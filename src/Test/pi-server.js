/*
  Pi-Server  —  src/Test/pi-server.js
  ─────────────────────────────────────────
  Läuft auf dem Raspberry Pi. Speichert Linie/Schicht/FA (gesetzt vom
  Tablet) und zählt GPIO-Sensor-Impulse als IST-Inkremente zu IONOS.

  Starten (lokal/Entwicklung):  node src/Test/pi-server.js
  Starten (Pi / Linie 2):       SENSOR_LINIE=2 node src/Test/pi-server.js

  Umgebungsvariablen:
    SENSOR_LINIE      Linie die akzeptiert wird (z.B. "2"). Leer = alle.
    SENSOR_GPIO_PIN   BCM-Pin-Nummer (Standard: 2)
    SENSOR_GPIO_LINE  GPIO-Line-Name (Standard: "GPIO<PIN>")
    SENSOR_GPIO_CHIP  GPIO-Chip-Override (leer = automatisch)
    GPIO_POLL_MS      Polling-Intervall Fallback (Standard: 80 ms)
    SIM_HOLD_KEY      Taste für Sensor-Simulation im Terminal (Standard: 'v')
    TRIGGER_GUARD_MS  Mindestabstand zwischen zwei Hits (Standard: 350 ms)
*/

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

let current = { linie: null, schicht: null, bereich: null, fa_nr: null };
let sensorLocked = false;

const IST_API = 'https://cosmetic-service.com/php-api/produktion/ist.php';
const GPIO_PIN = Number(process.env.SENSOR_GPIO_PIN || 2);
const GPIO_BASE = '/sys/class/gpio';
const GPIO_DIR = `${GPIO_BASE}/gpio${GPIO_PIN}`;
const GPIO_VALUE = `${GPIO_DIR}/value`;
const GPIO_POLL_MS = Number(process.env.GPIO_POLL_MS || 80);
const GPIO_CHIP = process.env.SENSOR_GPIO_CHIP || '';
const GPIO_LINE_NAME = process.env.SENSOR_GPIO_LINE || `GPIO${GPIO_PIN}`;

// Wenn gesetzt, werden nur Kontexte für diese Linie akzeptiert (z.B. "2").
const SENSOR_LINIE = process.env.SENSOR_LINIE || null;

let lastGpioValue = null;
let lastTriggerTs = 0;
const GPIO_DEBOUNCE_MS = 150;
const SIM_HOLD_KEY = (process.env.SIM_HOLD_KEY || 'v').toLowerCase();
const SIM_RELEASE_MS = Number(process.env.SIM_RELEASE_MS || 500);
const TRIGGER_GUARD_MS = Number(process.env.TRIGGER_GUARD_MS || 350);

let simulatedLowActive = false;
let simReleaseTimer = null;
let lastAnyTriggerTs = 0;
let gpioPollTimer = null;
let gpiomonProc = null;

