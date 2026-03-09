const odbc = require('odbc');
const { API_CONFIG } = require('./config');

class Database {
  constructor() {
    this.connectionString = API_CONFIG.ODBC_CONNECTION_STRING || '';
    this.pool = null;
  }

  async getPool() {
    if (!this.pool) {
      this.pool = await odbc.pool({
        connectionString: this.connectionString,
        initialSize: 2,
        incrementSize: 2,
        maxSize: 10,
      });
    }
    return this.pool;
  }

  async executeQuery(sql, params = []) {
    let connection;
    try {
      const pool = await this.getPool();
      connection = await pool.connect();
      const result = await connection.query(sql, params);
      return result;
    } catch (error) {
      console.error('Query execution error:', error.message);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error('Error closing connection:', closeError.message);
        }
      }
    }
  }
}

module.exports = new Database();
