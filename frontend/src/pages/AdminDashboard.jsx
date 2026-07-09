import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/formatters';
import StatusStamp from '../components/StatusStamp';
import AnimatedNumber from '../components/AnimatedNumber';
import ReportGenerator from '../components/ReportGenerator';
import AddUserForm from '../components/AddUserForm';

const CHART_COLORS = ['#33502F', '#B98330', '#9B3F27', '#7A9471', '#C7BFA9', '#5C6B58', '#D4A857', '#8B5A3C'];

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

  async function handleRoleChange(userId, newRole) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      setError(error.message);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    }
  }

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

  const categoryData = useMemo(() => {
    const totals = {};
    claims.forEach((c) => {
      const cat = c.category || 'Uncategorized';
      totals[cat] = (totals[cat] || 0) + (c.amount || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [claims]);

  const monthlyData = useMemo(() => {
    const totals = {};
    claims.forEach((c) => {
      if (!c.expense_date) return;
      const month = c.expense_date.slice(0, 7);
      totals[month] = (totals[month] || 0) + (c.amount || 0);
    });
    return Object.entries(totals)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [claims]);

  const statusData = useMemo(() => {
    const totals = {};
    claims.forEach((c) => {
      totals[c.status] = (totals[c.status] || 0) + 1;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [claims]);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {claims.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
            Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="paper-tilt receipt-card p-4">
              <p className="text-xs text-ink/50 uppercase tracking-wide mb-3">Spend by category</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="paper-tilt receipt-card p-4">
              <p className="text-xs text-ink/50 uppercase tracking-wide mb-3">Claims by status</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-ledger)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {monthlyData.length > 1 && (
              <div className="paper-tilt receipt-card p-4 lg:col-span-2">
                <p className="text-xs text-ink/50 uppercase tracking-wide mb-3">Spend over time</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--color-amber)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-amber)', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
          Reports
        </h2>
        <ReportGenerator claims={claims} />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg">
            All claims
          </h2>
          <button onClick={exportCSV} className="btn-press text-sm px-3 py-1.5 border border-slate hover:bg-slate/20">
            Export CSV
          </button>
        </div>
        <div className="space-y-3 stagger">
          {claims.map((claim) => (
            <div key={claim.id} className="receipt-card p-4 flex flex-wrap items-center justify-between gap-3">
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
        <AddUserForm onCreated={(newUser) => setUsers((prev) => [...prev, newUser])} />
        <div className="space-y-2 mt-6">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-slate py-2">
              <span>{u.full_name}</span>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="font-mono text-xs uppercase border border-slate px-2 py-1 bg-card"
              >
                <option value="employee">employee</option>
                <option value="manager">manager</option>
                <option value="finance">finance</option>
                <option value="hr">hr</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}