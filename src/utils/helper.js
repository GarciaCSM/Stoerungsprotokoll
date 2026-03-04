export const formatDate = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};
// formatTime now returns hours:minutes only; seconds are omitted per design.
export const formatTime = (totalSeconds) => {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const two = (n) => n.toString().padStart(2, '0');
  const hours = Math.floor(s / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  return `${two(hours)}:${two(mins)}`;
};
