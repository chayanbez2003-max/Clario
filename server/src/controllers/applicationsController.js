/**
 * applicationsController.js — Milestone 4.2
 *
 * Endpoints for the aggregated Application records.
 * Reads from the Application collection (pre-computed by applicationAggregator).
 */

const Application = require('../models/Application')

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications?clerkId=xxx
//
// Returns all aggregated Application records for the user,
// sorted by lastEmailDate descending (most recently active first).
//
// Response:
//   {
//     success: true,
//     data: {
//       total: number,
//       applications: [
//         {
//           _id, companyName, platform, currentStage, currentStageConfidence,
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
      .select('-sourceEmails -__v')     // Exclude heavy ref array + version key
      .sort({ lastEmailDate: -1 })      // Most recently active first
      .lean()

    return res.json({
      success: true,
      data: {
        total:        applications.length,
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
