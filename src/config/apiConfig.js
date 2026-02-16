// API Configuration
// TODO: Replace with your Render backend URL after deployment
export const API_BASE_URL = 'http://192.168.10.127:3001/api';

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  SEARCH_FA: `${API_BASE_URL}/search-fa`,
  GET_FA: (fanr) => `${API_BASE_URL}/fa/${fanr}`,
};

// API Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Verbindungsfehler zum Server. Ist das Backend gestartet?',
  FA_NOT_FOUND: 'FA nicht gefunden oder Status ungültig (erlaubt: 30, 35, 36)',
  GENERAL_ERROR: 'Ein Fehler ist aufgetreten',
};
