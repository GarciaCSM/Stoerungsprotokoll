// API Configuration
const API_CONFIG = {
  // allow override with environment variable, fallback to a high non-privileged port
  PORT: process.env.PORT || 5000,
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
