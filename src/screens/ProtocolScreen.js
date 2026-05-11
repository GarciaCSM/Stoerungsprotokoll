import React, { useState, useEffect, useRef } from 'react';
import { toIsoUtcOrNow } from '../utils/dateSafe';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';
import { useShift } from '../context/ShiftContext';
import protocolScreenStyles from '../styles/ProtocolScreenStyles';
import { THEME } from '../styles/globalStyles';
import { lineButtonConfig } from '../config/lineButtonConfig';
import { MaterialIcons } from '@expo/vector-icons';
import FAService from '../services/faService';
import { formatTime } from '../utils/helper';
import { API_BASE_URL, getSensorUrlsForLine } from '../config/apiConfig';

import { useProductionTimer } from './protocol/hooks/useProductionTimer';
import { useSollData } from './protocol/hooks/useSollData';
import { useLocalLogs } from './protocol/hooks/useLocalLogs';
import { useDbSync } from './protocol/hooks/useDbSync';
import SelectionBar   from './protocol/components/SelectionBar';
import FaSection      from './protocol/components/FaSection';
import SollIstZeitRow from './protocol/components/SollIstZeitRow';
import ActionSection  from './protocol/components/ActionSection';
import LogsSection    from './protocol/components/LogsSection';

// PI_SERVER_URL kommt jetzt direkt aus apiConfig → zeigt auf den Raspberry Pi
// Produktion: http://<PI-IP>:3000 | Test: http://localhost:3000 (npm run test:pi-server)


//  Constants 
const IST_COLORS = {
  good:    THEME.colors.dark.success,
  warning: THEME.colors.dark.warning,
  bad:     THEME.colors.dark.danger,
  neutral: THEME.colors.dark.foreground,
};

