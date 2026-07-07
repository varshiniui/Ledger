import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SubmitExpenseForm from '../components/SubmitExpenseForm';
import ClaimsList from '../components/ClaimsList';
import ManagerDashboard from './ManagerDashboard';
import FinanceDashboard from './FinanceDashboard';
import AdminDashboard from './AdminDashboard';
import NotificationBell from '../components/NotificationBell';
export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSubmitted() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-slate px-6 py-4">
        <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl">
          Ledger
        </h1>
        <div className="flex items-center gap-4 text-sm">
  <span className="text-ink/60">{profile?.full_name} · {profile?.role}</span>
  <NotificationBell />
  <button onClick={signOut} className="text-ink/60 hover:text-ink underline">
    Sign out
  </button>
</div>
      </header>

      <main className="px-6 py-8">
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
      </main>
    </div>
  );
}