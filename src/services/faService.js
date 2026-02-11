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
}

export default new FAService();
