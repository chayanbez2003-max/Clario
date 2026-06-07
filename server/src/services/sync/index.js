/**
 * syncService.js — Manual Sync Pipeline Orchestrator
 *
 * Implements the full email processing pipeline per the new architecture:
 *
 *   1. Load GmailIntegration refresh token
 *   2. Fetch latest 50 email metadata (subject, snippet, sender, gmailMessageId)
 *   3. Run noise filter on metadata — discard noise immediately (body never fetched)
 *   4. For non-noisy emails: fetch body text in memory
 *   5. Pass subject + snippet + bodyText to NLP adapter
 *   6. Store only structured NLP result in CandidateEmail (body is nulled before write)
 *   7. Run applicationAggregator to rebuild Application records
 *   8. Update GmailIntegration.lastSyncAt + emailsProcessed
 *
 * Privacy contract:
 *   - Body is fetched ONLY after noise filtering.
 *   - Body is processed in-memory and set to null before any DB write.
 *   - No body, HTML, payload, or attachments are ever stored.
 *
 * @module services/sync/syncService
 */

const GmailIntegration       = require('../../models/GmailIntegration')
const CandidateEmail         = require('../../models/CandidateEmail')
const { createGmailClient }  = require('../gmail/gmailClientFactory')
const { fetchRecentEmails, fetchEmailBody } = require('../gmail/gmailReaderService')
const { classifyNoise }      = require('../noise/noiseFilter')
const { extractCandidateData } = require('../parser/nlpAdapter')
const { aggregateApplications } = require('../applications/applicationAggregator')

// ── Constants ─────────────────────────────────────────────────────────────────

/** Max number of emails to process per sync */
const SYNC_BATCH_SIZE = 50

/** Max parallel body fetches to avoid hitting Gmail rate limits */
const MAX_PARALLEL_BODY_FETCHES = 5

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * _parseReceivedAt
 * Parses the date string from email metadata into a Date object.
 *
 * @param {string} dateStr
 * @returns {Date|null}
 */
function _parseReceivedAt(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

/**
 * _processBatch
 *
 * Processes a batch of non-noisy emails: fetches body, runs NLP, saves to DB.
 * Runs in chunks to respect Gmail API rate limits.
 *
 * @param {object} gmailClient
 * @param {object[]} nonNoisyEmails
 * @param {string} userId
 * @returns {Promise<{ successfullyProcessed: number, duplicatesSkipped: number, failed: number }>}
 */
async function _processBatch(gmailClient, nonNoisyEmails, userId) {
  let successfullyProcessed = 0
  let duplicatesSkipped     = 0
  let failed                = 0

  // Process in chunks to rate-limit body fetches
  for (let i = 0; i < nonNoisyEmails.length; i += MAX_PARALLEL_BODY_FETCHES) {
    const chunk = nonNoisyEmails.slice(i, i + MAX_PARALLEL_BODY_FETCHES)

    const results = await Promise.allSettled(
      chunk.map((email) => _processOneEmail(gmailClient, email, userId))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { outcome } = result.value
        if (outcome === 'saved')     successfullyProcessed++
        else if (outcome === 'dupe') duplicatesSkipped++
        else                         failed++
      } else {
        console.error('[syncService] Email processing error:', result.reason?.message)
        failed++
      }
    }
  }

  return { successfullyProcessed, duplicatesSkipped, failed }
}

/**
 * _processOneEmail
 *
 * Full pipeline for a single non-noisy email:
 *   1. Fetch body (in memory)
 *   2. Run NLP adapter
 *   3. Null out body
 *   4. Upsert CandidateEmail
 *
 * @param {object} gmailClient
 * @param {object} email - { gmailMessageId, subject, sender, date, snippet }
 * @param {string} userId
 * @returns {Promise<{ outcome: 'saved'|'dupe'|'failed' }>}
 */
