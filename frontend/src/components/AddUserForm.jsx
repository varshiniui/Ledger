import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AddUserForm({ onCreated, lockRole }) {
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(lockRole || 'employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const effectiveRole = lockRole || role;

    try {
      const res = await fetch(`${API_URL}/api/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, password, full_name: fullName, role: effectiveRole }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create user');

      setSuccess(`${fullName} added as ${effectiveRole}.`);
      setFullName('');
      setEmail('');
      setPassword('');
      if (!lockRole) setRole('employee');
      if (onCreated) onCreated(body.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="receipt-card p-5 space-y-3 max-w-md">
      <h3 className="font-medium text-ink mb-1">Add a new user</h3>

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
        <label className="text-xs uppercase tracking-wide text-ink/50">Temporary password</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-slate px-3 py-2 mt-1 bg-card focus:outline-none focus:ring-1 focus:ring-clay"
        />
      </div>

      {lockRole ? (
        <div>
          <label className="text-xs uppercase tracking-wide text-ink/50">Role</label>
          <p className="font-mono text-sm mt-1 text-ink/70">{lockRole}</p>
        </div>
      ) : (
        <div>
          <label className="text-xs uppercase tracking-wide text-ink/50">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-slate px-3 py-2 mt-1 bg-card font-mono text-sm"
          >
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="finance">finance</option>
            <option value="hr">hr</option>
            <option value="admin">admin</option>
          </select>
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
      {success && <p className="text-sm text-ledger">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-press bg-clay text-paper px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Add user'}
      </button>
    </form>
  );
}