const odbc = require('odbc');
const { API_CONFIG } = require('./config');

class Database {
  constructor() {
    this.connectionString = API_CONFIG.ODBC_CONNECTION_STRING;
  }

  async connect() {
    try {
      const connection = await odbc.connect(this.connectionString);
      return connection;
    } catch (error) {
      console.error('Database connection error:', error.message);
      throw error;
    }
  }

  async executeQuery(sql, params = []) {
    let connection;
    try {
      connection = await this.connect();
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
