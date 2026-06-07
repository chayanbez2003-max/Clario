import { useState } from 'react'
import { useUser, useAuth, UserButton } from '@clerk/clerk-react'
import Sidebar from '../components/Sidebar'
import GmailConnectionCard from '../components/GmailConnectionCard'
import { useGmailStatus } from '../hooks/useGmailStatus'
import { useApplications } from '../hooks/useApplications'
import { useStageStatistics } from '../hooks/useStageStatistics'
import { triggerSync } from '../api/gmailApi'
import {
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineLightningBolt,
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi'

// ── Stage badge colours ───────────────────────────────────────────────────────
const STAGE_STYLES = {
  APPLIED:    { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  ASSESSMENT: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  INTERVIEW:  { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  OFFER:      { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400'  },
  REJECTED:   { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
  HIRED:      { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-400'},
  WITHDRAWN:  { bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  UNKNOWN:    { bg: 'bg-[#f0eff8]', text: 'text-[#9098a9]',  dot: 'bg-[#9098a9]'  },
}

function StageBadge({ stage }) {
  const s = STAGE_STYLES[stage] || STAGE_STYLES.UNKNOWN
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {stage || 'UNKNOWN'}
    </span>
  )
}

export default function Dashboard() {
  const { user }                   = useUser()
  console.log("Clerk User ID:", user?.id);
  const { userId }                 = useAuth()
  const firstName                  = user?.firstName || 'there'

  const { status: gmailStatus, loading: gmailLoading, refetch: refetchGmail } = useGmailStatus()
  const { applications, total, loading: appsLoading, refetch: refetchApps }  = useApplications()
  const { stats, refetch: refetchStats }                                       = useStageStatistics()

  const [syncing,     setSyncing]     = useState(false)
  const [syncResult,  setSyncResult]  = useState(null)
  const [syncError,   setSyncError]   = useState(null)

  // Determine time of day greeting
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // ── Sync handler ─────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!userId || syncing) return
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await triggerSync(userId)
      setSyncResult(res.data)
      // Refresh downstream data
      await Promise.all([refetchGmail(), refetchApps(), refetchStats()])
    } catch (err) {
      setSyncError(err?.response?.data?.message || 'Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  // ── Stat cards ────────────────────────────────────────────────────────────────
  const statCards = [
    {
      id:        'last-sync',
      label:     'Last Sync',
      value:     gmailStatus?.lastSyncAt
        ? new Date(gmailStatus.lastSyncAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : 'Never',
      iconBg:    'bg-[#f0fdf4]',
      iconColor: 'text-[#16a34a]',
      Icon:      HiOutlineRefresh,
      badgeText: gmailStatus?.lastSyncAt ? 'Synced' : 'Never synced',
      badgeCls:  gmailStatus?.lastSyncAt ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#f0eff8] text-[#9098a9]',
      dot:       gmailStatus?.lastSyncAt ? 'bg-[#22c55e]' : 'bg-[#9098a9]',
    },
    {
      id:        'applications-count',
      label:     'Applications',
      value:     total,
      iconBg:    'bg-[#eff4ff]',
      iconColor: 'text-[#4f7ef7]',
      Icon:      HiOutlineDocumentText,
      badgeText: total > 0 ? `${total} tracked` : 'No data yet',
      badgeCls:  'bg-[#eff4ff] text-[#4f7ef7]',
      dot:       'bg-[#4f7ef7]',
    },
    {
      id:        'emails-processed',
      label:     'Emails Processed',
      value:     gmailStatus?.emailsProcessed ?? '—',
      iconBg:    'bg-[#fef3c7]',
      iconColor: 'text-[#92400e]',
      Icon:      HiOutlineChartBar,
      badgeText: 'Lifetime',
      badgeCls:  'bg-[#fef3c7] text-[#92400e]',
      dot:       'bg-[#f59e0b]',
    },
    {
      id:        'interview-count',
      label:     'In Interview',
      value:     stats?.interview ?? '—',
      iconBg:    'bg-[#f5f0ff]',
      iconColor: 'text-[#7c3aed]',
      Icon:      HiOutlineClipboardList,
      badgeText: stats?.interview > 0 ? 'Active' : 'None yet',
      badgeCls:  stats?.interview > 0 ? 'bg-[#f5f0ff] text-[#7c3aed]' : 'bg-[#f0eff8] text-[#9098a9]',
      dot:       stats?.interview > 0 ? 'bg-[#7c3aed]' : 'bg-[#9098a9]',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex">
      <Sidebar />

      <div className="flex-1 ml-60 flex flex-col min-h-screen">

        {/* Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#e8e8f0] h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#4f7ef7] flex items-center justify-center">
              <HiOutlineLightningBolt className="text-white text-sm" />
            </div>
            <span className="font-bold text-[#1a1a2e] text-base tracking-tight">Clario</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Manual Sync button */}
            {gmailStatus?.connected && (
              <button
                id="manual-sync-btn"
                onClick={handleSync}
                disabled={syncing}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150
                  ${syncing
                    ? 'bg-[#f0eff8] text-[#9098a9] cursor-not-allowed'
                    : 'bg-[#4f7ef7] text-white hover:bg-[#3b6be8] shadow-sm hover:shadow-md'
                  }`}
              >
                <HiOutlineRefresh className={`text-sm ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            )}
            <button
              id="notifications-btn"
              className="w-9 h-9 rounded-xl bg-[#f0eff8] flex items-center justify-center text-[#9098a9] hover:bg-[#eeedfb] hover:text-[#4f7ef7] transition-all duration-150"
            >
              <HiOutlineBell className="text-lg" />
            </button>
            <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 py-8 max-w-6xl w-full mx-auto">

          {/* Welcome */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-[#9098a9]">
              Here's what's happening with your job search today.
            </p>
          </div>

          {/* Sync result / error banner */}
          {syncResult && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f0fdf4] border border-[#dcfce7] mb-6 animate-fade-in">
              <HiOutlineCheckCircle className="text-[#16a34a] text-lg flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#4a5568]">
                <p className="font-semibold text-[#16a34a] mb-1">Sync complete</p>
                <span className="font-medium">{syncResult.emailsScanned}</span> scanned &nbsp;·&nbsp;
                <span className="font-medium">{syncResult.noisyFiltered}</span> noise filtered &nbsp;·&nbsp;
                <span className="font-medium">{syncResult.successfullyProcessed}</span> saved &nbsp;·&nbsp;
                <span className="font-medium">{syncResult.duplicatesSkipped}</span> dupes skipped
              </div>
            </div>
          )}
          {syncError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 mb-6 animate-fade-in">
              <HiOutlineExclamationCircle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-medium">{syncError}</p>
            </div>
          )}

          {/* Gmail connection card */}
          <div className="mb-6 animate-fade-in-up delay-100">
            <GmailConnectionCard
              status={gmailStatus}
              loading={gmailLoading}
              onRefetch={refetchGmail}
              compact={true}
            />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map(({ id, label, value, iconBg, iconColor, Icon, badgeText, badgeCls, dot }, i) => (
              <div
                key={id}
                id={id}
                className="bg-white rounded-2xl border border-[#e8e8f0] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up"
                style={{ animationDelay: `${(i + 2) * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon className={`text-base ${iconColor}`} />
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {badgeText}
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#1a1a2e] mb-1">{value}</p>
                <p className="text-xs text-[#9098a9] font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Applications table */}
          <div className="bg-white rounded-2xl border border-[#e8e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] mb-6 animate-fade-in-up delay-200">
            <div className="px-6 py-4 border-b border-[#e8e8f0] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#1a1a2e]">Recent Applications</h2>
                <p className="text-xs text-[#9098a9] mt-0.5">Grouped by company and role from your Gmail</p>
              </div>
              <span className="text-xs bg-[#f0eff8] text-[#9098a9] px-3 py-1 rounded-full font-medium">
                {appsLoading ? '…' : `${total} total`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f7f7f5]">
                  <tr>
                    {['Company', 'Role', 'Stage', 'Emails', 'Last Update'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-[#9098a9] uppercase tracking-widest border-b border-[#e8e8f0]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appsLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-[#9098a9]">Loading…</td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#f0eff8] flex items-center justify-center">
                            <HiOutlineDocumentText className="text-xl text-[#9098a9]" />
                          </div>
                          <p className="text-sm font-medium text-[#4a5568]">No applications yet</p>
                          <p className="text-xs text-[#9098a9]">
                            {gmailStatus?.connected
                              ? 'Click "Sync Now" to start tracking'
                              : 'Connect Gmail to start auto-tracking applications'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app._id} className="border-t border-[#f0eff8] hover:bg-[#fafafa] transition-colors duration-100">
                        <td className="px-6 py-3 text-sm font-semibold text-[#1a1a2e]">{app.company || '—'}</td>
                        <td className="px-6 py-3 text-sm text-[#4a5568]">{app.role || <span className="text-[#9098a9] italic">Unknown</span>}</td>
                        <td className="px-6 py-3"><StageBadge stage={app.currentStage} /></td>
                        <td className="px-6 py-3 text-sm text-[#9098a9]">{app.emailCount}</td>
                        <td className="px-6 py-3 text-xs text-[#9098a9]">
                          {app.lastEmailDate
                            ? new Date(app.lastEmailDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pipeline funnel */}
          {stats && stats.total > 0 && (
            <div
              id="pipeline-funnel"
              className="bg-white rounded-2xl border border-[#e8e8f0] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] animate-fade-in-up delay-300"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-[#1a1a2e]">Pipeline Overview</h2>
                  <p className="text-xs text-[#9098a9] mt-0.5">{stats.total} applications tracked</p>
                </div>
                <HiOutlineChartBar className="text-xl text-[#9098a9]" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Applied',    count: stats.applied,    color: 'bg-blue-400'   },
                  { label: 'Assessment', count: stats.assessment, color: 'bg-amber-400'  },
                  { label: 'Interview',  count: stats.interview,  color: 'bg-purple-400' },
                  { label: 'Offer',      count: stats.offer,      color: 'bg-green-400'  },
                  { label: 'Hired',      count: stats.hired,      color: 'bg-emerald-400'},
                  { label: 'Rejected',   count: stats.rejected,   color: 'bg-red-400'    },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#f7f7f5]">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-lg font-bold text-[#1a1a2e]">{count}</span>
                    <span className="text-xs text-[#9098a9] text-center">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
