import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import StatusStamp from '../components/StatusStamp';
import AnimatedNumber from '../components/AnimatedNumber';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [notes, setNotes] = useState({});

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*, employee:profiles!expenses_employee_id_fkey(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setClaims(data);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  async function handleDecision(claim, decision) {
    setActioningId(claim.id);

    const comment = notes[claim.id] || null;
    const newStatus = decision === 'approved' ? 'finance_review' : 'rejected';

    const { error: approvalError } = await supabase.from('approvals').insert({
      expense_id: claim.id,
      approver_id: user.id,
      decision,
      comment,
    });

    if (approvalError) {
      setError(approvalError.message);
      setActioningId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update({ status: newStatus })
      .eq('id', claim.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      if (decision === 'rejected') {
        await supabase.from('notifications').insert({
          user_id: claim.employee_id,
          message: `Your claim of ${formatCurrency(claim.amount)} was rejected by your manager.`,
        });
      }
      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
    }
    setActioningId(null);
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading claims…</p>;
  if (error) return <p className="text-rust text-sm">{error}</p>;

  const totalPendingAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div>
      <div className="paper-tilt receipt-card p-4 mb-6 inline-block">
        <p className="text-xs text-ink/50 uppercase tracking-wide">Awaiting your decision</p>
        <p className="font-mono text-2xl">
          <AnimatedNumber value={claims.length} /> claims · <AnimatedNumber value={totalPendingAmount} format={formatCurrency} />
        </p>
      </div>

      <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg mb-4">
        Pending approval
      </h2>

      {claims.length === 0 && (
        <p className="text-ink/50 text-sm">No claims waiting on your review.</p>
      )}

      <div className="space-y-4 stagger">
  
        {claims.map((claim) => (
          <div key={claim.id} className="receipt-card p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-ink font-medium">
                  {claim.employee?.full_name || 'Unknown employee'}
                </p>
                <p className="text-sm text-ink/60">
                  {claim.merchant_name || 'Merchant pending'} ·{' '}
                  {formatDate(claim.expense_date)} · {claim.category || 'Uncategorized'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-ink">{formatCurrency(claim.amount)}</span>
                <StatusStamp status={claim.status} />
              </div>
            </div>

            {claim.fraud_score > 0.3 && (
              <p className="text-xs text-rust mb-3">
                Fraud signal ({Math.round(claim.fraud_score * 100)}%): {claim.fraud_reason}
              </p>
            )}

            <input
              type="text"
              placeholder="Add a note (optional)"
              value={notes[claim.id] || ''}
              onChange={(e) => setNotes({ ...notes, [claim.id]: e.target.value })}
              className="w-full text-sm border border-slate px-2 py-1 mb-3"
              disabled={actioningId === claim.id}
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleDecision(claim, 'approved')}
                disabled={actioningId === claim.id}
                className="px-4 py-1.5 bg-ledger text-paper text-sm disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(claim, 'rejected')}
                disabled={actioningId === claim.id}
                className="px-4 py-1.5 border border-rust text-rust text-sm disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}