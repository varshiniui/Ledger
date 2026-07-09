import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SubmitExpenseForm from '../components/SubmitExpenseForm';
import ClaimsList from '../components/ClaimsList';
import ManagerDashboard from './ManagerDashboard';
import FinanceDashboard from './FinanceDashboard';
import AdminDashboard from './AdminDashboard';
import HRDashboard from './HRDashboard';
import NotificationBell from '../components/NotificationBell';
import AmbientBackground from '../components/AmbientBackground';

const ROLE_COLORS = {
  employee: 'var(--color-slate)',
  manager: 'var(--color-amber)',
  finance: 'var(--color-ledger)',
  admin: 'var(--color-rust)',
  hr: 'var(--color-clay)',
};

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSubmitted() {
    setRefreshKey((k) => k + 1);
  }

  const roleColor = ROLE_COLORS[profile?.role] || 'var(--color-ink)';

  return (
    <div className="min-h-screen bg-paper text-ink relative">
      <AmbientBackground variant="subtle" />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-y-3 border-b border-slate px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 header-underline inline-block">
          <div className="brand-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl">
            Ledger
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-sm flex-wrap">
          <span className="hidden sm:inline text-ink/60">{profile?.full_name}</span>
          {profile?.role && (
            <span className="role-chip" style={{ color: roleColor }}>
              {profile.role}
            </span>
          )}
          <NotificationBell />
          <button onClick={signOut} className="text-ink/60 hover:text-ink underline">
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 px-4 sm:px-6 py-8 enter-fade">
        {!profile && <p>Loading profile…</p>}

        {profile?.role === 'employee' && (
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
            <SubmitExpenseForm onSubmitted={handleSubmitted} />
            <div>
              <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
                Your claims
              </h2>
              <ClaimsList refreshKey={refreshKey} />
            </div>
          </div>
        )}

        {profile?.role === 'manager' && <ManagerDashboard />}
        {profile?.role === 'finance' && <FinanceDashboard />}
        {profile?.role === 'admin' && <AdminDashboard />}
        {profile?.role === 'hr' && <HRDashboard />}
      </main>
    </div>
  );
}