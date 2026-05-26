/**
 * IONOS MariaDB – Verbindungstest
 *
 * Ruft eine soll.php-Hilfsaktion auf dem Server auf die alle
 * stprot_-Tabellen mit ihren Spalten zurückgibt.
 *
 * Verwendung:
 *   node src/Test/IONOSDbTest.js --url=https://deine-domain.de/api
 *
 * Beispiel:
 *   node src/Test/IONOSDbTest.js --url=https://meliiskender.de/stoerung/php-api
 */

const https = require('https');
const http  = require('http');

// ── Basis-URL aus Argument lesen ─────────────────────────────
const argvUrl = process.argv.find(a => a.startsWith('--url='));
if (!argvUrl) {
  console.error('\n  ❌  Bitte --url=... angeben.');
  console.error('  Beispiel: node src/Test/IONOSDbTest.js --url=https://example.de/php-api\n');
  process.exit(1);
}
const BASE_URL = argvUrl.split('=').slice(1).join('=').replace(/\/$/, '');
/** Muss zu GET/DELETE session.php / stoerungen.php passen (Pflichtfeld). */
const TEST_BEREICH_QS = `bereich=${encodeURIComponent('Abfüllung')}`;

// ── Hilfsfunktion: HTTP-GET ───────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Hilfsfunktion: HTTP-POST ──────────────────────────────────
function post(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (url.startsWith('https') ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Ausgabe-Helfer ────────────────────────────────────────────
const ok  = (msg) => console.log(`  ✅  ${msg}`);
const err = (msg) => console.log(`  ❌  ${msg}`);
const sep = ()    => console.log('  ' + '─'.repeat(60));

// ════════════════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════════════════
async function run() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  IONOS MariaDB – Verbindungstest');
  console.log(`  Ziel: ${BASE_URL}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── 1. Erreichbarkeit: soll.php GET (leere Liste erwartet) ───
  console.log('📡  Test 1 – Erreichbarkeit (GET /soll.php)');
  sep();
  try {
    const res = await get(`${BASE_URL}/soll.php`);
    if (res.status === 200) {
      ok(`HTTP ${res.status} – Server erreichbar`);
      ok(`Antwort: ${JSON.stringify(res.body).substring(0, 120)}`);
    } else {
      err(`HTTP ${res.status}`);
      console.log('     Body:', res.body);
    }
  } catch (e) {
    err(`Verbindung fehlgeschlagen: ${e.message}`);
  }

  // ── 2. Session GET (404 erwartet, heißt DB-Zugriff klappt) ───
  console.log('\n📡  Test 2 – Session abrufen (404 = DB-Verbindung ok)');
  sep();
  try {
    const url = `${BASE_URL}/session.php?linie=Test&schicht=Test&datum=2000-01-01&${TEST_BEREICH_QS}`;
    const res = await get(url);
    if (res.status === 404) {
      ok(`HTTP 404 erwartet – DB-Verbindung funktioniert`);
      ok(`Meldung: ${res.body?.error || JSON.stringify(res.body)}`);
    } else if (res.status === 200) {
      ok(`HTTP 200 – Session gefunden (Tabelle stprot_produktion_session existiert)`);
    } else {
      err(`HTTP ${res.status}`);
      console.log('     Body:', JSON.stringify(res.body));
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── 3. Session POST (UPSERT – schreibt eine Testzeile) ────────
  console.log('\n📡  Test 3 – Session schreiben (POST /session.php)');
  sep();
  let sessionId = null;
  try {
    const res = await post(`${BASE_URL}/session.php`, {
      linie:           'TEST-Linie',
      schicht:         'TEST-Schicht',
      bereich:         'Abfüllung',
      datum:           '2000-01-01',
      session_run_key: '2000-01-01 00:00:00::Abfüllung',
      timer_start_time:'2000-01-01 00:00:00',
      linienfuehrer:   'Test User',
      elapsed_seconds: 42,
      running:         1,
      // send some dummy SOLL values to exercise new columns
      soll_pro_stunde: 100,
      soll_aktuell:    10,
    });
    if (res.status === 200 && res.body?.success) {
      sessionId = res.body.session_id;
      ok(`Session gespeichert – ID: ${sessionId}`);
    } else {
      err(`HTTP ${res.status}`);
      console.log('     Body:', JSON.stringify(res.body));
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── 4. Session GET (jetzt muss sie da sein) ───────────────────
  console.log('\n📡  Test 4 – Session lesen (GET /session.php)');
  sep();
  try {
    const url = `${BASE_URL}/session.php?linie=TEST-Linie&schicht=TEST-Schicht&datum=2000-01-01&${TEST_BEREICH_QS}`;
    const res = await get(url);
    if (res.status === 200) {
      const s = res.body;
      ok('Session erfolgreich gelesen:');
      console.log(`       linie:            ${s.linie}`);
      console.log(`       schicht:          ${s.schicht}`);
      console.log(`       datum:            ${s.datum}`);
      console.log(`       linienfuehrer:    ${s.linienfuehrer}`);
      console.log(`       elapsed_seconds:  ${s.elapsed_seconds}`);
      console.log(`       running:          ${s.running}`);
      console.log(`       soll_pro_stunde:  ${s.soll_pro_stunde}`);
      console.log(`       soll_aktuell:     ${s.soll_aktuell}`);
      console.log(`       aktualisiert_am:  ${s.aktualisiert_am}`);
    } else {
      err(`HTTP ${res.status} – ${res.body?.error}`);
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── 5. Störung eintragen ──────────────────────────────────────
  console.log('\n📡  Test 5 – Störung schreiben (POST /stoerungen.php)');
  sep();
  let stoerungId = null;
  try {
    const now = new Date().toISOString();
    const res = await post(`${BASE_URL}/stoerungen.php`, {
      linie:           'TEST-Linie',
      schicht:         'TEST-Schicht',
      bereich:         'Abfüllung',
      datum:           '2000-01-01',
      stoerung_typ:    'Testfehler',
      notiz:           'Automatischer Verbindungstest',
      start_time:      now,
      end_time:        now,
      dauer_sekunden:  10,
      linienfuehrer:   'Test User',
    });
    if (res.status === 201 && res.body?.success) {
      stoerungId = res.body.id;
      ok(`Störung gespeichert – ID: ${stoerungId}`);
    } else {
      err(`HTTP ${res.status}`);
      console.log('     Body:', JSON.stringify(res.body));
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── 6. Störungen lesen ────────────────────────────────────────
  console.log('\n📡  Test 6 – Störungen lesen (GET /stoerungen.php)');
  sep();
  try {
    const url = `${BASE_URL}/stoerungen.php?linie=TEST-Linie&schicht=TEST-Schicht&datum=2000-01-01&${TEST_BEREICH_QS}`;
    const res = await get(url);
    if (res.status === 200 && Array.isArray(res.body)) {
      ok(`${res.body.length} Störung(en) gefunden`);
      if (res.body.length > 0) {
        const s = res.body[0];
        console.log(`       stoerung_typ:    ${s.stoerung_typ}`);
        console.log(`       dauer_sekunden:  ${s.dauer_sekunden}`);
        console.log(`       erstellt_am:     ${s.erstellt_am}`);
      }
    } else {
      err(`HTTP ${res.status}`);
      console.log('     Body:', JSON.stringify(res.body));
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── 7. SOLL UPSERT ────────────────────────────────────────────
  console.log('\n📡  Test 7 – SOLL schreiben (POST /soll.php)');
  sep();
  try {
    const res = await post(`${BASE_URL}/soll.php`, {
      artikel_nr:        'TEST-9999',
      stueck_pro_stunde: 120,
      kalk_ma:           3,
      quelle:            'Verbindungstest',
    });
    if (res.status === 200 && res.body?.success) {
      ok(`SOLL gespeichert – upserted: ${res.body.upserted}`);
    } else {
      err(`HTTP ${res.status}`);
      console.log('     Body:', JSON.stringify(res.body));
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── 8. SOLL lesen ─────────────────────────────────────────────
  console.log('\n📡  Test 8 – SOLL lesen (GET /soll.php)');
  sep();
  try {
    const res = await get(`${BASE_URL}/soll.php?artikel_nr=TEST-9999`);
    if (res.status === 200) {
      ok(`SOLL gefunden:`);
      console.log(`       artikel_nr:        ${res.body.artikel_nr}`);
      console.log(`       stueck_pro_stunde: ${res.body.stueck_pro_stunde}`);
      console.log(`       kalk_ma:           ${res.body.kalk_ma}`);
    } else {
      err(`HTTP ${res.status} – ${res.body?.error}`);
    }
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  // ── Aufräumen: Testdaten löschen ──────────────────────────────
  console.log('\n🧹  Testdaten aufräumen (DELETE /session.php)');
  sep();
  try {
    const url = `${BASE_URL}/session.php?linie=TEST-Linie&schicht=TEST-Schicht&datum=2000-01-01&${TEST_BEREICH_QS}&session_run_key=${encodeURIComponent('2000-01-01 00:00:00::Abfüllung')}`;
    const mod  = url.startsWith('https') ? https : http;
    const result = await new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const req = mod.request(
        { hostname: parsed.hostname, port: parsed.port || 443,
          path: parsed.pathname + parsed.search, method: 'DELETE' },
        (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
        }
      );
      req.on('error', reject);
      req.end();
    });
    if (result.body?.success) ok('Testdaten entfernt');
    else console.log('     ', JSON.stringify(result.body));
  } catch (e) {
    err(`Fehler: ${e.message}`);
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Test abgeschlossen');
  console.log('══════════════════════════════════════════════════════════════\n');
}

run().catch(e => { console.error('Unerwarteter Fehler:', e); process.exit(1); });
