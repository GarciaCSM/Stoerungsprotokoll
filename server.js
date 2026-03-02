const express = require('express');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

const { API_CONFIG, CORS_OPTIONS } = require('./api/config/config');
const apiRoutes = require('./api/routes');

const app = express();

// Middleware
app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// ── Pi-Kontext: Linie/Schicht vom Tablet empfangen ───────────────────────────
// Das Tablet ruft POST /context auf, wenn der Benutzer eine Linie/Schicht bestätigt.
// Der Sensor-Simulator (und später der echte Pi-Sensor) liest GET /context aus.
let piContext = { linie: null, schicht: null };

app.post('/context', (req, res) => {
  piContext = { linie: req.body.linie || null, schicht: req.body.schicht || null };
  console.log(`[Kontext] Linie: "${piContext.linie}" | Schicht: "${piContext.schicht}"`);
  res.json({ success: true, context: piContext });
});

app.get('/context', (req, res) => {
  res.json(piContext);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Störungsprotokoll API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      searchFA: '/api/search-fa?query=XXX',
      getFA: '/api/fa/:fanr'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint nicht gefunden',
    path: req.path 
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Interner Serverfehler',
    message: error.message 
  });
});

// Start server
const server = app.listen(API_CONFIG.PORT, API_CONFIG.HOST, () => {
  console.log('='.repeat(60));
  console.log(`  Störungsprotokoll Backend Server`);
  console.log('='.repeat(60));
  console.log(`  Status:           Running`);
  console.log(`  Listen on:        ${API_CONFIG.HOST}:${API_CONFIG.PORT}`);
  console.log(
    `  (env PORT=${process.env.PORT || '<unset>'}  default=5000)`
  );
  console.log(`  Local URL:        http://localhost:${API_CONFIG.PORT}`);
  // build a list of non-internal IPv4 addresses to show as network URLs
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  if (addresses.length) {
    addresses.forEach(addr => {
      console.log(`  Network URL:      http://${addr}:${API_CONFIG.PORT}`);
    });
  } else {
    console.log('  Network URL:      <none found>');
  }
  console.log(`  ODBC DSN:         ${API_CONFIG.ODBC_CONNECTION_STRING.split(';')[0]}`);
  console.log(`  Time:             ${new Date().toLocaleString('de-DE')}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
