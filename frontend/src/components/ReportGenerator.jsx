import { useMemo, useState } from 'react';
import { formatCurrency } from '../lib/formatters';
import { getPeriodKey, formatPeriodLabel, matchesPeriod } from '../utils/periods';

const PERIOD_TYPES = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

export default function ReportGenerator({ claims }) {
  const [periodType, setPeriodType] = useState('monthly');

  const availablePeriods = useMemo(() => {
    const keys = new Set();
    claims.forEach((c) => {
      const key = getPeriodKey(c.expense_date, periodType);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort().reverse();
  }, [claims, periodType]);

  const [selectedPeriod, setSelectedPeriod] = useState(availablePeriods[0] || '');

  const effectivePeriod = availablePeriods.includes(selectedPeriod)
    ? selectedPeriod
    : availablePeriods[0] || '';

  const periodClaims = useMemo(() => {
    if (!effectivePeriod) return [];
    return claims.filter((c) => matchesPeriod(c.expense_date, periodType, effectivePeriod));
  }, [claims, periodType, effectivePeriod]);

  const totalAmount = periodClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const approvedAmount = periodClaims
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    periodClaims.forEach((c) => {
      const cat = c.category || 'Uncategorized';
      totals[cat] = (totals[cat] || 0) + (c.amount || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [periodClaims]);

  function exportPeriodCSV() {
    const headers = ['Employee', 'Merchant', 'Amount', 'Date', 'Category', 'Status', 'Fraud Score'];
    const rows = periodClaims.map((c) => [
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
    a.download = `expense-report-${effectivePeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (availablePeriods.length === 0) {
    return (
      <div className="receipt-card p-4">
        <p className="text-sm text-ink/50">No claims with dates yet to build a report from.</p>
      </div>
    );
  }

  return (
    <div className="receipt-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {PERIOD_TYPES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodType(p.key)}
              className={`btn-press text-xs px-3 py-1.5 border ${
                periodType === p.key
                  ? 'bg-ledger text-paper border-ledger'
                  : 'border-slate text-ink/60 hover:bg-slate/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <select
          value={effectivePeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-sm border border-slate px-2 py-1.5 bg-card font-mono"
        >
          {availablePeriods.map((key) => (
            <option key={key} value={key}>
              {formatPeriodLabel(key, periodType)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-ink/50 uppercase tracking-wide">Claims</p>
          <p className="font-mono text-xl">{periodClaims.length}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50 uppercase tracking-wide">Total value</p>
          <p className="font-mono text-xl">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50 uppercase tracking-wide">Approved & paid</p>
          <p className="font-mono text-xl text-ledger">{formatCurrency(approvedAmount)}</p>
        </div>
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-ink/50 uppercase tracking-wide mb-2">By category</p>
          <div className="space-y-1">
            {categoryBreakdown.map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-sm border-b border-slate/50 py-1">
                <span className="text-ink/70">{cat}</span>
                <span className="font-mono">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={exportPeriodCSV}
        disabled={periodClaims.length === 0}
        className="btn-press text-sm px-4 py-2 bg-ledger text-paper disabled:opacity-40"
      >
        Export {formatPeriodLabel(effectivePeriod, periodType)} CSV
      </button>
    </div>
  );
}