async function _processOneEmail(gmailClient, email, userId) {
  // Step 1: Fetch body in memory
  let bodyText = ''
  try {
    bodyText = await fetchEmailBody(gmailClient, email.gmailMessageId)
  } catch (bodyErr) {
    console.warn(`[syncService] Body fetch failed for ${email.gmailMessageId}:`, bodyErr.message)
    // Continue with empty body — NLP will still run on subject+snippet
  }

  // Step 2: NLP extraction (body is used here, in memory only)
  const nlpResult = extractCandidateData({
    subject:  email.subject,
    snippet:  email.snippet,
    sender:   email.sender,
    bodyText,           // in memory — NOT stored
  })

  // Step 3: Null out body immediately — privacy contract
  bodyText = null

  // Step 4: Build DB document (no body in this object)
  const candidateDoc = {
    userId,
    gmailMessageId:  email.gmailMessageId,
    subject:         email.subject,
    sender:          email.sender,
    receivedAt:      _parseReceivedAt(email.date),
    company:         nlpResult.company,
    role:            nlpResult.role,
    stage:           nlpResult.stage,
    confidence:      nlpResult.confidence,
    dateSignals:     nlpResult.dateSignals,
    processingSource: 'nlp_adapter',
    processedAt:     new Date(),
  }

  // Step 5: Upsert — skip duplicates gracefully
  try {
    await CandidateEmail.findOneAndUpdate(
      { userId, gmailMessageId: email.gmailMessageId },
      { $set: candidateDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return { outcome: 'saved' }
  } catch (err) {
    if (err.code === 11000) {
      return { outcome: 'dupe' }
    }
    throw err
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * runManualSync
 *
 * Orchestrates the full sync pipeline for a user.
 *
 * @param {string} userId - Clerk user ID
 * @returns {Promise<{
 *   emailsScanned:        number,
 *   noisyFiltered:        number,
 *   sentToNlp:            number,
 *   successfullyProcessed:number,
 *   duplicatesSkipped:    number,
 *   failed:               number,
 *   aggregation:          { created: number, updated: number, skipped: number },
 * }>}
 */
async function runManualSync(userId) {
  // ── Step 1: Load integration + refresh token ─────────────────────────────
  const integration = await GmailIntegration
    .findOne({ userId })
    .select('+refreshToken')

  if (!integration || !integration.gmailConnected) {
    throw new Error('Gmail is not connected for this user')
  }

  if (!integration.refreshToken) {
    throw new Error('Refresh token missing — please reconnect Gmail')
  }

  // ── Step 2: Create authenticated Gmail client ────────────────────────────
  const gmailClient = createGmailClient(integration.refreshToken)

  // ── Step 3: Fetch metadata (subject, snippet, sender, id — no body) ──────
  const allEmails = await fetchRecentEmails(gmailClient, SYNC_BATCH_SIZE)
  const emailsScanned = allEmails.length

  // ── Step 4: Noise filter — discard non-job emails ────────────────────────
  const nonNoisyEmails = []
  let noisyFiltered = 0

  for (const email of allEmails) {
    const noiseResult = classifyNoise({
      subject: email.subject,
      snippet: email.snippet,
      sender:  email.sender,
    })

    if (noiseResult.isNoisy) {
      noisyFiltered++
      // Noisy email → discarded. Body never fetched.
    } else {
      nonNoisyEmails.push(email)
    }
  }

  const sentToNlp = nonNoisyEmails.length

  // ── Step 5-6: Fetch bodies + NLP + store structured data ─────────────────
  const { successfullyProcessed, duplicatesSkipped, failed } =
    await _processBatch(gmailClient, nonNoisyEmails, userId)

  // ── Step 7: Application aggregation ──────────────────────────────────────
  const aggregation = await aggregateApplications(userId)

  // ── Step 8: Update GmailIntegration sync metadata ────────────────────────
  await GmailIntegration.findOneAndUpdate(
    { userId },
    {
      lastSyncAt:      new Date(),
      emailsProcessed: (integration.emailsProcessed || 0) + successfullyProcessed,
    }
  )

  console.log(
    `[syncService] Sync complete for userId=${userId}: ` +
    `scanned=${emailsScanned} noisy=${noisyFiltered} nlp=${sentToNlp} ` +
    `saved=${successfullyProcessed} dupes=${duplicatesSkipped} failed=${failed}`
  )

  return {
    emailsScanned,
    noisyFiltered,
    sentToNlp,
    successfullyProcessed,
    duplicatesSkipped,
    failed,
    aggregation,
  }
}

module.exports = { runManualSync }