function doRequest(method, rawUrl, body, cb) {
  const u = new url.URL(rawUrl);
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

function sendIncrement(ctx) {
  if (!ctx?.linie || !ctx?.schicht) {
    console.log('  [Sensor] Kein Kontext gesetzt – erst im Tablet Linie/Schicht bestätigen.');
    return;
  }
  if (!ctx.fa_nr) {
    console.log('  [Sensor] Keine FA ausgewählt – bitte zuerst FA im Tablet setzen.');
    return;
  }
  const datum = new Date().toISOString().slice(0, 10);
  doRequest('POST', IST_API, { linie: ctx.linie, schicht: ctx.schicht, bereich: ctx.bereich, fa_nr: ctx.fa_nr, datum, increment: 1 }, (err, json) => {
    if (err) { console.error('  [Sensor] Fehler beim IST-Increment:', err.message); return; }
    if (json?.success) {
      console.log(`  [Sensor] IST jetzt: ${json.ist}  (${ctx.linie} / ${ctx.schicht} / FA ${ctx.fa_nr})`);
    } else {
      console.log('  [Sensor] Unerwartete Antwort:', JSON.stringify(json));
    }
  });
}

function triggerSensorHit(source) {
  const now = Date.now();
  if (now - lastAnyTriggerTs < TRIGGER_GUARD_MS) {
    console.log(`  [Sensor:${source}] ignoriert (Guard ${TRIGGER_GUARD_MS}ms)`);
    return;
  }
  lastAnyTriggerTs = now;
  process.stdout.write(`  [Sensor:${source}] Hit erkannt ... `);
  sendIncrement(current);
}

function writeText(path, text) {
  fs.writeFileSync(path, String(text));
}

function readRaspiGpioLevel() {
  try {
    const out = execSync(`pinctrl get ${GPIO_PIN}`, { encoding: 'utf8' });
    const mLevel = out.match(/\blevel=(\d)\b/i);
    if (mLevel) return mLevel[1];
    const mHiLo = out.match(/\|\s*(hi|lo)\b/i);
    if (mHiLo) return mHiLo[1].toLowerCase() === 'hi' ? '1' : '0';
    return null;
  } catch {
    return null;
  }
}

function readGpioValue() {
  try { return fs.readFileSync(GPIO_VALUE, 'utf8').trim(); }
  catch { return null; }
}

function handleGpioChange() {
  const now = Date.now();
  if (now - lastTriggerTs < GPIO_DEBOUNCE_MS) return;
  const value = readGpioValue();
  if (value == null) return;
  if (value === '0' && lastGpioValue !== '0') {
    lastTriggerTs = now;
    triggerSensorHit(`GPIO${GPIO_PIN}`);
  }
  lastGpioValue = value;
}

function detectLibgpiodMajor() {
  try {
    const out = execSync('gpiomon --version 2>&1', { encoding: 'utf8' });
    const m = out.match(/(\d+)\.\d+/);
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

function initGpioViaLibgpiod() {
  const major = detectLibgpiodMajor();
  if (major == null) return false;

  let cmd = 'gpiomon';
  let args;

  if (major >= 2) {
    args = ['-e', 'falling', '-b', 'pull-up'];
    if (GPIO_CHIP) args.push('-c', GPIO_CHIP);
    args.push(GPIO_CHIP ? String(GPIO_PIN) : GPIO_LINE_NAME);
  } else {
    let chip = GPIO_CHIP;
    let offset = String(GPIO_PIN);
    if (!chip) {
      try {
        const found = execSync(`gpiofind ${GPIO_LINE_NAME}`, { encoding: 'utf8' }).trim();
        const parts = found.split(/\s+/);
        if (parts.length >= 2) { chip = parts[0]; offset = parts[1]; }
      } catch {
        console.warn(`[GPIO] gpiofind ${GPIO_LINE_NAME} fehlgeschlagen – libgpiod übersprungen.`);
        return false;
      }
    }
    args = ['-f', '-B', 'pull-up', chip, offset];
  }

  try {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let started = true;

    child.on('error', (err) => {
      started = false;
      console.warn(`[GPIO] gpiomon konnte nicht gestartet werden: ${err.message}`);
    });

    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (/falling/i.test(line)) {
          const now = Date.now();
          if (now - lastTriggerTs < GPIO_DEBOUNCE_MS) continue;
          lastTriggerTs = now;
          triggerSensorHit(`GPIO${GPIO_PIN}`);
        }
      }
    });

    child.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) console.warn(`[GPIO] gpiomon: ${msg}`);
    });

    child.on('exit', (code, signal) => {
      gpiomonProc = null;
      if (code && code !== 0) {
        console.warn(`[GPIO] gpiomon beendet (code=${code}, signal=${signal}).`);
      }
    });

    if (!started) return false;
    gpiomonProc = child;
    console.log(`[GPIO] libgpiod ${major}.x aktiv via gpiomon auf ${GPIO_LINE_NAME} (falling edge, event-getrieben).`);
    return true;
  } catch (err) {
    console.warn(`[GPIO] libgpiod-Start fehlgeschlagen: ${err.message}`);
    return false;
  }
}

