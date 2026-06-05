const { google } = require('googleapis')

// Gmail readonly scope — principle of least privilege
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

/**
 * Creates a base OAuth2 client (no credentials set — used for URL generation)
 */
function _createBaseOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

/**
 * generateAuthUrl
 *
 * Generates the Google OAuth consent screen URL.
 * Embeds clerkId in the `state` parameter so the callback can
 * identify which user completed the OAuth flow.
 *
 * TODO: Replace temporary clerkId flow with Clerk backend token verification
 *       before Manual Sync milestone.
 *
 * @param {string} clerkId - the user's Clerk user ID
 * @returns {string} Google OAuth URL
 */
function generateAuthUrl(clerkId) {
  const oauth2Client = _createBaseOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',   // Required to get a refresh_token
    prompt: 'consent',         // Force consent screen to always get refresh_token
    scope: SCOPES,
    state: clerkId,            // Passed back unchanged by Google in callback
  })
}

/**
 * exchangeCode
 *
 * Exchanges an authorization code (from Google callback) for tokens.
 *
 * @param {string} code - authorization code from Google
 * @returns {{ tokens: { access_token, refresh_token, expiry_date } }}
 */
async function exchangeCode(code) {
  const oauth2Client = _createBaseOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return { tokens }
}

/**
 * getGmailEmail
 *
 * Fetches the Gmail address associated with a set of tokens.
 * Called once after exchangeCode to store the gmail address.
 *
 * @param {{ access_token, refresh_token }} tokens
 * @returns {string} gmail address
 */
async function getGmailEmail(tokens) {
  const oauth2Client = _createBaseOAuth2Client()
  oauth2Client.setCredentials(tokens)

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  return data.email
}

module.exports = { generateAuthUrl, exchangeCode, getGmailEmail }
