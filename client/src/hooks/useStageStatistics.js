import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getStageStatistics } from '../api/stageApi'

/**
 * useStageStatistics
 *
 * Fetches and caches hiring pipeline stage counts for the current user.
 * Reads from GmailIntegration (pre-computed at sync time) — no aggregation overhead.
 *
 * @returns {{
 *   stats: { applied, assessment, interview, offer, rejected } | null,
 *   loading: boolean,
 *   error: string | null,
 *   refetch: () => Promise<void>,
 * }}
 */
export function useStageStatistics() {
  const { userId, isLoaded } = useAuth()

  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const refetch = useCallback(async () => {
    if (!isLoaded || !userId) return

    try {
      setLoading(true)
      setError(null)
      const res = await getStageStatistics(userId)
      setStats(res.data)
    } catch (err) {
      console.error('[useStageStatistics] fetch error:', err)
      setError('Failed to load pipeline statistics')
    } finally {
      setLoading(false)
    }
  }, [userId, isLoaded])

  // Fetch on mount once auth is ready
  useEffect(() => {
    if (isLoaded && userId) {
      refetch()
    }
  }, [isLoaded, userId])

  return { stats, loading, error, refetch }
}
