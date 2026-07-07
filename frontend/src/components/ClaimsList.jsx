import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import StatusStamp from './StatusStamp';

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
  if (claims.length === 0) return <p className="text-ink/50 text-sm">No claims submitted yet.</p>;

  return (
    <div className="space-y-3">
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
  );
}