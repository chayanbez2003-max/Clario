const express = require('express')
const router  = express.Router()
const { getStageStatistics } = require('../controllers/stageController')

/**
 * GET /api/stages/statistics?clerkId=xxx
 * Returns current stage counts aggregated from Application records.
 */
router.get('/statistics', getStageStatistics)

module.exports = router
