/*
  Dummy Pi-Server  —  src/Test/pi-server.js
  ─────────────────────────────────────────
  Simuliert den Node-Server, der später auf dem Raspberry Pi läuft.
  Speichert Linie/Schicht (gesetzt vom Tablet) und stellt sie dem
  Sensor-Simulator zur Verfügung.

  Starten:  node src/Test/pi-server.js
*/

const http = require('http');
const { execSync } = require('child_process');

let current = { linie: null, schicht: null, bereich: null, fa_nr: null };

function printStatus() {
  console.log('\n┌──────────────────────────────────────────┐');
  console.log('║  Aktueller Kontext:                       ║');
  console.log(`║  Linie   : ${(current.linie   || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  Schicht : ${(current.schicht || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  Bereich : ${(current.bereich || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  FA-Nr   : ${(current.fa_nr   || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log('└──────────────────────────────────────────┘\n');
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/context') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        current = {
          linie:   data.linie   ?? current.linie,
          schicht: data.schicht ?? current.schicht,
          bereich: data.bereich ?? current.bereich,
          fa_nr:   Object.prototype.hasOwnProperty.call(data, 'fa_nr') ? data.fa_nr : current.fa_nr,
        };
        console.log('[Pi-Server] Kontext aktualisiert:');
        printStatus();
        res.writeHead(200); res.end('OK');
      } catch {
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/context') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(current));
    return;
  }

  res.writeHead(404); res.end();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[Pi-Server] Port 3000 belegt – beende alten Prozess...');
    try {
      const out = execSync('netstat -ano').toString();
      const line = out.split('\n').find(l => l.includes(':3000') && (l.includes('ABH') || l.includes('LISTEN')));
      if (line) {
        const pid = line.trim().split(/\s+/).pop();
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`[Pi-Server] PID ${pid} beendet – starte neu...`);
        setTimeout(() => server.listen(3000), 500);
      }
    } catch (e) { console.error('[Pi-Server] Konnte Port nicht freimachen:', e.message); }
  } else {
    console.error('[Pi-Server] Fehler:', err.message);
  }
});

server.listen(3000, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Dummy Pi-Server läuft auf Port 3000     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  POST /context  → Linie/Schicht/FA setzen ║');
  console.log('║  GET  /context  → aktuellen Kontext lesen ║');
  console.log('╚══════════════════════════════════════════╝');
  // Ausgabe des morgigen Datums
  const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().slice(0,10);
  console.log(`Morgiges Datum: ${tomorrow}`);
  console.log('Warte auf Kontext vom Tablet...\n');
});
