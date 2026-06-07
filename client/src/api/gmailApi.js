import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_BASE}/api/gmail`,
  withCredentials: true,
})

/**
 * getGmailConnectUrl
 * Fetches the Google OAuth URL. Frontend redirects to it.
 *
 * @param {string} clerkId
 * @returns {Promise<{ authUrl: string }>}
 */
export const getGmailConnectUrl = async (clerkId) => {
  const { data } = await api.get('/connect', { params: { clerkId } })
  return data
}

/**
 * getGmailStatus
 * Returns current Gmail connection state for the user.
 * Response: { connected, gmailEmail, lastSyncAt, emailsProcessed }
 *
 * @param {string} clerkId
 */
export const getGmailStatus = async (clerkId) => {
  const { data } = await api.get('/status', { params: { clerkId } })
  return data
}

/**
 * verifyGmailConnection
 * Triggers a Gmail API verification — fetches 5 email metadata samples.
 * Returns { verified, gmailEmail, sampleEmails[] }
 *
 * @param {string} clerkId
 */
export const verifyGmailConnection = async (clerkId) => {
  const { data } = await api.post('/verify', { clerkId })
  return data
}

/**
 * triggerSync
 * Runs the full email sync pipeline for the user.
 * Returns sync metrics: { emailsScanned, noisyFiltered, sentToNlp,
 *   successfullyProcessed, duplicatesSkipped, failed, aggregation }
 *
 * @param {string} clerkId
 */
export const triggerSync = async (clerkId) => {
  const { data } = await api.post('/sync', { clerkId })
  return data
}
