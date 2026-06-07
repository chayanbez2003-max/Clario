/**
 * gmailReaderService
 *
 * Low-level Gmail reading operations. Accepts an authenticated Gmail client
 * (from gmailClientFactory) and returns structured email data.
 *
 * Privacy contract:
 *   - fetchEmailMetadata() — fetches ONLY headers (subject, sender, date, snippet).
 *     No body is transferred from Gmail.
 *   - fetchEmailBody() — fetches the full message and extracts ONLY plain text.
 *     The raw payload is not stored anywhere — caller must discard after use.
 *
 * Every email object uses `gmailMessageId` as the unique deduplication key.
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * _parseHeaders
 * Extracts subject, sender, date from Gmail message headers array.
 *
 * @param {Array} headers - from gmail message.payload.headers
 * @returns {{ subject, sender, date }}
 */
function _parseHeaders(headers) {
  const get = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  return {
    subject: get('Subject') || '(No Subject)',
    sender:  get('From')    || '(Unknown Sender)',
    date:    get('Date')    || '',
  }
}

/**
 * _decodeBase64
 * Decodes a Gmail base64url-encoded string to UTF-8 text.
 *
 * @param {string} encoded
 * @returns {string}
 */
function _decodeBase64(encoded) {
  if (!encoded) return ''
  // Gmail uses base64url — replace URL-safe chars before decoding
  const standard = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(standard, 'base64').toString('utf8')
}

/**
 * _extractPlainText
 *
 * Recursively walks a Gmail message payload to find the text/plain part.
 * Returns the decoded plain text, or an empty string if not found.
 *
 * Gmail message structure:
 *   - Simple messages: payload.body.data
 *   - Multipart:       payload.parts[] → recurse
 *
 * @param {object} payload - Gmail message payload
 * @returns {string}
 */
function _extractPlainText(payload) {
  if (!payload) return ''

  // Direct body — simple message or a leaf part
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return _decodeBase64(payload.body.data)
  }

  // Skip HTML parts — we only want plain text
  if (payload.mimeType === 'text/html') return ''

  // Multipart: recurse into parts
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = _extractPlainText(part)
      if (text) return text  // Return first non-empty plain text part
    }
  }

  return ''
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * fetchRecentEmails
 *
 * Fetches metadata for the N most recent emails in the inbox.
 * Also reads the snippet from the list response (no extra API call needed).
 * Does NOT fetch email bodies — metadata only.
 *
 * @param {object} gmailClient - authenticated client from gmailClientFactory
 * @param {number} limit - number of emails to fetch (default: 50)
 * @returns {Promise<Array<{ gmailMessageId, subject, sender, date, snippet }>>}
 */
async function fetchRecentEmails(gmailClient, limit = 50) {
  // Step 1: list message IDs (snippet is included in list response)
  const listRes = await gmailClient.users.messages.list({
    userId:     'me',
    maxResults: limit,
    labelIds:   ['INBOX'],
  })

  const messages = listRes.data.messages || []
  if (messages.length === 0) return []

  // Step 2: fetch metadata headers for each message in parallel
  const emailPromises = messages.map((msg) =>
    fetchEmailMetadata(gmailClient, msg.id)
  )

  const emails = await Promise.all(emailPromises)
  return emails
}

/**
 * fetchEmailMetadata
 *
 * Fetches subject, sender, date, and snippet for a single message.
 * Uses Gmail's `metadata` format — no email body transferred.
 *
 * @param {object} gmailClient - authenticated client from gmailClientFactory
 * @param {string} messageId - Gmail message ID
 * @returns {Promise<{ gmailMessageId, subject, sender, date, snippet }>}
 */
async function fetchEmailMetadata(gmailClient, messageId) {
  const res = await gmailClient.users.messages.get({
    userId:          'me',
    id:              messageId,
    format:          'metadata',
    metadataHeaders: ['Subject', 'From', 'Date'],
  })

  const headers = res.data.payload?.headers || []
  const { subject, sender, date } = _parseHeaders(headers)

  return {
    gmailMessageId: messageId,
    subject,
    sender,
    date,
    snippet: res.data.snippet || '',
  }
}

/**
 * fetchEmailBody
 *
 * Fetches the plain text body of a single email message.
 *
 * Privacy contract:
 *   - Returns ONLY decoded plain text — no HTML, no raw payload, no attachments.
 *   - The caller (syncService) must set the returned string to null immediately
 *     after NLP extraction and before any DB write.
 *
 * @param {object} gmailClient - authenticated client from gmailClientFactory
 * @param {string} messageId - Gmail message ID
 * @returns {Promise<string>} - plain text body, or empty string if unavailable
 */
async function fetchEmailBody(gmailClient, messageId) {
  const res = await gmailClient.users.messages.get({
    userId: 'me',
    id:     messageId,
    format: 'full',   // full gives us body parts
  })

  const payload = res.data.payload
  const text    = _extractPlainText(payload)

  // Truncate to 8000 chars — enough for NLP, prevents runaway memory on huge emails
  return text.slice(0, 8000)
}

module.exports = { fetchRecentEmails, fetchEmailMetadata, fetchEmailBody }
