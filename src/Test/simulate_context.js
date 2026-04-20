/*
  Context simulator - src/Test/simulate_context.js
  -------------------------------------------------
  Sends dummy context data to the Pi endpoint without starting the app.
  IMPORTANT: It does NOT auto-increment locally. It waits for PI responses
  and prints product count values only if PI returns them.

  Usage:
    node src/Test/simulate_context.js
    node src/Test/simulate_context.js --once
    node src/Test/simulate_context.js --pi-url=http://192.168.10.134:3000

  Options:
    --pi-url=http://localhost:3000
    --send-path=/context
    --confirm-path=/context/confirm
    --read-path=/context
    --linie=Linie 1
    --schicht=Fruehschicht
    --bereich=Abfuellung
    --leader=Dummy Leader
    --fa=DUMMY-FA-1001
    --send-interval=5000
    --retries=2
    --timeout=8000
    --loop          send repeatedly at the configured interval
    --dry-run
*/

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.substring(name.length + 3) : def;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getConfiguredPiUrl() {
  try {
    const cfgPath = path.resolve(__dirname, '..', 'config', 'apiConfig.js');
    const content = fs.readFileSync(cfgPath, 'utf8');

    const ipMatch = content.match(/const\s+PI_IP\s*=\s*['"`]([^'"`]+)['"`]/);
    const piIp = ipMatch && ipMatch[1] ? ipMatch[1] : null;

    const hostMatch = content.match(/const\s+PI_HOSTNAME\s*=\s*['"`]([^'"`]+)['"`]/);
    const piHost = hostMatch && hostMatch[1] ? hostMatch[1] : null;

    const directMatch = content.match(/PI_SERVER_URL\s*=\s*`([^`]+)`/);
    if (directMatch && directMatch[1]) {
      let rawUrl = directMatch[1];
      if (rawUrl.includes('${PI_IP}') && piIp) {
        return rawUrl.replace('${PI_IP}', piIp);
      }
      if (rawUrl.includes('${PI_HOSTNAME}') && piHost) {
        return rawUrl.replace('${PI_HOSTNAME}', piHost);
      }
      return rawUrl;
    }

    if (piHost) return `http://${piHost}:3000`;
    if (piIp) return `http://${piIp}:3000`;
  } catch {
    // ignore and use fallback below
  }
  return 'http://sensor1.local:3000';
}

const PI_URL = arg('pi-url', getConfiguredPiUrl());
const SEND_PATH = arg('send-path', '/context');
const CONFIRM_PATH = arg('confirm-path', '/context/confirm');
const READ_PATH = arg('read-path', '/context');
const LINIE = arg('linie', 'Linie 1');
const SCHICHT = arg('schicht', 'Fruehschicht');
const BEREICH = arg('bereich', 'Abfuellung');
const LEADER = arg('leader', 'Dummy Leader');
const FA_NR = arg('fa', 'DUMMY-FA-1001');
const SEND_INTERVAL_MS = Number(arg('send-interval', '5000'));
const RETRIES = Number(arg('retries', '2'));
const REQUEST_TIMEOUT_MS = Number(arg('timeout', '8000'));
const LOOP = hasFlag('loop');
const ONCE = !LOOP;
const DRY_RUN = hasFlag('dry-run');

const COUNT_KEYS = [
  'count',
  'counter',
  'productCount',
  'product_count',
  'productsCounted',
  'products_counted',
  'anzahl_produkte',
  'zaehler',
  'ist',
];

const contextPayload = {
  linie: LINIE,
  schicht: SCHICHT,
  bereich: BEREICH,
  linienfuehrer: LEADER,
  fa_nr: FA_NR,
  selection_confirmed: true,
  selectionConfirmed: true,
  confirmed: true,
  status: 'confirmed',
};

let sendTimer = null;
let inFlight = false;
let lastPrintedCount = null;

function parseResponseBody(raw) {
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function request(rawUrl, method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(rawUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;

    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data ? Buffer.byteLength(data) : 0,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            raw,
            parsed: parseResponseBody(raw),
          });
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const err = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function requestWithRetry(rawUrl, method, path, body, retries) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await request(rawUrl, method, path, body);
    } catch (e) {
      lastError = e;
      attempt += 1;
      if (attempt <= retries) {
        console.log(`[simulate_context] retry ${attempt}/${retries} for ${method} ${path} after error: ${e.code || e.message}`);
      }
    }
  }

  throw lastError;
}

function findCountInObject(obj) {
  if (!obj || typeof obj !== 'object') return null;

  for (const key of COUNT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = Number(obj[key]);
      if (Number.isFinite(value)) return value;
    }
  }

  if (obj.data && typeof obj.data === 'object') {
    return findCountInObject(obj.data);
  }
  if (obj.result && typeof obj.result === 'object') {
    return findCountInObject(obj.result);
  }

  return null;
}

