export function getMonthKey(dateStr) {
  return dateStr.slice(0, 7); // "2026-07"
}

export function getQuarterKey(dateStr) {
  const year = dateStr.slice(0, 4);
  const month = parseInt(dateStr.slice(5, 7), 10);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

export function getYearKey(dateStr) {
  return dateStr.slice(0, 4); // "2026"
}

export function getPeriodKey(dateStr, periodType) {
  if (!dateStr) return null;
  if (periodType === 'monthly') return getMonthKey(dateStr);
  if (periodType === 'quarterly') return getQuarterKey(dateStr);
  return getYearKey(dateStr);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatPeriodLabel(key, periodType) {
  if (periodType === 'monthly') {
    const [year, month] = key.split('-');
    return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
  }
  if (periodType === 'quarterly') {
    const [year, q] = key.split('-');
    return `${q} ${year}`;
  }
  return key;
}

export function matchesPeriod(dateStr, periodType, periodKey) {
  if (!dateStr) return false;
  return getPeriodKey(dateStr, periodType) === periodKey;
}