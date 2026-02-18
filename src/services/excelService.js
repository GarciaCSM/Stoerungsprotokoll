import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import XLSX from 'xlsx';
import { API_ENDPOINTS } from '../config/apiConfig';

// Parse .xlsx from a DocumentPicker URI and return array of row objects for the specified sheetName
export async function pickAndParseSheet(sheetName = 'SOLL-STUNDEN') {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'] });
  if (res.type !== 'success') return { cancelled: true };
  const uri = res.uri;

  // read file as base64 (SheetJS accepts base64)
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const workbook = XLSX.read(b64, { type: 'base64' });

  const sheetNames = workbook.SheetNames;
  const targetSheetName = sheetNames.find(n => n.toLowerCase() === sheetName.toLowerCase()) || sheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const rowsArr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  return { cancelled: false, rows, rowsArr };
}

// Build mapping { articleNumber: sollPerHour } and { articleNumber: anzahlArbeiter }
export function buildSollMap(rows, rowsArr = null, keyColumnCandidates = ['kopierte Werte', 'artikelnummer', 'artikel nr', 'artnr'], valueColumnCandidates = ['stückzahl pro Stunde', 'stückzahl/Std', 'soll stk', 'soll_stk']) {
  if (!Array.isArray(rows)) return { sollMap: {}, arbeitMap: {} };

  const normalizeKey = (s) => (s || '').toString().trim().replace(/\s+/g, '').toUpperCase();

  // If rows is an array-of-arrays (headerless), treat positional columns
  if (Array.isArray(rows[0])) {
    const sollMap = {};
    const arbeitMap = {};
    rows.forEach(r => {
      const rawKey = r[0];
      const rawVal = r[3]; // column D = SOLL
      const rawArb = r[4]; // column E = Anzahl Arbeiter
      if (rawKey == null) return;
      const key = normalizeKey(String(rawKey));
      const num = Number(String(rawVal || '').replace(',', '.'));
      if (!Number.isNaN(num)) sollMap[key] = num;
      const arb = Number(String(rawArb || '').replace(',', '.'));
      if (!Number.isNaN(arb)) arbeitMap[key] = Math.round(arb);
    });
    return { sollMap, arbeitMap };
  }

  // object-based parsing (header row present)
  const headerRow = rows[0] || {};
  const headers = Object.keys(headerRow).map(h => h.toString());

  const keyCol = headers.find(h => keyColumnCandidates.map(c => c.toLowerCase()).includes(h.toLowerCase()));
  const valueCol = headers.find(h => valueColumnCandidates.map(c => c.toLowerCase()).includes(h.toLowerCase()));
  const arbeitCol = headers.find(h => /kalk\.?\s*ma|anzahl.?arbeiter|arbeiter|mitarbeiter/i.test(h));

  // fallback: try to detect by substring
  const fallbackKey = headers.find(h => /artikel|artikelnummer|fa|kopiert/i.test(h));
  const fallbackVal = headers.find(h => /stück|stk|soll|pro stunde|pro_std/i.test(h));

  const finalKey = keyCol || fallbackKey;
  const finalVal = valueCol || fallbackVal;

  const sollMap = {};
  const arbeitMap = {};
  if (finalKey && finalVal) {
    rows.forEach(r => {
      const rawKey = r[finalKey];
      const rawVal = r[finalVal];
      if (rawKey == null) return;
      const key = normalizeKey(String(rawKey));
      const num = Number(String(rawVal || '').replace(',', '.'));
      if (!Number.isNaN(num)) sollMap[key] = num;
      if (arbeitCol) {
        const rawArb = r[arbeitCol];
        const arb = Number(String(rawArb || '').replace(',', '.'));
        if (!Number.isNaN(arb)) arbeitMap[key] = Math.round(arb);
      }
    });
    return { sollMap, arbeitMap };
  }

  // final fallback: if caller provided rowsArr (array rows), use positional mapping
  if (Array.isArray(rowsArr) && rowsArr.length > 0) {
    let startIdx = 0;
    const first = rowsArr[0];
    if (first && first[0] && /kopierte|artikel/i.test(String(first[0]))) startIdx = 1;
    rowsArr.slice(startIdx).forEach(r => {
      const rawKey = r[0];
      const rawVal = r[3];
      const rawArb = r[4];
      if (rawKey == null) return;
      const key = normalizeKey(String(rawKey));
      const num = Number(String(rawVal || '').replace(',', '.'));
      if (!Number.isNaN(num)) sollMap[key] = num;
      const arb = Number(String(rawArb || '').replace(',', '.'));
      if (!Number.isNaN(arb)) arbeitMap[key] = Math.round(arb);
    });
    return { sollMap, arbeitMap };
  }

  return { sollMap, arbeitMap }; // empty
}

// Fetch mapping from backend endpoint (server reads the SharePoint/OneDrive file)
export async function fetchSollFromServer() {
  const primary = API_ENDPOINTS.SOLL_HOURS;
  const fallbacks = [
    primary,
    // Android emulator default to host's localhost
    primary.replace('192.168.10.127', '10.0.2.2'),
    // Genymotion
    primary.replace('192.168.10.127', '10.0.3.2'),
    // iOS simulator / Expo on same machine
    primary.replace('192.168.10.127', '127.0.0.1')
  ].filter(Boolean);

  const errors = [];
  for (const url of fallbacks) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Server antwortet mit ${resp.status}`);
      const payload = await resp.json();
      return { ok: true, mapping: payload.mapping || {}, arbeitMapping: payload.arbeitMapping || {}, source: payload.source || url };
    } catch (err) {
      errors.push({ url, message: err.message || String(err) });
      // continue to next fallback
    }
  }

  return { ok: false, error: 'Network request failed (tried multiple endpoints)', details: errors };
}