// 
const ProtocolScreen = () => {
  const { shiftData, updateShiftData } = useShift();

  //  Shift selection state 
  const [currentView, setCurrentView]         = useState('initial');
  const [localLine, setLocalLine]             = useState(shiftData.selectedLine    || null);
  const [localLeader, setLocalLeader]         = useState(shiftData.selectedLeader  || null);
  const [localShift, setLocalShift]           = useState(shiftData.selectedShift   || null);
  const [localBereich, setLocalBereich]       = useState(shiftData.selectedBereich || null);
  const [selectionConfirmed, setSelectionConfirmed] = useState(
    !!(shiftData.selectedLine && shiftData.selectedLeader && shiftData.selectedShift && shiftData.selectedBereich)
  );
  const [lineLocked, setLineLocked]           = useState(false);
  const [openSelectModal, setOpenSelectModal] = useState(null);

  //  Confirm dialog 
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, title: '', message: '', onConfirm: null });
  const showConfirm = ({ title = 'Bestätigen', message = 'Bist du sicher?', onConfirm = null }) =>
    setConfirmDialog({ visible: true, title, message, onConfirm });
  const hideConfirm = () => setConfirmDialog(prev => ({ ...prev, visible: false, onConfirm: null }));

  //  FA search state 
  const [faSearchText, setFaSearchText]         = useState('');
  const [faSearchError, setFaSearchError]       = useState('');
  const [faSearchResults, setFaSearchResults]   = useState([]);
  const [isSearching, setIsSearching]           = useState(false);
  const [selectedFA, setSelectedFA]             = useState(null);
  const [taktBrutto, setTaktBrutto]             = useState(10);
  const faInitialized = useRef(false);
  const scrollViewRef = useRef(null);
  const lastIstValueRef = useRef(null);
  // Wenn true: selectionConfirmed wurde für die GLEICHE Linie/Schicht neu gesetzt
  // → useEffect darf den laufenden Timer NICHT anfassen
  const skipTimerRestoreRef = useRef(false);

  // helper to form storage key; include optional station
  const faStorageKey = (line, shift, station) => {
    const st = station ? station : '';
    return `selected_fa:${line}:${shift}:${st}`;
  };

  // Persist FA whenever it changes — skip the very first render (null initial state)
  // to avoid overwriting the stored value before the restore effect reads it
  useEffect(() => {
    if (!faInitialized.current) {
      faInitialized.current = true;
      return;
    }
    // global persistence (last used)
    if (selectedFA) {
      AsyncStorage.setItem('selected_fa', JSON.stringify(selectedFA)).catch(() => {});
    } else {
      AsyncStorage.removeItem('selected_fa').catch(() => {});
    }

    // per-shift persistence when a selection is confirmed
    (async () => {
      try {
        if (!selectionConfirmed) return;
        const line = shiftData.selectedLine;
        const shift = shiftData.selectedShift;
        const station = shiftData.selectedBereich;
        if (!line || !shift) return;
        const key = faStorageKey(line, shift, station);
        if (selectedFA) await AsyncStorage.setItem(key, JSON.stringify(selectedFA));
        else await AsyncStorage.removeItem(key);
      } catch (e) {
        /* ignore */
      }
    })();
  }, [selectedFA]);

  //  Custom hooks 
  const {
    localLogs, viewMode, setViewMode,
    loadLocalLogs, saveStoerLog, clearAllLocalLogs, computeIssueSummary,
    setLocalLogsFromServer,
  } = useLocalLogs({ shiftData, selectionConfirmed, localLine, localShift, selectedFA });

  // saveStoerLog mit DB-Sync wrappen – wird an useProductionTimer übergeben
  const saveStoerLogWithSync = async (args) => {
    await saveStoerLog(args);
    try {
      await saveStoerLogWithSyncRef.current?.(args);
    } catch (e) {
      console.warn('[ProtocolScreen] DB-Sync für Störung fehlgeschlagen:', e.message);
    }
  };
  const saveStoerLogWithSyncRef = useRef(null);

  const timer = useProductionTimer({ shiftData, saveStoerLog: saveStoerLogWithSync });

  const sendPiContext = async (payload, reason = 'unknown') => {
    // Komplette Funktion in äußerem try/catch – verhindert jegliche
    // unhandled rejection, die im Release-APK zum Absturz führen würde.
    try {
      const toMysqlDatetime = (epochMs) => {
        try {
          if (!epochMs) return null;
          const d = new Date(Number(epochMs));
          if (!Number.isFinite(d.getTime())) return null;
          return d.toISOString().slice(0, 19).replace('T', ' ');
        } catch (_) { return null; }
      };

      const computedSessionRunKey = toMysqlDatetime(
        timer?.productionStartTime?.current || timer?.mainTimerStartTime?.current
      );
      const makeSessionRunKey = (baseKey, bereich) => {
        if (!baseKey) return null;
        if (!bereich) return baseKey;
        return `${baseKey}::${bereich}`;
      };

      const enrichedPayload = {
        ...(payload || {}),
        session_run_key:
          (payload && payload.session_run_key) ||
          makeSessionRunKey(computedSessionRunKey, (payload && payload.bereich) || shiftData?.selectedBereich) ||
          null,
      };

      const piPayload = {
        ...enrichedPayload,
        fa_nr:
          enrichedPayload.fa_nr != null && enrichedPayload.fa_nr !== ''
            ? String(enrichedPayload.fa_nr)
            : enrichedPayload.fa_nr,
      };

      let body;
      try {
        body = JSON.stringify(piPayload);
      } catch (e) {
        console.warn('[PI context] JSON.stringify fehlgeschlagen', reason, e?.message);
        return;
      }

      const line = (payload && payload.linie) || shiftData?.selectedLine;
      const bereich = (payload && payload.bereich) || shiftData?.selectedBereich || null;

      let targets = [];
      try {
        targets = await getSensorUrlsForLine(line, bereich);
      } catch (e) {
        console.warn('[PI context] getSensorUrlsForLine fehlgeschlagen', reason, e?.message);
        return;
      }
      console.warn('[PI context] CALL', { reason, targets, payload: piPayload });
      if (!Array.isArray(targets) || targets.length === 0) {
        console.warn('[PI context] ABORTED: no targets for PI context');
        return;
      }

      // .allSettled statt .all → einzelne Rejects können niemals den
      // Aufrufer abreißen (wichtig für Release-Hermes).
      await Promise.allSettled(targets.map(async (target) => {
        if (!target || typeof target !== 'string') return;
        let timeoutId = null;
        try {
          console.warn(`[PI context] POST ${target}/context`);
          const controller = new AbortController();
          timeoutId = setTimeout(() => {
            try { controller.abort(); } catch (_) {}
          }, 5000);
          const res = await fetch(`${target}/context`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body,
            signal: controller.signal,
          });
          if (!res.ok) {
            let msg = '';
            try { msg = await res.text(); } catch (_) { msg = '<no body>'; }
            console.warn(`[PI context] ${reason} ${target} HTTP ${res.status}: ${msg}`);
          } else {
            console.warn(`[PI context] ${reason} ${target} OK`);
          }
        } catch (e) {
          console.warn(`[PI context] ${reason} ${target} failed:`, e?.message);
        } finally {
          if (timeoutId != null) {
            try { clearTimeout(timeoutId); } catch (_) {}
          }
        }
      }));
    } catch (e) {
      console.warn('[PI context] OUTER catch', reason, e?.message);
    }
  };

  // useSollData vor useDbSync – damit istValue beim Sync verfügbar ist
  const {
    sollPerHour, anzahlArbeiter, istValue,
    isImportingSoll, isFetchingSoll,
    handleImportSoll, handleRefreshSoll,
  } = useSollData({ selectedFA, shiftData });

  // Hilfsfunktion: Session aus DB auf Timer + FA anwenden
  const applyDbSession = async (session) => {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return;
    await timer.applyRemoteSession(session);
    // DB gewinnt immer – FA aus Session übernehmen (überschreibt lokalen Stand)
    if (session.fa_nr) {
      setSelectedFA({
        FANr: session.fa_nr,
        ArtikelNr: session.artikel_nr || '',
        Artikelbezeichnung: session.artikel_bezeichnung || '',
      });
    }
  };

  //  Derived SOLL/IST 
  const _soll     = Number(sollPerHour) || 0;
  const _ist      = Number(istValue)    || 0;
  const _pauseSec = Number(timer.totalPauseSeconds) || 0;
  const sollPerMin = _soll > 0 ? Math.round((_soll / 60) * 100) / 100 : 0;
  // aktuelle SOLL‑Zahl basierend auf Laufzeit (rounded down)
  const aktuelleSoll = _soll > 0 ? Math.floor((_soll / 3600) * (timer.elapsed || 0)) : 0;

  // Summe aller abgeschlossenen Störungen (muss vor useDbSync stehen)
  const stoerTotalSeconds = localLogs.reduce((s, l) => s + (l.durationSeconds || 0), 0);

  // DB‑Sync hook (after we know derived soll values)
  const dbSync = useDbSync({ shiftData, timer, selectionConfirmed, selectedFA, istValue,
                               sollPerHour: _soll, sollAktuell: aktuelleSoll,
                               stoerTotalSeconds });

  // Ref mit syncStoerung befüllen sobald dbSync bereit
  useEffect(() => {
    saveStoerLogWithSyncRef.current = dbSync.syncStoerung;
  }, [dbSync.syncStoerung]);

  // SOLL basiert auf Bruttoproduktionszeit (Netto + Störungszeit). Pausezeit abziehen.
  // Das Störungsprotokoll-Backend zählt Störungen in den Bruttotimer rein.  
  const bruttoForSollSec = Math.max(0, (timer.elapsed || 0) + (timer.stoerRunning ? timer.stoerElapsed || 0 : 0));
  const expectedIst = _soll > 0 ? (bruttoForSollSec / 3600) * _soll : 0;
  const expectedIstRounded = Math.round(expectedIst);

  const displayExpectedIst = expectedIstRounded;

  const istDiff            = _ist - displayExpectedIst;

  const istStartTimeMs = timer.mainTimerStartTime?.current || null;
  const sollStartTimeMs = (() => {
    if (!istStartTimeMs) return null;
    const shiftName = shiftData.selectedShift;

    if (shiftName === 'Frühschicht') {
      const started = new Date(istStartTimeMs);
      const dayStart = new Date(started);
      dayStart.setHours(6, 0, 0, 0);
      const dayStartEnd = new Date(dayStart);
      dayStartEnd.setMinutes(30);
      if (started >= dayStart && started <= dayStartEnd) {
        return dayStart.getTime();
      }
    }

    if (shiftName === 'Spätschicht') {
      const started = new Date(istStartTimeMs);
      const shiftStart = new Date(started);
      shiftStart.setHours(14, 45, 0, 0);
      const shiftStartEnd = new Date(shiftStart);
      shiftStartEnd.setMinutes(shiftStartEnd.getMinutes() + 30); // bis 15:15
      if (started >= shiftStart && started <= shiftStartEnd) {
        return shiftStart.getTime();
      }
    }

    return istStartTimeMs;
  })();

  const getIstStatus = () => {
    if (!timer.running && timer.elapsed === 0) return 'neutral';
    if (_soll <= 0 || expectedIst <= 0) return 'neutral';
    const dev = (displayExpectedIst - _ist) / displayExpectedIst;
    if (dev <= 0.05) return 'good';
    if (dev <= 0.10) return 'warning';
    return 'bad';
  };
  const istStatus = getIstStatus();
  const istColor  = IST_COLORS[istStatus];

  useEffect(() => {
    const currentIst = Number(_ist) || 0;

    // First sample only initializes the baseline so we do not auto-resume
    // production immediately on mount or after restoring server state.
    if (lastIstValueRef.current === null) {
      lastIstValueRef.current = currentIst;
      return;
    }

    const istIncreased = currentIst > lastIstValueRef.current;
    lastIstValueRef.current = currentIst;

    if (!istIncreased) return;
    if (!selectionConfirmed) return;
    if (!timer.stoerRunning || !timer.selectedIssue) return;
    if (!selectedFA) return;

    timer.handleStart(selectedFA, setFaSearchError, setCurrentView);
  }, [_ist, selectionConfirmed, timer.stoerRunning, timer.selectedIssue, selectedFA]);

  const effectiveLine  = selectionConfirmed ? shiftData.selectedLine  : localLine;
  const effectiveShift = selectionConfirmed ? shiftData.selectedShift : localShift;

  const statusInfo = timer.stoerRunning || timer.selectedIssue
    ? { color: THEME.colors.dark.danger,  text: 'Störung'    }
    : timer.pauseRunning
    ? { color: THEME.colors.dark.warning, text: 'Pause'      }
    : timer.running
    ? { color: THEME.colors.dark.success, text: 'Produktion' }
    : { color: THEME.colors.dark.brutto,  text: 'Bereit'     };

  //  Load logs + restore pause totals on selection change (also on FA change)
  useEffect(() => {
    const line  = selectionConfirmed ? shiftData.selectedLine  : localLine;
    const shift = selectionConfirmed ? shiftData.selectedShift : localShift;
    loadLocalLogs(line, shift);
    timer.restorePauseTotalsForSelection(shiftData.selectedLine, shiftData.selectedShift);
  }, [shiftData.selectedLine, shiftData.selectedShift, localLine, localShift, selectionConfirmed, selectedFA?.FANr]);

  // ── Wenn Schicht bestätigt ist (oder App neu geöffnet während Schicht läuft):
  //     lade Session + Störungen aus der DB (Server gewinnt laut Einstellung).
  useEffect(() => {
    if (!selectionConfirmed) return;
    // Wenn nur der Linienführer geändert wurde (gleiche Linie+Schicht), Timer in Ruhe lassen
    if (skipTimerRestoreRef.current) {
      skipTimerRestoreRef.current = false;
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const { session, stoerungen } = await dbSync.loadFromDb();
        if (!mounted) return;
        // Session (Timer + FA) aus DB wiederherstellen
        await applyDbSession(session);
        // Nur Störungen des aktiven Auftrags laden
        const activeFaNr = session?.fa_nr;
        if (Array.isArray(stoerungen) && stoerungen.length && activeFaNr) {
          const incoming = stoerungen
            .filter(s => s.fa_nr === activeFaNr)
            .map(s => ({
            id: s.id || Date.now(),
            type: 'störung',
            line: s.linie,
            lineNumber: s.linie_nummer || (s.linie?.match(/\d+/)?.[0] || s.linie),
            shift: s.schicht,
            shift_type: s.schicht,
            leader: s.linienfuehrer || null,
            issue: s.stoerung_typ,
            notes: s.notiz || null,
            startTime: toIsoUtcOrNow(s.start_time),
            endTime: toIsoUtcOrNow(s.end_time),
            durationSeconds: Number(s.dauer_sekunden || 0),
            createdAt: toIsoUtcOrNow(s.erstellt_am),
          }));

          // Nur DB‑Störungen anzeigen (ersetze die aktuell angezeigten Logs)
          setLocalLogsFromServer(incoming);
        }
      } catch (e) {
        console.warn('loadFromDb failed', e);
      }
    })();
    return () => { mounted = false; };
  }, [selectionConfirmed]);

  //  Restore persisted assignment + FA on mount 
  useEffect(() => {
    (async () => {
      try {
        // Restore selected FA
        const rawFA = await AsyncStorage.getItem('selected_fa');
        let restoredFA = null;
        if (rawFA) { try { restoredFA = JSON.parse(rawFA); setSelectedFA(restoredFA); } catch {} }

        const assigned = await AsyncStorage.getItem('assigned_line');
        const leader   = await AsyncStorage.getItem('assigned_leader');
        const shift    = await AsyncStorage.getItem('assigned_shift');
        const bereich  = await AsyncStorage.getItem('assigned_bereich');
        const locked   = await AsyncStorage.getItem('assigned_line_locked');
        if (assigned) setLocalLine(assigned);
        if (leader)   setLocalLeader(leader);
        if (shift)    setLocalShift(shift);
        if (bereich)  setLocalBereich(bereich);
        if      (locked === 'false')   setLineLocked(false);
        else if (locked === 'true')    setLineLocked(true);
        else if (assigned)             setLineLocked(true);
        if (assigned && leader && shift && bereich) {
          updateShiftData({ selectedLine: assigned, selectedLeader: leader, selectedShift: shift, selectedBereich: bereich || null });
          setSelectionConfirmed(true);
          // Pi-Server beim App-Start sofort über aktuelle Linie/Schicht informieren
          await sendPiContext(
            { linie: assigned, schicht: shift, bereich: bereich || null, fa_nr: restoredFA?.FANr || null },
            'restore-assignment'
          );
        }
      } catch (e) { console.warn('Failed to load persisted assignment', e); }
    })();
  }, []);

  //  FA search 
  const handleFASearch = async () => {
    setFaSearchError(''); setFaSearchResults([]);
    if (!faSearchText.trim()) return;
    setIsSearching(true);
    try {
      const data = await FAService.searchFA(faSearchText);
      if (data.success) {
        if (data.results.length === 0) setFaSearchError('FA nicht gefunden oder Status ungültig (erlaubt: 30, 35, 36)');
        else setFaSearchResults(data.results);
      } else { setFaSearchError(data.error || 'Fehler beim Suchen'); }
    } catch { setFaSearchError('Verbindungsfehler zum Server. Ist das Backend gestartet?'); }
    finally   { setIsSearching(false); }
  };

  const handleSelectFA = async (fa) => {
    const rawFanr = fa.FANr != null && fa.FANr !== '' ? fa.FANr : fa.fanr;
    const newFA = {
      FANr: rawFanr,
      ArtikelNr: fa.ArtikelNr ?? fa.artikel_nr ?? '',
      Artikelbezeichnung: fa.Artikelbezeichnung ?? fa.artikel_bezeichnung ?? '',
    };
    setSelectedFA(newFA);
    setFaSearchText(''); setFaSearchResults([]); setFaSearchError('');

    const liniePi = shiftData?.selectedLine ?? localLine ?? null;
    const schichtPi = shiftData?.selectedShift ?? localShift ?? null;
    const bereichPi = shiftData?.selectedBereich ?? localBereich ?? null;

    // Pi-Server über neue FA und aktuellen Kontext informieren (await: vermeidet Race mit
    // einem noch ausstehenden confirm-selection-changed POST mit fa_nr:null).
    await sendPiContext({
      linie: liniePi,
      schicht: schichtPi,
      bereich: bereichPi,
      fa_nr: rawFanr,
    }, 'fa-selected');

    // Prüfe ob für diese FA heute auf dieser Linie/Schicht eine Session gespeichert ist.
    // Falls ja → Brutto-Start, Netto-Zeit, Pausen, IST-Stk wiederherstellen (selbe Produktion).
    // Falls eine andere FA gespeichert ist → Timer zurücksetzen (neue Produktion).
    if (!shiftData?.selectedLine || !shiftData?.selectedShift) return;
    const fanrKey = rawFanr != null ? String(rawFanr) : '';
    try {
      const { session, stoerungen } = await dbSync.loadFromDb();
      const sessFa = session?.fa_nr != null ? String(session.fa_nr) : '';
      if (session && sessFa && fanrKey && sessFa === fanrKey) {
        // Gleiche FA wie in DB → alles wiederherstellen
        await timer.applyRemoteSession(session);
      } else if (session && sessFa && fanrKey && sessFa !== fanrKey) {
        // Andere FA war gespeichert → neuer Produktionslauf → Timer zurücksetzen
        await timer.resetTimer();
      }
      // Kein session → nichts tun (frischer Start)

      // Störungen für diese FA laden (DB + AsyncStorage) – bereits per FA gefiltert
      if (Array.isArray(stoerungen) && stoerungen.length) {
        const incoming = stoerungen
          .filter(s => s.fa_nr != null && String(s.fa_nr) === fanrKey)
          .map(s => ({
            id: s.id || Date.now(),
            type: 'störung',
            line: s.linie,
            lineNumber: s.linie_nummer || (s.linie?.match(/\d+/)?.[0] || s.linie),
            shift: s.schicht,
            shift_type: s.schicht,
            leader: s.linienfuehrer || null,
            fa_nr: s.fa_nr,
            issue: s.stoerung_typ,
            notes: s.notiz || null,
            startTime: toIsoUtcOrNow(s.start_time),
            endTime: toIsoUtcOrNow(s.end_time),
            durationSeconds: Number(s.dauer_sekunden || 0),
            createdAt: toIsoUtcOrNow(s.erstellt_am),
          }));
        setLocalLogsFromServer(incoming);
      } else {
        // Keine DB-Störungen für diese FA → aus AsyncStorage laden (FA-gefiltert via hook)
        loadLocalLogs(shiftData.selectedLine, shiftData.selectedShift, rawFanr);
      }
    } catch (e) {
      console.warn('[handleSelectFA] DB-Session-Lookup fehlgeschlagen:', e.message);
    }
  };

  //  Persist helpers 
  const persistLine    = async (v) => { try { v ? await AsyncStorage.setItem('assigned_line',    v) : await AsyncStorage.removeItem('assigned_line');    } catch {} };
  const persistLeader  = async (v) => { try { v ? await AsyncStorage.setItem('assigned_leader',  v) : await AsyncStorage.removeItem('assigned_leader');  } catch {} };
  const persistShift   = async (v) => { try { v ? await AsyncStorage.setItem('assigned_shift',   v) : await AsyncStorage.removeItem('assigned_shift');   } catch {} };
  const persistBereich = async (v) => { try { v ? await AsyncStorage.setItem('assigned_bereich', v) : await AsyncStorage.removeItem('assigned_bereich'); } catch {} };

  const handleConfirmSelection = async () => {
    if (!localLine || !localLeader || !localShift || !localBereich) return;

    // If switching away from an active selection that currently has production activity,
    // require an explicit confirmation from the user before proceeding.
    const isChangingSelection = Boolean(shiftData.selectedLine && shiftData.selectedShift &&
      (shiftData.selectedLine !== localLine || shiftData.selectedShift !== localShift));
    const hasActiveProduction = Boolean(timer.running || (timer.elapsed || 0) > 0 || timer.stoerRunning);

    const applySelection = async () => {
      const prevLine  = shiftData.selectedLine;
      const prevShift = shiftData.selectedShift;
      const sameSelection = (prevLine === localLine && prevShift === localShift);

      // ── Gleiche Linie + Schicht: nur Linienführer aktualisieren, Timer läuft weiter ──
      if (sameSelection) {
        skipTimerRestoreRef.current = true; // useEffect soll Timer NICHT neu laden
        updateShiftData({ selectedLine: localLine, selectedLeader: localLeader, selectedShift: localShift, selectedBereich: localBereich });
        await persistLeader(localLeader); await persistBereich(localBereich);
        await AsyncStorage.setItem('assigned_line_locked', 'true');
        setLineLocked(true); setSelectionConfirmed(true);
        await sendPiContext(
          { linie: localLine, schicht: localShift, bereich: localBereich, fa_nr: selectedFA?.FANr || null },
          'confirm-same-selection'
        );
        return; // Timer nicht anfassen – Produktion läuft unverändert weiter
      }

      // ── Linie oder Schicht hat sich geändert ─────────────────────────────────────────

      // 1) Vorherige Schicht speichern (pausiert)
      if (prevLine && prevShift) {
        try {
          await timer.saveStateForSelection(prevLine, prevShift, true);
          if (selectedFA) {
            const prevStation = shiftData.selectedBereich;
            await AsyncStorage.setItem(faStorageKey(prevLine, prevShift, prevStation), JSON.stringify(selectedFA));
          }
        } catch (e) { console.warn('Failed to save previous shift data', e); }
      }

      // 2) Neue Auswahl übernehmen
      updateShiftData({ selectedLine: localLine, selectedLeader: localLeader, selectedShift: localShift, selectedBereich: localBereich });
      await persistLine(localLine); await persistLeader(localLeader); await persistShift(localShift); await persistBereich(localBereich);
      await AsyncStorage.setItem('assigned_line_locked', 'true');
      setLineLocked(true); setSelectionConfirmed(true);

      // inform Pi‑Server über aktualisierte Linie/Schicht/Bereich/FA
      // await: sonst kann ein langsames POST noch nach FA-Auswahl ankommen und fa_nr:null setzen.
      await sendPiContext(
        { linie: localLine, schicht: localShift, bereich: localBereich, fa_nr: selectedFA?.FANr || null },
        'confirm-selection-changed'
      );

      // 3) DB zuerst laden – DB gewinnt immer über lokalen Cache
      loadLocalLogs(localLine, localShift);
      let dbSessionRestored = false;
      try {
        const { session, stoerungen } = await dbSync.loadFromDb(localLine, localShift, localBereich);
        if (session) {
          await applyDbSession(session);
          dbSessionRestored = true;
        }
        // Nur Störungen des aktiven Auftrags laden
        const activeFaNr = session?.fa_nr || selectedFA?.FANr;
        if (Array.isArray(stoerungen) && stoerungen.length && activeFaNr) {
          const incoming = stoerungen
            .filter(s => s.fa_nr === activeFaNr)
            .map(s => ({
            id: s.id || Date.now(),
            type: 'störung',
            line: s.linie,
            lineNumber: s.linie_nummer || (s.linie?.match(/\d+/)?.[0] || s.linie),
            shift: s.schicht,
            shift_type: s.schicht,
            leader: s.linienfuehrer || null,
            issue: s.stoerung_typ,
            notes: s.notiz || null,
            startTime: toIsoUtcOrNow(s.start_time),
            endTime: toIsoUtcOrNow(s.end_time),
            durationSeconds: Number(s.dauer_sekunden || 0),
            createdAt: toIsoUtcOrNow(s.erstellt_am),
          }));
          setLocalLogsFromServer(incoming);
        }
      } catch (e) { console.warn('Fehler beim Laden aus DB:', e); }

      // 4) Fallback: nur wenn DB keine Session hatte → lokalen Cache; beides leer → Reset
      if (!dbSessionRestored) {
        try {
          const loaded = await timer.loadStateForSelection(localLine, localShift);
          if (!loaded) await timer.resetTimer();
        } catch (e) { console.warn('Failed to restore timer for new selection', e); }
        try {
          const rawPerFa = await AsyncStorage.getItem(faStorageKey(localLine, localShift, localBereich));
          if (rawPerFa) {
            try { setSelectedFA(JSON.parse(rawPerFa)); } catch {}
          } else {
            setSelectedFA(null);
          }
        } catch (e) { console.warn('Failed to restore per-shift selectedFA', e); }
      }
    };

    if (isChangingSelection && hasActiveProduction) {
      showConfirm({
        title: 'Schichtwechsel bestätigen',
        message: 'Auf der aktuellen Schicht läuft noch Produktion. Beim Wechsel wird der aktuelle Timer für die alte Schicht gespeichert. Trotzdem wechseln?',
        onConfirm: applySelection,
      });
      return;
    }

    // no confirmation required → apply immediately
    await applySelection();
  };

  //  Schicht beenden 
  const handleEnde = async () => {
    const lineForReset = shiftData.selectedLine;
    const shiftForReset = shiftData.selectedShift;
    const bereichForReset = shiftData.selectedBereich;
    const sessionRunKeyForReset = (() => {
      const base = timer?.productionStartTime?.current || timer?.mainTimerStartTime?.current;
      if (!base) return null;
      const d = new Date(Number(base));
      if (!Number.isFinite(d.getTime())) return null;
      const baseKey = d.toISOString().slice(0, 19).replace('T', ' ');
      return bereichForReset ? `${baseKey}::${bereichForReset}` : baseKey;
    })();

    // Erst alle aktuellen Werte (elapsed, pause, IST) final in die DB schreiben,
    // damit die Statistik später exakte Schichtdaten bekommt.
    await dbSync.syncSession();

    // IST für den beendeten Auftrag explizit zurücksetzen.
    try {
      const datum = new Date().toISOString().slice(0, 10);
      await fetch('https://cosmetic-service.com/php-api/produktion/ist.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linie: lineForReset || null,
          schicht: shiftForReset || null,
          bereich: bereichForReset || null,
          datum,
          session_run_key: sessionRunKeyForReset,
          ist: 0,
        }),
      });
    } catch (e) {
      console.warn('[ProtocolScreen] IST reset beim Auftragsende fehlgeschlagen:', e.message);
    }

    // Dann running=0 setzen (DELETE) – Zeile bleibt als Historien-Protokoll erhalten.
    await dbSync.stopSession();
    // Kontext beim Pi löschen (optional)
    sendPiContext({ linie: null, schicht: null, bereich: null }, 'end-production-clear-selection');
    await timer.resetTimer();
    try { await AsyncStorage.removeItem('assigned_leader'); } catch {}
    try { await AsyncStorage.removeItem('assigned_shift');  } catch {}
    try { await AsyncStorage.removeItem('assigned_bereich'); } catch {}
    // also clear stored FA for this completed shift/station
    try {
      const key = faStorageKey(shiftData.selectedLine, shiftData.selectedShift, shiftData.selectedBereich);
      await AsyncStorage.removeItem(key);
    } catch {}
    try { await AsyncStorage.removeItem('selected_fa');     } catch {}
    updateShiftData({ selectedLine: shiftData.selectedLine || null, selectedLeader: null, selectedShift: null, selectedBereich: null });
    setSelectionConfirmed(false); setLocalLeader(null); setLocalShift(null); setLocalBereich(null);
    setSelectedFA(null);
    // FA aus Pi-Kontext löschen
    sendPiContext({ fa_nr: null }, 'end-production-clear-fa');
  };

  // 
  return (
    <View style={protocolScreenStyles.container}>

      {/* Header Bar */}
      <View style={protocolScreenStyles.headerBar}>
        <View style={protocolScreenStyles.headerLeft}>
          <MaterialIcons name="assessment" size={28} color={THEME.colors.dark.info} />
          <Text style={protocolScreenStyles.headerTitle}>Produktions-Monitor</Text>
        </View>
        <View style={protocolScreenStyles.statusIndicator}>
          <View style={[protocolScreenStyles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={protocolScreenStyles.statusText}>{statusInfo.text}</Text>
        </View>
        <Text style={protocolScreenStyles.headerTime}>
          {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <SelectionBar
        localLine={localLine} setLocalLine={setLocalLine}
        localLeader={localLeader} setLocalLeader={setLocalLeader}
        localShift={localShift} setLocalShift={setLocalShift}
        localBereich={localBereich} setLocalBereich={setLocalBereich}
        selectionConfirmed={selectionConfirmed} setSelectionConfirmed={setSelectionConfirmed}
        lineLocked={lineLocked} setLineLocked={setLineLocked}
        openSelectModal={openSelectModal} setOpenSelectModal={setOpenSelectModal}
        shiftData={shiftData}
        anzahlArbeiter={anzahlArbeiter}
        sollPerHour={sollPerHour}
        handleConfirmSelection={handleConfirmSelection}
        showConfirm={showConfirm}
      />

      <ScrollView
        ref={scrollViewRef}
        style={protocolScreenStyles.contentContainer}
        contentContainerStyle={protocolScreenStyles.scrollContent}
      >
        <View style={protocolScreenStyles.dashboardGrid}>
          <FaSection
            faSearchText={faSearchText} setFaSearchText={setFaSearchText}
            faSearchError={faSearchError}
            faSearchResults={faSearchResults}
            isSearching={isSearching}
            selectedFA={selectedFA}
            handleFASearch={handleFASearch}
            handleSelectFA={handleSelectFA}
            onRemoveFA={() => {
              setSelectedFA(null);
              sendPiContext({ fa_nr: null }, 'fa-removed');
            }}
            showConfirm={showConfirm}
            selectionReady={selectionConfirmed && !!shiftData.selectedBereich}
          />
          <SollIstZeitRow
            timer={timer}
            selectedFA={selectedFA}
            sollPerHour={sollPerHour}
            _soll={_soll} _ist={_ist} _pauseSec={_pauseSec}
            expectedIstRounded={displayExpectedIst}
            istDiff={istDiff} istStatus={istStatus} istColor={istColor}
            stoerTotalSeconds={stoerTotalSeconds}
            istStartTime={istStartTimeMs}
            sollStartTime={sollStartTimeMs}
            taktBrutto={taktBrutto}
            onSelectTaktBrutto={setTaktBrutto}
            isImportingSoll={isImportingSoll} isFetchingSoll={isFetchingSoll}
            handleImportSoll={handleImportSoll} handleRefreshSoll={handleRefreshSoll}
            formatTime={formatTime}
          />
        </View>

        <ActionSection
          currentView={currentView} setCurrentView={setCurrentView}
          timer={timer}
          selectedFA={selectedFA}
          selectionConfirmed={selectionConfirmed}
          showConfirm={showConfirm}
          setFaSearchError={setFaSearchError}
          effectiveLine={effectiveLine}
          lineButtonConfig={lineButtonConfig}
          onEnde={handleEnde}
          formatTime={formatTime}
          scrollViewRef={scrollViewRef}
        />

        {selectionConfirmed && !timer.selectedIssue && currentView !== 'störung' && (
          <LogsSection
            localLogs={localLogs}
            viewMode={viewMode} setViewMode={setViewMode}
            clearAllLocalLogs={clearAllLocalLogs}
            setLocalLogsFromServer={setLocalLogsFromServer}
            dbSync={dbSync}
            computeIssueSummary={computeIssueSummary}
            showConfirm={showConfirm}
            formatTime={formatTime}
          />
        )}
      </ScrollView>

      {/* ── Pause Overlay ────────────────────────────────────── */}
      <Modal
        visible={timer.pauseRunning}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(15, 40, 120, 0.82)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            alignItems: 'center',
            paddingHorizontal: 40,
            paddingVertical: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(30, 64, 175, 0.55)',
            borderWidth: 1,
            borderColor: 'rgba(147, 197, 253, 0.3)',
            gap: 16,
            minWidth: 300,
          }}>
            <MaterialIcons name="free-breakfast" size={72} color="rgba(147, 197, 253, 0.95)" />
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: '#EFF6FF',
              letterSpacing: 1,
              marginTop: 8,
            }}>PAUSE</Text>
            <Text style={{
              fontSize: 16,
              color: 'rgba(219, 234, 254, 0.85)',
              textAlign: 'center',
              lineHeight: 24,
            }}>Du befindest dich in der Pause.{`\n`}Die Produktion ist angehalten.</Text>
            <Text style={{
              fontSize: 48,
              fontWeight: '700',
              color: '#BFDBFE',
              letterSpacing: 2,
              fontVariant: ['tabular-nums'],
              marginTop: 8,
            }}>{formatTime(timer.pauseElapsed)}</Text>
            <TouchableOpacity
              onPress={() => showConfirm({
                title: 'Pause beenden',
                message: 'Möchtest du die Pause beenden und weiterproduzieren?',
                onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView),
              })}
              style={{
                marginTop: 24,
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
                paddingVertical: 16,
                paddingHorizontal: 48,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: 'rgba(147, 197, 253, 0.5)',
              }}
            >
              <MaterialIcons name="play-arrow" size={24} color="#EFF6FF" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#EFF6FF' }}>Pause beenden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Störung Overlay ─────────────────────────────────── */}
      <Modal
        visible={!!(timer.stoerRunning && timer.selectedIssue)}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(100, 10, 10, 0.82)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            alignItems: 'center',
            paddingHorizontal: 40,
            paddingVertical: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(153, 27, 27, 0.55)',
            borderWidth: 1,
            borderColor: 'rgba(252, 165, 165, 0.3)',
            gap: 16,
            minWidth: 300,
            maxWidth: 460,
          }}>
            <MaterialIcons name="warning" size={72} color="rgba(252, 165, 165, 0.95)" />
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: '#FEF2F2',
              letterSpacing: 1,
              marginTop: 8,
            }}>STÖRUNG AKTIV</Text>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#FECACA',
              textAlign: 'center',
            }}>{timer.selectedIssue}</Text>
            {timer.selectedIssue === 'Sonstiges' && !!timer.sonstigesText && (
              <Text style={{
                fontSize: 15,
                color: '#FECACA',
                textAlign: 'center',
                lineHeight: 22,
              }}>{timer.sonstigesText}</Text>
            )}
            <Text style={{
              fontSize: 48,
              fontWeight: '700',
              color: '#FCA5A5',
              letterSpacing: 2,
              fontVariant: ['tabular-nums'],
              marginTop: 4,
            }}>{formatTime(timer.stoerElapsed)}</Text>
            <TouchableOpacity
              onPress={() => timer.handleStart(selectedFA, setFaSearchError, setCurrentView)}
              disabled={timer.selectedIssue === 'Sonstiges' && !timer.sonstigesText?.trim()}
              style={[{
                marginTop: 24,
                backgroundColor: 'rgba(220, 38, 38, 0.9)',
                paddingVertical: 16,
                paddingHorizontal: 48,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: 'rgba(252, 165, 165, 0.5)',
              }, timer.selectedIssue === 'Sonstiges' && !timer.sonstigesText?.trim() && { opacity: 0.4 }]}
            >
              <MaterialIcons name="play-arrow" size={24} color="#FEF2F2" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FEF2F2' }}>Störung beenden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={hideConfirm}
        onConfirm={async () => { if (confirmDialog.onConfirm) await confirmDialog.onConfirm(); hideConfirm(); }}
      />
    </View>
  );
};

export default ProtocolScreen;