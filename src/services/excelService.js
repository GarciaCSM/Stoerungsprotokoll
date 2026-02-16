import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import XLSX from 'xlsx';

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
  return { cancelled: false, rows };
}

// Build mapping { articleNumber: sollPerHour }
export function buildSollMap(rows, keyColumnCandidates = ['kopierte Werte', 'artikelnummer', 'artikel nr', 'artnr'], valueColumnCandidates = ['stückzahl pro Stunde', 'stückzahl/Std', 'soll stk', 'soll_stk']) {
  if (!Array.isArray(rows)) return {};

  const normalize = (s) => (s || '').toString().trim().toLowerCase();

  const headerRow = rows[0] || {};
  const headers = Object.keys(headerRow).map(h => h.toString());

  const keyCol = headers.find(h => keyColumnCandidates.map(c => c.toLowerCase()).includes(h.toLowerCase()));
  const valueCol = headers.find(h => valueColumnCandidates.map(c => c.toLowerCase()).includes(h.toLowerCase()));

  // fallback: try to detect by substring
  const fallbackKey = headers.find(h => /artikel|artikelnummer|fa|kopiert/i.test(h));
  const fallbackVal = headers.find(h => /stück|stk|soll|pro stunde|pro_std/i.test(h));

  const finalKey = keyCol || fallbackKey;
  const finalVal = valueCol || fallbackVal;

  const map = {};
  if (!finalKey || !finalVal) return map;

  rows.forEach(r => {
    const rawKey = r[finalKey];
    const rawVal = r[finalVal];
    if (rawKey == null) return;
    const key = String(rawKey).trim();
    const num = Number(String(rawVal).replace(',', '.'));
    if (!Number.isNaN(num)) map[key] = num;
  });

  return map;
}
