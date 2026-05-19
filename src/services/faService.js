/**
 * faService.js – Fertigungsaufträge (FA) und IST-Werte für die Produktions-App
 *
 * API-Schicht zwischen Tablet und IONOS-PHP (primär), optional Fallback in apiConfig:
 *
 * - searchFA: FA-Suche nach Nummer (search-fa.php).
 * - getFAByNumber: Einzelnen FA inkl. Artikel laden (fa.php).
 * - checkHealth: Prüfen, ob die API erreichbar ist (health.php).
 * - getDbIst: Aktuellen IST-Stückstand aus der DB (ist.php) – wird z. B. jede Sekunde für SOLL/IST angezeigt.
 * - getTestIst: Nur für Tests gegen einen lokalen Node-Endpunkt (TEST_IST).
 *
 * Verwendung: ProtocolScreen (FA-Auswahl), useSollData (IST-Polling).
 * Produktivbetrieb läuft über IONOS; server.js auf dem PC ist dafür nicht nötig.
 */

import { API_ENDPOINTS, API_ERROR_MESSAGES } from '../config/apiConfig';

/** True für 4xx-Antworten (außer 404) – diese wiederholen wir nicht. */
function isFatalHttp(status) {
  return status >= 400 && status < 500 && status !== 404;
}

class FAService {
  /**
   * Search for FA-Koepfe by FANr
   * @param {string} query - Search query
   * @returns {Promise<{success: boolean, results: Array, count: number, error?: string}>}
   */
  async searchFA(query) {
    if (!query || query.trim().length === 0) {
      return { success: true, results: [], count: 0 };
    }

    const bases = [
      API_ENDPOINTS.SEARCH_FA,
      API_ENDPOINTS.SEARCH_FA_FALLBACK,
    ].filter(Boolean);
    const tried = [];
    let lastErr = null;
    let fatalStatus = null;

    outer: for (const base of bases) {
      const url = `${base}?query=${encodeURIComponent(query)}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          lastErr = new Error(`HTTP ${response.status}: ${response.statusText}`);
          tried.push({ url, status: response.status });
          if (isFatalHttp(response.status)) {
            fatalStatus = response.status;
            break outer;
          }
          continue;
        }
        return await response.json();
      } catch (error) {
        lastErr = error;
        tried.push({ url, message: error.message || String(error) });
        console.warn('FA Search fetch failed:', url, error.message || error);
      }
    }

    console.error('FA Search error (all candidates):', lastErr, tried);
    const net =
      lastErr &&
      String(lastErr.message || lastErr).toLowerCase().includes('network');
    let errorMsg;
    if (fatalStatus === 403) {
      errorMsg = 'IONOS-Server hat den Zugriff blockiert (HTTP 403). Bitte WP-Defender entsperren.';
    } else if (fatalStatus) {
      errorMsg = `IONOS-Server: HTTP ${fatalStatus}`;
    } else {
      errorMsg = net ? API_ERROR_MESSAGES.NETWORK_ERROR : API_ERROR_MESSAGES.GENERAL_ERROR;
    }
    return {
      success: false,
      results: [],
      count: 0,
      error: errorMsg,
    };
  }

  /**
   * Get specific FA by FANr
   * @param {string} fanr - FA Number
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getFAByNumber(fanr) {
    const candidates = [
      API_ENDPOINTS.GET_FA(fanr),
      API_ENDPOINTS.GET_FA_FALLBACK ? API_ENDPOINTS.GET_FA_FALLBACK(fanr) : null,
    ].filter(Boolean);

    let lastErr = null;
    let fatalStatus = null;

    for (const url of candidates) {
      try {
        const response = await fetch(url);

        if (response.ok) {
          return await response.json();
        }
        if (response.status === 404) {
          lastErr = { type: 'notfound' };
          continue;
        }
        lastErr = new Error(`HTTP ${response.status}: ${response.statusText}`);
        if (isFatalHttp(response.status)) {
          fatalStatus = response.status;
          break;
        }
      } catch (error) {
        lastErr = error;
        console.warn('Get FA fetch failed:', url, error.message || error);
      }
    }

    if (lastErr && lastErr.type === 'notfound') {
      return { success: false, error: API_ERROR_MESSAGES.FA_NOT_FOUND };
    }

    console.error('Get FA error:', lastErr);
    const net =
      lastErr &&
      String(lastErr.message || lastErr).toLowerCase().includes('network');
    let errorMsg;
    if (fatalStatus === 403) {
      errorMsg = 'IONOS-Server hat den Zugriff blockiert (HTTP 403). Bitte WP-Defender entsperren.';
    } else if (fatalStatus) {
      errorMsg = `IONOS-Server: HTTP ${fatalStatus}`;
    } else {
      errorMsg = net ? API_ERROR_MESSAGES.NETWORK_ERROR : API_ERROR_MESSAGES.GENERAL_ERROR;
    }
    return { success: false, error: errorMsg };
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    const urls = [
      API_ENDPOINTS.HEALTH,
      API_ENDPOINTS.HEALTH_FALLBACK,
    ].filter(Boolean);
    for (const url of urls) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'ok') return true;
      } catch (error) {
        console.warn('Health check failed:', url, error.message || error);
      }
    }
    return false;
  }

  /**
   * Test helper: read current IST value from backend test endpoint
   * Returns numeric IST or 0 on error
   */
  async getTestIst() {
    try {
      const resp = await fetch(API_ENDPOINTS.TEST_IST);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const j = await resp.json();
      return typeof j.ist === 'number' ? j.ist : Number(j.ist) || 0;
    } catch (err) {
      console.warn('getTestIst failed:', err.message || err);
      return 0;
    }
  }

  /**
   * IST-Wert direkt aus IONOS-DB lesen (kein lokaler Node-Server nötig).
   * Wird von useSollData jede Sekunde aufgerufen.
   */
  async getDbIst(linie, schicht, datum, bereich = null) {
    try {
      const endpointUrl = API_ENDPOINTS.DB_IST(linie, schicht, datum, bereich);
      console.log('[getDbIst] Fetching:', endpointUrl);
      const resp = await fetch(endpointUrl);
      if (!resp.ok) {
        console.warn('[getDbIst] HTTP Fehler:', resp.status, resp.statusText);
        return 0;
      }
      const j = await resp.json();
      console.log('[getDbIst] Antwort:', j);
      return typeof j.ist === 'number' ? j.ist : Number(j.ist) || 0;
    } catch (err) {
      console.warn('[getDbIst] failed:', err.message || err);
      return 0;
    }
  }
}

export default new FAService();
