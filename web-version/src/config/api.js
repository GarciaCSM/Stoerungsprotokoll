const fallbackBaseUrl = 'http://localhost:3001/api';
const fallbackDbSyncBaseUrl = 'https://cosmetic-service.com/php-api/produktion';
const fallbackPiUrl = 'http://sensor1.local:3000';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || fallbackBaseUrl;

export const DB_SYNC_BASE_URL =
  import.meta.env.VITE_DB_SYNC_BASE_URL?.trim() || fallbackDbSyncBaseUrl;

export const PI_SERVER_URL =
  import.meta.env.VITE_PI_SERVER_URL?.trim() || fallbackPiUrl;

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  SEARCH_FA: `${API_BASE_URL}/search-fa`,
  SOLL_HOURS: `${API_BASE_URL}/soll-hours`,
  SESSION: `${DB_SYNC_BASE_URL}/session.php`,
  STOERUNGEN: `${DB_SYNC_BASE_URL}/stoerungen.php`,
  CONTEXT: `${PI_SERVER_URL}/context`,
};
