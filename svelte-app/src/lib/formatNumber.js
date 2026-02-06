/**
 * Format a number for display with Finnish locale conventions.
 * Uses appropriate scale suffixes for readability.
 */
export function formatNumber(n) {
  if (n === null || n === undefined) return '-';
  if (isNaN(n)) return '-';
  if (!isFinite(n)) return '∞';

  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';

  if (abs === 0) return '0';
  if (abs < 0.01) return sign + abs.toExponential(1);
  if (abs < 1) return sign + abs.toFixed(2);
  if (abs < 1_000) return sign + abs.toFixed(1);
  if (abs < 1_000_000) return sign + Math.round(abs).toLocaleString('fi-FI');
  if (abs < 1_000_000_000) return sign + (abs / 1_000_000).toFixed(1) + ' miljoonaa';
  if (abs < 1_000_000_000_000) return sign + (abs / 1_000_000_000).toFixed(2) + ' miljardia';
  if (abs < 1e15) return sign + (abs / 1_000_000_000_000).toFixed(2) + ' biljoonaa';
  return sign + abs.toExponential(2);
}

/**
 * Format a number as an integer with thousand separators.
 */
export function formatInteger(n) {
  if (n === null || n === undefined) return '-';
  if (isNaN(n)) return '-';
  if (!isFinite(n)) return '∞';
  return Math.round(n).toLocaleString('fi-FI');
}
