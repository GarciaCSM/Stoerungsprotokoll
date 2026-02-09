import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';
import { useShift } from '../context/ShiftContext';
import { protocolScreenStyles } from '../styles/ProtocolScreenStyles';
import { lineButtonConfig } from '../config/lineButtonConfig';
import { MaterialIcons, Feather } from '@expo/vector-icons';

// Colors for inline usage
const COLORS = {
  foreground: '#0F172A',
};

// Reusable animated button with press feedback
const AnimatedButton = ({ children, onPress, accessibilityLabel, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, friction: 6, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.95}
        style={style}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Minimal timer display (no animations)
const TimerDisplay = ({ time = '00:00:00', status = null }) => {
  const label = status === 'start' ? 'Läuft' : status === 'störung' ? 'Störung' : status === 'pause' ? 'Pause' : 'Bereit';
  const chipStyle = status === 'start' ? protocolScreenStyles.timerChipGreen : status === 'störung' ? protocolScreenStyles.timerChipRed : status === 'pause' ? protocolScreenStyles.timerChipPause : protocolScreenStyles.timerChipNeutral;

  return (
    <View style={protocolScreenStyles.timerContainer}>
      <Text style={protocolScreenStyles.timerText}>{time}</Text>
      <View style={[protocolScreenStyles.timerChip, chipStyle, { marginTop: 12 }]}>
        <Text style={protocolScreenStyles.timerChipText}>{label}</Text>
      </View>
    </View>
  );
};

const ProtocolScreen = ({ onBack }) => {
  const { shiftData } = useShift();
  const [currentView, setCurrentView] = useState('initial'); // 'initial' oder 'störung'

  // Timer state
  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);
  const [activeButton, setActiveButton] = useState(null); // 'start' | 'störung' | 'pause' | null
  const [selectedIssue, setSelectedIssue] = useState(null); // when a störung button is selected
  const [sonstigesText, setSonstigesText] = useState(''); // description when Sonstiges selected
  const [showStartOnly, setShowStartOnly] = useState(false); // when true, only show Start button

  // Störung timer state
  const [stoerStart, setStoerStart] = useState(null); // timestamp ms
  const [stoerRunning, setStoerRunning] = useState(false);
  const [stoerElapsed, setStoerElapsed] = useState(0); // seconds
  const stoerIntervalRef = useRef(null);
  // remember whether the main timer was running before starting a stör (so we can restore it on cancel)
  const prevRunningBeforeStoer = useRef(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setElapsed((s) => s + 1);
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

    setActiveButton('start');
    setRunning(true);
    // clear selected issue (resolved) and show full controls again
    setSelectedIssue(null);
    setShowStartOnly(false);
    setCurrentView('initial');
  };

  const handlePause = () => {
    setActiveButton('pause');
    setRunning(false);
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
              <AnimatedButton
                key={index}
                style={protocolScreenStyles.disturbanceCard}
                onPress={() => handleIssueSelect(buttonLabel)}
              >
                <View style={{alignItems: 'center'}}>
                  <MaterialIcons name="warning" size={20} color="#94A3B8" style={protocolScreenStyles.disturbanceIcon} />
                  <Text style={protocolScreenStyles.actionButtonText} numberOfLines={2} ellipsizeMode="tail">{buttonLabel}</Text>
                </View>
              </AnimatedButton>
            ))}
          </View>
        </View>
      </View>
    );
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

  return (
    <View style={protocolScreenStyles.container}>
      <ScrollView style={protocolScreenStyles.contentContainer}>

        <Text style={protocolScreenStyles.titleInfoRow}>
          {shiftData.selectedLine} - {shiftData.selectedShift} - {shiftData.selectedLeader}
        </Text>

        <View style={protocolScreenStyles.timerCenteredContainer}>
          <TimerDisplay time={formatTime(elapsed)} status={activeButton} />
          {stoerRunning && (
            <Text style={protocolScreenStyles.stoerTimerText}>Stör-Timer: {formatTime(stoerElapsed)}</Text>
          )}
          {selectedIssue && (
            <>
              <Text style={protocolScreenStyles.selectedIssueText}>Aktuelle Störung: {selectedIssue}</Text>
              {selectedIssue === 'Sonstiges' && (
                <TextInput
                  style={protocolScreenStyles.sonstigesInput}
                  placeholder="Beschreibe die Störung..."
                  value={sonstigesText}
                  onChangeText={setSonstigesText}
                  multiline
                />
              )}
            </>
          )}

          <View style={protocolScreenStyles.buttonsRowCentered}>

          </View>

          {/* Local logs table for today: hidden when a specific issue is selected */}
          {!selectedIssue && (
            currentView === 'störung' ? (
              // show modal-like full width selector above the table
              lineButtonConfig[shiftData.selectedLine] && lineButtonConfig[shiftData.selectedLine].störung && (
                <View style={{width: '100%'}}>
                  {renderButtons(lineButtonConfig[shiftData.selectedLine].störung)}
                </View>
              )
            ) : (
              <>
                {/* Header outside table container */}
                <View style={protocolScreenStyles.tableTitleRow}>
                  <Text style={protocolScreenStyles.tableTitle}>Lokale Störungsprotokolle (Heute)</Text>
                  <TouchableOpacity onPress={clearAllLocalLogs} accessibilityLabel="Logs leeren">
                    <Text style={protocolScreenStyles.smallDangerButton}>🗑️ Logs leeren</Text>
                  </TouchableOpacity>
                </View>

                {/* Tabs: switch between raw logs and aggregated summary */}
                <View style={protocolScreenStyles.tabRow}>
                  <TouchableOpacity onPress={() => setViewMode('logs')} style={[protocolScreenStyles.tabButton, viewMode === 'logs' && protocolScreenStyles.tabActive]}>
                    <Text style={[protocolScreenStyles.tabText, viewMode === 'logs' && {color: COLORS.foreground}]}>Protokolle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setViewMode('summary')} style={[protocolScreenStyles.tabButton, viewMode === 'summary' && protocolScreenStyles.tabActive]}>
                    <Text style={[protocolScreenStyles.tabText, viewMode === 'summary' && {color: COLORS.foreground}]}>Übersicht ({localLogs.length})</Text>
                  </TouchableOpacity>
                </View>

                <View style={protocolScreenStyles.tableContainer}>

                {viewMode === 'logs' ? (
                  <>
                    <View style={protocolScreenStyles.tableHeader}>
                      <Text style={[protocolScreenStyles.tableHeaderCellLeft, {flex:2}]}>Störung</Text>
                      <Text style={protocolScreenStyles.tableHeaderCell}>Start</Text>
                      <Text style={protocolScreenStyles.tableHeaderCell}>Ende</Text>
                      <Text style={protocolScreenStyles.tableHeaderCell}>Dauer</Text>
                    </View>
                    {localLogs.length === 0 && (
                      <Text style={protocolScreenStyles.tableEmpty}>Keine Einträge für {shiftData.selectedShift ? shiftData.selectedShift + ' (Heute)' : 'heute'}</Text>
                    )}

                    {/* make rows scrollable if many entries */}
                    <ScrollView style={protocolScreenStyles.tableScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      {localLogs.map((log) => (
                        <View key={log.id} style={protocolScreenStyles.tableRow}>
                      <View style={{flex:2}}>
                        <Text style={protocolScreenStyles.tableCellLeft}>{log.issue}</Text>
                        {log.notes ? <Text style={protocolScreenStyles.tableNote}>{log.notes}</Text> : null}
                      </View>
                          <Text style={protocolScreenStyles.tableCell}>{new Date(log.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</Text>
                          <Text style={protocolScreenStyles.tableCell}>{new Date(log.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</Text>
                          <Text style={protocolScreenStyles.tableCell}>{formatTime(log.durationSeconds)}</Text>
                        </View>
                      ))}
                    </ScrollView>
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
              </>
            )
          )}

          <View style={{height:20}} />

          <View style={protocolScreenStyles.buttonsRowCentered}>
            {currentView === 'initial' ? (
              showStartOnly ? (
                // only show Start when an issue is selected
                <AnimatedButton
                  accessibilityLabel="Start"
                  style={[
                    protocolScreenStyles.buttonSize,
                    protocolScreenStyles.startButton,
                    activeButton === 'start' && protocolScreenStyles.startButtonActive,
                  ]}
                  onPress={handleStart}
                >
                  <View style={protocolScreenStyles.buttonContent}>
                    <View style={protocolScreenStyles.buttonIconContainer}>
                      <MaterialIcons name="play-arrow" size={16} color="#10B981" />
                    </View>
                    <Text style={protocolScreenStyles.buttonLabelOnButton} numberOfLines={1} ellipsizeMode={'tail'}>Produktion starten</Text>
                  </View>
                </AnimatedButton>
              ) : (
                <>
                  <AnimatedButton
                    accessibilityLabel="Start"
                    style={[
                      protocolScreenStyles.buttonSize,
                      protocolScreenStyles.startButton,
                      activeButton === 'start' && protocolScreenStyles.startButtonActive,
                    ]}
                    onPress={handleStart}
                  >
                    <View style={protocolScreenStyles.buttonContent}>
                      <View style={protocolScreenStyles.iconStartOutline}>
                        <Feather name="play" size={16} color="#ffffff" />
                      </View> 
                      <Text style={protocolScreenStyles.buttonLabelOnButton} numberOfLines={1} ellipsizeMode={'tail'}>Produktion starten</Text>
                    </View>
                  </AnimatedButton>

                  <AnimatedButton
                    accessibilityLabel="Störung"
                    style={[
                      protocolScreenStyles.buttonSize,
                      protocolScreenStyles.actionButton,
                      activeButton === 'störung' && protocolScreenStyles.actionButtonActive,
                    ]}
                    onPress={handleStörungClick}
                  >
                    <View style={protocolScreenStyles.buttonContent}>
                      <View style={[protocolScreenStyles.buttonIconContainer, { backgroundColor: '#F59E0B' }]}>
                        <MaterialIcons name="warning" size={16} color="#ffffff" />
                      </View>
                      <Text style={protocolScreenStyles.buttonLabelOnButton} numberOfLines={1} ellipsizeMode={'tail'}>Störung melden</Text>
                    </View>
                  </AnimatedButton>

                  <AnimatedButton
                    accessibilityLabel="Pause"
                    style={[
                      protocolScreenStyles.buttonSize,
                      protocolScreenStyles.pauseButton,
                      activeButton === 'pause' && protocolScreenStyles.pauseButtonActive,
                    ]}
                    onPress={handlePause}
                  >
                    <View style={protocolScreenStyles.buttonContent}>
                      <View style={[protocolScreenStyles.buttonIconContainer, { backgroundColor: '#3B82F6' }]}>
                        <MaterialIcons name="pause" size={16} color="#ffffff" />
                      </View>
                      <Text style={protocolScreenStyles.buttonLabelOnButton} numberOfLines={1} ellipsizeMode={'tail'}>Pause setzen</Text>
                    </View>
                  </AnimatedButton>

                  <AnimatedButton
                    accessibilityLabel="Ende"
                    style={[
                      protocolScreenStyles.buttonSize,
                      protocolScreenStyles.endeButton,
                    ]}
                    onPress={openEndConfirm}
                  >
                    <View style={protocolScreenStyles.buttonContent}>
                      <View style={[protocolScreenStyles.buttonIconContainer, { backgroundColor: '#EF4444' }]}>
                        <MaterialIcons name="stop" size={16} color="#ffffff" />
                      </View>
                      <Text style={protocolScreenStyles.buttonLabelOnButton} numberOfLines={1} ellipsizeMode={'tail'}>Schicht beenden</Text>
                    </View>
                  </AnimatedButton>

                  <ConfirmModal
                    visible={showEndConfirm}
                    title="Schicht beenden"
                    message="Bist du sicher, dass du die Schicht beenden möchtest?"
                    onCancel={cancelEndConfirm}
                    onConfirm={confirmEnd}
                  />
                </>
              )
            ) : (
              // If in "störung" view, the selector is rendered above the table — nothing to render here
              null
            )}
          </View>
        </View>

      </ScrollView>
      <TouchableOpacity style={protocolScreenStyles.backButton} onPress={handleZurückClick}>
        <Text style={protocolScreenStyles.backButtonText}>Zurück</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProtocolScreen;
