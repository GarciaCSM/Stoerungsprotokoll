import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';
import { useShift } from '../context/ShiftContext';
import protocolScreenStyles from '../styles/ProtocolScreenStyles';
import { THEME } from '../styles/globalStyles';
import { lineButtonConfig } from '../config/lineButtonConfig';
import { MaterialIcons } from '@expo/vector-icons';
import FAService from '../services/faService';
import { formatTime } from '../utils/helper';
import { API_BASE_URL, PI_SERVER_URL } from '../config/apiConfig';

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
    !!(shiftData.selectedLine && shiftData.selectedLeader && shiftData.selectedShift)
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

  // useSollData vor useDbSync – damit istValue beim Sync verfügbar ist
  const {
    sollPerHour, anzahlArbeiter, istValue,
    isImportingSoll, isFetchingSoll,
    handleImportSoll, handleRefreshSoll,
  } = useSollData({ selectedFA, shiftData });

  // Hilfsfunktion: Session aus DB auf Timer + FA anwenden
  const applyDbSession = async (session) => {
    if (!session) return;
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

  // Frühschicht: wenn Produktion zwischen 6:00 und 6:30 gestartet wurde,
  // rechne SOLL ab 6:00 (nicht ab tatsächlichem Start-Druck)
  const getSollGrossElapsed = () => {
    if (shiftData.selectedShift !== 'Frühschicht') return timer.elapsed;
    const startTs = timer.mainTimerStartTime.current;
    if (!startTs) return timer.elapsed;
    const startDate = new Date(startTs);
    const snap = new Date(startDate);
    snap.setHours(6, 0, 0, 0);
    const diffMin = (startDate - snap) / 60000;
    if (diffMin < 0 || diffMin > 30) return timer.elapsed;
    // Offset in Sekunden zwischen 6:00 und tatsächlichem Start dazuaddieren
    return timer.elapsed + diffMin * 60;
  };
  // SOLL basiert auf Brutto-Zeit (kein _pauseSec-Abzug → kein Rückwärtssprung beim Weiter-Drücken)
  const netSec = getSollGrossElapsed();
  const expectedIst        = _soll > 0 ? (netSec / 3600) * _soll : 0;
  const expectedIstRounded = Math.round(expectedIst);

  // Freeze the SOLL number when pause is active but let the clock keep running.
  // We use refs so the snapshot happens synchronously during render (no async effect delay).
  const pauseWasRunningRef   = React.useRef(false);
  const frozenExpectedIstRef = React.useRef(null);
  if (timer.pauseRunning && !pauseWasRunningRef.current) {
    // pause just started → take snapshot now
    frozenExpectedIstRef.current = expectedIstRounded;
  }
  if (!timer.pauseRunning) {
    frozenExpectedIstRef.current = null;
  }
  pauseWasRunningRef.current = timer.pauseRunning;

  const displayExpectedIst =
    timer.pauseRunning && frozenExpectedIstRef.current != null
      ? frozenExpectedIstRef.current
      : expectedIstRounded;

  const istDiff            = _ist - displayExpectedIst;

  const getIstStatus = () => {
    if (!timer.running && timer.elapsed === 0) return 'neutral';
    if (_soll <= 0 || expectedIst <= 0) return 'neutral';
    const dev = (expectedIst - _ist) / expectedIst;
    if (dev <= 0.05) return 'good';
    if (dev <= 0.10) return 'warning';
    return 'bad';
  };
  const istStatus = getIstStatus();
  const istColor  = IST_COLORS[istStatus];

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
            startTime: new Date(s.start_time).toISOString(),
            endTime: new Date(s.end_time).toISOString(),
            durationSeconds: Number(s.dauer_sekunden || 0),
            createdAt: s.erstellt_am || new Date().toISOString(),
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
        if (assigned && leader && shift) {
          updateShiftData({ selectedLine: assigned, selectedLeader: leader, selectedShift: shift, selectedBereich: bereich || null });
          setSelectionConfirmed(true);
          // Pi-Server beim App-Start sofort über aktuelle Linie/Schicht informieren
          if (PI_SERVER_URL) {
            fetch(`${PI_SERVER_URL}/context`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linie: assigned, schicht: shift, bereich: bereich || null, fa_nr: restoredFA?.FANr || null })
            }).catch(() => {});
          }
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
    const newFA = { FANr: fa.FANr, ArtikelNr: fa.ArtikelNr, Artikelbezeichnung: fa.Artikelbezeichnung };
    setSelectedFA(newFA);
    setFaSearchText(''); setFaSearchResults([]); setFaSearchError('');

    // Pi-Server über neue FA und aktuellen Kontext informieren
    if (PI_SERVER_URL) {
      fetch(`${PI_SERVER_URL}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linie:  shiftData.selectedLine  || null,
          schicht: shiftData.selectedShift || null,
          bereich: localBereich || null,
          fa_nr:   fa.FANr,
        }),
      }).catch(() => {});
    }

    // Prüfe ob für diese FA heute auf dieser Linie/Schicht eine Session gespeichert ist.
    // Falls ja → Brutto-Start, Netto-Zeit, Pausen, IST-Stk wiederherstellen (selbe Produktion).
    // Falls eine andere FA gespeichert ist → Timer zurücksetzen (neue Produktion).
    if (!shiftData?.selectedLine || !shiftData?.selectedShift) return;
    try {
      const { session, stoerungen } = await dbSync.loadFromDb();
      if (session && session.fa_nr === fa.FANr) {
        // Gleiche FA wie in DB → alles wiederherstellen
        await timer.applyRemoteSession(session);
      } else if (session && session.fa_nr && session.fa_nr !== fa.FANr) {
        // Andere FA war gespeichert → neuer Produktionslauf → Timer zurücksetzen
        await timer.resetTimer();
      }
      // Kein session → nichts tun (frischer Start)

      // Störungen für diese FA laden (DB + AsyncStorage) – bereits per FA gefiltert
      if (Array.isArray(stoerungen) && stoerungen.length) {
        const incoming = stoerungen
          .filter(s => s.fa_nr === fa.FANr)
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
            startTime: new Date(s.start_time).toISOString(),
            endTime: new Date(s.end_time).toISOString(),
            durationSeconds: Number(s.dauer_sekunden || 0),
            createdAt: s.erstellt_am || new Date().toISOString(),
          }));
        setLocalLogsFromServer(incoming);
      } else {
        // Keine DB-Störungen für diese FA → aus AsyncStorage laden (FA-gefiltert via hook)
        loadLocalLogs(shiftData.selectedLine, shiftData.selectedShift, fa.FANr);
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
    if (!localLine || !localLeader || !localShift) return;

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
      if (PI_SERVER_URL) {
        fetch(`${PI_SERVER_URL}/context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linie: localLine, schicht: localShift, bereich: localBereich, fa_nr: selectedFA?.FANr || null })
        }).catch(() => {});
      }

      // 3) DB zuerst laden – DB gewinnt immer über lokalen Cache
      loadLocalLogs(localLine, localShift);
      let dbSessionRestored = false;
      try {
        const { session, stoerungen } = await dbSync.loadFromDb(localLine, localShift);
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
            startTime: new Date(s.start_time).toISOString(),
            endTime: new Date(s.end_time).toISOString(),
            durationSeconds: Number(s.dauer_sekunden || 0),
            createdAt: s.erstellt_am || new Date().toISOString(),
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
    // Erst alle aktuellen Werte (elapsed, pause, IST) final in die DB schreiben,
    // damit die Statistik später exakte Schichtdaten bekommt.
    await dbSync.syncSession();
    // Dann running=0 setzen (DELETE) – Zeile bleibt als Historien-Protokoll erhalten.
    await dbSync.stopSession();
    // Kontext beim Pi löschen (optional)
    if (PI_SERVER_URL) {
      fetch(`${PI_SERVER_URL}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linie: null, schicht: null })
      }).catch(() => {});
    }
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
    if (PI_SERVER_URL) {
      fetch(`${PI_SERVER_URL}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fa_nr: null }),
      }).catch(() => {});
    }
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

      <ScrollView style={protocolScreenStyles.contentContainer} contentContainerStyle={protocolScreenStyles.scrollContent}>
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
              if (PI_SERVER_URL) {
                fetch(`${PI_SERVER_URL}/context`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fa_nr: null }),
                }).catch(() => {});
              }
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
            {timer.selectedIssue === 'Sonstiges' && (
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(252, 165, 165, 0.4)',
                  borderRadius: 10,
                  padding: 12,
                  color: '#FEF2F2',
                  fontSize: 15,
                  width: '100%',
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                placeholder="Beschreibe die Störung..."
                placeholderTextColor="rgba(252,165,165,0.5)"
                value={timer.sonstigesText}
                onChangeText={timer.setSonstigesText}
                multiline
              />
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