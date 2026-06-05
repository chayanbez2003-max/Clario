import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getApplications } from '../api/applicationsApi'

/**
 * useApplications
 *
 * Fetches and caches aggregated Application records for the current user.
 * Call refetch() after a sync to get updated data.
 *
 * @returns {{
 *   applications: object[],
 *   total: number,
 *   loading: boolean,
 *   error: string | null,
 *   refetch: () => Promise<void>,
 * }}
 */
export function useApplications() {
  const { userId, isLoaded } = useAuth()

  const [applications, setApplications] = useState([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  const refetch = useCallback(async () => {
    if (!isLoaded || !userId) return
    try {
      setLoading(true)
      setError(null)
      const res = await getApplications(userId)
      setApplications(res.data?.applications || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      console.error('[useApplications] fetch error:', err)
      setError('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [userId, isLoaded])

  useEffect(() => {
    if (isLoaded && userId) refetch()
  }, [isLoaded, userId])

  return { applications, total, loading, error, refetch }
}
