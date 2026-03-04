/*
  Sensor‑Simulator  —  src/Test/sensor-simulator.js
  ────────────────────────────────────────
  Simuliert den IRSW20A: bei Tastendruck „a“ wird ein IST-Increment
  an die IONOS-API gesendet – genau wie später der echte Sensor.
  Linie und Schicht werden automatisch vom Pi-Server geholt.

  Starten:  node src/Test/sensor-simulator.js

  Tasten:
    a   → simuliere einen Sensor-Hit (+1)
    c   → aktuellen Kontext anzeigen
    q   → beenden
*/

const http  = require('http');
const https = require('https');
const url   = require('url');

// Pi-Server Port (pi-server.js läuft auf 3000 – getrennt vom Node-Backend auf 3001)
// Im Dev: npm run test:pi-server startet pi-server.js auf localhost:3000
const PI_PORT = process.env.PI_PORT || 3000;
const PI_URL  = process.env.PI_URL  || `http://localhost:${PI_PORT}`;
const IST_API = 'https://cosmetic-service.com/php-api/produktion/ist.php';

function doRequest(method, rawUrl, body, cb) {
  const u    = new url.URL(rawUrl);
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
      try   { cb(null, JSON.parse(raw)); }
      catch { cb(null, raw); }
    });
  });
  req.on('error', cb);
  if (data) req.write(data);
  req.end();
}

function getContext(cb) {
  doRequest('GET', `${PI_URL}/context`, null, (err, json) => {
    if (err) { console.error('  ✗ Pi-Server nicht erreichbar:', err.message); cb(null); return; }
    cb(json);
  });
}

function sendIncrement(ctx) {
  if (!ctx?.linie || !ctx?.schicht) {
    console.log('  ⚠  Kein Kontext gesetzt – erst im Tablet eine Linie/Schicht bestätigen!');
    return;
  }
  if (!ctx.fa_nr) {
    console.log('  ⚠  Kein FA ausgewählt – bitte zuerst im Tablet eine FA-Nummer auswählen!');
    return;
  }
  const datum = new Date().toISOString().slice(0, 10);
  doRequest('POST', IST_API, { linie: ctx.linie, schicht: ctx.schicht, datum, increment: 1 }, (err, json) => {
    if (err) { console.error('  ✗ Fehler:', err.message); return; }
    if (json?.success) console.log(`  ✓ IST jetzt: ${json.ist}  (${ctx.linie} / ${ctx.schicht} / FA ${ctx.fa_nr})`);
    else console.log('  ✗ Antwort:', JSON.stringify(json));
  });
}

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  Sensor-Simulator (kein Hardware nötig)         ║');
console.log('╠════════════════════════════════════════════╣');
console.log('║  a → Sensor-Hit (+1)  |  c → Kontext  |  q → quit ║');
console.log('╚════════════════════════════════════════════╝\n');

process.stdin.setEncoding('utf8');
process.stdin.resume(); // Prozess am Leben halten auch wenn kein TTY
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true); // Einzelne Tasten ohne Enter
} else {
  console.log('  (Kein TTY erkannt – Enter nach jeder Taste drücken)\n');
}

process.stdin.on('data', (key) => {
  const k = key.toString();
  if (k === '\u0003' || k.toLowerCase() === 'q') { console.log('Tschüss!\n'); process.exit(0); }
  if (k.toLowerCase() === 'a') {
    process.stdout.write('  → Sensor-Hit ... ');
    getContext(ctx => sendIncrement(ctx));
  }
  if (k === 'c') {
    getContext(ctx => {
      if (!ctx) { console.log('  Kontext: Pi-Server nicht erreichbar'); return; }
      console.log('  Kontext:');
      console.log(`    Linie   : ${ctx.linie   || '(nicht gesetzt)'}`);
      console.log(`    Schicht : ${ctx.schicht || '(nicht gesetzt)'}`);
      console.log(`    Bereich : ${ctx.bereich || '(nicht gesetzt)'}`);
      console.log(`    FA-Nr   : ${ctx.fa_nr   || '(nicht gesetzt)'}`);
    });
  }
});
