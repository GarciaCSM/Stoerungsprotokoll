// Reine Erreichbarkeits-Prüfung für den Pi-Sensor.
// Pingt `GET /context` mit kurzem Timeout und sagt nur, OB der Sensor online ist.
// Die Belegt-Logik (welche Linie/Station gerade produziert) läuft separat über die DB.

import { getSensorUrlsForLine } from '../config/apiConfig';

export const SENSOR_PROBE_TIMEOUT_MS = 4500;
export const SENSOR_RETRY_INTERVAL_MS = 10_000;
export const SENSOR_UNREACHABLE_MESSAGE =
  'Sensor nicht erreichbar. Neuer Versuch alle 10 Sekunden.';

async function pingSensor(baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!base) return false;
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), SENSOR_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/context`, {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timerId);
  }
}

/** Mindestens ein zur Linie/Bereich gehörender Sensor antwortet. */
export async function probeSensorReachable(line, bereich) {
  if (!line) return false;
  let targets = [];
  try {
    targets = await getSensorUrlsForLine(line, bereich);
  } catch {
    return false;
  }
  if (!targets.length) return false;
  const results = await Promise.all(targets.map((url) => pingSensor(url)));
  return results.some(Boolean);
}
