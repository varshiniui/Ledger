import { useEffect, useState, useCallback } from 'react';
import { Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import StatusStamp from './StatusStamp';
import AnimatedNumber from './AnimatedNumber';

export default function ClaimsList({ refreshKey }) {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <p className="text-ink/50 text-sm">Loading claims…</p>;
  if (error) return <p className="text-rust text-sm">Failed to load claims: {error}</p>;

  const totalAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingCount = claims.filter((c) => c.status === 'pending' || c.status === 'finance_review').length;
  const approvedCount = claims.filter((c) => c.status === 'approved').length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6 stagger">
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

      {claims.length === 0 ? (
        <p className="text-ink/50 text-sm">No claims submitted yet.</p>
      ) : (
        <div className="space-y-3 stagger">
          {claims.map((claim) => (
            <div key={claim.id} className="receipt-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-ink font-medium">{claim.merchant_name || 'Merchant pending'}</p>
                <p className="text-sm text-ink/60">
                  {formatDate(claim.expense_date)} · {claim.category || 'Category pending'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-ink">{formatCurrency(claim.amount)}</span>
                <StatusStamp status={claim.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}