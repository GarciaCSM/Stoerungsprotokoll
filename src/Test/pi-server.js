/*
  Dummy Pi-Server  —  src/Test/pi-server.js
  ─────────────────────────────────────────
  Simuliert den Node-Server, der später auf dem Raspberry Pi läuft.
  Speichert Linie/Schicht (gesetzt vom Tablet) und stellt sie dem
  Sensor-Simulator zur Verfügung.

  Starten:  node src/Test/pi-server.js
*/

const http = require('http');

let current = { linie: null, schicht: null };

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
        current = { linie: data.linie, schicht: data.schicht };
        console.log(`[Pi-Server] Kontext gesetzt → Linie: "${current.linie}" | Schicht: "${current.schicht}"`);
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

server.listen(3000, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Dummy Pi-Server läuft auf Port 3000     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  POST /context  → Linie/Schicht setzen   ║');
  console.log('║  GET  /context  → aktuellen Kontext lesen║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('Warte auf Kontext vom Tablet...\n');
});
