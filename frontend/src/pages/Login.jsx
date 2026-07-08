import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import AmbientBackground from '../components/AmbientBackground';
import { useTilt } from '../hooks/useTilt';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { ref, handleMouseMove, handleMouseLeave } = useTilt(8);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 relative">
      <AmbientBackground />

      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="tilt-card receipt-card enter-fade p-8 w-full max-w-sm relative z-10"
        style={{ boxShadow: '0 22px 40px -20px rgba(28, 35, 33, 0.35)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="brand-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl text-ink">
            Ledger
          </h1>
        </div>
        <p className="text-sm text-ink/60 mb-6">Sign in to submit and track expense claims.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate px-3 py-2 mt-1 bg-card focus:outline-none focus:ring-1 focus:ring-ledger"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50">Password</label>
            <div className="mt-1">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>

          {error && <p className="text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full bg-rust text-paper py-2.5 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}