function initGpio() {
  if (initGpioViaLibgpiod()) return;
  console.log('[GPIO] libgpiod nicht verfügbar – versuche Sysfs / pinctrl-Polling...');

  try {
    if (!fs.existsSync(GPIO_DIR)) writeText(`${GPIO_BASE}/export`, GPIO_PIN);
    writeText(`${GPIO_DIR}/direction`, 'in');
    writeText(`${GPIO_DIR}/edge`, 'falling');
    try { execSync(`pinctrl set ${GPIO_PIN} ip pu`, { stdio: 'ignore' }); } catch {}

    lastGpioValue = readGpioValue();
    fs.watch(GPIO_VALUE, { persistent: true }, () => handleGpioChange());
    console.log(`[GPIO] Sensor aktiv auf GPIO${GPIO_PIN} (falling edge / LOW-Trigger, sysfs).`);
  } catch (err) {
    console.error(`[GPIO] Sysfs-Init fehlgeschlagen: ${err.message}`);
    console.log('[GPIO] Fallback: pinctrl-Polling wird aktiviert...');

    lastGpioValue = readRaspiGpioLevel();
    if (lastGpioValue == null) {
      console.error('[GPIO] Fallback fehlgeschlagen: pinctrl nicht verfügbar.');
      console.error('[GPIO] Hinweis: `sudo apt install raspi-utils` prüfen, mit ausreichenden Rechten starten.');
      return;
    }

    gpioPollTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastTriggerTs < GPIO_DEBOUNCE_MS) return;
      const value = readRaspiGpioLevel();
      if (value == null) return;
      if (value !== lastGpioValue) console.log(`[GPIO-DEBUG] GPIO${GPIO_PIN}: ${lastGpioValue ?? '?'} -> ${value}`);
      if (value === '0' && lastGpioValue !== '0') {
        lastTriggerTs = now;
        triggerSensorHit(`GPIO${GPIO_PIN}`);
      }
      lastGpioValue = value;
    }, GPIO_POLL_MS);

    console.log(`[GPIO] Polling aktiv auf GPIO${GPIO_PIN} (${GPIO_POLL_MS}ms).`);
  }
}

function printStatus() {
  const linieLine = SENSOR_LINIE ? `Linie ${SENSOR_LINIE}` : 'alle';
  console.log('\n┌──────────────────────────────────────────┐');
  console.log('║  Aktueller Kontext:                       ║');
  console.log(`║  Linie   : ${(current.linie   || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  Schicht : ${(current.schicht || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  Bereich : ${(current.bereich || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  FA-Nr   : ${(current.fa_nr   || '(nicht gesetzt)').padEnd(29)} ║`);
  console.log(`║  Sensor  : ${(sensorLocked ? 'GESPERRT (FA-Wechsel gesperrt)' : 'Frei').padEnd(29)} ║`);
  console.log(`║  Akzept. : ${linieLine.padEnd(29)} ║`);
  console.log(`║  SIM LOW : ${(simulatedLowActive ? 'aktiv' : 'inaktiv').padEnd(29)} ║`);
  console.log('└──────────────────────────────────────────┘\n');
}

function setSimulatedLow(active, source) {
  if (active) {
    if (simulatedLowActive) return;
    simulatedLowActive = true;
    console.log(`  [SIM] LOW aktiv (${source})`);
    triggerSensorHit('SIM-LOW');
    return;
  }
  if (!simulatedLowActive) return;
  simulatedLowActive = false;
  console.log('  [SIM] LOW beendet');
}

