export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export const STATUS_LABELS = {
  pending: 'Pending',
  manager_review: 'Manager Review',
  finance_review: 'Finance Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_STAMP_CLASS = {
  pending: 'stamp-amber',
  manager_review: 'stamp-amber',
  finance_review: 'stamp-amber',
  approved: 'stamp-ledger',
  rejected: 'stamp-rust',
};