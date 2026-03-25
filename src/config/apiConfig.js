// API Configuration
// USB-Entwicklung (adb reverse): USE_LOCALHOST = true → localhost
// WLAN / Tablet-Produktion:      USE_LOCALHOST = false → LAN-IP
// Für lokale Tests (z.B. `npm run test:pi-server`) sollte hier true stehen
const USE_LOCALHOST = false; // true nur für USB-Entwicklung am PC

export const API_BASE_URL =
  __DEV__ && USE_LOCALHOST
    ? 'http://localhost:3001/api'
    : 'http://192.168.10.187:3001/api';

// Raspberry Pi – direkter Kontext-Empfänger (Tablet → Pi)
// Im Büro/Test (USE_LOCALHOST=true):  http://localhost:3000  (adb reverse + npm run test:pi-server)
// Produktion   (USE_LOCALHOST=false): http://<PI-IP>:3000   ← echte Pi-IP eintragen
const PI_IP = '192.168.10.134'; // ← Pi-IP hier anpassen (jetzt dein Pi)
export const PI_SERVER_URL =
  __DEV__ && USE_LOCALHOST
    ? 'http://localhost:3000'
    : `http://${PI_IP}:3000`;

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
