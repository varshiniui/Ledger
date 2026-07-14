import { useEffect, useState, useCallback } from 'react';
import { Wallet, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import StatusStamp from './StatusStamp';
import AnimatedNumber from './AnimatedNumber';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ClaimsList({ refreshKey }) {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setClaims(data);
      setError('');
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims, refreshKey]);

  async function handleDelete(claimId) {
    if (!window.confirm('Delete this claim? This cannot be undone.')) return;

    setDeletingId(claimId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/expenses/${claimId}?employee_id=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete claim');

      setClaims((prev) => prev.filter((c) => c.id !== claimId));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading claims…</p>;

  const totalAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingCount = claims.filter((c) => c.status === 'pending' || c.status === 'finance_review').length;
  const approvedCount = claims.filter((c) => c.status === 'approved').length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 stagger">
        <div className="paper-tilt receipt-card p-3">
          <Wallet size={16} className="text-ledger mb-1" />
          <p className="text-xs text-ink/50 uppercase tracking-wide">Total claimed</p>
          <p className="font-mono text-lg">
            <AnimatedNumber value={totalAmount} format={formatCurrency} />
          </p>
        </div>
        <div className="paper-tilt receipt-card p-3">
          <Clock size={16} className="text-amber mb-1" />
          <p className="text-xs text-ink/50 uppercase tracking-wide">In review</p>
          <p className="font-mono text-lg">
            <AnimatedNumber value={pendingCount} />
          </p>
        </div>
        <div className="paper-tilt receipt-card p-3">
          <CheckCircle2 size={16} className="text-ledger mb-1" />
          <p className="text-xs text-ink/50 uppercase tracking-wide">Approved</p>
          <p className="font-mono text-lg">
            <AnimatedNumber value={approvedCount} />
          </p>
        </div>
      </div>

      {error && <p className="text-rust text-sm mb-3">{error}</p>}

      {claims.length === 0 ? (
        <p className="text-ink/50 text-sm">No claims submitted yet.</p>
      ) : (
        <div className="space-y-3 stagger">
          {claims.map((claim) => (
            <div key={claim.id} className="receipt-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-ink font-medium">{claim.merchant_name || 'Merchant pending'}</p>
                <p className="text-sm text-ink/60">
                  {formatDate(claim.expense_date)} · {claim.category || 'Category pending'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-ink">{formatCurrency(claim.amount)}</span>
                <StatusStamp status={claim.status} />
                {claim.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(claim.id)}
                    disabled={deletingId === claim.id}
                    title="Delete claim"
                    className="p-1.5 text-ink/40 hover:text-rust rounded-full hover:bg-slate/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}