import { NavLink } from 'react-router-dom'
import {
  HiOutlineViewGrid,
  HiOutlineMail,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineLightningBolt,
} from 'react-icons/hi'

const navItems = [
  { to: '/dashboard',           icon: HiOutlineViewGrid,  label: 'Applications' },
  { to: '/dashboard/gmail',     icon: HiOutlineMail,      label: 'Gmail Sync'   },
  { to: '/dashboard/analytics', icon: HiOutlineChartBar,  label: 'Analytics'    },
  { to: '/dashboard/settings',  icon: HiOutlineCog,       label: 'Settings'     },
]

export default function Sidebar() {
  return (
    <aside className="fixed top-16 left-0 bottom-0 w-60 bg-white border-r border-[#e8e8f0] flex flex-col z-40">
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-[#e8e8f0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#4f7ef7] flex items-center justify-center">
            <HiOutlineLightningBolt className="text-white text-sm" />
          </div>
          <span className="text-[#1a1a2e] font-bold text-base tracking-tight">Clario</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#eff4ff] text-[#4f7ef7]'
                  : 'text-[#4a5568] hover:bg-[#f0eff8] hover:text-[#1a1a2e]'
              }`
            }
          >
            <Icon className="text-lg flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#e8e8f0]">
        <p className="text-xs text-[#9098a9]">Clario v1.0 · Beta</p>
      </div>
    </aside>
  )
}
