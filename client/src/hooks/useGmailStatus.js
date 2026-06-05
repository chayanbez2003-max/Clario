import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getGmailStatus } from '../api/gmailApi'

/**
 * useGmailStatus
 *
 * Fetches and manages Gmail connection status for the current user.
 * Reused by Dashboard, GmailSyncPage, and future sync features.
 *
 * @returns {{
 *   status: { connected: boolean, gmailEmail: string|null, lastSyncAt: string|null, emailsProcessed: number } | null,
 *   loading: boolean,
 *   error: string | null,
 *   refetch: () => void
 * }}
 */
export function useGmailStatus() {
  const { userId, isLoaded } = useAuth()

  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchStatus = useCallback(async () => {
    if (!isLoaded || !userId) return

    try {
      setLoading(true)
      setError(null)
      const res = await getGmailStatus(userId)
      setStatus(res.data)
    } catch (err) {
      console.error('[useGmailStatus] fetch error:', err)
      setError('Failed to load Gmail status')
    } finally {
      setLoading(false)
    }
  }, [userId, isLoaded])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return { status, loading, error, refetch: fetchStatus }
}
