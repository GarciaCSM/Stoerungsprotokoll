import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { pickAndParseSheet, buildSollMap, fetchSollFromServer } from '../../../services/excelService';
import FAService from '../../../services/faService';
import { formatLocalDateYmd } from '../../../utils/dateSafe';

/**
 * Manages SOLL/IST data: loading from cache + server, Excel import, and IST polling.
 *
 * @param {object} opts
 * @param {object|null} opts.selectedFA - currently selected FA { FANr, ArtikelNr, ... }
 */
export function useSollData({ selectedFA, shiftData }) {
  const [sollPerHour, setSollPerHour] = useState(0);
  const [sollMap, setSollMap] = useState({});
  const [arbeitMap, setArbeitMap] = useState({});
  const [anzahlArbeiter, setAnzahlArbeiter] = useState(null);
  const [isImportingSoll, setIsImportingSoll] = useState(false);
  const [isFetchingSoll, setIsFetchingSoll] = useState(false);
  const [istValue, setIstValue] = useState(0);

  // ─── Load cache, then silently refresh from server ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('soll_hours_map');
        const map = raw ? JSON.parse(raw) : {};
        setSollMap(map || {});
        const rawArb = await AsyncStorage.getItem('arbeit_map');
        setArbeitMap(normalizeArbeitMap(rawArb ? JSON.parse(rawArb) : {}));
      } catch (e) {
        console.warn('Failed to load persisted SOLL mapping', e);
      }

      try {
        const remote = await fetchSollFromServer();
        if (remote.ok) applyRemoteMappings(remote.mapping || {}, remote.arbeitMapping || {});
      } catch (e) {
        console.warn('Background SOLL refresh failed', e);
      }
    })();
  }, []);

  // ─── Update SOLL + Arbeiter when selection or maps change ──────────────────
  useEffect(() => {
    if (selectedFA?.ArtikelNr) {
      const lookup = normKey(selectedFA.ArtikelNr);
      setSollPerHour(sollMap[lookup] ?? 0);
      setAnzahlArbeiter(arbeitMap[lookup] != null ? Math.round(Number(arbeitMap[lookup])) : null);
    } else {
      setSollPerHour(0);
      setAnzahlArbeiter(null);
    }
  }, [selectedFA, sollMap, arbeitMap]);

  // ─── Poll IST value – direkt aus Session-IST (ist.php) ───────────────────
  useEffect(() => {
    if (!selectedFA?.FANr) {
      setIstValue(0);
      return;
    }

    let mounted = true;
    // query IST for tomorrow
    const datum = formatLocalDateYmd();
    const linie   = shiftData?.selectedLine;
    const schicht = shiftData?.selectedShift;
    const bereich = shiftData?.selectedBereich;
    const poll = async () => {
      try {
        if (!linie || !schicht) { if (mounted) setIstValue(0); return; }
        const v = await FAService.getDbIst(linie, schicht, datum, bereich);
        if (mounted) setIstValue(v);
      } catch (_) {}
    };
    poll();
    const timer = setInterval(poll, 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, [selectedFA?.FANr, shiftData?.selectedLine, shiftData?.selectedShift, shiftData?.selectedBereich]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const normKey = (v) => String(v).trim().replace(/\s+/g, '').toUpperCase();
  const normalizeArbeitMap = (raw) =>
    Object.fromEntries(Object.entries(raw || {}).map(([k, v]) => [k, Number.isFinite(Number(v)) ? Math.round(Number(v)) : v]));

  const applyRemoteMappings = async (map, aMap) => {
    await AsyncStorage.setItem('soll_hours_map', JSON.stringify(map));
    await AsyncStorage.setItem('arbeit_map', JSON.stringify(aMap));
    setSollMap(map);
    setArbeitMap(normalizeArbeitMap(aMap));
  };

  // ─── Import from local Excel file ──────────────────────────────────────────
  const handleImportSoll = async () => {
    setIsImportingSoll(true);
    try {
      const parsed = await pickAndParseSheet('SOLL-STUNDEN');
      if (parsed.cancelled) return;
      const { sollMap: map, arbeitMap: aMap } = buildSollMap(parsed.rows || [], parsed.rowsArr || null);
      await AsyncStorage.setItem('soll_hours_map', JSON.stringify(map));
      await AsyncStorage.setItem('arbeit_map', JSON.stringify(aMap));
      setSollMap(map || {});
      setArbeitMap(normalizeArbeitMap(aMap));
      if (selectedFA?.ArtikelNr) {
        const lookup = normKey(selectedFA.ArtikelNr);
        if (map[lookup] != null) setSollPerHour(map[lookup]);
        if (aMap[lookup] != null) setAnzahlArbeiter(Math.round(Number(aMap[lookup])));
      }
      Alert.alert('Import erfolgreich', `${Object.keys(map).length} SOLL-Einträge importiert.`);
    } catch (e) {
      Alert.alert('Import fehlgeschlagen', e.message || String(e));
    } finally {
      setIsImportingSoll(false);
    }
  };

  // ─── Refresh from server ────────────────────────────────────────────────────
  const handleRefreshSoll = async () => {
    setIsFetchingSoll(true);
    try {
      const remote = await fetchSollFromServer();
      if (!remote.ok) {
        const tried = remote.details?.map(d => `${d.url} → ${d.message}`).join('\n') || remote.error || 'unbekannt';
        throw new Error(`${remote.error || 'Fehler'}\n${tried}`);
      }
      await applyRemoteMappings(remote.mapping || {}, remote.arbeitMapping || {});
      Alert.alert('Aktualisiert', `${Object.keys(remote.mapping || {}).length} Einträge geladen.\nQuelle: ${remote.source || 'server'}`);
    } catch (e) {
      Alert.alert('Fetch fehlgeschlagen', e.message || String(e));
    } finally {
      setIsFetchingSoll(false);
    }
  };

  return {
    sollPerHour, sollMap, arbeitMap, anzahlArbeiter,
    istValue, isImportingSoll, isFetchingSoll,
    handleImportSoll, handleRefreshSoll,
  };
}
