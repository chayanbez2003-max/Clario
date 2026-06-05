const express = require('express')
const router = express.Router()
const {
  getConnectUrl,
  handleCallback,
  getStatus,
  verifyConnection,
} = require('../controllers/gmailController')

// TODO: When Clerk backend token verification is implemented, import requireAuth
// and add it to all routes below before the Manual Sync milestone.
// const { requireAuth } = require('../middlewares/authMiddleware')

/**
 * GET /api/gmail/connect?clerkId=xxx
 * Returns Google OAuth URL for the frontend to redirect to.
 */
router.get('/connect', getConnectUrl)

/**
 * GET /api/gmail/callback?code=xxx&state=clerkId
 * Google OAuth callback — exchanges code for tokens, stores GmailIntegration,
 * redirects browser to frontend with ?connected=true.
 */
router.get('/callback', handleCallback)

/**
 * GET /api/gmail/status?clerkId=xxx
 * Returns current Gmail connection status.
 * Response: { connected, gmailEmail, lastSyncAt, emailsProcessed }
 */
router.get('/status', getStatus)

/**
 * POST /api/gmail/verify
 * Body: { clerkId }
 * Verifies Gmail API access using stored refresh token.
 * Fetches 5 email metadata samples for diagnostic display.
 * Does NOT persist emails.
 */
router.post('/verify', verifyConnection)

module.exports = router
