// API Configuration
const API_CONFIG = {
  PORT: process.env.PORT || 3001,
  HOST: '0.0.0.0',
  ODBC_CONNECTION_STRING: process.env.ODBC_CONNECTION_STRING,
};

// CORS Configuration
const CORS_OPTIONS = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = {
  API_CONFIG,
  CORS_OPTIONS,
};
