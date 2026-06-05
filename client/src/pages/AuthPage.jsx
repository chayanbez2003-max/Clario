import { SignIn, SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { HiOutlineLightningBolt } from 'react-icons/hi'

export default function AuthPage({ mode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] flex flex-col">
      {/* Top bar */}
      <div className="px-8 py-5 flex items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#4f7ef7] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <HiOutlineLightningBolt className="text-white text-base" />
          </div>
          <span className="text-[#1a1a2e] font-bold text-lg tracking-tight">Clario</span>
        </Link>
      </div>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[460px]">
          {/* Heading above Clerk card */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">
              {mode === 'sign-in' ? 'Welcome back' : 'Start tracking smarter'}
            </h1>
            <p className="text-sm text-[#9098a9]">
              {mode === 'sign-in'
                ? 'Sign in to access your dashboard.'
                : 'Create your free account — no credit card needed.'}
            </p>
          </div>

          {/* Clerk component */}
          {mode === 'sign-in' ? (
            <SignIn
              routing="hash"
              signUpUrl="/sign-up"
              afterSignInUrl="/dashboard"
              appearance={{
                layout: { socialButtonsPlacement: 'top', socialButtonsVariant: 'iconButton' },
                variables: {
                  colorPrimary: '#4f7ef7',
                  colorBackground: '#ffffff',
                  colorText: '#1a1a2e',
                  colorInputBackground: '#f7f7f5',
                  borderRadius: '10px',
                  fontFamily: 'Inter, sans-serif',
                },
              }}
            />
          ) : (
            <SignUp
              routing="hash"
              signInUrl="/sign-in"
              afterSignUpUrl="/dashboard"
              appearance={{
                layout: { socialButtonsPlacement: 'top', socialButtonsVariant: 'iconButton' },
                variables: {
                  colorPrimary: '#4f7ef7',
                  colorBackground: '#ffffff',
                  colorText: '#1a1a2e',
                  colorInputBackground: '#f7f7f5',
                  borderRadius: '10px',
                  fontFamily: 'Inter, sans-serif',
                },
              }}
            />
          )}

          {/* Toggle link */}
          <p className="text-center text-sm text-[#9098a9] mt-5">
            {mode === 'sign-in' ? (
              <>Don't have an account?{' '}
                <Link to="/sign-up" className="text-[#4f7ef7] font-semibold hover:underline">Sign up</Link>
              </>
            ) : (
              <>Already have an account?{' '}
                <Link to="/sign-in" className="text-[#4f7ef7] font-semibold hover:underline">Sign in</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
