// API Configuration
const API_CONFIG = {
  // allow override with environment variable, fallback to 3001
  PORT: process.env.PORT || 3001,
  HOST: '0.0.0.0',
  ODBC_CONNECTION_STRING: process.env.ODBC_CONNECTION_STRING,

  /** Basis-URL der IONOS-PHP-API (ohne abschließenden Slash), z. B. https://…/php-api/produktion */
  IONOS_SYNC_BASE_URL: process.env.IONOS_SYNC_BASE_URL || '',
  /** Optional: nur wenn STPROT_SYNC_SECRET auf IONOS gesetzt ist – sonst leer lassen */
  IONOS_SYNC_SECRET: process.env.IONOS_SYNC_SECRET || '',
  /** Nach Serverstart ODBC-FAs nach IONOS spiegeln (1/true/ja) */
  SYNC_TO_IONOS_ON_START: ['1', 'true', 'yes', 'ja'].includes(
    String(process.env.SYNC_TO_IONOS_ON_START || '').toLowerCase(),
  ),
  /** FA- und SOLL-Sync einzeln abschaltbar */
  IONOS_SYNC_FA: process.env.IONOS_SYNC_FA !== '0' && process.env.IONOS_SYNC_FA !== 'false',
  IONOS_SYNC_SOLL: process.env.IONOS_SYNC_SOLL !== '0' && process.env.IONOS_SYNC_SOLL !== 'false',
  IONOS_FA_SYNC_LIMIT: parseInt(process.env.IONOS_FA_SYNC_LIMIT || '8000', 10),
  IONOS_SYNC_BATCH_SIZE: parseInt(process.env.IONOS_SYNC_BATCH_SIZE || '150', 10),
  /** Lokale SOLL-Excel zusätzlich als Datei nach IONOS laden (soll_file_upload.php) */
  IONOS_UPLOAD_SOLL_FILE: process.env.IONOS_UPLOAD_SOLL_FILE !== '0' && process.env.IONOS_UPLOAD_SOLL_FILE !== 'false',
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
