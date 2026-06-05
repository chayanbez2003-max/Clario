/**
 * stageController.js
 *
 * Controller for stage statistics endpoints.
 *
 * Reads hiring pipeline counts from GmailIntegration (pre-computed at sync time)
 * rather than running aggregation queries on JobEmailCandidate on every request.
 * This makes the dashboard load fast regardless of email volume.
 */

const GmailIntegration = require('../models/GmailIntegration')


const getStageStatistics = async (req, res) => {
  try {
    const { clerkId } = req.query

    if (!clerkId) {
      return res.status(400).json({
        success: false,
        message: 'clerkId is required',
      })
    }

    const integration = await GmailIntegration.findOne({ userId: clerkId })

    if (!integration) {
      // No integration yet — return zeros (user hasn't connected Gmail)
      return res.json({
        success: true,
        data: {
          applied:    0,
          assessment: 0,
          interview:  0,
          offer:      0,
          rejected:   0,
        },
      })
    }

    return res.json({
      success: true,
      data: {
        applied:    integration.appliedCount    || 0,
        assessment: integration.assessmentCount || 0,
        interview:  integration.interviewCount  || 0,
        offer:      integration.offerCount      || 0,
        rejected:   integration.rejectedCount   || 0,
      },
    })
  } catch (err) {
    console.error('[stageController] getStageStatistics error:', err)
    return res.status(500).json({
      success: false,
      message: 'Failed to load stage statistics',
    })
  }
}

module.exports = { getStageStatistics }
