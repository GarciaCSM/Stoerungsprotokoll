// API Configuration
// Für lokalen Windows-API-Server: localhost bleibt erhalten.
// Für Pi-Kontext: zwingend Pi-IP (kein localhost).
const USE_LOCALHOST = true;

// If USE_LOCALHOST is true the app will use localhost for the API
// (works when the device is connected and `adb reverse tcp:3001 tcp:3001` is active).
export const API_BASE_URL = USE_LOCALHOST
  ? 'http://localhost:3001/api'
  : 'http://192.168.10.187:3001/api';

// Raspberry Pi – direkter Kontext-Empfänger (Tablet → Pi)
// Kein localhost möglich (Pi-only)
const PI_IP = '192.168.10.134'; // <-- hier deine Pi-IP eintragen
export const PI_SERVER_URL = `http://${PI_IP}:3000`;

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
