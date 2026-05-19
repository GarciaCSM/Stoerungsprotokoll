// API Configuration
// Für lokalen Windows-API-Server: localhost bleibt erhalten.
// Für Pi-Kontext: zwingend Pi-IP (kein localhost).
const USE_LOCALHOST = true;

/** Lokaler Node-Server (adb reverse tcp:3001 beim USB-Dev). */
export const LOCAL_DEV_SERVER = 'http://localhost:3001';

// If USE_LOCALHOST is true the app will use localhost for the API
// (works when the device is connected and `adb reverse tcp:3001 tcp:3001` is active).
export const API_BASE_URL = USE_LOCALHOST
  ? `${LOCAL_DEV_SERVER}/api`
  : 'http://192.168.10.152:3001/api'; // keine statische IP und PORT wurde noch nicht freigegeben (die kümmern sich anscheinend drum...)

/**
 * USB-Dev (__DEV__): IONOS über lokalen Proxy (server.js /ionos-proxy) – kein CORS, gleicher Host wie FA-Fallback.
 * Release-APK: direkt https://cosmetic-service.com/…
 */
export const USE_IONOS_VIA_LOCAL_PROXY =
  USE_LOCALHOST && typeof __DEV__ !== 'undefined' && __DEV__;

// Sensor mapping per Linie/Bereich
// Werte können ein String (ein Sensor) oder ein Array (mehrere Sensoren) sein.
// Linie 1 -> Bereichsabhängig: Abfüllung / Verpackung
// Linie 2 -> Bereichsabhängig (Verpackung: 2× Pi). Abfüllung: Pi erwartet Kontext "Linie 1" –
// siehe resolvePiSensorBridge / getSensorUrlsForLine (Tablet bleibt Linie 2 für DB/UI).
// Linie 3 -> Testsensor localhost:5003
const SENSOR_MAPPING = {
  'Linie 1': {
    default: 'http://192.168.10.78:3000',
    Abfüllung: 'http://192.168.10.78:3000',
    Verpackung: 'http://192.168.10.25:3000',
  },
  'Linie 2': {
    default: 'http://localhost:5002',
    Abfüllung: 'http://192.168.10.78:3000',
    Verpackung: ['http://192.168.2.53:3000', 'http://192.168.10.26:3000'],
  },
  'Linie 3': {
    default: 'http://192.168.10.25:3000',
    Abfüllung: 'http://192.168.10.25:3000',
    Verpackung: 'http://localhost:5003',
  },
};

// Fallback URL (keep existing behaviour)
const DEFAULT_PI_SERVER = 'http://sensor1.local:3000';

/**
 * Feste IPs, wenn `sensorX.local` im Tablet-WLAN nicht aufgelöst wird.
 * Keys = Hostname aus der URL (case-insensitive). Produktion: echte Pi-IPs eintragen.
 */
export const SENSOR_HOST_OVERRIDES = {
  // 'sensor1.local': '192.168.10.40',
  // optional, falls wieder Hostname-URL: 'csm-pi-2.local': '192.168.2.53',
};

function applySensorHostOverride(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const u = new URL(rawUrl);
    const ip = SENSOR_HOST_OVERRIDES[u.hostname.toLowerCase()];
    if (ip && String(ip).trim()) {
      const next = new URL(rawUrl);
      next.hostname = String(ip).trim();
      return next.href.replace(/\/$/, '');
    }
  } catch (_) { /* ignore */ }
  return rawUrl;
}

// Zeroconf: npm-Paket react-native-zeroconf@0.14.x (mit dist/). Bei Problemen
// SENSOR_HOST_OVERRIDES nutzen oder ENABLE_ZEROCONF = false (nur natives .local).
const ENABLE_ZEROCONF = true;

export const resolveMdnsHost = async (rawUrl, timeout = 4000) => {
  if (!ENABLE_ZEROCONF) return null;

  try {
    const Zeroconf = require('react-native-zeroconf');
    const ZeroconfClass = (Zeroconf && Zeroconf.default) || Zeroconf;
    if (typeof ZeroconfClass !== 'function') return null;
    const zeroconf = new ZeroconfClass();

    const u = new URL(rawUrl);
    const hostname = u.hostname;
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
      zeroconf.scan('http', 'tcp', 'local.');

      setTimeout(() => {
        try { zeroconf.removeListener('resolved', onResolved); } catch (e) {}
        try { zeroconf.stop(); } catch (e) {}
        if (!resolved) resolve(null);
      }, timeout);
    });
  } catch (e) {
    return null;
  }
};

/**
 * Pi/Sensor erwartet ggf. andere Linie im JSON als am Tablet (DB/UI unverändert).
 * @returns {{ urlLine: string|null|undefined, urlBereich: string|null|undefined, contextLinie: string|null|undefined }}
 */
export function resolvePiSensorBridge(tabletLine, bereich = null) {
  if (tabletLine == null || tabletLine === '') {
    return { urlLine: tabletLine, urlBereich: bereich, contextLinie: tabletLine };
  }
  const lineStr = String(tabletLine);
  const b = bereich != null && bereich !== '' ? String(bereich) : '';
  if (lineStr === 'Linie 2' && b === 'Abfüllung') {
    return {
      urlLine: 'Linie 1',
      urlBereich: 'Abfüllung',
      contextLinie: 'Linie 1',
    };
  }
  return { urlLine: lineStr, urlBereich: bereich, contextLinie: lineStr };
}

/** Override (.local → IP) + optional Zeroconf für eine Sensor-URL. */
async function finalizeSensorUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let u = applySensorHostOverride(url);
  if (u.includes('.local')) {
    const resolved = await resolveMdnsHost(u).catch(() => null);
    u = resolved || u;
  }
  return u;
}

export const getSensorUrlForLine = async (line, bereich = null) => {
  const urls = await getSensorUrlsForLine(line, bereich);
  return urls[0] || DEFAULT_PI_SERVER;
};

export const getSensorUrlsForLine = async (line, bereich = null) => {
  try {
    const { urlLine, urlBereich } = resolvePiSensorBridge(line, bereich);
    if (!urlLine) {
      const u = await finalizeSensorUrl(DEFAULT_PI_SERVER);
      return [u || DEFAULT_PI_SERVER];
    }
    const mapped = SENSOR_MAPPING[urlLine];
    if (!mapped) {
      const u = await finalizeSensorUrl(DEFAULT_PI_SERVER);
      return [u || DEFAULT_PI_SERVER];
    }

    const resolvedMapping = typeof mapped === 'object'
      ? (urlBereich && mapped[urlBereich]) || mapped.default || DEFAULT_PI_SERVER
      : mapped;

    const sensorUrls = Array.isArray(resolvedMapping) ? resolvedMapping : [resolvedMapping];
    const resolvedUrls = await Promise.all(
      sensorUrls.map((url) => finalizeSensorUrl(typeof url === 'string' ? url : null))
    );

    return resolvedUrls.filter(Boolean);
  } catch (e) {
    console.warn('[getSensorUrlsForLine] failed:', e?.message);
    const u = await finalizeSensorUrl(DEFAULT_PI_SERVER);
    return [u || DEFAULT_PI_SERVER];
  }
};

export const SENSOR_MAPPING_CONST = SENSOR_MAPPING;

// IONOS PHP-API base (Session, IST, FA, SOLL)
export const IONOS_REMOTE_BASE = 'https://cosmetic-service.com/php-api/produktion';
export const IONOS_API_BASE = USE_IONOS_VIA_LOCAL_PROXY
  ? `${LOCAL_DEV_SERVER}/ionos-proxy/produktion`
  : IONOS_REMOTE_BASE;

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
