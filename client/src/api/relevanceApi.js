import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_BASE}/api/relevance`,
  withCredentials: true,
})

/**
 * getCandidates
 *
 * Fetches all JobEmailCandidates for the user, sorted by relevanceScore desc.
 * Returns the full candidate document including stage, confidence, and company fields
 * added in Milestone 4.1.
 *
 * @param {string} clerkId
 * @returns {Promise<{ success: boolean, data: { total: number, candidates: object[] } }>}
 */
export const getCandidates = async (clerkId) => {
  const { data } = await api.get('/candidates', { params: { clerkId } })
  return data
}
