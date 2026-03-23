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

// Try several candidate filenames/extensions inside configured folder
function findSollFile(baseDir) {
  const candidates = [
    'auftragseingang.xlsx',
    'auftragseingang.xls',
    'auftragseingang.csv',
    'SOLL-STUNDEN.xlsx',
    'SOLL-STUNDEN.csv'
  ];

  for (const c of candidates) {
    const p = path.join(baseDir, c);
    if (fs.existsSync(p)) return p;
  }
  // try baseDir directly if it already points to a file
  if (fs.existsSync(baseDir) && fs.lstatSync(baseDir).isFile()) return baseDir;
  return null;
}

async function loadWorkbookFromSharepoint(url) {
  if (!fetchFn) {
    throw new Error('Kein Fetch verfügbar. Installiere Node 18+ oder nutze undici.');
  }

  const resp = await fetchFn(url);
  if (!resp.ok) {
    throw new Error(`SharePoint-URL antwortet mit HTTP ${resp.status}`);
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
  const findHeader = (candidates) => headers.find(h => candidates.map(c => c.toLowerCase()).includes(h.toLowerCase()))
    || headers.find(h => candidates.some(c => h.toLowerCase().includes(c.toLowerCase())));

  const keyHeader = findHeader(keyCandidates);
  const valueHeader = findHeader(valueCandidates);
  const arbeitHeader = findHeader(arbeitCandidates);
  if (!keyHeader || !valueHeader) return { map: {}, arbeitMap: {} };

  const map = {};
  const arbeitMap = {};
  rows.forEach(r => {
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

class SollController {
  // GET /api/soll-hours
  async getSollHours(req, res) {
    try {
      let configured = process.env.SOLL_BASE_PATH || process.env.SOLL_FILE_PATH || '';

      // allow placeholder {user} or <user> in env var
      const currentUser = process.env.USERNAME || process.env.USERPROFILE?.split(/[\\/]/).pop() || '';
      if (configured && (configured.includes('{user}') || configured.includes('<user>'))) {
        configured = configured.replace(/\{user\}|<user>/g, currentUser);
      }

      // if configured is empty, try to build a default path from USERPROFILE
      let base = configured;
      if (!base || base.length === 0) {
        const profile = process.env.USERPROFILE || process.env.HOME || '';
        base = path.join(profile, 'Cosmetic Service GmbH', 'SCM - Dokumente', 'Auftragseingang');
      }

      const sharepointUrl = process.env.SOLL_SHAREPOINT_URL || null;
      let workbook;
      let source;

      if (sharepointUrl) {
        workbook = await loadWorkbookFromSharepoint(sharepointUrl);
        source = `sharepoint:${sharepointUrl}`;
      } else {
        const filePath = findSollFile(base);
        if (!filePath) return res.status(404).json({ success: false, error: 'SOLL-Datei nicht gefunden', attemptedPath: base });
        workbook = XLSX.readFile(filePath, { codepage: 1252 });
        source = filePath;
      }

      const sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'soll-stunden') || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Try object-based parsing first (header row present)
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      let { map, arbeitMap } = buildSollMapFromRows(rows);

      // If no mapping found, fallback to positional parsing (A=key, D=SOLL, E=Arbeiter)
      if (Object.keys(map).length === 0) {
        const arrayRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        let startIdx = 0;
        if (arrayRows.length > 0) {
          const first = arrayRows[0];
          if (first && first[0] && /kopierte|artikel/i.test(String(first[0]))) startIdx = 1;
        }
        arrayRows.slice(startIdx).forEach(r => {
          const rawKey = r[0];
          const rawVal = r[3]; // column D = SOLL
          const rawArb = r[4]; // column E = Anzahl Arbeiter
          if (rawKey == null) return;
          const key = String(rawKey).trim().replace(/\s+/g, '').toUpperCase();
          const num = Number(String(rawVal || '').replace(',', '.'));
          if (!Number.isNaN(num)) map[key] = num;
          const arb = Number(String(rawArb || '').replace(',', '.'));
          if (!Number.isNaN(arb)) arbeitMap[key] = Math.round(arb);
        });
      }

      res.json({ success: true, source, mapping: map, arbeitMapping: arbeitMap, count: Object.keys(map).length });
    } catch (err) {
      console.error('Failed to read SOLL file:', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  }
}

module.exports = new SollController();