import { API_ENDPOINTS, API_ERROR_MESSAGES } from '../config/apiConfig';

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

    try {
      const url = `${API_ENDPOINTS.SEARCH_FA}?query=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('FA Search error:', error);
      return {
        success: false,
        results: [],
        count: 0,
        error: error.message.includes('Network')
          ? API_ERROR_MESSAGES.NETWORK_ERROR
          : API_ERROR_MESSAGES.GENERAL_ERROR,
      };
    }
  }

  /**
   * Get specific FA by FANr
   * @param {string} fanr - FA Number
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getFAByNumber(fanr) {
    try {
      const url = API_ENDPOINTS.GET_FA(fanr);
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: API_ERROR_MESSAGES.FA_NOT_FOUND,
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Get FA error:', error);
      return {
        success: false,
        error: error.message.includes('Network')
          ? API_ERROR_MESSAGES.NETWORK_ERROR
          : API_ERROR_MESSAGES.GENERAL_ERROR,
      };
    }
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const response = await fetch(API_ENDPOINTS.HEALTH);
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
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
  async getDbIst(linie, schicht, datum) {
    try {
      const endpointUrl = API_ENDPOINTS.DB_IST(linie, schicht, datum);
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
