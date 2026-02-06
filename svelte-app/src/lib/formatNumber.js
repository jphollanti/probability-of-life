/**
 * Format a number for display with English locale conventions.
 * Uses appropriate scale suffixes for readability.
 */
export function formatNumber(n) {
  if (n === null || n === undefined) return '-';
  if (isNaN(n)) return '-';
  if (!isFinite(n)) return '\u221e';

  const abs = Math.abs(n);
  const sign = n < 0 ? '\u2212' : '';

  if (abs === 0) return '0';
  if (abs < 0.01) return sign + abs.toExponential(1);
  if (abs < 1) return sign + abs.toFixed(2);
  if (abs < 1_000) return sign + abs.toFixed(1);
  if (abs < 1_000_000) return sign + Math.round(abs).toLocaleString('en-US');
  if (abs < 1_000_000_000) return sign + (abs / 1_000_000).toFixed(1) + ' million';
  if (abs < 1_000_000_000_000) return sign + (abs / 1_000_000_000).toFixed(2) + ' billion';
  if (abs < 1e15) return sign + (abs / 1_000_000_000_000).toFixed(2) + ' trillion';
  return sign + abs.toExponential(2);
}

/**
 * Format a number as an integer with thousand separators.
 */
export function formatInteger(n) {
  if (n === null || n === undefined) return '-';
  if (isNaN(n)) return '-';
  if (!isFinite(n)) return '\u221e';
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Format a compact number for tight spaces (floating header, inline ranges).
 * More aggressive abbreviation than formatNumber.
 */
export function formatCompact(n) {
  if (n === null || n === undefined) return '-';
  if (isNaN(n)) return '-';
  if (!isFinite(n)) return '\u221e';

  const abs = Math.abs(n);
  const sign = n < 0 ? '\u2212' : '';

  if (abs === 0) return '0';
  if (abs < 1) return sign + abs.toFixed(1);
  if (abs < 1_000) return sign + Math.round(abs).toString();
  if (abs < 1_000_000) return sign + (abs / 1_000).toFixed(1) + 'k';
  if (abs < 1_000_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs < 1_000_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B';
  return sign + abs.toExponential(1);
}

/**
 * Format a range as "lower — upper" using compact formatting.
 */
export function formatRange(lower, upper) {
  return `${formatCompact(lower)}\u2009\u2013\u2009${formatCompact(upper)}`;
}
