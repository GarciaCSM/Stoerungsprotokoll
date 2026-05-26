/**
 * Beim Serverstart (optional): ODBC-FA → IONOS; lokale SOLL-Datei → Upload nach IONOS (soll_file_upload.php);
 * dieselben Werte zusätzlich als Zeilen in stprot_soll_konfiguration (soll.php). Tablets: GET soll_hours.php.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const database = require('../config/database');
const { loadSollMappingsFromEnv, getLocalSollFilePath } = require('./sollFileService');
const { API_CONFIG } = require('../config/config');

function postJson(urlString, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const u = new URL(urlString);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 60000,
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => {
        data += c;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.write(bodyStr);
    req.end();
  });
}

function postMultipartFile(urlString, secret, filePath) {
  return new Promise((resolve, reject) => {
    const boundary = `----StprotBoundary${Date.now()}`;
    let fileBuf;
    try {
      fileBuf = fs.readFileSync(filePath);
    } catch (e) {
      reject(e);
      return;
    }
    const filename = path.basename(filePath).replace(/[\r\n"]/g, '_');
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === '.csv' || ext === '.txt'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="secret"\r\n\r\n${String(secret)}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${mime}\r\n\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, fileBuf, tail]);

    const u = new URL(urlString);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      timeout: 120000,
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => {
        data += c;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.write(body);
    req.end();
  });
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchFaRowsFromOdbc(limit) {
  const sql = `
    SELECT TOP (${Number(limit)})
      CAST(FANr AS VARCHAR(50)) AS FANr,
      CAST(ArtikelNr AS VARCHAR(50)) AS ArtikelNr,
      CAST(Artikelbezeichnung AS NVARCHAR(500)) AS Artikelbezeichnung,
      Verarbeitungsstatus
    FROM dbo.FAKoepfe
    WHERE Verarbeitungsstatus IN (30, 35, 36)
    ORDER BY FANr DESC
  `;
  return database.executeQuery(sql, []);
}

/**
 * @param {{ silent?: boolean }} opts
 * @returns {Promise<object>}
 */
async function runIonosSync(opts = {}) {
  const silent = !!opts.silent;
  const log = silent ? () => {} : (...a) => console.log('[IONOS-Sync]', ...a);

  const base = (API_CONFIG.IONOS_SYNC_BASE_URL || '').replace(/\/$/, '');
  const secret = API_CONFIG.IONOS_SYNC_SECRET || '';

  if (!base) {
    log('Übersprungen: IONOS_SYNC_BASE_URL nicht gesetzt');
    return { skipped: true, reason: 'no base url' };
  }

  const out = { fa: null, soll: null };

  // ── FA → fa_sync.php ─────────────────────────────────────────
  if (API_CONFIG.IONOS_SYNC_FA) {
    const limit = Math.min(Math.max(1, Number(API_CONFIG.IONOS_FA_SYNC_LIMIT) || 8000), 50000);
    try {
      const rows = await fetchFaRowsFromOdbc(limit);
      const items = (rows || []).map((r) => ({
        fanr: String(r.FANr ?? '').trim(),
        artikel_nr: r.ArtikelNr != null ? String(r.ArtikelNr).trim() : null,
        artikel_bezeichnung: r.Artikelbezeichnung != null ? String(r.Artikelbezeichnung) : null,
        verarbeitungsstatus: r.Verarbeitungsstatus != null ? Number(r.Verarbeitungsstatus) : null,
      })).filter((x) => x.fanr);

      const batches = chunkArray(items, Number(API_CONFIG.IONOS_SYNC_BATCH_SIZE) || 150);
      let okB = 0;
      let lastErr = null;
      for (const batch of batches) {
        const url = `${base}/fa_sync.php`;
        const res = await postJson(url, { secret: secret || '', items: batch });
        if (res.status === 200 && res.body && res.body.success) {
          okB += 1;
        } else {
          lastErr = { status: res.status, body: res.body };
          break;
        }
      }
      out.fa = { batches: batches.length, okBatches: okB, rows: items.length, error: lastErr };
      if (lastErr) log('FA-Sync Fehler:', JSON.stringify(lastErr));
      else log(`FA-Sync ok: ${items.length} Zeilen in ${okB}/${batches.length} Paketen`);
    } catch (e) {
      out.fa = { error: e.message };
      log('FA-Sync Exception:', e.message);
    }
  }

  // ── Excel-SOLL: Datei auf IONOS ablegen + Zeilen in DB (soll.php) ──
  if (API_CONFIG.IONOS_SYNC_SOLL) {
    try {
      let fileUpload = null;
      if (API_CONFIG.IONOS_UPLOAD_SOLL_FILE) {
        const localPath = getLocalSollFilePath();
        if (localPath) {
          try {
            const up = await postMultipartFile(`${base}/soll_file_upload.php`, secret || '', localPath);
            const ok =
              up.status === 200 &&
              up.body &&
              typeof up.body === 'object' &&
              up.body.success;
            fileUpload = { ok, status: up.status, savedAs: ok ? up.body.saved_as : null, error: ok ? null : up.body };
            if (ok) {
              log(`SOLL-Datei auf IONOS gespeichert: ${up.body.saved_as || 'ok'}`);
            } else {
              log('SOLL-Datei-Upload fehlgeschlagen:', JSON.stringify(up.body));
            }
          } catch (e) {
            fileUpload = { ok: false, error: e.message };
            log('SOLL-Datei-Upload Exception:', e.message);
          }
        } else {
          log('SOLL-Datei-Upload übersprungen: keine lokale Datei (nur SOLL_REMOTE_URL?)');
        }
      }

      const { map, arbeitMap, source, count } = await loadSollMappingsFromEnv();
      const entries = Object.entries(map);
      let ok = 0;
      let fail = 0;
      const quelle = `server-sync:${pathBasename(source)}`;

      for (const [artikelNrNorm, stueckProStunde] of entries) {
        const body = {
          artikel_nr: artikelNrNorm,
          stueck_pro_stunde: stueckProStunde,
          kalk_ma: arbeitMap[artikelNrNorm] != null ? arbeitMap[artikelNrNorm] : null,
          quelle,
        };
        const res = await postJson(`${base}/soll.php`, body);
        if (res.status === 200 && res.body && res.body.success) ok += 1;
        else fail += 1;
      }

      out.soll = { source, count, ok, fail, fileUpload };
      log(`SOLL-Sync DB: ${ok} ok, ${fail} fehlgeschlagen (${count} Artikel, Quelle: ${source})`);
    } catch (e) {
      out.soll = { error: e.message, attemptedPath: e.attemptedPath };
      log('SOLL-Sync übersprungen / Fehler:', e.message);
    }
  }

  return out;
}

function pathBasename(s) {
  if (!s || typeof s !== 'string') return 'unknown';
  const parts = s.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || s;
}

module.exports = { runIonosSync, postJson, postMultipartFile };
