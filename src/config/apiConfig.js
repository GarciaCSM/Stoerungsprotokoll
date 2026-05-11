// API Configuration
// Für lokalen Windows-API-Server: localhost bleibt erhalten.
// Für Pi-Kontext: zwingend Pi-IP (kein localhost).
const USE_LOCALHOST = true;

// If USE_LOCALHOST is true the app will use localhost for the API
// (works when the device is connected and `adb reverse tcp:3001 tcp:3001` is active).
export const API_BASE_URL = USE_LOCALHOST
  ? 'http://localhost:3001/api'
  : 'http://192.168.10.152:3001/api'; // keine statische IP und PORT wurde noch nicht freigegeben (die kümmern sich anscheinend drum...)

// Sensor mapping per Linie/Bereich
// Werte können ein String (ein Sensor) oder ein Array (mehrere Sensoren) sein.
// Linie 1 -> sensor1.local (Produktiv Pi)
// Linie 2 -> Bereichsabhängig: Abfüllung / Verpackung (Verpackung hat 2 Sensoren)
// Linie 3 -> Testsensor localhost:5003
const SENSOR_MAPPING = {
  'Linie 1': 'http://sensor1.local:3000',
  'Linie 2': {
    default: 'http://localhost:5002',
    Abfüllung: 'http://sensor1.local:3000',
    Verpackung: ['http://localhost:5004', 'http://localhost:5005'],
  },
  'Linie 3': 'http://localhost:5003',
};

// Fallback URL (keep existing behaviour)
const DEFAULT_PI_SERVER = 'http://sensor1.local:3000';

// Try to resolve mDNS hostnames on-device using react-native-zeroconf.
// If the native module is not installed or resolution fails, we fall back
// to the static mapping above. This function returns the resolved URL
// (string) or the fallback mapping.
export const resolveMdnsHost = async (rawUrl, timeout = 2000) => {
  try {
    // Dynamic import so web builds don't fail.
    const Zeroconf = require('react-native-zeroconf');
    const zeroconf = new Zeroconf();

    const u = new URL(rawUrl);
    const hostname = u.hostname; // e.g. sensor1.local
    // Nur der Gerätename (ohne .local), zum Abgleich mit Bonjour host/name
    const wantedLabel = String(hostname || '')
      .replace(/\.local\.?$/i, '')
      .toLowerCase();

    const serviceMatchesWantedHost = (service) => {
      if (!wantedLabel) return true;
      const h = String(service?.host || '').replace(/\.$/, '').toLowerCase();
      const n = String(service?.name || '').toLowerCase();
      return (
        h === `${wantedLabel}.local` ||
        h.startsWith(`${wantedLabel}.`) ||
        n.includes(wantedLabel)
      );
    };

    return await new Promise((resolve) => {
      let resolved = null;
      // react-native-zeroconf: emit('resolved', service) — genau EIN Argument
      const onResolved = (service) => {
        try {
          if (!service || !serviceMatchesWantedHost(service)) return;
          const hosts = service.addresses || (service.host ? [service.host] : []);
          if (hosts && hosts.length) {
            const ip = hosts.find(h => h && h.indexOf(':') === -1) || hosts[0];
            if (ip) {
              resolved = `http://${ip}:${service.port || u.port || 80}`;
              resolve(resolved);
              try { zeroconf.removeListener('resolved', onResolved); } catch (e) {}
              try { zeroconf.stop(); } catch (e) {}
            }
          }
        } catch (_) {}
      };

      zeroconf.on('resolved', onResolved);
      // API: scan(type='http', protocol='tcp', domain='local.')
      zeroconf.scan('http', 'tcp', 'local.');

      setTimeout(() => {
        try { zeroconf.removeListener('resolved', onResolved); } catch (e) {}
        try { zeroconf.stop(); } catch (e) {}
        if (!resolved) resolve(null);
      }, timeout);
    });
  } catch (e) {
    // Native module not available or error — caller should fallback
    return null;
  }
};

export const getSensorUrlForLine = async (line, bereich = null) => {
  const urls = await getSensorUrlsForLine(line, bereich);
  return urls[0] || DEFAULT_PI_SERVER;
};

