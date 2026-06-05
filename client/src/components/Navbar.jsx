import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { HiOutlineLightningBolt } from 'react-icons/hi'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e8e8f0]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#4f7ef7] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <HiOutlineLightningBolt className="text-white text-base" />
          </div>
          <span className="text-[#1a1a2e] font-bold text-lg tracking-tight">Clario</span>
        </Link>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              to="/sign-in"
              className="text-sm font-medium text-[#4a5568] hover:text-[#4f7ef7] transition-colors duration-150 px-3 py-2 rounded-lg hover:bg-[#f0eff8]"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="text-sm font-semibold bg-[#4f7ef7] text-white px-4 py-2 rounded-lg hover:bg-[#3b6af0] transition-all duration-200 shadow-sm hover:shadow-[0_4px_20px_rgba(79,126,247,0.35)] hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </SignedOut>

          <SignedIn>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-[#4a5568] hover:text-[#4f7ef7] transition-colors duration-150 px-3 py-2 rounded-lg hover:bg-[#f0eff8]"
            >
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  )
}
