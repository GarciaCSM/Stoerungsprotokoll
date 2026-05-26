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

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Kalendertag auf dem Gerät (YYYY-MM-DD) — Session/Störungen/IST-Abfrage am gleichen produktiven Tag wie die UI-Uhr. */
export function formatLocalDateYmd(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Epoch ms → MySQL DATETIME in lokaler Gerätezeit (kein UTC).
 * Wichtig: früher wurde toISOString() genutzt → 08:00 MESZ landete als 06:00 in der DB.
 */
export function epochMsToLocalMysqlDatetime(epochMs) {
  if (epochMs == null || epochMs === '') return null;
  const d = new Date(Number(epochMs));
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** Beliebiges Datum (Epoch, ISO, Date) → MySQL-DATETIME in lokaler Gerätezeit. */
export function dateValueToLocalMysqlDatetime(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return epochMsToLocalMysqlDatetime(d.getTime());
}