function refreshSimulatedLowFromHold() {
  setSimulatedLow(true, `Taste ${SIM_HOLD_KEY}`);
  if (simReleaseTimer) clearTimeout(simReleaseTimer);
  simReleaseTimer = setTimeout(() => {
    setSimulatedLow(false, 'timeout');
    simReleaseTimer = null;
  }, SIM_RELEASE_MS);
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

        // Linie-Filter: nur die konfigurierte Linie akzeptieren (SENSOR_LINIE).
        // Wenn SENSOR_LINIE nicht gesetzt ist, werden alle Linien akzeptiert.
        if (SENSOR_LINIE) {
          const incoming = typeof data.linie === 'string' ? data.linie.trim().toLowerCase() : null;
          const accepted1 = `linie ${SENSOR_LINIE}`.toLowerCase();
          const accepted2 = String(SENSOR_LINIE).toLowerCase();
          if (incoming && incoming !== accepted1 && incoming !== accepted2) {
            console.log(`[Pi-Server] Ignoriere Kontext für "${data.linie}" (akzeptiere nur Linie ${SENSOR_LINIE})`);
            res.writeHead(200); res.end('ignored');
            return;
          }
        }

        // Schichtwechsel → Sensor entsperren
        const newSchicht = data.schicht ?? current.schicht;
        if (newSchicht && current.schicht && newSchicht !== current.schicht) {
          sensorLocked = false;
          console.log('[Pi-Server] Schichtwechsel erkannt – Sensor entsperrt.');
        }

        // FA-Wechsel während Produktion ignorieren
        if (sensorLocked && current.fa_nr && data.fa_nr && data.fa_nr !== current.fa_nr) {
          console.log(`[Pi-Server] FA-Wechsel ignoriert (läuft auf FA ${current.fa_nr}). Neu: ${data.fa_nr}`);
          res.writeHead(200); res.end('locked');
          return;
        }

        current = {
          linie:   data.linie   ?? current.linie,
          schicht: data.schicht ?? current.schicht,
          bereich: data.bereich ?? current.bereich,
          fa_nr:   Object.prototype.hasOwnProperty.call(data, 'fa_nr') ? data.fa_nr : current.fa_nr,
        };

        if (current.fa_nr) sensorLocked = true;

        console.log('[Pi-Server] Kontext aktualisiert:');
        printStatus();
        res.writeHead(200); res.end('OK');
      } catch {
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  if (req.method === 'GET' && (req.url === '/context' || req.url === '/status')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...current,
      sensorLocked,
      gpio: GPIO_LINE_NAME,
      acceptedLinie: SENSOR_LINIE || 'alle',
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/simulate/gpio-low') {
    triggerSensorHit('SIM');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, simulated: true, pin: GPIO_PIN }));
    return;
  }

  if (req.method === 'POST' && req.url === '/sensor/nfc') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let uid = null;
      try { uid = JSON.parse(body || '{}').uid || null; } catch {}
      triggerSensorHit(uid ? `NFC ${uid}` : 'NFC');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, source: 'nfc', uid }));
    });
    return;
  }

  res.writeHead(404); res.end();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[Pi-Server] Port 3000 belegt – beende alten Prozess...');
    try {
      // Linux (Pi): fuser gibt den PID auf Port 3000 frei
      execSync('fuser -k 3000/tcp', { stdio: 'ignore' });
      console.log('[Pi-Server] Port freigegeben – starte neu...');
      setTimeout(() => server.listen(3000), 500);
    } catch (e) { console.error('[Pi-Server] Konnte Port nicht freimachen:', e.message); }
  } else {
    console.error('[Pi-Server] Fehler:', err.message);
  }
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => {
  const linieBanner = SENSOR_LINIE ? `Linie ${SENSOR_LINIE}` : 'alle Linien';
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║  Pi-Server + GPIO läuft auf Port ${PORT}    ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Linie   : ${linieBanner.padEnd(29)} ║`);
  console.log(`║  GPIO    : ${GPIO_LINE_NAME.padEnd(29)} ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  POST /context        → Kontext setzen   ║');
  console.log('║  GET  /context|status → Kontext lesen    ║');
  console.log('║  POST /simulate/gpio-low → Test-Trigger  ║');
  console.log('║  POST /sensor/nfc    → NFC/RFID-Trigger  ║');
  console.log(`║  Taste '${SIM_HOLD_KEY}' halten → SIM LOW (Terminal)  ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('Warte auf Kontext vom Tablet...\n');
  initGpio();
});

process.stdin.setEncoding('utf8');
process.stdin.resume();
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
} else {
  console.log('  (Kein TTY – systemd-Modus, Tastatureingabe deaktiviert)\n');
}

process.stdin.on('data', (key) => {
  const raw = key.toString();
  const k = raw.trim().toLowerCase();
  if (raw === '' || raw === '') {
    if (simReleaseTimer) clearTimeout(simReleaseTimer);
    if (gpioPollTimer) clearInterval(gpioPollTimer);
    if (gpiomonProc) { try { gpiomonProc.kill('SIGTERM'); } catch {} }
    console.log('Beende Pi-Server...');
    process.exit(0);
  }
  if (k === SIM_HOLD_KEY) { refreshSimulatedLowFromHold(); return; }
  if (k === 'c') printStatus();
});

process.on('SIGTERM', () => {
  console.log('[Pi-Server] SIGTERM empfangen – sauber beenden...');
  if (gpiomonProc) { try { gpiomonProc.kill('SIGTERM'); } catch {} }
  process.exit(0);
});
