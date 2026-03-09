export const formatDate = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

/**
 * Fixes mojibake encoding that appears when XLSX files are parsed with wrong
 * encoding (e.g. German umlauts showing as Ã¼ instead of ü).
 * Safe to call on any value – non-strings are returned unchanged.
 */
export const fixEncoding = (val) => {
  if (!val || typeof val !== 'string') return val;
  try {
    return decodeURIComponent(escape(val));
  } catch {
    return val;
  }
};
// formatTime now returns hours:minutes only; seconds are omitted per design.
export const formatTime = (totalSeconds) => {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const two = (n) => n.toString().padStart(2, '0');
  const hours = Math.floor(s / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  return `${two(hours)}:${two(mins)}`;
};
