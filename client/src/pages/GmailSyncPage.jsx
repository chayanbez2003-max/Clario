import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  HiOutlineMail,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineLightningBolt,
} from 'react-icons/hi'
import Sidebar from '../components/Sidebar'
import GmailConnectionCard from '../components/GmailConnectionCard'
import { useGmailStatus } from '../hooks/useGmailStatus'
import { UserButton } from '@clerk/clerk-react'

export default function GmailSyncPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { status, loading, error, refetch } = useGmailStatus()

  const connectedParam = searchParams.get('connected')
  const errorParam     = searchParams.get('error')

  // After OAuth redirect, refetch status and clean up URL params
  useEffect(() => {
    if (connectedParam === 'true') {
      refetch()
      // Remove the query param to keep URL clean
      setSearchParams({}, { replace: true })
    }
  }, [connectedParam])

  const errorMessages = {
    access_denied:    'You cancelled the Gmail connection. Click Connect Gmail to try again.',
    no_refresh_token: 'Google didn\'t return a refresh token. Please try connecting again.',
    invalid_callback: 'Something went wrong with the OAuth callback. Please try again.',
    callback_failed:  'Connection failed on the server. Please try again.',
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex">
      <Sidebar />

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#e8e8f0] h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#4f7ef7] flex items-center justify-center">
              <HiOutlineLightningBolt className="text-white text-sm" />
            </div>
            <span className="font-bold text-[#1a1a2e] text-base tracking-tight">Clario</span>
          </div>
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </header>

        <main className="flex-1 px-8 py-8 max-w-3xl w-full mx-auto">

          {/* Page title */}
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                <HiOutlineMail className="text-lg text-[#4f7ef7]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">Gmail Sync</h1>
            </div>
            <p className="text-sm text-[#9098a9] ml-12">
              Connect and verify your Gmail account to start tracking job applications.
            </p>
          </div>

          {/* OAuth error banner */}
          {errorParam && errorMessages[errorParam] && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 mb-6 animate-fade-in">
              <HiOutlineExclamationCircle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Connection failed</p>
                <p className="text-xs text-red-500 mt-0.5">{errorMessages[errorParam]}</p>
              </div>
            </div>
          )}

          {/* OAuth success banner */}
          {connectedParam === 'true' && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f0fdf4] border border-[#dcfce7] mb-6 animate-fade-in">
              <HiOutlineCheckCircle className="text-[#16a34a] text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#16a34a]">Gmail connected successfully!</p>
                <p className="text-xs text-[#9098a9] mt-0.5">
                  Now click "Verify Gmail Connection" to confirm API access.
                </p>
              </div>
            </div>
          )}

          {/* Main card */}
          <div className="animate-fade-in-up delay-100">
            {error ? (
              <div className="p-6 bg-white rounded-2xl border border-[#e8e8f0] text-center">
                <HiOutlineExclamationCircle className="text-2xl text-red-300 mx-auto mb-2" />
                <p className="text-sm text-[#4a5568]">{error}</p>
                <button
                  onClick={refetch}
                  className="mt-3 text-xs text-[#4f7ef7] hover:underline font-medium"
                >
                  Retry
                </button>
              </div>
            ) : (
              <GmailConnectionCard
                status={status}
                loading={loading}
                onRefetch={refetch}
                compact={false}
              />
            )}
          </div>

          {/* Architecture info box */}
          <div className="mt-6 p-4 rounded-2xl bg-[#f7f7f5] border border-[#e8e8f0] animate-fade-in-up delay-200">
            <p className="text-xs font-semibold text-[#9098a9] uppercase tracking-wider mb-3">
              What happens when you connect?
            </p>
            <div className="space-y-2.5">
              {[
                { icon: HiOutlineMail,         text: 'Gmail access is granted with read-only permissions' },
                { icon: HiOutlineCheckCircle,  text: 'Your refresh token is securely stored (never exposed)' },
                { icon: HiOutlineLightningBolt, text: 'Verification fetches 5 email metadata samples — no content stored' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <Icon className="text-sm text-[#4f7ef7] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#4a5568]">{text}</p>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
