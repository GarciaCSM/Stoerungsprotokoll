import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';
import { useShift } from '../context/ShiftContext';
import protocolScreenStyles from '../styles/ProtocolScreenStyles';
import { lineButtonConfig } from '../config/lineButtonConfig';
import { MaterialIcons } from '@expo/vector-icons';
import FAService from '../services/faService';

const ProtocolScreen = ({ onBack }) => {
  const { shiftData, updateShiftData } = useShift();
  const [currentView, setCurrentView] = useState('initial'); // 'initial' oder 'störung'

  // Timer state
  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);
  const [activeButton, setActiveButton] = useState(null); // 'start' | 'störung' | 'pause' | null
  const [selectedIssue, setSelectedIssue] = useState(null); // when a störung button is selected
  const [sonstigesText, setSonstigesText] = useState(''); // description when Sonstiges selected
  const [showStartOnly, setShowStartOnly] = useState(false); // when true, only show Start button

  // FA-Number search state
  const [faSearchText, setFaSearchText] = useState('');
  const [faSearchError, setFaSearchError] = useState('');
  const [faSearchResults, setFaSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFA, setSelectedFA] = useState(null); // {FANr, ArtikelNr, Artikelbezeichnung}

  // Störung timer state
  const [stoerStart, setStoerStart] = useState(null); // timestamp ms
  const [stoerRunning, setStoerRunning] = useState(false);
  const [stoerElapsed, setStoerElapsed] = useState(0); // seconds
  const stoerIntervalRef = useRef(null);
  // remember whether the main timer was running before starting a stör (so we can restore it on cancel)
  const prevRunningBeforeStoer = useRef(false);

  // Pause tracking
  const [pauseStart, setPauseStart] = useState(null); // timestamp ms
  const [pauseRunning, setPauseRunning] = useState(false);
  const [pauseElapsed, setPauseElapsed] = useState(0); // live pause seconds
  const [totalPauseSeconds, setTotalPauseSeconds] = useState(0); // cumulative pause seconds
  const pauseIntervalRef = useRef(null);

  const intervalRef = useRef(null);
  const mainTimerStartTime = useRef(null); // timestamp when main timer started (for persistence)

  useEffect(() => {
    if (running) {
      // if starting, set start time
      if (!mainTimerStartTime.current) {
        mainTimerStartTime.current = Date.now() - (elapsed * 1000);
      }
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          const now = Date.now();
          const newElapsed = Math.floor((now - mainTimerStartTime.current) / 1000);
          setElapsed(newElapsed);
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  // separate effect for stör timer
  useEffect(() => {
    if (stoerRunning) {
      if (!stoerIntervalRef.current) {
        stoerIntervalRef.current = setInterval(() => {
          setStoerElapsed(Math.round((Date.now() - stoerStart) / 1000));
        }, 1000);
      }
    } else {
      if (stoerIntervalRef.current) {
        clearInterval(stoerIntervalRef.current);
        stoerIntervalRef.current = null;
      }
    }
    return () => {
      if (stoerIntervalRef.current) {
        clearInterval(stoerIntervalRef.current);
        stoerIntervalRef.current = null;
      }
    };
  }, [stoerRunning, stoerStart]);

  // Pause timer effect: track an active pause and update totalPauseSeconds while pausing
  useEffect(() => {
    if (pauseRunning) {
      if (!pauseIntervalRef.current) {
        pauseIntervalRef.current = setInterval(() => {
          // keep a live counter in case UI wants to show pause duration
          const now = Date.now();
          setPauseElapsed(Math.round((now - pauseStart) / 1000));
        }, 1000);
      }
    } else {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
      // clear live counter
      setPauseElapsed(0);
    }
    return () => {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
    };
  }, [pauseRunning, pauseStart]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const two = (n) => n.toString().padStart(2, '0');
    return `${two(hrs)}:${two(mins)}:${two(secs)}`;
  };

  // Persist a störung log locally (AsyncStorage) — no DB yet
  const [localLogs, setLocalLogs] = useState([]);

  // View mode: 'logs' (default table) or 'summary' (aggregated view)
  const [viewMode, setViewMode] = useState('logs');

  // Compute summary (count and total duration) for possible issues for current line/shift
  const computeIssueSummary = () => {
    // prefer configured issues for the selected line; fall back to unique issues seen in today's logs
    const cfg = lineButtonConfig[shiftData.selectedLine] && lineButtonConfig[shiftData.selectedLine].störung ? lineButtonConfig[shiftData.selectedLine].störung : [];
    const issues = cfg && cfg.length ? cfg : [...new Set(localLogs.map(l => l.issue).filter(Boolean))];
    return issues.map((label) => {
      const entries = localLogs.filter(e => e.issue === label);
      const count = entries.length;
      const totalSeconds = entries.reduce((s, e) => s + (e.durationSeconds || 0), 0);
      return { label, count, totalSeconds };
    });
  };

  const loadLocalLogs = async () => {
    try {
      const key = 'local_logs';
      const raw = await AsyncStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      // filter to today's entries, current line and selected shift
      const today = new Date().toDateString();
      const todays = existing.filter((e) => {
        const isToday = new Date(e.createdAt).toDateString() === today;
        const sameLine = e.line === shiftData.selectedLine;
        const sameShift = (shiftData.selectedShift && (e.shift_type === shiftData.selectedShift || e.shift === shiftData.selectedShift));
        return isToday && sameLine && (shiftData.selectedShift ? sameShift : true);
      });
      setLocalLogs(todays.reverse()); // latest first
    } catch (e) {
      console.warn('Failed to load local logs', e);
    }
  };

  useEffect(() => {
    // load local logs on mount and whenever selected line or shift changes
    loadLocalLogs();
  }, [shiftData.selectedLine, shiftData.selectedShift]);

  // Load timer state from AsyncStorage on mount
  useEffect(() => {
    const loadTimerState = async () => {
      try {
        const timerStateRaw = await AsyncStorage.getItem('timer_state');
        if (timerStateRaw) {
          const timerState = JSON.parse(timerStateRaw);
          const now = Date.now();
          // restore state
          if (timerState.running && timerState.startTime) {
            const elapsedMs = now - timerState.startTime;
            const elapsedSec = Math.floor(elapsedMs / 1000);
            mainTimerStartTime.current = timerState.startTime;
            setElapsed(elapsedSec);
            setRunning(true);
            setActiveButton(timerState.activeButton || 'start');
          } else {
            setElapsed(timerState.elapsed || 0);
            setRunning(false);
            setActiveButton(timerState.activeButton || null);
          }
          // restore störung state
          if (timerState.selectedIssue) {
            setSelectedIssue(timerState.selectedIssue);
            setShowStartOnly(true);
          }
          if (timerState.stoerStart && timerState.stoerRunning) {
            setStoerStart(timerState.stoerStart);
            setStoerRunning(true);
            const stoerElapsedSec = Math.floor((now - timerState.stoerStart) / 1000);
            setStoerElapsed(stoerElapsedSec);
          }

          // restore pause info
          setTotalPauseSeconds(timerState.totalPauseSeconds || 0);
          setPauseStart(timerState.pauseStart || null);
          setPauseRunning(timerState.pauseRunning || false);
          if (timerState.pauseRunning && timerState.pauseStart) {
            const pElapsed = Math.floor((now - timerState.pauseStart) / 1000);
            setPauseElapsed(pElapsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load timer state', e);
      }
    };
    loadTimerState();
  }, []);

  const saveStoerLog = async ({ issue, startTime, endTime, durationSeconds, notes }) => {
    try {
      const key = 'local_logs';
      const raw = await AsyncStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const lineNumber = (shiftData.selectedLine && shiftData.selectedLine.match(/\d+/)) ? shiftData.selectedLine.match(/\d+/)[0] : shiftData.selectedLine;
      const entry = {
        id: Date.now(),
        type: 'störung',
        line: shiftData.selectedLine,
        lineNumber: lineNumber, // numeric or raw indicator for later grouping (not displayed in table)
        shift: shiftData.selectedShift,
        shift_type: shiftData.selectedShift, // explicit field for server ENUM compatibility
        leader: shiftData.selectedLeader,
        issue,
        notes: notes || null,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationSeconds,
        createdAt: new Date().toISOString(),
      };
      existing.push(entry);
      await AsyncStorage.setItem(key, JSON.stringify(existing));
      console.log('Saved störung log locally', entry);
      // update local state view
      loadLocalLogs();
    } catch (e) {
      console.warn('Failed to save störung log', e);
    }
  };

  // Save timer state to AsyncStorage whenever it changes
  const saveTimerState = async () => {
    try {
      const timerState = {
        elapsed,
        running,
        activeButton,
        selectedIssue,
        showStartOnly,
        startTime: mainTimerStartTime.current,
        stoerStart,
        stoerRunning,
        // pause info
        pauseStart,
        pauseRunning,
        totalPauseSeconds,
      };
      await AsyncStorage.setItem('timer_state', JSON.stringify(timerState));
    } catch (e) {
      console.warn('Failed to save timer state', e);
    }
  };

  // Auto-save timer state whenever relevant values change
  useEffect(() => {
    saveTimerState();
  }, [elapsed, running, activeButton, selectedIssue, showStartOnly, stoerStart, stoerRunning, pauseStart, pauseRunning, totalPauseSeconds]);

  // Dev helper: clear all local logs (no confirmation) — used to quickly empty tables
  const clearAllLocalLogs = async () => {
    try {
      const key = 'local_logs';
      await AsyncStorage.setItem(key, JSON.stringify([]));
      setLocalLogs([]);
      console.log('Cleared all local logs (dev)');
    } catch (e) {
      console.warn('Failed to clear local logs', e);
    }
  };

  // Button handlers that control timer and active states
  const handleStart = async () => {
    // if there is a selected issue and a running stör timer, record it before starting
    if (selectedIssue && stoerStart) {
      const end = Date.now();
      const durationSeconds = Math.round((end - stoerStart) / 1000);
      const notes = selectedIssue === 'Sonstiges' ? sonstigesText : undefined;
      await saveStoerLog({ issue: selectedIssue, startTime: stoerStart, endTime: end, durationSeconds, notes });
      // reset stör timer
      setStoerStart(null);
      setStoerRunning(false);
      setStoerElapsed(0);
      setSonstigesText('');
      // clear stored prev running flag
      prevRunningBeforeStoer.current = false;
    }

    // if we're resuming from pause, add the pause duration to total and clear pause state
    if (pauseRunning && pauseStart) {
      const now = Date.now();
      const added = Math.round((now - pauseStart) / 1000);
      setTotalPauseSeconds(prev => prev + added);
      setPauseRunning(false);
      setPauseStart(null);
      setPauseElapsed(0);
    }

    setActiveButton('start');
    setRunning(true);
    // clear selected issue (resolved) and show full controls again
    setSelectedIssue(null);
    setShowStartOnly(false);
    setCurrentView('initial');
  };

  const handlePause = () => {
    // start a pause period
    if (!pauseRunning) {
      setPauseStart(Date.now());
      setPauseRunning(true);
      setActiveButton('pause');
      setRunning(false);
    }
  };

  const handleCancelStoer = () => {
    // Cancel current störung without saving a log and restore previous running state
    if (stoerRunning) {
      setStoerRunning(false);
      setStoerStart(null);
      setStoerElapsed(0);
    }
    setSelectedIssue(null);
    setShowStartOnly(false);
    setCurrentView('initial');
    setActiveButton(prevRunningBeforeStoer.current ? 'start' : null);
    if (prevRunningBeforeStoer.current) setRunning(true);
    prevRunningBeforeStoer.current = false;
  };

  const handleStörungClick = () => {
    // Öffne die Störungs‑Auswahl und stoppe den Haupt‑Timer sofort.
    // Merke den aktuellen Timerzustand (nur für Referenz), aber wir starten den Haupt‑Timer erst wieder wenn der Benutzer ausdrücklich zurückkehrt.
    prevRunningBeforeStoer.current = running;
    setCurrentView('störung');
    setActiveButton('störung');
    // stoppe den Haupt-Timer sofort
    setRunning(false);
  };

  const handleIssueSelect = (issueLabel) => {
    // user selected a specific störung cause -> start stör timer and stop main timer
    setSelectedIssue(issueLabel);
    // clear any previous Sonstiges text unless Sonstiges was just chosen
    if (issueLabel !== 'Sonstiges') setSonstigesText('');

    // remember previous running state so we can restore it on cancel
    prevRunningBeforeStoer.current = running;

    // Beginne Störungs-Timer erst beim konkreten Auswählen
    if (!stoerRunning) {
      const now = Date.now();
      setStoerStart(now);
      setStoerRunning(true);
      setStoerElapsed(0);
    }

    setShowStartOnly(true);
    setCurrentView('initial');
    setActiveButton('störung');
    // stoppe den Haupt-Timer **erst jetzt**
    setRunning(false);
    console.log('Issue selected:', issueLabel);
  };

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleEnde = async () => {
    setActiveButton(null);
    setRunning(false);
    setElapsed(0);
    setCurrentView('initial');
    // clear any selected issue
    setSelectedIssue(null);
    setShowStartOnly(false);
    // reset timer start time
    mainTimerStartTime.current = null;
    // clear stored timer state
    try {
      await AsyncStorage.removeItem('timer_state');
    } catch (e) {
      console.warn('Failed to clear timer state', e);
    }

    // remove assigned line and related leader/shift when production is finished so the tablet will ask again next time
    try {
      await AsyncStorage.removeItem('assigned_line');
      await AsyncStorage.removeItem('assigned_leader');
      await AsyncStorage.removeItem('assigned_shift');
    } catch (e) {
      console.warn('Failed to remove assigned assignment keys', e);
    }

    // reset global shift data (line, leader, shift)
    try {
      updateShiftData({ selectedLine: null, selectedLeader: null, selectedShift: null });
    } catch (e) {
      console.warn('Failed to update shift data', e);
    }

    // navigate back to home so the UI asks for new data
    onBack();
  };

  const openEndConfirm = () => setShowEndConfirm(true);
  const cancelEndConfirm = () => setShowEndConfirm(false);
  const confirmEnd = () => {
    setShowEndConfirm(false);
    handleEnde();
  };

  // Responsive buttons: use flexWrap so they adapt to screen width — for 'störung' view show modal-like selector
  const renderButtons = (buttons) => {
    return (
      <View style={{width: '100%'}}>
        <View style={protocolScreenStyles.modalSelectCard}>
          <View style={protocolScreenStyles.modalHeaderRow}>
            <Text style={protocolScreenStyles.modalTitle}>Störung auswählen</Text>
            <TouchableOpacity onPress={() => setCurrentView('initial')}> 
              <Text style={protocolScreenStyles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={protocolScreenStyles.gridContainer}>
            {buttons.map((buttonLabel, index) => (
              <TouchableOpacity
                key={index}
                style={protocolScreenStyles.disturbanceCard}
                onPress={() => handleIssueSelect(buttonLabel)}
              >
                <View style={{alignItems: 'center'}}>
                  <MaterialIcons name="warning" size={20} color="#94A3B8" style={protocolScreenStyles.disturbanceIcon} />
                  <Text style={protocolScreenStyles.actionButtonText} numberOfLines={2} ellipsizeMode="tail">{buttonLabel}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };


  const handleFASearch = async () => {
    // Clear previous results and errors
    setFaSearchError('');
    setFaSearchResults([]);
    
    if (!faSearchText.trim()) {
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Call FAService
      const data = await FAService.searchFA(faSearchText);
      
      if (data.success) {
        if (data.results.length === 0) {
          setFaSearchError('FA nicht gefunden oder Status ungültig (erlaubt: 30, 35, 36)');
        } else {
          setFaSearchResults(data.results);
        }
      } else {
        setFaSearchError(data.error || 'Fehler beim Suchen');
      }
    } catch (error) {
      console.error('Search error:', error);
      setFaSearchError('Verbindungsfehler zum Server. Ist das Backend gestartet?');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSelectFA = (fa) => {
    setSelectedFA({
      FANr: fa.FANr,
      ArtikelNr: fa.ArtikelNr,
      Artikelbezeichnung: fa.Artikelbezeichnung
    });
    setFaSearchText('');
    setFaSearchResults([]);
    setFaSearchError('');
  };
  
  const handleRemoveFA = () => {
    setSelectedFA(null);
  };

  const handleZurückClick = () => {
    if (currentView === 'störung') {
      // leave the stör selection and ensure main timer is running (set status to 'Läuft')
      setCurrentView('initial');
      setActiveButton('start');
      setRunning(true);
      // reset previous flag
      prevRunningBeforeStoer.current = false;
      return;
    }

    // If a stör timer is currently running, interpret 'Zurück' as canceling the stör and resuming production (always restart main timer)
    if (stoerRunning) {
      setStoerRunning(false);
      setStoerStart(null);
      setStoerElapsed(0);
      setSelectedIssue(null);
      // always restart the main timer on cancel
      setActiveButton('start');
      setRunning(true);
      prevRunningBeforeStoer.current = false;
      return;
    }

    onBack();
  };

  const statusInfo = stoerRunning || selectedIssue
    ? { color: '#EF4444', text: 'Störung' }
    : pauseRunning
    ? { color: '#F59E0B', text: 'Pause' }
    : running
    ? { color: '#22C55E', text: 'Produktion' }
    : { color: '#64748B', text: 'Bereit' };

  return (
    <View style={protocolScreenStyles.container}>
      {/* Header Bar */}
      <View style={protocolScreenStyles.headerBar}>
        <View style={protocolScreenStyles.headerLeft}>
          <MaterialIcons name="assessment" size={28} color="#3B82F6" />
          <Text style={protocolScreenStyles.headerTitle}>Produktions-Monitor</Text>
        </View>

        <View style={protocolScreenStyles.statusIndicator} accessibilityLabel={`Status: ${statusInfo.text}`}>
          <View style={[protocolScreenStyles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={protocolScreenStyles.statusText}>{statusInfo.text}</Text>
        </View>

        <Text style={protocolScreenStyles.headerTime}>
          {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <ScrollView
        style={protocolScreenStyles.contentContainer}
        contentContainerStyle={protocolScreenStyles.scrollContent}
      >
        {/* Dashboard Grid */}
        <View style={protocolScreenStyles.dashboardGrid}>
          
          {/* FA Section - Full Width */}
          <View style={protocolScreenStyles.faSectionCardFullWidth}>
            <Text style={protocolScreenStyles.sectionTitle}>FERTIGUNGSAUFTRAG</Text>
            
            {!selectedFA ? (
              <>
                <View style={protocolScreenStyles.faSearchContainer}>
                  <TextInput
                    style={protocolScreenStyles.faSearchInput}
                    placeholder="FA-Nummer eingeben"
                    placeholderTextColor="#64748B"
                    value={faSearchText}
                    onChangeText={setFaSearchText}
                    autoCapitalize="characters"
                    onSubmitEditing={handleFASearch}
                  />
                  <TouchableOpacity 
                    style={protocolScreenStyles.faSearchButton}
                    onPress={handleFASearch}
                    disabled={isSearching}
                  >
                    <MaterialIcons name="search" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                {faSearchError ? (
                  <Text style={protocolScreenStyles.faSearchError}>{faSearchError}</Text>
                ) : null}
                
                {faSearchResults.length > 0 && (
                  <View style={protocolScreenStyles.faResultsContainer}>
                    <Text style={protocolScreenStyles.faResultsTitle}>Suchergebnisse ({faSearchResults.length})</Text>
                    <ScrollView style={protocolScreenStyles.faResultsList} nestedScrollEnabled={true}>
                      {faSearchResults.map((fa, index) => (
                        <TouchableOpacity
                          key={index}
                          style={protocolScreenStyles.faResultItem}
                          onPress={() => handleSelectFA(fa)}
                        >
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
                  <View>
                    <Text style={protocolScreenStyles.faSelectedLabel}>FA-Nummer</Text>
                    <Text style={protocolScreenStyles.faSelectedValue}>{selectedFA.FANr}</Text>
                  </View>
                  <View style={{marginTop: 8}}>
                    <Text style={protocolScreenStyles.faSelectedLabel}>Artikel-Nr</Text>
                    <Text style={protocolScreenStyles.faSelectedValue}>{selectedFA.ArtikelNr}</Text>
                  </View>
                  <View style={{marginTop: 8}}>
                    <Text style={protocolScreenStyles.faSelectedLabel}>Bezeichnung</Text>
                    <Text style={protocolScreenStyles.faSelectedValue}>{selectedFA.Artikelbezeichnung}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={protocolScreenStyles.faRemoveButton}
                  onPress={handleRemoveFA}
                >
                  <MaterialIcons name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SOLL + IST (stacked) and Zeitübersicht (right column) */}
          <View style={protocolScreenStyles.sollIstZeitRow}>
            <View style={protocolScreenStyles.sollIstColumn}>
              <View style={protocolScreenStyles.sollIstCard}>
                <Text style={protocolScreenStyles.sollIstLabel}>SOLL</Text>
                <Text style={protocolScreenStyles.sollIstValue}>0</Text>
                <Text style={protocolScreenStyles.sollIstSubtext}>Stk/Std</Text>
              </View>

              <View style={[protocolScreenStyles.sollIstCard, protocolScreenStyles.sollIstCardSpacing]}>
                <Text style={protocolScreenStyles.sollIstLabel}>IST</Text>
                <Text style={protocolScreenStyles.sollIstValue}>0</Text>
                <Text style={protocolScreenStyles.sollIstSubtext}>Differenz: 0</Text>
              </View>
            </View>

            <View style={protocolScreenStyles.zeitColumn}>
              <View style={protocolScreenStyles.zeitCard}>
                <Text style={protocolScreenStyles.sectionTitle}>ZEITÜBERSICHT</Text>

                {/* IST START + SOLL START nebeneinander - jeweils eigene dunklere Box */}
                <View style={protocolScreenStyles.zeitStartRow}>
                  <View style={protocolScreenStyles.zeitStartItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialIcons name="access-time" size={16} color="#3B82F6" style={{marginRight: 6}} />
                        <Text style={protocolScreenStyles.zeitPairLabel}>IST START</Text>
                      </View>
                      <Text style={protocolScreenStyles.zeitPairValue}>
                        {mainTimerStartTime.current ? new Date(mainTimerStartTime.current).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                    </View>
                  </View>

                  <View style={protocolScreenStyles.zeitStartItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialIcons name="access-time" size={16} color="#22C55E" style={{marginRight: 6}} />
                        <Text style={protocolScreenStyles.zeitPairLabel}>SOLL START</Text>
                      </View>
                      <Text style={protocolScreenStyles.zeitPairValue}>--:--</Text>
                    </View>
                  </View>
                </View>

                {/* BRUTTO + NETTO nebeneinander - jeweils eigene dunklere Box */}
                <View style={protocolScreenStyles.zeitPairRow}>
                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <Text style={protocolScreenStyles.zeitPairLabel}>BRUTTO</Text>
                      <Text style={protocolScreenStyles.zeitPairValue}>{formatTime(elapsed)}</Text>
                    </View>
                  </View>

                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialIcons name="show-chart" size={16} color="#22C55E" style={{marginRight: 6}} />
                        <Text style={[protocolScreenStyles.zeitPairLabel, {color: '#22C55E'}]}>NETTO</Text>
                      </View>
                      <Text style={[protocolScreenStyles.zeitPairValue, {color: '#22C55E'}]}>
                        {formatTime(elapsed - localLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0))}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* STÖRUNG KUM. + PAUSE KUM. nebeneinander - jeweils eigene dunklere Box */}
                <View style={protocolScreenStyles.zeitPairRow}>
                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialIcons name="warning" size={16} color="#EF4444" style={{marginRight: 6}} />
                        <Text style={[protocolScreenStyles.zeitPairLabel, {color: '#EF4444'}]}>STÖRUNG KUM.</Text>
                      </View>
                      <Text style={[protocolScreenStyles.zeitPairValue, {color: '#EF4444'}]}>
                        {Math.floor(localLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0) / 60)} Min
                      </Text>
                    </View>
                  </View>

                  <View style={protocolScreenStyles.zeitPairItem}>
                    <View style={protocolScreenStyles.zeitInnerBox}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialIcons name="free-breakfast" size={16} color="#F59E0B" style={{marginRight: 6}} />
                        <Text style={[protocolScreenStyles.zeitPairLabel, {color: '#F59E0B'}]}>PAUSE KUM.</Text>
                      </View>
                      <Text style={[protocolScreenStyles.zeitPairValue, {color: '#F59E0B'}]}>{Math.floor(totalPauseSeconds / 60)} Min</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Info Sections */}
        {stoerRunning && (
          <View style={{padding: 16}}>
            <Text style={protocolScreenStyles.stoerTimerText}>Stör-Timer: {formatTime(stoerElapsed)}</Text>
          </View>
        )}

        {selectedIssue && (
          <View style={{padding: 16}}>
            <Text style={protocolScreenStyles.selectedIssueText}>Aktuelle Störung: {selectedIssue}</Text>
            {selectedIssue === 'Sonstiges' && (
              <TextInput
                style={protocolScreenStyles.sonstigesInput}
                placeholder="Beschreibe die Störung..."
                placeholderTextColor="#64748B"
                value={sonstigesText}
                onChangeText={setSonstigesText}
                multiline
              />
            )}
          </View>
        )}


        {/* Action Buttons Section */}
        {currentView === 'initial' && (
          <View style={protocolScreenStyles.actionsSection}>
            {showStartOnly ? (
              <View style={protocolScreenStyles.buttonsRow}>
                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.startButton]}
                  onPress={handleStart}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={protocolScreenStyles.actionButtonText}>Produktion starten</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.modalCancel]}
                  onPress={handleCancelStoer}
                >
                  <Text style={protocolScreenStyles.modalCancelText}>Abbrechen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={protocolScreenStyles.buttonsRow}>
                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.startButton, activeButton === 'start' && protocolScreenStyles.actionButtonActive]}
                  onPress={handleStart}
                  disabled={activeButton === 'start'}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={protocolScreenStyles.actionButtonText}>Produktion starten</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.stoerungButton, activeButton === 'störung' && protocolScreenStyles.actionButtonActive]}
                  onPress={handleStörungClick}
                >
                  <MaterialIcons name="warning" size={20} color="#fff" />
                  <Text style={protocolScreenStyles.actionButtonText}>Störung melden</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.pauseButton, activeButton === 'pause' && protocolScreenStyles.actionButtonActive]}
                  onPress={handlePause}
                >
                  <MaterialIcons name="pause" size={20} color="#fff" />
                  <Text style={protocolScreenStyles.actionButtonText}>Pause setzen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[protocolScreenStyles.actionButton, protocolScreenStyles.endeButton]}
                  onPress={openEndConfirm}
                >
                  <MaterialIcons name="stop" size={20} color="#fff" />
                  <Text style={protocolScreenStyles.actionButtonText}>Schicht beenden</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Störung Selection Modal */}
        {currentView === 'störung' && lineButtonConfig[shiftData.selectedLine]?.störung && (
          <View style={protocolScreenStyles.stoerungModal}>
            <Text style={protocolScreenStyles.sectionTitle}>STÖRUNG AUSWÄHLEN</Text>
            {renderButtons(lineButtonConfig[shiftData.selectedLine].störung)}
          </View>
        )}

        {/* Logs Table Section */}
        {!selectedIssue && currentView !== 'störung' && (
          <View style={protocolScreenStyles.logsSection}>
            <View style={protocolScreenStyles.tableTitleRow}>
              <Text style={protocolScreenStyles.sectionTitle}>STÖRUNGSPROTOKOLLE (HEUTE)</Text>
              <TouchableOpacity onPress={clearAllLocalLogs}>
                <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={protocolScreenStyles.tabRow}>
              <TouchableOpacity 
                onPress={() => setViewMode('logs')} 
                style={[protocolScreenStyles.tabButton, viewMode === 'logs' && protocolScreenStyles.tabActive]}
              >
                <Text style={[protocolScreenStyles.tabText, viewMode === 'logs' && protocolScreenStyles.tabTextActive]}>
                  Protokolle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setViewMode('summary')} 
                style={[protocolScreenStyles.tabButton, viewMode === 'summary' && protocolScreenStyles.tabActive]}
              >
                <Text style={[protocolScreenStyles.tabText, viewMode === 'summary' && protocolScreenStyles.tabTextActive]}>
                  Übersicht ({localLogs.length})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={protocolScreenStyles.tableContainer}>
              {viewMode === 'logs' ? (
                <>
                  <View style={protocolScreenStyles.tableHeader}>
                    <Text style={[protocolScreenStyles.tableHeaderCell, {flex: 2}]}>Störung</Text>
                    <Text style={protocolScreenStyles.tableHeaderCell}>Start</Text>
                    <Text style={protocolScreenStyles.tableHeaderCell}>Ende</Text>
                    <Text style={protocolScreenStyles.tableHeaderCell}>Dauer</Text>
                  </View>
                  
                  {localLogs.length === 0 ? (
                    <Text style={protocolScreenStyles.tableEmpty}>Keine Einträge für heute</Text>
                  ) : (
                    <ScrollView style={protocolScreenStyles.tableScroll} nestedScrollEnabled={true}>
                      {localLogs.map((log) => (
                        <View key={log.id} style={protocolScreenStyles.tableRow}>
                          <View style={{flex: 2}}>
                            <Text style={protocolScreenStyles.tableCell}>{log.issue}</Text>
                            {log.notes && <Text style={protocolScreenStyles.tableNote}>{log.notes}</Text>}
                          </View>
                          <Text style={protocolScreenStyles.tableCell}>
                            {new Date(log.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <Text style={protocolScreenStyles.tableCell}>
                            {new Date(log.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <Text style={protocolScreenStyles.tableCell}>{formatTime(log.durationSeconds)}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </>
              ) : (
                <>
                  {computeIssueSummary().length === 0 ? (
                    <Text style={protocolScreenStyles.tableEmpty}>Keine definierten Störungen</Text>
                  ) : (
                    <View style={protocolScreenStyles.summaryGrid}>
                      {computeIssueSummary().map((item) => (
                        <View key={item.label} style={protocolScreenStyles.summaryCard}>
                          <Text style={protocolScreenStyles.summaryCount}>{item.count}</Text>
                          <Text style={protocolScreenStyles.summaryLabel}>{item.label}</Text>
                          <Text style={protocolScreenStyles.summaryTime}>{formatTime(item.totalSeconds)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

      </ScrollView>
      
      {/* Confirm Modal */}
      <ConfirmModal
        visible={showEndConfirm}
        title="Schicht beenden"
        message="Bist du sicher, dass du die Schicht beenden möchtest?"
        onCancel={cancelEndConfirm}
        onConfirm={confirmEnd}
      />
      
      {/* Back Button */}
      <TouchableOpacity style={protocolScreenStyles.backButton} onPress={handleZurückClick}>
        <MaterialIcons name="arrow-back" size={20} color="#F1F5F9" />
        <Text style={protocolScreenStyles.backButtonText}>Zurück</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProtocolScreen;
