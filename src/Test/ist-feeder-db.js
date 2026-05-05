/*
  IST-Feeder (DB-Version) — src/Test/ist-feeder-db.js
  ─────────────────────────────────────────────────────
  Sendet IST-Signale direkt an die IONOS MariaDB via PHP-API.
  Die App liest den Wert ebenfalls von dort → kein lokaler Node-Server nötig.

  Usage:
    node src/Test/ist-feeder-db.js [--linie="Linie 1"] [--schicht="Frühschicht"] [--url=https://cosmetic-service.com/php-api/produktion]

  Tasten:
    a / A  → IST um 1 erhöhen (atomisches Increment in der DB)
    r      → aktuellen IST-Wert aus DB lesen
    0      → IST auf 0 zurücksetzen
    q / ^C → beenden
*/

const https = require('https');
const http  = require('http');
const url   = require('url');

// ── CLI-Args ──────────────────────────────────────────────────────────────────
const arg = (key, def) => {
  const found = process.argv.find(a => a.startsWith(`--${key}=`));
  return found ? found.split('=').slice(1).join('=') : def;
};

const BASE_URL = arg('url', 'https://cosmetic-service.com/php-api/produktion');
const LINIE    = arg('linie',   'Linie 1');
const SCHICHT  = arg('schicht', 'Frühschicht');
const DATUM    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const BEREICH  = arg('bereich', '');

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  IST-Feeder  →  IONOS DB (direkt)               ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║  Linie  : ${LINIE.padEnd(38)}║`);
console.log(`║  Schicht: ${SCHICHT.padEnd(38)}║`);
console.log(`║  Datum  : ${DATUM.padEnd(38)}║`);
console.log(`║  URL    : ${BASE_URL.slice(0, 38).padEnd(38)}║`);
console.log(`║  Bereich: ${(BEREICH || '-').slice(0, 38).padEnd(38)}║`);
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  a → IST +1  |  r → lesen  |  0 → reset  | q → quit ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// ── HTTP-Hilfsfunktionen ──────────────────────────────────────────────────────
function doRequest(method, path, body, cb) {
  const u    = new url.URL(BASE_URL + path);
  const lib  = u.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : null;

  const opts = {
    hostname: u.hostname,
    port:     u.port || (u.protocol === 'https:' ? 443 : 80),
    path:     u.pathname + u.search,
    method,
    headers: {
      'Content-Type':   'application/json',
      'Content-Length': data ? Buffer.byteLength(data) : 0,
    },
  };

  const req = lib.request(opts, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try   { cb(null, JSON.parse(raw), res.statusCode); }
      catch { cb(null, raw, res.statusCode); }
    });
  });
  req.on('error', (e) => cb(e));
  if (data) req.write(data);
  req.end();
}

function readIst(cb) {
  const params = new URLSearchParams({ linie: LINIE, schicht: SCHICHT, datum: DATUM });
  if (BEREICH) params.set('bereich', BEREICH);
  const qs = `?${params.toString()}`;
  doRequest('GET', `/ist.php${qs}`, null, cb);
}

function incrementIst(by = 1) {
  doRequest('POST', '/ist.php', { linie: LINIE, schicht: SCHICHT, bereich: BEREICH || null, datum: DATUM, increment: by }, (err, json) => {
    if (err) { console.error('  ✗ Fehler:', err.message); return; }
    if (json?.success) {
      console.log(`  ✓ IST jetzt: ${json.ist}`);
    } else {
      console.log('  ✗ Antwort:', JSON.stringify(json));
    }
  });
}

function resetIst() {
  doRequest('POST', '/ist.php', { linie: LINIE, schicht: SCHICHT, bereich: BEREICH || null, datum: DATUM, ist: 0 }, (err, json) => {
    if (err) { console.error('  ✗ Fehler:', err.message); return; }
    console.log('  ✓ IST zurückgesetzt auf 0');
  });
}

// ── Startwert anzeigen ────────────────────────────────────────────────────────
readIst((err, json) => {
  if (err) console.warn('  Startwert nicht lesbar:', err.message);
  else console.log(`  Aktueller IST in DB: ${json?.ist ?? '?'}\n`);
});

// ── Tastatureingabe ───────────────────────────────────────────────────────────
process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('data', (key) => {
  const k = key.toString();
  if (k === '\u0003' || k.toLowerCase() === 'q') {
    console.log('\nTschüss!\n');
    process.exit(0);
  }
  if (k.toLowerCase() === 'a') {
    process.stdout.write('  → Increment +1 ... ');
    incrementIst(1);
  }
  if (k === 'r') {
    readIst((err, json) => {
      if (err) console.error('\n  ✗ Fehler:', err.message);
      else console.log(`\n  IST in DB: ${json?.ist ?? '?'}`);
    });
  }
  if (k === '0') {
    process.stdout.write('  → Reset auf 0 ... ');
    resetIst();
  }
});
