import {
  ScanLine, Sparkles, ShieldCheck, Workflow, Bell, BarChart3, ArrowRight, ChevronDown,
} from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import Reveal from '../components/Reveal';
import AnimatedNumber from '../components/AnimatedNumber';
import { useTilt } from '../hooks/useTilt';

const FEATURES = [
  { icon: ScanLine, title: 'OCR scanning', desc: 'Reads any receipt.' },
  { icon: Sparkles, title: 'AI categorization', desc: 'Sorts every claim.' },
  { icon: ShieldCheck, title: 'Fraud detection', desc: 'Flags what looks off.' },
  { icon: Workflow, title: 'Multi-level approval', desc: 'Routes to the right person.' },
  { icon: Bell, title: 'Live notifications', desc: 'Nobody waits in the dark.' },
  { icon: BarChart3, title: 'Analytics & reports', desc: 'Spend, sorted and exportable.' },
];

const STEPS = ['Submitted', 'Scanned', 'Reviewed', 'Approved'];

const STATS = [
  { value: 9, suffix: '', label: 'Modules' },
  { value: 4, suffix: '', label: 'User roles' },
  { value: 100, suffix: '%', label: 'AI reviewed' },
];

export default function LandingPage({ onGetStarted }) {
  const { ref, handleMouseMove, handleMouseLeave } = useTilt(10);

  return (
    <div className="min-h-screen bg-paper text-ink relative overflow-x-hidden">
      <AmbientBackground />

      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="brand-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span style={{ fontFamily: 'Fraunces, serif' }} className="text-xl">
            Ledger
          </span>
        </div>
        <button onClick={onGetStarted} className="btn-press text-sm px-4 py-2 border border-ink hover:bg-ink hover:text-paper transition-colors">
          Sign in
        </button>
      </nav>

      <section className="relative z-10 px-6 md:px-12 pt-10 md:pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
        <div className="enter-fade">
          <p className="font-mono text-xs uppercase tracking-widest text-clay mb-4">
            AI Expense Management
          </p>
          <h1
            style={{ fontFamily: 'Fraunces, serif' }}
            className="text-4xl md:text-6xl leading-[1.05] mb-6"
          >
            Receipts that file themselves.
          </h1>
          <p className="text-ink/60 text-lg mb-8 max-w-md">
            Snap a photo. AI reads it, checks it, routes it. Done in seconds.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onGetStarted}
              className="btn-press inline-flex items-center gap-2 px-6 py-3 bg-clay text-paper"
            >
              Get started <ArrowRight size={16} />
            </button>
            <a href="#features" className="text-sm text-ink/60 hover:text-ink underline">
              See how it works
            </a>
          </div>
        </div>

        <div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="hero-stack-wrap enter-fade"
          style={{ animationDelay: '0.15s' }}
        >
          <div className="hero-stack">
            <div className="card">
              <div className="lines">
                <span style={{ width: '70%' }}></span>
                <span style={{ width: '90%' }}></span>
                <span style={{ width: '55%' }}></span>
              </div>
            </div>
            <div className="card">
              <div className="lines">
                <span style={{ width: '80%' }}></span>
                <span style={{ width: '60%' }}></span>
                <span style={{ width: '75%' }}></span>
              </div>
            </div>
            <div className="card">
              <div className="lines">
                <span style={{ width: '65%' }}></span>
                <span style={{ width: '85%' }}></span>
                <span style={{ width: '50%' }}></span>
              </div>
            </div>
            <div className="card">
              <div className="lines">
                <span style={{ width: '75%' }}></span>
                <span style={{ width: '95%' }}></span>
                <span style={{ width: '60%' }}></span>
              </div>
              <span className="stamp text-clay absolute bottom-4 right-4 text-[0.6rem]">
                Verified
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 flex justify-center pb-10">
        <ChevronDown className="scroll-cue text-ink/30" size={22} />
      </div>

      <section className="relative z-10 px-6 md:px-12 pb-20 max-w-4xl mx-auto">
        <Reveal>
          <div className="grid grid-cols-3 gap-4 text-center">
            {STATS.map((s) => (
              <div key={s.label} className="paper-tilt receipt-card py-6">
                <p className="font-mono text-3xl text-clay">
                  <AnimatedNumber value={s.value} format={(v) => `${Math.round(v)}${s.suffix}`} />
                </p>
                <p className="text-xs text-ink/50 uppercase tracking-wide mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="features" className="relative z-10 px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <Reveal>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl md:text-3xl mb-14 text-center">
            Everything, handled.
          </h2>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="paper-tilt receipt-card p-5 h-full text-center">
                <f.icon size={26} className="text-clay mx-auto mb-3" />
                <h3 className="font-medium text-ink text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-ink/50">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 md:px-12 py-20 max-w-4xl mx-auto">
        <Reveal>
          <div className="step-flow">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3" style={{ flex: i < STEPS.length - 1 ? '1 1 auto' : '0 0 auto' }}>
                <span
                  className="stamp"
                  style={{
                    color: i === STEPS.length - 1 ? 'var(--color-clay)' : 'var(--color-ink)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                >
                  {step}
                </span>
                {i < STEPS.length - 1 && <div className="step-line"></div>}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 px-6 md:px-12 py-24 text-center">
        <Reveal>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl md:text-4xl mb-6">
            Ready to try it?
          </h2>
          <button
            onClick={onGetStarted}
            className="btn-press inline-flex items-center gap-2 px-7 py-3.5 bg-clay text-paper"
          >
            Sign in <ArrowRight size={16} />
          </button>
        </Reveal>
      </section>

      <footer className="relative z-10 px-6 md:px-12 py-8 border-t border-slate text-center">
        <p className="text-xs text-ink/40 font-mono">Ledger · AI Expense Management System</p>
      </footer>
    </div>
  );
}