// "YYYY-MM-DD" of the phone's local day (stored timestamps are UTC).
export function localDay(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The local day `days` calendar days before `date` (DST-safe: calendar maths, not ms).
export function daysBefore(date, days) {
  const d = new Date(date);
  return localDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - days));
}
