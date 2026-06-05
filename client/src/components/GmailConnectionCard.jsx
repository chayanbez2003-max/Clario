import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  HiOutlineMail,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineLightningBolt,
  HiOutlineClock,
} from 'react-icons/hi'
import { getGmailConnectUrl, verifyGmailConnection } from '../api/gmailApi'

/**
 * GmailConnectionCard
 *
 * Props:
 *   status  - from useGmailStatus() hook
 *   loading - loading state
 *   onRefetch - callback to re-fetch status after actions
 *   compact - when true, renders a smaller card (for Dashboard overview)
 *
 * State 1: Not connected
 * State 2: Connected, not verified
 * State 3: Verified (shows 5 sample emails)
 */
export default function GmailConnectionCard({ status, loading, onRefetch, compact = false }) {
  const { userId } = useAuth()

  const [connecting, setConnecting]   = useState(false)
  const [verifying, setVerifying]     = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyError, setVerifyError]   = useState(null)

  // ── Connect Gmail → redirect to Google OAuth ──
  const handleConnect = async () => {
    try {
      setConnecting(true)
      const { authUrl } = await getGmailConnectUrl(userId)
      window.location.href = authUrl   // Full browser redirect to Google
    } catch (err) {
      console.error('[GmailConnectionCard] connect error:', err)
      setConnecting(false)
    }
  }

  // ── Verify connection → fetch 5 email samples ──
  const handleVerify = async () => {
    try {
      setVerifying(true)
      setVerifyError(null)
      setVerifyResult(null)
      const res = await verifyGmailConnection(userId)
      setVerifyResult(res.data)
      // Refetch status so Dashboard stat cards pick up new lastSyncAt + emailsProcessed
      if (onRefetch) onRefetch()
    } catch (err) {
      console.error('[GmailConnectionCard] verify error:', err)
      const msg = err.response?.data?.message || 'Verification failed. Please try again.'
      setVerifyError(msg)
    } finally {
      setVerifying(false)
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-[#e8e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${compact ? 'p-5' : 'p-6'}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#f0eff8] rounded w-1/3" />
          <div className="h-3 bg-[#f0eff8] rounded w-2/3" />
          <div className="h-9 bg-[#f0eff8] rounded-xl w-36 mt-4" />
        </div>
      </div>
    )
  }

  const isConnected = status?.connected
  const isVerified  = verifyResult?.verified

  // ════════════════════════════════════════════════
  // STATE 1 — Not Connected
  // ════════════════════════════════════════════════
  if (!isConnected) {
    return (
      <div className={`bg-white rounded-2xl border border-[#e8e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${compact ? 'p-5' : 'p-6'} animate-fade-in`}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#f0eff8] flex items-center justify-center flex-shrink-0">
            <HiOutlineMail className="text-xl text-[#9098a9]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Gmail</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#f0eff8] text-[#9098a9]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9098a9]" />
                Not Connected
              </span>
            </div>
            <p className="text-xs text-[#9098a9] mb-4">
              Connect your Gmail to start tracking job applications automatically.
            </p>
            <button
              id="gmail-connect-btn"
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 bg-[#4f7ef7] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#3b6af0] transition-all duration-200 shadow-[0_4px_14px_rgba(79,126,247,0.28)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  <HiOutlineMail className="text-base" />
                  Connect Gmail
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════
  // STATE 3 — Verified (overlays State 2)
  // ════════════════════════════════════════════════
  if (isVerified) {
    return (
      <div className={`bg-white rounded-2xl border border-[#dcfce7] shadow-[0_2px_8px_rgba(34,197,94,0.10)] ${compact ? 'p-5' : 'p-6'} animate-fade-in`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
              <HiOutlineCheckCircle className="text-xl text-[#16a34a]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#1a1a2e]">Gmail</h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#16a34a]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-[#9098a9] mt-0.5">{verifyResult.gmailEmail}</p>
            </div>
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="text-xs text-[#9098a9] hover:text-[#4f7ef7] flex items-center gap-1 transition-colors duration-150"
          >
            <HiOutlineRefresh className={verifying ? 'animate-spin' : ''} />
            Re-verify
          </button>
        </div>

        {/* Verification stats row */}
        <div className="flex items-center gap-4 mb-4 px-1">
          <div className="flex items-center gap-1.5 text-xs text-[#9098a9]">
            <HiOutlineClock className="text-sm text-[#22c55e]" />
            <span>Last verified:{' '}
              <span className="font-semibold text-[#1a1a2e]">
                {verifyResult.lastVerifiedAt
                  ? new Date(verifyResult.lastVerifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Just now'}
              </span>
            </span>
          </div>
          <span className="text-[#e8e8f0]">·</span>
          <span className="text-xs text-[#9098a9]">
            Sample emails retrieved:{' '}
            <span className="font-semibold text-[#1a1a2e]">{verifyResult.sampleEmailCount ?? verifyResult.sampleEmails?.length ?? 0}</span>
          </span>
        </div>

        {/* Sample emails */}
        {!compact && verifyResult.sampleEmails?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#9098a9] uppercase tracking-wider mb-3">
              Latest emails · verification sample
            </p>
            {verifyResult.sampleEmails.map((email) => (
              <div
                key={email.gmailMessageId}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#f7f7f5] border border-[#e8e8f0] hover:border-[#d4d4e8] transition-colors duration-150"
              >
                <div className="w-6 h-6 rounded-lg bg-[#eff4ff] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HiOutlineMail className="text-xs text-[#4f7ef7]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#1a1a2e] truncate">{email.subject}</p>
                  <p className="text-xs text-[#9098a9] truncate mt-0.5">{email.sender}</p>
                </div>
                <p className="text-xs text-[#9098a9] flex-shrink-0 mt-0.5 flex items-center gap-1">
                  <HiOutlineClock className="text-xs" />
                  {new Date(email.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {compact && (
          <p className="text-xs text-[#9098a9]">
            {verifyResult.sampleEmails?.length} emails sampled · Gmail API access confirmed
          </p>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════
  // STATE 2 — Connected, not yet verified
  // ════════════════════════════════════════════════
  return (
    <div className={`bg-white rounded-2xl border border-[#e8e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${compact ? 'p-5' : 'p-6'} animate-fade-in`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center flex-shrink-0">
            <HiOutlineMail className="text-xl text-[#4f7ef7]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Gmail</h3>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#4f7ef7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4f7ef7] animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-xs text-[#9098a9] mt-0.5">{status.gmailEmail}</p>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs py-2 border-b border-[#f0eff8]">
          <span className="text-[#9098a9] font-medium">Connection Status</span>
          <span className="text-[#16a34a] font-semibold flex items-center gap-1">
            <HiOutlineCheckCircle /> Active
          </span>
        </div>
        <div className="flex items-center justify-between text-xs py-2 border-b border-[#f0eff8]">
          <span className="text-[#9098a9] font-medium">Last Verified</span>
          <span className="text-[#1a1a2e] font-semibold">
            {status.lastVerifiedAt
              ? new Date(status.lastVerifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              : 'Never'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs py-2">
          <span className="text-[#9098a9] font-medium">Last Sync</span>
          <span className="text-[#1a1a2e] font-semibold">
            {status.lastSyncAt
              ? new Date(status.lastSyncAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              : 'Never'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {verifyError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
          <HiOutlineExclamationCircle className="text-red-400 text-base flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{verifyError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          id="gmail-verify-btn"
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center gap-2 bg-[#4f7ef7] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#3b6af0] transition-all duration-200 shadow-[0_4px_14px_rgba(79,126,247,0.25)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {verifying ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <HiOutlineLightningBolt className="text-base" />
              Verify Gmail Connection
            </>
          )}
        </button>
        <button
          id="gmail-reconnect-btn"
          onClick={handleConnect}
          className="text-xs text-[#9098a9] hover:text-[#4f7ef7] transition-colors duration-150 font-medium"
        >
          Reconnect
        </button>
      </div>
    </div>
  )
}
