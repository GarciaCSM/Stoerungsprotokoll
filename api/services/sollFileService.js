const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

let fetchFn = global.fetch;
if (!fetchFn) {
  try {
    fetchFn = require('undici').fetch;
  } catch (_e) {
    fetchFn = null;
  }
}

function findSollFile(baseDir) {
  const candidates = [
    'auftragseingang.xlsx',
    'auftragseingang.xls',
    'auftragseingang.csv',
    'SOLL-STUNDEN.xlsx',
    'SOLL-STUNDEN.csv',
  ];
  for (const c of candidates) {
    const p = path.join(baseDir, c);
    if (fs.existsSync(p)) return p;
  }
  if (fs.existsSync(baseDir) && fs.lstatSync(baseDir).isFile()) return baseDir;
  return null;
}

async function loadWorkbookFromRemoteUrl(url, label = 'Remote') {
  if (!fetchFn) {
    throw new Error('Kein Fetch verfügbar. Node 18+ oder undici installieren.');
  }
  const resp = await fetchFn(url);
  if (!resp.ok) {
    throw new Error(`${label}-URL antwortet mit HTTP ${resp.status}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return XLSX.read(buffer, { type: 'buffer', codepage: 1252 });
}

function buildSollMapFromRows(rows) {
  const keyCandidates = ['kopierte Werte', 'artikelnummer', 'artikel nr', 'artnr', 'artikelnr'];
  const valueCandidates = ['stückzahl pro Stunde', 'stückzahl/Std', 'soll stk', 'soll_stk', 'stk/std', 'soll'];
  const arbeitCandidates = ['kalk. MA', 'kalk.MA', 'kalkMA', 'kalk. ma', 'anzahl arbeiter', 'anzahlarbeiter', 'arbeiter', 'mitarbeiter'];

  const headers = Object.keys(rows[0] || {}).map(h => String(h));
  const findHeader = (candidates) =>
    headers.find(h => candidates.map(c => c.toLowerCase()).includes(h.toLowerCase())) ||
    headers.find(h => candidates.some(c => h.toLowerCase().includes(c.toLowerCase())));

  const keyHeader = findHeader(keyCandidates);
  const valueHeader = findHeader(valueCandidates);
  const arbeitHeader = findHeader(arbeitCandidates);
  if (!keyHeader || !valueHeader) return { map: {}, arbeitMap: {} };

  const map = {};
  const arbeitMap = {};
  rows.forEach((r) => {
    const rawKey = r[keyHeader];
    const rawVal = r[valueHeader];
    if (rawKey == null) return;
    const key = String(rawKey).trim().replace(/\s+/g, '').toUpperCase();
    const num = Number(String(rawVal || '').replace(',', '.'));
    if (!Number.isNaN(num)) map[key] = num;
    if (arbeitHeader) {
      const rawArb = r[arbeitHeader];
      const arb = Number(String(rawArb || '').replace(',', '.'));
      if (!Number.isNaN(arb)) arbeitMap[key] = Math.round(arb);
    }
  });
  return { map, arbeitMap };
}

/**
 * Liest SOLL-Mappings. Reihenfolge:
 * 1) SOLL_REMOTE_URL – beliebige http(s)-URL (.xlsx/.xls), z. B. SharePoint/Nextcloud/IONOS
 * 2) SOLL_SHAREPOINT_URL – Alias, gleiche Logik
 * 3) Lokaler Ordner / SOLL_FILE_PATH / SOLL_BASE_PATH (wie bisher)
 *
 * Ohne Remote-URL und ohne lokale Datei: klare Fehlermeldung mit Hinweis auf .env.
 */
async function loadSollMappingsFromEnv() {
  const remoteUrl =
    (process.env.SOLL_REMOTE_URL && String(process.env.SOLL_REMOTE_URL).trim()) ||
    (process.env.SOLL_SHAREPOINT_URL && String(process.env.SOLL_SHAREPOINT_URL).trim()) ||
    null;

  let configured = process.env.SOLL_BASE_PATH || process.env.SOLL_FILE_PATH || '';
  const currentUser = process.env.USERNAME || process.env.USERPROFILE?.split(/[\\/]/).pop() || '';
  if (configured && (configured.includes('{user}') || configured.includes('<user>'))) {
    configured = configured.replace(/\{user\}|<user>/g, currentUser);
  }

  let base = configured;
  if (!base || base.length === 0) {
    const profile = process.env.USERPROFILE || process.env.HOME || '';
    base = path.join(profile, 'Cosmetic Service GmbH', 'SCM - Dokumente', 'Auftragseingang');
  }

  let workbook;
  let source;

  if (remoteUrl) {
    workbook = await loadWorkbookFromRemoteUrl(remoteUrl, 'SOLL');
    source = `remote:${remoteUrl}`;
  } else {
    const filePath = findSollFile(base);
    if (!filePath) {
      const err = new Error(
        'SOLL-Quelle fehlt: Bitte SOLL_REMOTE_URL (HTTPS-Link zur .xlsx) oder SOLL_FILE_PATH / lokalen Ordner in .env setzen.',
      );
      err.attemptedPath = base;
      err.code = 'SOLL_SOURCE_MISSING';
      throw err;
    }
    workbook = XLSX.readFile(filePath, { codepage: 1252 });
    source = filePath;
  }

  const sheetName =
    workbook.SheetNames.find((n) => n.toLowerCase() === 'soll-stunden') || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  let { map, arbeitMap } = buildSollMapFromRows(rows);

  if (Object.keys(map).length === 0) {
    const arrayRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    let startIdx = 0;
    if (arrayRows.length > 0) {
      const first = arrayRows[0];
      if (first && first[0] && /kopierte|artikel/i.test(String(first[0]))) startIdx = 1;
    }
    arrayRows.slice(startIdx).forEach((r) => {
      const rawKey = r[0];
      const rawVal = r[3];
      const rawArb = r[4];
      if (rawKey == null) return;
      const key = String(rawKey).trim().replace(/\s+/g, '').toUpperCase();
      const num = Number(String(rawVal || '').replace(',', '.'));
      if (!Number.isNaN(num)) map[key] = num;
      const arb = Number(String(rawArb || '').replace(',', '.'));
      if (!Number.isNaN(arb)) arbeitMap[key] = Math.round(arb);
    });
  }

  return { map, arbeitMap, source, count: Object.keys(map).length };
}

/**
 * Absoluter Pfad zur lokalen SOLL-Datei (.xlsx/.xls/.csv), oder null wenn nur Remote-URL konfiguriert ist.
 * Für Upload nach IONOS (soll_file_upload.php).
 */
function getLocalSollFilePath() {
  const remoteUrl =
    (process.env.SOLL_REMOTE_URL && String(process.env.SOLL_REMOTE_URL).trim()) ||
    (process.env.SOLL_SHAREPOINT_URL && String(process.env.SOLL_SHAREPOINT_URL).trim()) ||
    null;
  if (remoteUrl) return null;

  let configured = process.env.SOLL_BASE_PATH || process.env.SOLL_FILE_PATH || '';
  const currentUser = process.env.USERNAME || process.env.USERPROFILE?.split(/[\\/]/).pop() || '';
  if (configured && (configured.includes('{user}') || configured.includes('<user>'))) {
    configured = configured.replace(/\{user\}|<user>/g, currentUser);
  }

  let base = configured;
  if (!base || base.length === 0) {
    const profile = process.env.USERPROFILE || process.env.HOME || '';
    base = path.join(profile, 'Cosmetic Service GmbH', 'SCM - Dokumente', 'Auftragseingang');
  }

  const found = findSollFile(base);
  return found ? path.resolve(found) : null;
}

module.exports = {
  loadSollMappingsFromEnv,
  findSollFile,
  getLocalSollFilePath,
};
