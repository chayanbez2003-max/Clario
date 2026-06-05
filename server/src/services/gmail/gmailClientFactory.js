const { google } = require('googleapis')

/**
 * gmailClientFactory
 *
 * Single source of truth for creating authenticated Gmail API clients.
 * Every Gmail feature (verification, manual sync, auto sync) calls this.
 *
 * @param {string} refreshToken - stored refresh token from GmailIntegration
 * @returns {import('googleapis').gmail_v1.Gmail} authenticated Gmail client
 */
function createGmailClient(refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

module.exports = { createGmailClient }
