import { useState } from 'react';
import { supabase } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Register({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      // Sign the new user in immediately, AuthContext picks up the session
      // automatically and routes into the dashboard.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="paper-tilt receipt-card enter-fade p-8 w-full max-w-sm">
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
        <p className="text-sm text-ink/60 mb-6">Create an account to get started.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full border border-slate px-3 py-2 mt-1 bg-card focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate px-3 py-2 mt-1 bg-card focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50">Password</label>
            <div className="mt-1">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          {error && <p className="text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full bg-clay text-paper py-2.5 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-6 text-center">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-clay underline hover:text-ink">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}