export const getSensorUrlsForLine = async (line, bereich = null) => {
  if (!line) return [DEFAULT_PI_SERVER];
  const mapped = SENSOR_MAPPING[line];
  if (!mapped) return [DEFAULT_PI_SERVER];

  const resolvedMapping = typeof mapped === 'object'
    ? (bereich && mapped[bereich]) || mapped.default || DEFAULT_PI_SERVER
    : mapped;

  const sensorUrls = Array.isArray(resolvedMapping) ? resolvedMapping : [resolvedMapping];
  const resolvedUrls = await Promise.all(sensorUrls.map(async (url) => {
    // Attempt mDNS resolution only for .local hostnames
    if (url.includes('.local')) {
      const resolved = await resolveMdnsHost(url).catch(() => null);
      return resolved || url; // if resolution failed, return original mDNS URL
    }
    return url;
  }));

  return resolvedUrls.filter(Boolean);
};

export const SENSOR_MAPPING_CONST = SENSOR_MAPPING;

// IONOS PHP-API base (für IST-Wert via DB)
export const IONOS_API_BASE = 'https://cosmetic-service.com/php-api/produktion';

/** true: Tablets laden SOLL-Karte direkt von IONOS (soll_hours.php). false: lokaler Node /api/soll-hours (z. B. mit adb reverse). */
const USE_IONOS_SOLL_HOURS = true;

/** true: FA-Suche und FA-Detail von IONOS (search-fa.php, fa.php) – gleiche Logik wie Node, ohne Windows-Server. */
const USE_IONOS_FA = true;

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: USE_IONOS_FA
    ? `${IONOS_API_BASE}/health.php`
    : `${API_BASE_URL}/health`,
  SEARCH_FA: USE_IONOS_FA
    ? `${IONOS_API_BASE}/search-fa.php`
    : `${API_BASE_URL}/search-fa`,
  GET_FA: USE_IONOS_FA
    ? (fanr) =>
        `${IONOS_API_BASE}/fa.php?fanr=${encodeURIComponent(String(fanr ?? ''))}`
    : (fanr) => `${API_BASE_URL}/fa/${encodeURIComponent(String(fanr ?? ''))}`,
  SOLL_HOURS: USE_IONOS_SOLL_HOURS
    ? `${IONOS_API_BASE}/soll_hours.php`
    : `${API_BASE_URL}/soll-hours`,
  /** Nur gesetzt wenn USE_IONOS_SOLL_HOURS – zweiter Versuch in fetchSollFromServer */
  SOLL_HOURS_FALLBACK: USE_IONOS_SOLL_HOURS ? `${API_BASE_URL}/soll-hours` : null,
  /** Zweiter Versuch in faService (lokaler Node), falls IONOS zeitweise nicht erreichbar */
  HEALTH_FALLBACK: USE_IONOS_FA ? `${API_BASE_URL}/health` : null,
  SEARCH_FA_FALLBACK: USE_IONOS_FA ? `${API_BASE_URL}/search-fa` : null,
  GET_FA_FALLBACK: USE_IONOS_FA
    ? (fanr) =>
        `${API_BASE_URL}/fa/${encodeURIComponent(String(fanr ?? ''))}`
    : null,
  TEST_IST:  `${API_BASE_URL}/test/ist`,
  // IST direkt aus IONOS-DB (kein lokaler Node-Server nötig)
  DB_IST: (linie, schicht, datum, bereich = null) => {
    let url = `${IONOS_API_BASE}/ist.php?linie=${encodeURIComponent(String(linie || ''))}&schicht=${encodeURIComponent(String(schicht || ''))}&datum=${encodeURIComponent(String(datum || ''))}`;
    if (bereich) {
      url += `&bereich=${encodeURIComponent(String(bereich))}`;
    }
    return url;
  }
};

// API Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Verbindungsfehler zum Server. Ist das Backend gestartet?',
  FA_NOT_FOUND: 'FA nicht gefunden oder Status ungültig (erlaubt: 30, 35, 36)',
  GENERAL_ERROR: 'Ein Fehler ist aufgetreten',
};
