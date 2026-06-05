const GmailIntegration = require('../models/GmailIntegration')
const gmailAuthService = require('../services/gmail/gmailAuthService')
const { createGmailClient } = require('../services/gmail/gmailClientFactory')
const { fetchRecentEmails } = require('../services/gmail/gmailReaderService')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ─────────────────────────────────────────────────────────────
// GET /api/gmail/connect?clerkId=xxx
// Returns the Google OAuth consent URL.
//
// TODO: Replace temporary clerkId flow with Clerk backend token
//       verification before Manual Sync milestone.
// ─────────────────────────────────────────────────────────────
const getConnectUrl = async (req, res) => {
  try {
    const { clerkId } = req.query

    if (!clerkId) {
      return res.status(400).json({ success: false, message: 'clerkId is required' })
    }

    const authUrl = gmailAuthService.generateAuthUrl(clerkId)

    res.json({ success: true, authUrl })
  } catch (err) {
    console.error('[gmailController] getConnectUrl error:', err)
    res.status(500).json({ success: false, message: 'Failed to generate OAuth URL' })
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/gmail/callback?code=xxx&state=clerkId
// Google calls this after user grants consent.
// Exchanges code for tokens, stores GmailIntegration, redirects to frontend.
//
// TODO: Replace temporary clerkId flow with Clerk backend token
//       verification before Manual Sync milestone.
// ─────────────────────────────────────────────────────────────
const handleCallback = async (req, res) => {
  try {
    const { code, state: clerkId, error } = req.query

    // User denied access
    if (error) {
      console.warn('[gmailController] OAuth denied by user:', error)
      return res.redirect(`${FRONTEND_URL}/dashboard/gmail?error=access_denied`)
    }

    if (!code || !clerkId) {
      return res.redirect(`${FRONTEND_URL}/dashboard/gmail?error=invalid_callback`)
    }

    // Exchange authorization code for tokens
    const { tokens } = await gmailAuthService.exchangeCode(code)

    if (!tokens.refresh_token) {
      // This happens if the user already granted access before and `prompt: 'consent'`
      // was not set, or they revoked and re-granted. Log and redirect with error.
      console.error('[gmailController] No refresh_token received. Tokens:', tokens)
      return res.redirect(`${FRONTEND_URL}/dashboard/gmail?error=no_refresh_token`)
    }

    // Fetch the gmail address associated with this token
    const gmailEmail = await gmailAuthService.getGmailEmail(tokens)

    // Upsert GmailIntegration record for this user
    await GmailIntegration.findOneAndUpdate(
      { userId: clerkId },
      {
        userId: clerkId,
        gmailEmail: gmailEmail,
        refreshToken: tokens.refresh_token,
        gmailConnected: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    console.log(`[gmailController] Gmail connected for user ${clerkId}: ${gmailEmail}`)

    // Redirect to frontend with success signal
    res.redirect(`${FRONTEND_URL}/dashboard/gmail?connected=true`)
  } catch (err) {
    console.error('[gmailController] handleCallback error:', err)
    res.redirect(`${FRONTEND_URL}/dashboard/gmail?error=callback_failed`)
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/gmail/status?clerkId=xxx
// Returns current Gmail connection status for a user.
// Response shape is locked in — emailsProcessed is always present.
//
// TODO: Replace temporary clerkId flow with Clerk backend token
//       verification before Manual Sync milestone.
// ─────────────────────────────────────────────────────────────
const getStatus = async (req, res) => {
  try {
    const { clerkId } = req.query

    if (!clerkId) {
      return res.status(400).json({ success: false, message: 'clerkId is required' })
    }

    const integration = await GmailIntegration.findOne({ userId: clerkId })

    if (!integration) {
      // No record yet — user has never connected Gmail
      return res.json({
        success: true,
        data: {
          connected: false,
          gmailEmail: null,
          lastVerifiedAt: null,
          lastSyncAt: null,
          emailsProcessed: 0,
        },
      })
    }

    res.json({
      success: true,
      data: {
        connected: integration.gmailConnected,
        gmailEmail: integration.gmailEmail,
        lastVerifiedAt: integration.lastVerifiedAt,
        lastSyncAt: integration.lastSyncAt,
        emailsProcessed: integration.emailsProcessed,
      },
    })
  } catch (err) {
    console.error('[gmailController] getStatus error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch Gmail status' })
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/gmail/verify
// Body: { clerkId }
// Uses stored refresh token to verify Gmail API access.
// Fetches latest 5 email metadata samples (diagnostic only — not persisted).
//
// TODO: Replace temporary clerkId flow with Clerk backend token
//       verification before Manual Sync milestone.
// ─────────────────────────────────────────────────────────────
const verifyConnection = async (req, res) => {
  try {
    const { clerkId } = req.body

    if (!clerkId) {
      return res.status(400).json({ success: false, message: 'clerkId is required' })
    }

    // Fetch integration including the hidden refreshToken field
    const integration = await GmailIntegration.findOne({ userId: clerkId }).select(
      '+refreshToken'
    )

    if (!integration || !integration.gmailConnected) {
      return res.status(404).json({
        success: false,
        message: 'Gmail is not connected for this user',
      })
    }

    if (!integration.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token missing — please reconnect Gmail',
      })
    }

    // Create authenticated Gmail client using the stored refresh token
    const gmailClient = createGmailClient(integration.refreshToken)

    // Fetch latest 5 emails (metadata only — not persisted to DB)
    const sampleEmails = await fetchRecentEmails(gmailClient, 5)

    // Verification is a health check, not a sync operation.
    // Only lastVerifiedAt is updated.
    // emailsProcessed and lastSyncAt are reserved for sync operations (Step 3+).
    const now = new Date()
    await GmailIntegration.findOneAndUpdate(
      { userId: clerkId },
      { lastVerifiedAt: now }
    )

    res.json({
      success: true,
      data: {
        verified: true,
        gmailEmail: integration.gmailEmail,
        lastVerifiedAt: now,
        sampleEmailCount: sampleEmails.length,
        sampleEmails,   // Array of { gmailMessageId, subject, sender, date }
      },
    })
  } catch (err) {
    console.error('[gmailController] verifyConnection error:', err)

    // Surface a useful message if Google API rejected the token
    const isAuthError = err.code === 401 || err.message?.includes('invalid_grant')
    if (isAuthError) {
      return res.status(401).json({
        success: false,
        message: 'Gmail token is expired or revoked. Please reconnect Gmail.',
      })
    }

    res.status(500).json({ success: false, message: 'Gmail verification failed' })
  }
}

module.exports = { getConnectUrl, handleCallback, getStatus, verifyConnection }
