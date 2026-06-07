/**
 * stageController.js
 *
 * Returns hiring pipeline stage counts for the dashboard.
 * Aggregates live from the Application collection (grouped by currentStage).
 * No pre-computed counts needed — this is a fast aggregation query.
 */

const Application = require('../models/Application')

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stages/statistics?clerkId=xxx
//
// Returns current stage counts for the user's applications.
//
// Response:
//   {
//     success: true,
//     data: {
//       applied:    number,
//       assessment: number,
//       interview:  number,
//       offer:      number,
//       rejected:   number,
//       hired:      number,
//       withdrawn:  number,
//       unknown:    number,
//       total:      number,
//     }
//   }
// ─────────────────────────────────────────────────────────────────────────────
const getStageStatistics = async (req, res) => {
  try {
    const { clerkId } = req.query

    if (!clerkId) {
      return res.status(400).json({
        success: false,
        message: 'clerkId is required',
      })
    }

    // Aggregate stage counts directly from Application collection
    const stageCounts = await Application.aggregate([
      { $match: { userId: clerkId } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ])

    // Build a zero-filled result object
    const data = {
      applied:    0,
      assessment: 0,
      interview:  0,
      offer:      0,
      rejected:   0,
      hired:      0,
      withdrawn:  0,
      unknown:    0,
      total:      0,
    }

    for (const { _id, count } of stageCounts) {
      const key = (_id || 'UNKNOWN').toLowerCase()
      if (key in data) data[key] = count
      data.total += count
    }

    return res.json({ success: true, data })
  } catch (err) {
    console.error('[stageController] getStageStatistics error:', err)
    return res.status(500).json({
      success: false,
      message: 'Failed to load stage statistics',
    })
  }
}

module.exports = { getStageStatistics }
