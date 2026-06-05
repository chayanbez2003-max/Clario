import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_BASE}/api/applications`,
  withCredentials: true,
})

/**
 * getApplications
 *
 * Fetches all aggregated Application records for the user.
 * Records are sorted by lastEmailDate desc (most recently active first).
 *
 * @param {string} clerkId
 * @returns {Promise<{
 *   success: boolean,
 *   data: {
 *     total: number,
 *     applications: Array<{
 *       _id: string,
 *       companyName: string,
 *       platform: string,
 *       currentStage: string,
 *       currentStageConfidence: string,
 *       emailCount: number,
 *       firstEmailDate: string | null,
 *       lastEmailDate: string | null,
 *     }>
 *   }
 * }>}
 */
export const getApplications = async (clerkId) => {
  const { data } = await api.get('/', { params: { clerkId } })
  return data
}
