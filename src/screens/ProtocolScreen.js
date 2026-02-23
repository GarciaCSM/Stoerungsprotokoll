import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';
import { useShift } from '../context/ShiftContext';
import protocolScreenStyles from '../styles/ProtocolScreenStyles';
import { THEME } from '../styles/globalStyles';
import { lineButtonConfig } from '../config/lineButtonConfig';
import { MaterialIcons } from '@expo/vector-icons';
import FAService from '../services/faService';

import { useProductionTimer } from './protocol/hooks/useProductionTimer';
import { useSollData } from './protocol/hooks/useSollData';
import { useLocalLogs } from './protocol/hooks/useLocalLogs';
import { useDbSync } from './protocol/hooks/useDbSync';

//  Constants 
const LINE_OPTIONS = [
  { label: 'Linie 1', value: 'Linie 1' },
  { label: 'Linie 2', value: 'Linie 2' },
  { label: 'Linie 3', value: 'Linie 3' },
  { label: 'Linie 4', value: 'Linie 4' },
  { label: 'Linie 5', value: 'Linie 5' },
  { label: 'Linie 6', value: 'Linie 6' },
];
const LEADER_OPTIONS = [{ label: 'Melih Iskender', value: 'Melih Iskender' }];
const SHIFT_OPTIONS  = [
  { label: 'Frühschicht', value: 'Frühschicht' },
  { label: 'Spätschicht', value: 'Spätschicht' },
];

const IST_COLORS = {
  good:    THEME.colors.dark.success,
  warning: THEME.colors.dark.warning,
  bad:     THEME.colors.dark.danger,
  neutral: THEME.colors.dark.foreground,
};

//  Helper 
const formatTime = (totalSeconds) => {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const two = (n) => n.toString().padStart(2, '0');
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
};

