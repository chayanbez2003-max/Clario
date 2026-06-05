/**
 * gmailReaderService
 *
 * Low-level Gmail reading operations. Accepts an authenticated Gmail client
 * (from gmailClientFactory) and returns structured email data.
 *
 * Reused by:
 *   - Milestone 2: Gmail verification (fetchRecentEmails)
 *   - Step 3:  Manual Sync
 *   - Step 4:  Email Logs
 *   - Step 5:  NLP Pipeline input
 *   - Step 7:  Auto Sync engine
 *
 * Every email object from this service uses `gmailMessageId` as the
 * unique identifier — this is the deduplication key for all future features.
 */

/**
 * _parseHeaders
 * Extracts subject, sender, date from Gmail message headers array.
 *
 * @param {Array} headers - from gmail message.payload.headers
 * @returns {{ subject, sender, date }}
 */
function _parseHeaders(headers) {
  const get = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  return {
    subject: get('Subject') || '(No Subject)',
    sender:  get('From')    || '(Unknown Sender)',
    date:    get('Date')    || '',
  }
}

/**
 * fetchRecentEmails
 *
 * Fetches metadata for the N most recent emails in the inbox.
 * Does NOT fetch email bodies — metadata only.
 *
 * @param {object} gmailClient - authenticated client from gmailClientFactory
 * @param {number} limit - number of emails to fetch (default: 10)
 * @returns {Promise<Array<{ gmailMessageId, subject, sender, date }>>}
 */
async function fetchRecentEmails(gmailClient, limit = 10) {
  // Step 1: list message IDs
  const listRes = await gmailClient.users.messages.list({
    userId: 'me',
    maxResults: limit,
    labelIds: ['INBOX'],
  })

  const messages = listRes.data.messages || []
  if (messages.length === 0) return []

  // Step 2: fetch metadata for each message in parallel
  const emailPromises = messages.map((msg) =>
    fetchEmailMetadata(gmailClient, msg.id)
  )

  const emails = await Promise.all(emailPromises)
  return emails
}

/**
 * fetchEmailMetadata
 *
 * Fetches subject, sender, date for a single message.
 * Uses Gmail's `metadata` format — no email body transferred.
 *
 * @param {object} gmailClient - authenticated client from gmailClientFactory
 * @param {string} messageId - Gmail message ID
 * @returns {Promise<{ gmailMessageId, subject, sender, date }>}
 */
async function fetchEmailMetadata(gmailClient, messageId) {
  const res = await gmailClient.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Date'],
  })

  const headers = res.data.payload?.headers || []
  const { subject, sender, date } = _parseHeaders(headers)

  return {
    gmailMessageId: messageId,   // Deduplication key for all future features
    subject,
    sender,
    date,
  }
}

/**
 * fetchEmailBody
 *
 * Fetches the full email body for a single message.
 *
 * NOT IMPLEMENTED — placeholder for Step 4 (Email Logs) and Step 5 (NLP).
 *
 * @param {object} gmailClient
 * @param {string} messageId
 */
async function fetchEmailBody(gmailClient, messageId) {
  // TODO: Implement in Step 4 (Email Logs milestone)
  // Will decode base64 body parts and return plain text + HTML
  throw new Error('fetchEmailBody is not yet implemented (Step 4)')
}

module.exports = { fetchRecentEmails, fetchEmailMetadata, fetchEmailBody }
