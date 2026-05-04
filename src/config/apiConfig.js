// API Configuration
// Für lokalen Windows-API-Server: localhost bleibt erhalten.
// Für Pi-Kontext: zwingend Pi-IP (kein localhost).
const USE_LOCALHOST = true;

// If USE_LOCALHOST is true the app will use localhost for the API
// (works when the device is connected and `adb reverse tcp:3001 tcp:3001` is active).
export const API_BASE_URL = USE_LOCALHOST
  ? 'http://localhost:3001/api'
  : 'http://192.168.10.152:3001/api';

// Sensor mapping per Linie
// Linie 1 -> sensor1.local (Produktiv Pi)
// Linie 2 -> Testsensor localhost:5002
// Linie 3 -> Testsensor localhost:5003
const SENSOR_MAPPING = {
  'Linie 1': 'http://sensor1.local:3000',
  'Linie 2': 'http://localhost:5002',
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
    const serviceType = '_http._tcp.';

    return await new Promise((resolve) => {
      let resolved = null;
      const onResolved = (serviceName, service) => {
        try {
          // service.name or service.host may contain the hostname
          if (!service) return;
          const hosts = service.addresses || (service.host ? [service.host] : []);
          if (hosts && hosts.length) {
            const ip = hosts.find(h => h && h.indexOf(':') === -1) || hosts[0];
            if (ip) {
              resolved = `http://${ip}:${service.port || u.port || 80}`;
              resolve(resolved);
              zeroconf.removeListener('resolved', onResolved);
            }
          }
        } catch (_) {}
      };

      zeroconf.on('resolved', onResolved);
      zeroconf.scan(serviceType, 'local.');

      setTimeout(() => {
        try { zeroconf.removeListener('resolved', onResolved); } catch (e) {}
        if (!resolved) resolve(null);
      }, timeout);
    });
  } catch (e) {
    // Native module not available or error — caller should fallback
    return null;
  }
};

export const getSensorUrlForLine = async (line) => {
  if (!line) return DEFAULT_PI_SERVER;
  const mapped = SENSOR_MAPPING[line];
  if (!mapped) return DEFAULT_PI_SERVER;

  // Attempt mDNS resolution only for .local hostnames
  if (mapped.includes('.local')) {
    const resolved = await resolveMdnsHost(mapped).catch(() => null);
    return resolved || mapped; // if resolution failed, return original mDNS URL
  }
  return mapped;
};

export const SENSOR_MAPPING_CONST = SENSOR_MAPPING;

// IONOS PHP-API base (für IST-Wert via DB)
export const IONOS_API_BASE = 'https://cosmetic-service.com/php-api/produktion';

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH:    `${API_BASE_URL}/health`,
  SEARCH_FA: `${API_BASE_URL}/search-fa`,
  GET_FA:    (fanr) => `${API_BASE_URL}/fa/${fanr}`,
  SOLL_HOURS: `${API_BASE_URL}/soll-hours`,
  TEST_IST:  `${API_BASE_URL}/test/ist`,
  // IST direkt aus IONOS-DB (kein lokaler Node-Server nötig)
  DB_IST: (linie, schicht, datum) =>
    `${IONOS_API_BASE}/ist.php?linie=${encodeURIComponent(linie)}&schicht=${encodeURIComponent(schicht)}&datum=${datum}`
};

// API Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Verbindungsfehler zum Server. Ist das Backend gestartet?',
  FA_NOT_FOUND: 'FA nicht gefunden oder Status ungültig (erlaubt: 30, 35, 36)',
  GENERAL_ERROR: 'Ein Fehler ist aufgetreten',
};