// 
const ProtocolScreen = () => {
  const { shiftData, updateShiftData } = useShift();

  //  Shift selection state 
  const [currentView, setCurrentView]         = useState('initial');
  const [localLine, setLocalLine]             = useState(shiftData.selectedLine   || null);
  const [localLeader, setLocalLeader]         = useState(shiftData.selectedLeader || null);
  const [localShift, setLocalShift]           = useState(shiftData.selectedShift  || null);
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
  const faInitialized = useRef(false);

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
        const line = shiftData.selectedLine; const shift = shiftData.selectedShift;
        if (!line || !shift) return;
        const key = `selected_fa:${line}:${shift}`;
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
  } = useLocalLogs({ shiftData, selectionConfirmed, localLine, localShift });

  // saveStoerLog mit DB-Sync wrappen – wird an useProductionTimer übergeben
  const saveStoerLogWithSync = async (args) => {
    await saveStoerLog(args);
    saveStoerLogWithSyncRef.current?.(args);
  };
  const saveStoerLogWithSyncRef = useRef(null);

  const timer = useProductionTimer({ shiftData, saveStoerLog: saveStoerLogWithSync });

  // useSollData vor useDbSync – damit istValue beim Sync verfügbar ist
  const {
    sollPerHour, anzahlArbeiter, istValue,
    isImportingSoll, isFetchingSoll,
    handleImportSoll, handleRefreshSoll,
  } = useSollData({ selectedFA, shiftData });

  const dbSync = useDbSync({ shiftData, timer, selectionConfirmed, selectedFA, istValue });

  // Ref mit syncStoerung befüllen sobald dbSync bereit
  useEffect(() => {
    saveStoerLogWithSyncRef.current = dbSync.syncStoerung;
  }, [dbSync.syncStoerung]);

  // Hilfsfunktion: Session aus DB auf Timer + FA anwenden
  const applyDbSession = async (session) => {
    if (!session) return;
    await timer.applyRemoteSession(session);
    if (!selectedFA && session.fa_nr) {
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
  const netSec = Math.max(0, getSollGrossElapsed() - _pauseSec);
  const expectedIst        = _soll > 0 ? (netSec / 3600) * _soll : 0;
  const expectedIstRounded = Math.round(expectedIst);
  const istDiff            = _ist - expectedIstRounded;

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

  const stoerTotalSeconds = localLogs.reduce((s, l) => s + (l.durationSeconds || 0), 0);

  //  Load logs + restore pause totals on selection change 
  useEffect(() => {
    const line  = selectionConfirmed ? shiftData.selectedLine  : localLine;
    const shift = selectionConfirmed ? shiftData.selectedShift : localShift;
    loadLocalLogs(line, shift);
    timer.restorePauseTotalsForSelection(shiftData.selectedLine, shiftData.selectedShift);
  }, [shiftData.selectedLine, shiftData.selectedShift, localLine, localShift, selectionConfirmed]);

  // ── Wenn Schicht bestätigt ist (oder App neu geöffnet während Schicht läuft):
  //     lade Session + Störungen aus der DB (Server gewinnt laut Einstellung).
  useEffect(() => {
    if (!selectionConfirmed) return;
    let mounted = true;
    (async () => {
      try {
        const { session, stoerungen } = await dbSync.loadFromDb();
        if (!mounted) return;
        // Session (Timer + FA) aus DB wiederherstellen
        await applyDbSession(session);
        if (Array.isArray(stoerungen) && stoerungen.length) {
          const incoming = stoerungen.map(s => ({
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
        if (rawFA) { try { setSelectedFA(JSON.parse(rawFA)); } catch {} }

        const assigned = await AsyncStorage.getItem('assigned_line');
        const leader   = await AsyncStorage.getItem('assigned_leader');
        const shift    = await AsyncStorage.getItem('assigned_shift');
        const locked   = await AsyncStorage.getItem('assigned_line_locked');
        if (assigned) setLocalLine(assigned);
        if (leader)   setLocalLeader(leader);
        if (shift)    setLocalShift(shift);
        if      (locked === 'false')   setLineLocked(false);
        else if (locked === 'true')    setLineLocked(true);
        else if (assigned)             setLineLocked(true);
        if (assigned && leader && shift) {
          updateShiftData({ selectedLine: assigned, selectedLeader: leader, selectedShift: shift });
          setSelectionConfirmed(true);
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

  const handleSelectFA = (fa) => {
    setSelectedFA({ FANr: fa.FANr, ArtikelNr: fa.ArtikelNr, Artikelbezeichnung: fa.Artikelbezeichnung });
    setFaSearchText(''); setFaSearchResults([]); setFaSearchError('');
  };

  //  Persist helpers 
  const persistLine   = async (v) => { try { v ? await AsyncStorage.setItem('assigned_line',   v) : await AsyncStorage.removeItem('assigned_line');   } catch {} };
  const persistLeader = async (v) => { try { v ? await AsyncStorage.setItem('assigned_leader', v) : await AsyncStorage.removeItem('assigned_leader'); } catch {} };
  const persistShift  = async (v) => { try { v ? await AsyncStorage.setItem('assigned_shift',  v) : await AsyncStorage.removeItem('assigned_shift');  } catch {} };

  const handleConfirmSelection = async () => {
    if (!localLine || !localLeader || !localShift) return;

    // If switching away from an active selection that currently has production activity,
    // require an explicit confirmation from the user before proceeding.
    const isChangingSelection = Boolean(shiftData.selectedLine && shiftData.selectedShift &&
      (shiftData.selectedLine !== localLine || shiftData.selectedShift !== localShift));
    const hasActiveProduction = Boolean(timer.running || (timer.elapsed || 0) > 0 || timer.stoerRunning);

    const applySelection = async () => {
      // 1) Save current (previous) selection's timer state per-shift
      const prevLine = shiftData.selectedLine; const prevShift = shiftData.selectedShift;
      if (prevLine && prevShift && (prevLine !== localLine || prevShift !== localShift)) {
        try {
          // persist timer (paused) and per-shift selected FA before switching away
          await timer.saveStateForSelection(prevLine, prevShift, true);
          if (selectedFA) await AsyncStorage.setItem(`selected_fa:${prevLine}:${prevShift}`, JSON.stringify(selectedFA));
        } catch (e) { console.warn('Failed to save previous shift data', e); }
      }
      // 2) Apply new selection locally
      updateShiftData({ selectedLine: localLine, selectedLeader: localLeader, selectedShift: localShift });
      await persistLine(localLine); await persistLeader(localLeader); await persistShift(localShift);
      await AsyncStorage.setItem('assigned_line_locked', 'true');
      setLineLocked(true); setSelectionConfirmed(true);

      // 3) Restore per-shift timer for the newly selected shift (or reset if none)
      try {
        const loaded = await timer.loadStateForSelection(localLine, localShift);
        if (!loaded) {
          await timer.resetTimer();
        }
        // restore per-shift selected FA if present
        try {
          const rawPerFa = await AsyncStorage.getItem(`selected_fa:${localLine}:${localShift}`);
          if (rawPerFa) {
            try { setSelectedFA(JSON.parse(rawPerFa)); } catch {}
          } else {
            setSelectedFA(null);
          }
        } catch (e) { console.warn('Failed to restore per-shift selectedFA', e); }
      } catch (e) { console.warn('Failed to restore timer for new selection', e); }

      // 4) Load logs for the new selection and replace displayed logs with DB entries (today + same schicht)
      loadLocalLogs(localLine, localShift);
      try {
        const { session, stoerungen } = await dbSync.loadFromDb(localLine, localShift);
        // Session (Timer + FA) aus DB wiederherstellen
        await applyDbSession(session);
        if (Array.isArray(stoerungen) && stoerungen.length) {
          const incoming = stoerungen.map(s => ({
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
      } catch (e) { console.warn('Fehler beim Laden der Störungen aus DB', e); }
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
    await dbSync.stopSession();
    await timer.resetTimer();
    try { await AsyncStorage.removeItem('assigned_leader'); } catch {}
    try { await AsyncStorage.removeItem('assigned_shift');  } catch {}
    try { await AsyncStorage.removeItem('selected_fa');     } catch {}
    updateShiftData({ selectedLine: shiftData.selectedLine || null, selectedLeader: null, selectedShift: null });
    setSelectionConfirmed(false); setLocalLeader(null); setLocalShift(null);
    setSelectedFA(null);
  };

  //  Störung button grid 
  const renderStörungButtons = (buttons) => (
    <View style={protocolScreenStyles.modalSelectCard}>
      <View style={protocolScreenStyles.modalHeaderRow}>
        <Text style={protocolScreenStyles.modalTitle}>Störung auswählen</Text>
        <TouchableOpacity onPress={() => setCurrentView('initial')}>
          <Text style={protocolScreenStyles.modalClose}></Text>
        </TouchableOpacity>
      </View>
      <View style={protocolScreenStyles.gridContainer}>
        {buttons.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={protocolScreenStyles.disturbanceCard}
            onPress={() => { timer.handleIssueSelect(label); setCurrentView('initial'); }}
          >
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="warning" size={20} color={THEME.colors.dark.foregroundMuted} style={protocolScreenStyles.disturbanceIcon} />
              <Text style={protocolScreenStyles.actionButtonText} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 
  return (
    <View style={protocolScreenStyles.container}>

      {/*  Header Bar  */}
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

      {/*  Selection Bar  */}
      <View style={protocolScreenStyles.topSelectionBar}>
        {!selectionConfirmed ? (
          <>
            <View style={protocolScreenStyles.selectionGroup}>
              {/* Line chip */}
              <TouchableOpacity
                style={[protocolScreenStyles.selectionChip, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => { if (!lineLocked) setOpenSelectModal('line'); }}
                activeOpacity={lineLocked ? 1 : 0.7}
              >
                <View>
                  <Text style={protocolScreenStyles.selectionLabelSmall}>Linie</Text>
                  <Text style={protocolScreenStyles.selectionValueSmall}>{localLine || ''}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (lineLocked) {
                      showConfirm({
                        title: 'Linie entsperren',
                        message: 'Linie wirklich entsperren?',
                        onConfirm: async () => {
                          setLineLocked(false);
                          try { await AsyncStorage.removeItem('assigned_line_locked'); } catch {}
                        },
                      });
                    } else {
                      setLineLocked(true);
                      AsyncStorage.setItem('assigned_line_locked', 'true');
                    }
                  }}
                  style={{ paddingLeft: 8, paddingRight: 4 }}
                >
                  <MaterialIcons name={lineLocked ? 'lock' : 'lock-open'} size={18} color={lineLocked ? THEME.colors.dark.warning : THEME.colors.dark.foregroundMuted} />
                </TouchableOpacity>
              </TouchableOpacity>

              <TouchableOpacity style={protocolScreenStyles.selectionChip} onPress={() => setOpenSelectModal('leader')}>
                <Text style={protocolScreenStyles.selectionLabelSmall}>Linienführer</Text>
                <Text style={protocolScreenStyles.selectionValueSmall}>{localLeader || ''}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={protocolScreenStyles.selectionChip} onPress={() => setOpenSelectModal('shift')}>
                <Text style={protocolScreenStyles.selectionLabelSmall}>Schicht</Text>
                <Text style={protocolScreenStyles.selectionValueSmall}>{localShift || ''}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={protocolScreenStyles.confirmSmallButton} onPress={handleConfirmSelection}>
              <Text style={protocolScreenStyles.confirmSmallButtonText}>Bestätigen</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
            <View style={protocolScreenStyles.selectionSummarySmall}>
              <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11 }}>Linie</Text>
              <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedLine}</Text>
              {lineLocked && <MaterialIcons name="lock" size={14} color={THEME.colors.dark.warning} style={{ marginLeft: 8 }} />}
              <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11, marginLeft: 12 }}>Schicht</Text>
              <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedShift}</Text>
              <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 11, marginLeft: 12 }}>Führer</Text>
              <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '700', marginLeft: 8 }}>{shiftData.selectedLeader}</Text>
              <MaterialIcons name="people" size={13} color={THEME.colors.dark.foregroundMuted} style={{ marginLeft: 12 }} />
              <Text style={{ color: anzahlArbeiter != null ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted, fontWeight: '700', marginLeft: 4 }}>
                {anzahlArbeiter != null ? anzahlArbeiter : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectionConfirmed(false)}>
              <Text style={protocolScreenStyles.editSelectionText}>Ändern</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/*  Selection picker modal  */}
      <Modal visible={openSelectModal !== null} transparent animationType="fade">
        <View style={protocolScreenStyles.modalOverlay}>
          <View style={protocolScreenStyles.modalSelectCard}>
            <View style={protocolScreenStyles.modalHeaderRow}>
              <Text style={protocolScreenStyles.modalTitle}>
                {openSelectModal === 'line' ? 'Linie wählen' : openSelectModal === 'leader' ? 'Linienführer wählen' : 'Schicht wählen'}
              </Text>
              <TouchableOpacity onPress={() => setOpenSelectModal(null)}>
                <Text style={protocolScreenStyles.modalClose}></Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(openSelectModal === 'line' ? LINE_OPTIONS : openSelectModal === 'leader' ? LEADER_OPTIONS : SHIFT_OPTIONS).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.colors.dark.border }}
                  onPress={() => {
                    if (openSelectModal === 'line')   setLocalLine(opt.value);
                    if (openSelectModal === 'leader') setLocalLeader(opt.value);
                    if (openSelectModal === 'shift')  setLocalShift(opt.value);
                    setOpenSelectModal(null);
                  }}
                >
                  <Text style={{ color: THEME.colors.dark.foreground, fontWeight: '600' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setOpenSelectModal(null)} style={[protocolScreenStyles.modalButton, protocolScreenStyles.modalCancel]}>
                <Text style={protocolScreenStyles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/*  Main scroll content  */}
      <ScrollView style={protocolScreenStyles.contentContainer} contentContainerStyle={protocolScreenStyles.scrollContent}>

        <View style={protocolScreenStyles.dashboardGrid}>

          {/* FA Section */}
          <View style={protocolScreenStyles.faSectionCard}>
            <Text style={protocolScreenStyles.sectionTitle}>FERTIGUNGSAUFTRAG</Text>
            {!selectedFA ? (
              <>
                <View style={protocolScreenStyles.faSearchContainer}>
                  <TextInput
                    style={protocolScreenStyles.faSearchInput}
                    placeholder="FA-Nummer eingeben"
                    placeholderTextColor={THEME.colors.dark.foregroundDim}
                    value={faSearchText}
                    onChangeText={setFaSearchText}
                    autoCapitalize="characters"
                    onSubmitEditing={handleFASearch}
                  />
                  <TouchableOpacity style={protocolScreenStyles.faSearchButton} onPress={handleFASearch} disabled={isSearching}>
                    <MaterialIcons name="search" size={20} color={THEME.colors.dark.foreground} />
                  </TouchableOpacity>
                </View>
                {!!faSearchError && <Text style={protocolScreenStyles.faSearchError}>{faSearchError}</Text>}
                {faSearchResults.length > 0 && (
                  <View style={protocolScreenStyles.faResultsContainer}>
                    <Text style={protocolScreenStyles.faResultsTitle}>Suchergebnisse ({faSearchResults.length})</Text>
                    <ScrollView style={protocolScreenStyles.faResultsList} nestedScrollEnabled>
                      {faSearchResults.map((fa, i) => (
                        <TouchableOpacity key={i} style={protocolScreenStyles.faResultItem} onPress={() => handleSelectFA(fa)}>
                          <Text style={protocolScreenStyles.faResultFANr}>{fa.FANr}</Text>
                          <Text style={protocolScreenStyles.faResultArtikel}>{fa.Artikelbezeichnung}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <View style={protocolScreenStyles.faSelectedContainer}>
                <View style={protocolScreenStyles.faSelectedContent}>
                  <Text style={protocolScreenStyles.faSelectedLabel}>FA-Nummer</Text>
                  <Text style={protocolScreenStyles.faSelectedValue}>{selectedFA.FANr}</Text>
                  <Text style={[protocolScreenStyles.faSelectedLabel, { marginTop: 8 }]}>Artikel-Nr</Text>
                  <Text style={protocolScreenStyles.faSelectedValue}>{selectedFA.ArtikelNr}</Text>
                  <Text style={[protocolScreenStyles.faSelectedLabel, { marginTop: 8 }]}>Bezeichnung</Text>
                  <Text style={protocolScreenStyles.faSelectedValue}>{selectedFA.Artikelbezeichnung}</Text>
                </View>
                <TouchableOpacity style={protocolScreenStyles.faRemoveButton} onPress={() => setSelectedFA(null)}>
                  <MaterialIcons name="close" size={20} color={THEME.colors.dark.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SOLL / IST / Zeitübersicht row */}
          <View style={protocolScreenStyles.sollIstZeitRow}>

            {/* SOLL + IST column */}
            <View style={protocolScreenStyles.sollIstColumn}>
              {/* SOLL Card */}
              <View style={[protocolScreenStyles.sollIstCard, { borderTopWidth: 3, borderTopColor: THEME.colors.dark.primary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MaterialIcons name="track-changes" size={13} color={THEME.colors.dark.primary} />
                    <Text style={protocolScreenStyles.sollIstLabel}>SOLL</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity onPress={handleImportSoll} disabled={isImportingSoll} style={{ padding: 5 }}>
                      <MaterialIcons name="file-upload" size={16} color={isImportingSoll ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleRefreshSoll} disabled={isFetchingSoll} style={{ padding: 5 }}>
                      <MaterialIcons name="autorenew" size={16} color={isFetchingSoll ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <Text style={protocolScreenStyles.sollIstValue}>{_soll > 0 ? expectedIstRounded : '—'}</Text>
                  {_soll > 0 && <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 13, marginBottom: 7 }}>Stk</Text>}
                </View>
                <Text style={{ fontSize: 11, color: THEME.colors.dark.foregroundDim, marginTop: 2 }}>
                  {_soll > 0 ? `Vorgabe ${sollPerHour} / Std` : 'Kein SOLL geladen'}
                </Text>
              </View>

              {/* IST Card */}
              <View style={[protocolScreenStyles.sollIstCard, protocolScreenStyles.sollIstCardSpacing, { borderTopWidth: 3, borderTopColor: istStatus !== 'neutral' ? istColor : THEME.colors.dark.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MaterialIcons name="bar-chart" size={13} color={istStatus !== 'neutral' ? istColor : THEME.colors.dark.foregroundMuted} />
                    <Text style={[protocolScreenStyles.sollIstLabel, istStatus !== 'neutral' && { color: istColor }]}>IST</Text>
                  </View>
                  {istStatus !== 'neutral' && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: istColor + '25' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: istColor, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        {istStatus === 'good' ? 'Im Soll' : istStatus === 'warning' ? 'Leicht zurück' : 'Zu langsam'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <Text style={[protocolScreenStyles.sollIstValue, { color: istColor }]}>{_ist}</Text>
                  <Text style={{ color: istColor + 'AA', fontSize: 13, marginBottom: 7 }}>Stk</Text>
                </View>
                {_soll > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <MaterialIcons
                      name={istDiff >= 0 ? 'arrow-upward' : 'arrow-downward'}
                      size={13}
                      color={istDiff >= 0 ? THEME.colors.dark.success : THEME.colors.dark.danger}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: istDiff >= 0 ? THEME.colors.dark.success : THEME.colors.dark.danger }}>
                      {istDiff >= 0 ? '+' : ''}{istDiff} Stk
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: THEME.colors.dark.foregroundDim, marginTop: 2 }}>Kein SOLL geladen</Text>
                )}
              </View>
            </View>

            {/* Zeitübersicht column */}
            <View style={protocolScreenStyles.zeitColumn}>
              <View style={protocolScreenStyles.sollIstCard}>
                <Text style={protocolScreenStyles.sectionTitle}>ZEITÜBERSICHT</Text>

                <View style={protocolScreenStyles.zeitStartRow}>
                  <View style={protocolScreenStyles.zeitStartItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="access-time" size={16} color={THEME.colors.dark.info} style={{ marginRight: 6 }} />
                        <Text style={protocolScreenStyles.zeitPairLabel}>IST START</Text>
                      </View>
                      <Text style={protocolScreenStyles.zeitPairValue}>
                        {timer.mainTimerStartTime.current
                          ? new Date(timer.mainTimerStartTime.current).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </Text>
                    </View>
                  </View>
                  <View style={protocolScreenStyles.zeitStartItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="access-time" size={16} color={THEME.colors.dark.success} style={{ marginRight: 6 }} />
                        <Text style={protocolScreenStyles.zeitPairLabel}>SOLL START</Text>
                      </View>
                      <Text style={protocolScreenStyles.zeitPairValue}>--:--</Text>
                    </View>
                  </View>
                </View>

                <View style={protocolScreenStyles.zeitPairRow}>
                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <Text style={protocolScreenStyles.zeitPairLabel}>BRUTTO</Text>
                      <Text style={protocolScreenStyles.zeitPairValue}>{formatTime(timer.elapsed)}</Text>
                    </View>
                  </View>
                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="show-chart" size={16} color={THEME.colors.dark.success} style={{ marginRight: 6 }} />
                        <Text style={[protocolScreenStyles.zeitPairLabel, { color: THEME.colors.dark.success }]}>NETTO</Text>
                      </View>
                      <Text style={[protocolScreenStyles.zeitPairValue, { color: THEME.colors.dark.success }]}>
                        {selectedFA ? formatTime(Math.max(0, timer.elapsed - _pauseSec - stoerTotalSeconds)) : '--:--'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={protocolScreenStyles.zeitPairRow}>
                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="warning" size={16} color={THEME.colors.dark.danger} style={{ marginRight: 6 }} />
                        <Text style={[protocolScreenStyles.zeitPairLabel, { color: THEME.colors.dark.danger }]}>STÖRUNG KUM.</Text>
                      </View>
                      <Text style={[protocolScreenStyles.zeitPairValue, { color: THEME.colors.dark.danger }]}>
                        {Math.floor(stoerTotalSeconds / 60)} Min
                      </Text>
                    </View>
                  </View>
                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="free-breakfast" size={16} color={THEME.colors.dark.warning} style={{ marginRight: 6 }} />
                        <Text style={[protocolScreenStyles.zeitPairLabel, { color: THEME.colors.dark.warning }]}>PAUSE KUM.</Text>
                      </View>
                      <Text style={[protocolScreenStyles.zeitPairValue, { color: THEME.colors.dark.warning }]}>
                        {Math.floor(_pauseSec / 60)} Min
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Störung active timer + note */}
        {timer.stoerRunning && (
          <View style={{ padding: 16 }}>
            <Text style={protocolScreenStyles.stoerTimerText}>Stör-Timer: {formatTime(timer.stoerElapsed)}</Text>
          </View>
        )}
        {timer.selectedIssue && (
          <View style={{ padding: 16 }}>
            <Text style={protocolScreenStyles.selectedIssueText}>Aktuelle Störung: {timer.selectedIssue}</Text>
            {timer.selectedIssue === 'Sonstiges' && (
              <TextInput
                style={protocolScreenStyles.sonstigesInput}
                placeholder="Beschreibe die Störung..."
                placeholderTextColor={THEME.colors.dark.foregroundDim}
                value={timer.sonstigesText}
                onChangeText={timer.setSonstigesText}
                multiline
              />
            )}
          </View>
        )}

        {/*  Action Buttons  */}
        {currentView === 'initial' && (
          <View style={protocolScreenStyles.actionsSection}>
            {timer.showStartOnly ? (
              <View style={protocolScreenStyles.buttonsRow}>
                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.startButton, !selectedFA && protocolScreenStyles.actionButtonDisabled]}
                  onPress={() => showConfirm({ title: 'Produktion starten', message: 'Produktion jetzt starten?', onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView) })}
                  disabled={!selectedFA}
                >
                  <MaterialIcons name="play-arrow" size={20} color={selectedFA ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted} />
                  <Text style={[protocolScreenStyles.actionButtonText, !selectedFA && protocolScreenStyles.actionButtonTextDisabled]}>Produktion starten</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[protocolScreenStyles.actionButton, protocolScreenStyles.modalCancel]} onPress={() => timer.handleCancelStoer(setCurrentView)}>
                  <Text style={protocolScreenStyles.modalCancelText}>Abbrechen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={protocolScreenStyles.buttonsRow}>
                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.startButton, timer.activeButton === 'start' && protocolScreenStyles.actionButtonActive, !selectedFA && protocolScreenStyles.actionButtonDisabled]}
                  onPress={() => showConfirm({ title: 'Produktion starten', message: 'Produktion jetzt starten?', onConfirm: () => timer.handleStart(selectedFA, setFaSearchError, setCurrentView) })}
                  disabled={!selectedFA || timer.activeButton === 'start'}
                >
                  <MaterialIcons name="play-arrow" size={20} color={selectedFA ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted} />
                  <Text style={[protocolScreenStyles.actionButtonText, !selectedFA && protocolScreenStyles.actionButtonTextDisabled]}>Produktion starten</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.stoerungButton, timer.activeButton === 'störung' && protocolScreenStyles.actionButtonActive]}
                  onPress={() => timer.handleStörungClick(setCurrentView)}
                >
                  <MaterialIcons name="warning" size={20} color={THEME.colors.dark.foreground} />
                  <Text style={protocolScreenStyles.actionButtonText}>Störung melden</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.pauseButton, timer.activeButton === 'pause' && protocolScreenStyles.actionButtonActive, !selectedFA && protocolScreenStyles.actionButtonDisabled]}
                  onPress={() => timer.handlePause(selectedFA, setFaSearchError)}
                  disabled={!selectedFA}
                >
                  <MaterialIcons name="pause" size={20} color={selectedFA ? THEME.colors.dark.foreground : THEME.colors.dark.foregroundMuted} />
                  <Text style={[protocolScreenStyles.actionButtonText, !selectedFA && protocolScreenStyles.actionButtonTextDisabled]}>Pause setzen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.endeButton]}
                  onPress={() => showConfirm({ title: 'Schicht beenden', message: 'Bist du sicher, dass du die Schicht beenden möchtest?', onConfirm: handleEnde })}
                >
                  <MaterialIcons name="stop" size={20} color={THEME.colors.dark.foreground} />
                  <Text style={protocolScreenStyles.actionButtonText}>Schicht beenden</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Störung selector */}
        {currentView === 'störung' && lineButtonConfig[effectiveLine]?.störung && (
          <View style={protocolScreenStyles.stoerungModal}>
            <Text style={protocolScreenStyles.sectionTitle}>STÖRUNG AUSWÄHLEN</Text>
            {renderStörungButtons(lineButtonConfig[effectiveLine].störung)}
          </View>
        )}

        {/* Logs table */}
        {!timer.selectedIssue && currentView !== 'störung' && (
          <View style={protocolScreenStyles.logsSection}>
            <View style={protocolScreenStyles.tableTitleRow}>
              <Text style={protocolScreenStyles.sectionTitle}>STÖRUNGSPROTOKOLLE (HEUTE)</Text>
              <TouchableOpacity onPress={() =>
                showConfirm({
                  title: 'Protokoll leeren',
                  message: 'Einträge werden nur lokal gelöscht. Die Daten bleiben in der Datenbank und werden beim nächsten Laden wiederhergestellt. Trotzdem leeren?',
                  onConfirm: async () => {
                    await clearAllLocalLogs();
                    // DB-Einträge sofort neu laden
                    try {
                      const { stoerungen } = await dbSync.loadFromDb();
                      if (Array.isArray(stoerungen) && stoerungen.length) {
                        setLocalLogsFromServer(stoerungen.map(s => ({
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
                        })));
                      }
                    } catch (e) { console.warn('DB reload after clear failed', e); }
                  },
                })
              }>
                <MaterialIcons name="delete-outline" size={24} color={THEME.colors.dark.danger} />
              </TouchableOpacity>
            </View>

            <View style={protocolScreenStyles.tabRow}>
              {['logs', 'summary'].map(mode => (
                <TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={[protocolScreenStyles.tabButton, viewMode === mode && protocolScreenStyles.tabActive]}>
                  <Text style={[protocolScreenStyles.tabText, viewMode === mode && protocolScreenStyles.tabTextActive]}>
                    {mode === 'logs' ? 'Protokolle' : `Übersicht (${localLogs.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={protocolScreenStyles.tableContainer}>
              {viewMode === 'logs' ? (
                <>
                  <View style={protocolScreenStyles.tableHeader}>
                    <View style={{ width: 8 }} />
                    <Text style={[protocolScreenStyles.tableHeaderCell, { flex: 2 }]}>STÖRUNG</Text>
                    <Text style={protocolScreenStyles.tableHeaderCell}>START</Text>
                    <Text style={protocolScreenStyles.tableHeaderCell}>ENDE</Text>
                    <Text style={protocolScreenStyles.tableHeaderCell}>DAUER</Text>
                  </View>
                  {localLogs.length === 0 ? (
                    <Text style={protocolScreenStyles.tableEmpty}>Keine Einträge für heute</Text>
                  ) : (
                    <ScrollView style={protocolScreenStyles.tableScroll} nestedScrollEnabled>
                      {localLogs.map((log) => {
                        const dur = log.durationSeconds;
                        const col = dur >= 60 ? THEME.colors.dark.danger : dur >= 10 ? THEME.colors.dark.warning : THEME.colors.dark.netto;
                        return (
                          <View key={log.id} style={[protocolScreenStyles.tableRow, { flexDirection: 'row', alignItems: 'center' }]}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col, marginRight: 12 }} />
                            <View style={{ flex: 2 }}>
                              <Text style={protocolScreenStyles.tableCell}>{log.issue}</Text>
                              {log.notes && <Text style={protocolScreenStyles.tableNote}>{log.notes}</Text>}
                            </View>
                            <Text style={protocolScreenStyles.tableCell}>{new Date(log.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</Text>
                            <Text style={protocolScreenStyles.tableCell}>{new Date(log.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</Text>
                            <Text style={[protocolScreenStyles.tableCell, { color: col, fontWeight: '600' }]}>{formatTime(dur)}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </>
              ) : (
                computeIssueSummary().length === 0 ? (
                  <Text style={protocolScreenStyles.tableEmpty}>Keine definierten Störungen</Text>
                ) : (
                  <View style={protocolScreenStyles.summaryGrid}>
                    {computeIssueSummary().map(item => (
                      <View key={item.label} style={protocolScreenStyles.summaryCard}>
                        <Text style={protocolScreenStyles.summaryCount}>{item.count}</Text>
                        <Text style={protocolScreenStyles.summaryLabel}>{item.label}</Text>
                        <Text style={protocolScreenStyles.summaryTime}>{formatTime(item.totalSeconds)}</Text>
                      </View>
                    ))}
                  </View>
                )
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Confirm Modal */}
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
