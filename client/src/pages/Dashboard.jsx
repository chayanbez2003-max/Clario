import { useUser, UserButton } from '@clerk/clerk-react'
import Sidebar from '../components/Sidebar'
import GmailConnectionCard from '../components/GmailConnectionCard'
import { useGmailStatus } from '../hooks/useGmailStatus'
import {
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineLightningBolt,
  HiOutlineBell,
} from 'react-icons/hi'

export default function Dashboard() {
  const { user } = useUser()
  const firstName = user?.firstName || 'there'

  const { status: gmailStatus, loading: gmailLoading, refetch: refetchGmail } = useGmailStatus()

  // Determine time of day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const statCards = [
    {
      id: 'last-sync',
      label: 'Last Sync',
      value: gmailStatus?.lastSyncAt
        ? new Date(gmailStatus.lastSyncAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : 'Never',
      iconBg: 'bg-[#f0fdf4]',
      iconColor: 'text-[#16a34a]',
      Icon: HiOutlineRefresh,
      badgeText: gmailStatus?.lastSyncAt ? 'Synced' : 'Never synced',
      badgeCls: gmailStatus?.lastSyncAt ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#f0eff8] text-[#9098a9]',
      dot: gmailStatus?.lastSyncAt ? 'bg-[#22c55e]' : 'bg-[#9098a9]',
    },
    {
      id: 'applications-count',
      label: 'Applications',
      value: '0',
      iconBg: 'bg-[#eff4ff]',
      iconColor: 'text-[#4f7ef7]',
      Icon: HiOutlineDocumentText,
      badgeText: 'No data yet',
      badgeCls: 'bg-[#eff4ff] text-[#4f7ef7]',
      dot: 'bg-[#4f7ef7]',
    },
    {
      id: 'emails-processed',
      label: 'Emails Processed',
      value: gmailStatus?.emailsProcessed ?? '—',
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#92400e]',
      Icon: HiOutlineChartBar,
      badgeText: 'Lifetime',
      badgeCls: 'bg-[#fef3c7] text-[#92400e]',
      dot: 'bg-[#f59e0b]',
    },
    {
      id: 'review-queue',
      label: 'Review Queue',
      value: '0',
      iconBg: 'bg-[#f0eff8]',
      iconColor: 'text-[#9098a9]',
      Icon: HiOutlineClipboardList,
      badgeText: 'Queue empty',
      badgeCls: 'bg-[#f0eff8] text-[#9098a9]',
      dot: 'bg-[#9098a9]',
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
          <div className="flex items-center gap-4">
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

          {/* Gmail connection card — live, always first */}
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
                <p className="text-xs text-[#9098a9] mt-0.5">Applications parsed from Gmail will appear here</p>
              </div>
              <span className="text-xs bg-[#f0eff8] text-[#9098a9] px-3 py-1 rounded-full font-medium">0 total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f7f7f5]">
                  <tr>
                    {['Company', 'Role', 'Status', 'Last Updated'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-[#9098a9] uppercase tracking-widest border-b border-[#e8e8f0]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f0eff8] flex items-center justify-center">
                          <HiOutlineDocumentText className="text-xl text-[#9098a9]" />
                        </div>
                        <p className="text-sm font-medium text-[#4a5568]">No applications yet</p>
                        <p className="text-xs text-[#9098a9]">
                          {gmailStatus?.connected
                            ? 'Verify your Gmail connection to start tracking'
                            : 'Connect Gmail to start auto-tracking applications'}
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Analytics placeholder */}
          <div
            id="analytics-placeholder"
            className="bg-white rounded-2xl border border-[#e8e8f0] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] animate-fade-in-up delay-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-[#1a1a2e]">Analytics Overview</h2>
                <p className="text-xs text-[#9098a9] mt-0.5">Charts and insights will appear after Gmail sync</p>
              </div>
              <HiOutlineChartBar className="text-xl text-[#9098a9]" />
            </div>
            <div className="h-40 rounded-xl bg-[#f7f7f5] border border-dashed border-[#d4d4e8] flex flex-col items-center justify-center gap-2">
              <HiOutlineChartBar className="text-2xl text-[#d4d4e8]" />
              <p className="text-xs text-[#9098a9]">Analytics coming soon</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
