import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/formatters';
import StatusStamp from '../components/StatusStamp';
import AnimatedNumber from '../components/AnimatedNumber';

export default function AdminDashboard() {
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const [claimsRes, usersRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*, employee:profiles!expenses_employee_id_fkey(full_name, role)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('full_name'),
      ]);

      if (claimsRes.error) setError(claimsRes.error.message);
      else setClaims(claimsRes.data);

      if (usersRes.error) setError(usersRes.error.message);
      else setUsers(usersRes.data);

      setLoading(false);
    }
    load();
  }, []);

  function exportCSV() {
    const headers = ['Employee', 'Merchant', 'Amount', 'Date', 'Category', 'Status', 'Fraud Score'];
    const rows = claims.map((c) => [
      c.employee?.full_name || '',
      c.merchant_name || '',
      c.amount,
      c.expense_date,
      c.category || '',
      c.status,
      c.fraud_score ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading…</p>;
  if (error) return <p className="text-rust text-sm">{error}</p>;

  const totalClaims = claims.length;
  const totalAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const flagged = claims.filter((c) => c.fraud_score > 0.5).length;

  return (
    <div className="space-y-10">
      <div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
          System overview
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="paper-tilt receipt-card p-4">
            <p className="text-xs text-ink/50 uppercase tracking-wide">Total claims</p>
            <p className="font-mono text-2xl"><AnimatedNumber value={totalClaims} /></p>
          </div>
          <div className="paper-tilt receipt-card p-4">
            <p className="text-xs text-ink/50 uppercase tracking-wide">Total value</p>
            <p className="font-mono text-2xl"><AnimatedNumber value={totalAmount} format={formatCurrency} /></p>
          </div>
          <div className="paper-tilt receipt-card p-4">
            <p className="text-xs text-ink/50 uppercase tracking-wide">Fraud flagged</p>
            <p className="font-mono text-2xl text-rust"><AnimatedNumber value={flagged} /></p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg">
            All claims
          </h2>
          <button onClick={exportCSV} className="text-sm px-3 py-1.5 border border-slate hover:bg-slate/20">
            Export CSV
          </button>
        </div>
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="receipt-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-ink font-medium">
                  {claim.employee?.full_name || 'Unknown'} · {claim.merchant_name || 'Merchant pending'}
                </p>
                <p className="text-sm text-ink/60">
                  {formatDate(claim.expense_date)} · {claim.category || 'Uncategorized'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-ink">{formatCurrency(claim.amount)}</span>
                <StatusStamp status={claim.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
          Users
        </h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm border-b border-slate py-2">
              <span>{u.full_name}</span>
              <span className="font-mono text-ink/60 uppercase text-xs">{u.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}