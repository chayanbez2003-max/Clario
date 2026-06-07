/**
 * applicationsController.js
 *
 * Endpoints for aggregated Application records.
 * Reads from the Application collection (rebuilt by applicationAggregator after each sync).
 */

const Application = require('../models/Application')

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications?clerkId=xxx
//
// Returns all Application records for the user, sorted by lastEmailDate desc.
//
// Response:
//   {
//     success: true,
//     data: {
//       total: number,
//       applications: [
//         {
//           _id, company, role, currentStage, currentStageConfidence,
//           emailCount, firstEmailDate, lastEmailDate, createdAt, updatedAt
//         }
//       ]
//     }
//   }
// ─────────────────────────────────────────────────────────────────────────────
const getApplications = async (req, res) => {
  try {
    const { clerkId } = req.query

    if (!clerkId) {
      return res.status(400).json({ success: false, message: 'clerkId is required' })
    }

    const applications = await Application
      .find({ userId: clerkId })
      .select('-__v')
      .sort({ lastEmailDate: -1 })
      .lean()

    return res.json({
      success: true,
      data: {
        total: applications.length,
        applications,
      },
    })
  } catch (err) {
    console.error('[applicationsController] getApplications error:', err)
    return res.status(500).json({
      success: false,
      message: 'Failed to load applications',
    })
  }
}

module.exports = { getApplications }
