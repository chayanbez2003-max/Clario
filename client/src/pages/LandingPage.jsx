import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  HiOutlineMail,
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineLightningBolt,
  HiOutlineChartBar,
  HiArrowRight,
} from 'react-icons/hi'

const features = [
  {
    icon: HiOutlineMail,
    title: 'Gmail Sync',
    desc: 'Securely connect your Gmail and let Clario do the heavy lifting — no manual entry ever.',
    color: 'bg-[#eff4ff] text-[#4f7ef7]',
  },
  {
    icon: HiOutlineLightningBolt,
    title: 'Auto Tracking',
    desc: 'Recruiter emails are parsed in real time and job applications are logged instantly.',
    color: 'bg-[#f0fdf4] text-[#16a34a]',
  },
  {
    icon: HiOutlineChartBar,
    title: 'Smart Status Detection',
    desc: 'Applied → Interviewing → Offer → Rejected — tracked automatically from email content.',
    color: 'bg-[#fef3c7] text-[#92400e]',
  },
]

const stats = [
  { value: '2,400+', label: 'Applications tracked' },
  { value: '98%',   label: 'Email accuracy' },
  { value: '0',     label: 'Manual entry needed' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] font-[Inter,sans-serif]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#eff4ff] text-[#4f7ef7] text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-[#bfd3fb] animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4f7ef7] animate-pulse-dot" />
            Gmail-powered · Auto-tracking · Built for students
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1a2e] leading-tight tracking-tight mb-6 animate-fade-in-up">
            Track every job<br />
            <span className="text-[#4f7ef7]">application</span>, automatically.
          </h1>

          <p className="text-lg md:text-xl text-[#4a5568] max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-100">
            Clario connects to your Gmail, reads recruiter emails, and keeps your application
            dashboard updated — so you never miss an opportunity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
            <Link
              to="/sign-up"
              id="hero-get-started"
              className="inline-flex items-center gap-2 bg-[#4f7ef7] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#3b6af0] transition-all duration-200 shadow-[0_4px_20px_rgba(79,126,247,0.3)] hover:shadow-[0_6px_28px_rgba(79,126,247,0.42)] hover:-translate-y-0.5 text-base"
            >
              Get Started Free
              <HiArrowRight className="text-lg" />
            </Link>
            <Link
              to="/sign-in"
              id="hero-sign-in"
              className="inline-flex items-center gap-2 bg-white text-[#1a1a2e] font-semibold px-8 py-3.5 rounded-xl border border-[#d4d4e8] hover:bg-[#eeedfb] hover:border-[#bfd3fb] transition-all duration-200 text-base hover:-translate-y-0.5"
            >
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in delay-300">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-[#1a1a2e] tracking-tight">{s.value}</p>
                <p className="text-sm text-[#9098a9] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual mockup strip ── */}
      <div className="w-full overflow-hidden py-2 border-y border-[#e8e8f0] bg-white/60">
        <div className="flex items-center gap-8 px-6 max-w-5xl mx-auto">
          {['Applied', 'Interviewing', 'Offer Received', 'Rejected', 'In Review'].map((s, i) => (
            <span
              key={s}
              className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                i === 0 ? 'bg-[#eff4ff] text-[#4f7ef7]'
                : i === 1 ? 'bg-[#fef3c7] text-[#92400e]'
                : i === 2 ? 'bg-[#f0fdf4] text-[#16a34a]'
                : i === 3 ? 'bg-red-50 text-red-500'
                : 'bg-[#f0eff8] text-[#9098a9]'
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-[#4a5568] text-lg max-w-xl mx-auto">
              Built specifically for students juggling dozens of applications at once.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={title}
                className={`bg-white rounded-2xl border border-[#e8e8f0] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)] hover:-translate-y-1 transition-all duration-200 animate-fade-in-up`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="text-xl" />
                </div>
                <h3 className="text-base font-semibold text-[#1a1a2e] mb-2">{title}</h3>
                <p className="text-sm text-[#4a5568] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto bg-[#4f7ef7] rounded-3xl p-12 text-center shadow-[0_8px_40px_rgba(79,126,247,0.35)]">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to stop losing track?</h2>
          <p className="text-white/80 text-base mb-8">
            Connect Gmail and let Clario handle the tracking — for free.
          </p>
          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 bg-white text-[#4f7ef7] font-bold px-8 py-3.5 rounded-xl hover:bg-[#f0eff8] transition-all duration-200 text-base shadow-sm hover:-translate-y-0.5"
          >
            Start for Free <HiArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-[#e8e8f0] text-center">
        <p className="text-sm text-[#9098a9]">
          © 2024 Clario · Made with ♥ for students
        </p>
      </footer>
    </div>
  )
}
