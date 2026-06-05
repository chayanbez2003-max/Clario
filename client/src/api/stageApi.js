import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_BASE}/api/stages`,
  withCredentials: true,
})

/**
 * getStageStatistics
 *
 * Fetches hiring pipeline stage counts for the current user.
 * Data is pre-computed at sync time — this is a fast read from GmailIntegration.
 *
 * @param {string} clerkId
 * @returns {Promise<{
 *   success: boolean,
 *   data: {
 *     applied:    number,
 *     assessment: number,
 *     interview:  number,
 *     offer:      number,
 *     rejected:   number,
 *   }
 * }>}
 */
export const getStageStatistics = async (clerkId) => {
  const { data } = await api.get('/statistics', { params: { clerkId } })
  return data
}
