const express = require('express');
const cors = require('cors');
const os = require('os');
const https = require('https');
const { URL } = require('url');
require('dotenv').config();

const { API_CONFIG, CORS_OPTIONS } = require('./api/config/config');
const apiRoutes = require('./api/routes');
const { runIonosSync } = require('./api/services/ionosSync');

const IONOS_PROXY_TARGET = (
  process.env.IONOS_SYNC_BASE_URL || 'https://cosmetic-service.com/php-api/produktion'
).replace(/\/$/, '');

const app = express();

// Middleware
app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── IONOS-Proxy für USB-Dev (Tablet → localhost:3001 → cosmetic-service.com) ─
// Umgeht CORS und erlaubt Session/IST/FA/SOLL ohne direkten HTTPS-Zugriff vom Gerät.
function ionosProxyHandler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  const suffix = req.url && req.url.startsWith('/') ? req.url : `/${req.url || ''}`;
  let upstream;
  try {
    upstream = new URL(suffix, `${IONOS_PROXY_TARGET}/`);
  } catch (e) {
    return res.status(400).json({ error: 'Bad proxy URL', message: e.message });
  }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = {
      Accept: req.headers.accept || 'application/json',
      Host: upstream.hostname,
    };
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }
    if (body.length) headers['Content-Length'] = String(body.length);

    const proxyReq = https.request(
      {
        hostname: upstream.hostname,
        port: upstream.port || 443,
        path: upstream.pathname + upstream.search,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const outHeaders = { ...proxyRes.headers, 'access-control-allow-origin': '*' };
        res.writeHead(proxyRes.statusCode, outHeaders);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on('error', (e) => {
      console.warn('[IONOS-Proxy]', req.method, suffix, e.message);
      res.status(502).json({ error: 'IONOS proxy failed', message: e.message });
    });
    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
}

app.use('/ionos-proxy/produktion', ionosProxyHandler);

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
    `  (env PORT=${process.env.PORT || '<unset>'}  default=3001)`
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
  console.log(`  ODBC DSN:         ${(API_CONFIG.ODBC_CONNECTION_STRING || '').split(';')[0] || '<unset>'}`);
  console.log(`  Time:             ${new Date().toLocaleString('de-DE')}`);
  console.log(`  IONOS-Proxy:      http://localhost:${API_CONFIG.PORT}/ionos-proxy/produktion`);
  console.log(`                    → ${IONOS_PROXY_TARGET}`);
  console.log('='.repeat(60));

  if (API_CONFIG.SYNC_TO_IONOS_ON_START && API_CONFIG.IONOS_SYNC_BASE_URL) {
    runIonosSync({ silent: false }).catch((e) => {
      console.error('[IONOS-Sync] Fehler:', e.message || e);
    });
  } else if (API_CONFIG.SYNC_TO_IONOS_ON_START && !API_CONFIG.IONOS_SYNC_BASE_URL) {
    console.warn('[IONOS-Sync] SYNC_TO_IONOS_ON_START ist an, aber IONOS_SYNC_BASE_URL fehlt – übersprungen.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
