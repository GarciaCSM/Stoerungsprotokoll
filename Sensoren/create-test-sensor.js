const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const { URL } = require('url');

const IST_API = 'https://cosmetic-service.com/php-api/produktion/ist.php';

function doRequest(method, rawUrl, body, cb) {
  const u = new URL(rawUrl);
  const lib = u.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : null;
  const opts = {
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data ? Buffer.byteLength(data) : 0,
    },
  };
  const req = lib.request(opts, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try { cb(null, JSON.parse(raw)); }
      catch { cb(null, raw); }
    });
  });
  req.on('error', cb);
  if (data) req.write(data);
  req.end();
}

function createTestSensor({ port, title }) {
  let current = { linie: null, schicht: null, bereich: null, fa_nr: null };
  let counter = 0;

  function printStatus() {
    const formatField = (value) => String(value ?? '(nicht gesetzt)').padEnd(29);
    console.log('\n┌──────────────────────────────────────────┐');
    console.log('║  Aktueller Kontext:                       ║');
    console.log(`║  Linie   : ${formatField(current.linie)} ║`);
    console.log(`║  Schicht : ${formatField(current.schicht)} ║`);
    console.log(`║  Bereich : ${formatField(current.bereich)} ║`);
    console.log(`║  FA-Nr   : ${formatField(current.fa_nr)} ║`);
    console.log(`║  Zähler  : ${String(counter || 0).padEnd(29)} ║`);
    console.log('└──────────────────────────────────────────┘\n');
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
      if (err) {
        console.error('  ✗ Fehler beim IST-Push:', err.message);
        return;
      }
      if (json?.success) {
        console.log(`  ✓ IST jetzt: ${json.ist}  (${ctx.linie} / ${ctx.schicht} / FA ${ctx.fa_nr})`);
      } else {
        console.log('  ✗ Antwort:', JSON.stringify(json));
      }
    });
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
          console.log(`[${title}] Kontext aktualisiert:`);
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
      res.end(JSON.stringify({ ...current, counter }));
      return;
    }

    res.writeHead(404); res.end();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[${title}] Port ${port} belegt – beende alten Prozess...`);
      try {
        const out = execSync('netstat -ano').toString();
        const line = out.split('\n').find(l => l.includes(`:${port}`) && (l.includes('ABH') || l.includes('LISTEN')));
        if (line) {
          const pid = line.trim().split(/\s+/).pop();
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`[${title}] PID ${pid} beendet – starte neu...`);
          setTimeout(() => server.listen(port), 500);
        }
      } catch (e) {
        console.error(`[${title}] Konnte Port nicht freimachen:`, e.message);
      }
    } else {
      console.error(`[${title}] Fehler:`, err.message);
    }
  });

  server.listen(port, () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log(`║  ${title.padEnd(40)} ║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  POST /context  → Linie/Schicht/FA setzen ║');
    console.log('║  GET  /context  → aktuellen Kontext lesen ║');
    console.log('║  c              → Zähler +1 & Kontext    ║');
    console.log('╚══════════════════════════════════════════╝');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    console.log(`Morgiges Datum: ${tomorrow}`);
    console.log('Warte auf Kontext vom Tablet...\n');
  });

  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('data', (key) => {
    const k = key.toString();
    if (k === '\u0003' || k.toLowerCase() === 'q') {
      console.log('Tschüss!\n');
      process.exit(0);
    }
    if (k.toLowerCase() === 'c') {
      counter += 1;
      console.log(`[${title}] Zähler erhöht: ${counter}`);
      printStatus();
      sendIncrement(current);
    }
  });
}

module.exports = createTestSensor;