function extractCount(parsed) {
  if (parsed == null) return null;

  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }

  if (typeof parsed === 'string') {
    const n = Number(parsed.trim());
    return Number.isFinite(n) ? n : null;
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const n = extractCount(item);
      if (n != null) return n;
    }
    return null;
  }

  return findCountInObject(parsed);
}

function printCountFromPi(count, source) {
  const time = new Date().toLocaleTimeString('de-DE');
  if (lastPrintedCount !== count) {
    console.log(`[${time}] PI ${source} -> gezaehlte Produkte: ${count}`);
    lastPrintedCount = count;
  } else {
    console.log(`[${time}] PI ${source} bestaetigt, Zaehler unveraendert: ${count}`);
  }
}

async function sendContextAndRead() {
  if (DRY_RUN) {
    console.log('[simulate_context] dry-run: context would be sent:', contextPayload);
    return true;
  }

  try {
    const postRes = await requestWithRetry(PI_URL, 'POST', SEND_PATH, contextPayload, RETRIES);
    if (postRes.status < 200 || postRes.status >= 300) {
      console.log(`[simulate_context] context send failed (${postRes.status}): ${postRes.raw}`);
      return false;
    }

    console.log(`[simulate_context] context sent (${postRes.status}) -> ${contextPayload.linie} / ${contextPayload.schicht} / ${contextPayload.bereich}`);

    // Optional: explicit confirmation call for PI backends that require a separate confirm step.
    try {
      const confirmRes = await requestWithRetry(PI_URL, 'POST', CONFIRM_PATH, contextPayload, 0);
      if (confirmRes.status >= 200 && confirmRes.status < 300) {
        console.log(`[simulate_context] shift confirmed via ${CONFIRM_PATH} (${confirmRes.status})`);
      } else if (confirmRes.status !== 404 && confirmRes.status !== 405) {
        console.log(`[simulate_context] confirm call returned ${confirmRes.status}: ${confirmRes.raw}`);
      }
    } catch (_ignore) {
      // Ignore confirm errors; many PI servers only provide /context.
    }

    let count = extractCount(postRes.parsed);
    if (count != null) {
      printCountFromPi(count, 'POST');
      return true;
    }

    const getRes = await requestWithRetry(PI_URL, 'GET', READ_PATH, null, RETRIES);
    if (getRes.status >= 200 && getRes.status < 300) {
      count = extractCount(getRes.parsed);
      if (count != null) {
        printCountFromPi(count, 'GET');
        return true;
      }
      console.log('[simulate_context] PI antwortet, aber ohne Produktzaehler-Feld.');
      return true;
    }

    console.log(`[simulate_context] GET ${READ_PATH} failed (${getRes.status}): ${getRes.raw}`);
    return false;
  } catch (e) {
    const reason = e && (e.code || e.message) ? `${e.code || ''} ${e.message || ''}`.trim() : String(e);
    console.log(`[simulate_context] PI request error: ${reason}`);
    return false;
  }
}

async function tick() {
  if (inFlight) return;
  inFlight = true;
  try {
    return await sendContextAndRead();
  } finally {
    inFlight = false;
  }
}

async function start() {
  console.log('\n=== Context simulator started ===');
  console.log(`pi-url        : ${PI_URL}`);
  console.log(`send-path     : ${SEND_PATH}`);
  console.log(`confirm-path  : ${CONFIRM_PATH}`);
  console.log(`read-path     : ${READ_PATH}`);
  console.log(`linie         : ${LINIE}`);
  console.log(`schicht       : ${SCHICHT}`);
  console.log(`bereich       : ${BEREICH}`);
  console.log(`leader        : ${LEADER}`);
  console.log(`fa_nr         : ${FA_NR}`);
  console.log(`send-interval : ${SEND_INTERVAL_MS} ms`);
  console.log(`retries       : ${RETRIES}`);
  console.log(`timeout       : ${REQUEST_TIMEOUT_MS} ms`);
  console.log(`mode          : ${DRY_RUN ? 'dry-run' : LOOP ? 'loop' : 'once'}`);

  const ok = await tick();

  if (LOOP) {
    sendTimer = setInterval(() => {
      tick();
    }, SEND_INTERVAL_MS);
    console.log('Press Ctrl+C to stop.\n');
  } else {
    console.log('Simulationsprozess bleibt aktiv. Drücke Strg+C zum Beenden.');
    process.stdin.resume();
  }
}

function shutdown(code) {
  if (sendTimer) clearInterval(sendTimer);
  process.exit(code);
}

process.on('SIGINT', () => {
  console.log('\n[simulate_context] stopping...');
  shutdown(0);
});

start().catch((e) => {
  console.error('[simulate_context] fatal error:', e.message);
  shutdown(1);
});
