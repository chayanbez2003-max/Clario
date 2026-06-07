/**
 * applicationAggregator.js
 *
 * Groups CandidateEmail records by { userId, company, role } and upserts
 * into the Application collection.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Called by:  syncService.runManualSync() at end of every sync
 * Input:      userId (Clerk ID)
 * Output:     { created, updated, skipped } counts
 *
 * Grouping key: { userId, company, role }
 *   - Multiple applications allowed per company when roles differ.
 *   - role: null is treated as a separate group.
 *
 * Stage resolution:
 *   The most recently received email's stage is used (newest first),
 *   skipping UNKNOWN unless all are UNKNOWN.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * @module services/applications/applicationAggregator
 */

const CandidateEmail = require('../../models/CandidateEmail')
const Application    = require('../../models/Application')

/**
 * _resolveCurrentStage
 *
 * Returns the stage of the most recent non-UNKNOWN candidate email.
 * Falls back to UNKNOWN if all are UNKNOWN.
 *
 * @param {object[]} candidates - sorted by receivedAt desc
 * @returns {{ stage: string, confidence: string }}
 */
function _resolveCurrentStage(candidates) {
  for (const c of candidates) {
    if (c.stage && c.stage !== 'UNKNOWN') {
      return { stage: c.stage, confidence: c.confidence || 'low' }
    }
  }
  return { stage: 'UNKNOWN', confidence: 'low' }
}

/**
 * aggregateApplications
 *
 * Rebuilds Application records for a user based on current CandidateEmail data.
 *
 * @param {string} userId
 * @returns {Promise<{ created: number, updated: number, skipped: number }>}
 */
async function aggregateApplications(userId) {
  // ── Step 1: Fetch all candidates with a resolved company ──────────────────
  const candidates = await CandidateEmail
    .find({
      userId,
      company: { $ne: null, $exists: true },
    })
    .select('company role stage confidence receivedAt _id')
    .sort({ receivedAt: -1 })  // Newest first
    .lean()

  if (candidates.length === 0) {
    return { created: 0, updated: 0, skipped: 0 }
  }

  // ── Step 2: Group by { company (normalised), role (normalised) } ───────────
  const groups = new Map()

  for (const candidate of candidates) {
    const companyKey = candidate.company.trim().toLowerCase()
    // role may be null — treat null as a distinct group key
    const roleKey    = candidate.role ? candidate.role.trim().toLowerCase() : '__no_role__'
    const mapKey     = `${companyKey}|||${roleKey}`

    if (!groups.has(mapKey)) {
      groups.set(mapKey, {
        company:    candidate.company,
        role:       candidate.role || null,
        candidates: [],
      })
    }
    groups.get(mapKey).candidates.push(candidate)
  }

  // ── Step 3: Upsert Application for each group ─────────────────────────────
  let created = 0
  let updated = 0
  let skipped = 0

  for (const [, group] of groups) {
    const { company, role, candidates: groupCandidates } = group

    if (!company || company.length < 2) {
      skipped++
      continue
    }

    const { stage: currentStage, confidence: currentStageConfidence } =
      _resolveCurrentStage(groupCandidates)  // already sorted newest first

    const dates         = groupCandidates.map((c) => c.receivedAt).filter(Boolean)
    const firstEmailDate = dates.length > 0
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : null
    const lastEmailDate  = dates.length > 0
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null

    try {
      const result = await Application.findOneAndUpdate(
        { userId, company, role },
        {
          $set: {
            currentStage,
            currentStageConfidence,
            emailCount:    groupCandidates.length,
            firstEmailDate,
            lastEmailDate,
          },
        },
        {
          upsert:              true,
          new:                 true,
          setDefaultsOnInsert: true,
        }
      )

      // Detect created vs updated: if createdAt ≈ updatedAt → just created
      if (result.createdAt && result.updatedAt &&
          Math.abs(result.createdAt - result.updatedAt) < 1000) {
        created++
      } else {
        updated++
      }
    } catch (err) {
      if (err.code === 11000) {
        updated++   // Race condition on upsert — treat as updated
      } else {
        console.error(`[applicationAggregator] Failed for "${company}/${role}":`, err.message)
        skipped++
      }
    }
  }

  console.log(
    `[applicationAggregator] userId=${userId}: ` +
    `created=${created} updated=${updated} skipped=${skipped} ` +
    `groups=${groups.size} candidates=${candidates.length}`
  )

  return { created, updated, skipped }
}

module.exports = { aggregateApplications }
