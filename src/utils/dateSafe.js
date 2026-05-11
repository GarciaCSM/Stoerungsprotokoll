/**
 * Konvertiert einen DB-/API-Zeitstempel zu ISO-UTC.
 * Ungültige Werte würden mit Date#toISOString einen RangeError werfen — das blockiert die App.
 */
export function toIsoUtcOrNow(value) {
  if (value == null || value === '') {
    return new Date().toISOString();
  }
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  if (!Number.isFinite(t)) {
    return new Date().toISOString();
  }
  return d.toISOString();
}
