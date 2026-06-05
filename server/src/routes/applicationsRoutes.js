const express    = require('express')
const router     = express.Router()
const { getApplications } = require('../controllers/applicationsController')

/**
 * GET /api/applications?clerkId=xxx
 *
 * Returns aggregated application records for a user.
 * Data is pre-computed by applicationAggregator at end of every sync.
 *
 * Response: { total, applications: [{ companyName, platform, currentStage, emailCount, lastEmailDate }] }
 */
router.get('/', getApplications)

module.exports = router
