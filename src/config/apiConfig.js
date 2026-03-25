// API Configuration
// Im Entwickler-Modus mit USB- oder Emulator-Test: localhost nutzen.
// Für echtes WLAN Pi: USE_LOCALHOST ausknipsen und PI_IP auf Pi-Adresse setzen.
const USE_LOCALHOST = false;

export const API_BASE_URL =
  __DEV__ && USE_LOCALHOST
    ? 'http://localhost:3001/api'
    : 'http://192.168.10.187:3001/api';

// Raspberry Pi – direkter Kontext-Empfänger (Tablet → Pi)
const PI_IP = '192.168.10.134'; // <-- hier deine Pi-IP eintragen
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
