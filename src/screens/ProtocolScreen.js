import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';
import { useShift } from '../context/ShiftContext';
import { protocolScreenStyles } from '../styles/ProtocolScreenStyles';
import { lineButtonConfig } from '../config/lineButtonConfig';

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

// Minimal timer display with subtle animations (variant 5)
const TimerDisplay = ({ time = '00:00:00', status = null }) => {
  const label = status === 'start' ? 'Läuft' : status === 'störung' ? 'Störung' : status === 'pause' ? 'Pause' : 'Bereit';
  const chipStyle = status === 'start' ? protocolScreenStyles.timerChipGreen : status === 'störung' ? protocolScreenStyles.timerChipRed : status === 'pause' ? protocolScreenStyles.timerChipPause : protocolScreenStyles.timerChipNeutral;

  // animation: pulse while running, spring on status change
  const anim = useRef(new Animated.Value(1)).current; // for spring on change
  const pulse = useRef(new Animated.Value(1)).current; // continuous pulse when running

  useEffect(() => {
    // spring effect on status change
    anim.setValue(0.95);
    Animated.spring(anim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  }, [status]);

  useEffect(() => {
    let loop;
    if (status === 'start') {
      // continuous slow pulse
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.03, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulse.setValue(1);
      if (loop && loop.stop) loop.stop();
    }
    return () => {
      if (loop && loop.stop) loop.stop();
      pulse.setValue(1);
    };
  }, [status]);

  const combinedScale = Animated.multiply(anim, pulse);

  return (
    <View style={protocolScreenStyles.timerContainer}>
      <Animated.Text style={[protocolScreenStyles.timerText, { transform: [{ scale: combinedScale }] }]}>{time}</Animated.Text>
      <Animated.View style={[protocolScreenStyles.timerChip, chipStyle, { transform: [{ scale: anim }], marginTop: 12 }]}>
        <Text style={protocolScreenStyles.timerChipText}>{label}</Text>
      </Animated.View>
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
  const [showStartOnly, setShowStartOnly] = useState(false); // when true, only show Start button

  // Störung timer state
  const [stoerStart, setStoerStart] = useState(null); // timestamp ms
  const [stoerRunning, setStoerRunning] = useState(false);
  const [stoerElapsed, setStoerElapsed] = useState(0); // seconds
  const stoerIntervalRef = useRef(null);

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

  const saveStoerLog = async ({ issue, startTime, endTime, durationSeconds }) => {
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
      await saveStoerLog({ issue: selectedIssue, startTime: stoerStart, endTime: end, durationSeconds });
      // reset stör timer
      setStoerStart(null);
      setStoerRunning(false);
      setStoerElapsed(0);
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
    setCurrentView('störung');
    setActiveButton('störung');
    setRunning(false);
    // Start stör timer
    if (!stoerRunning) {
      const now = Date.now();
      setStoerStart(now);
      setStoerRunning(true);
      setStoerElapsed(0);
    }
  };

  const handleIssueSelect = (issueLabel) => {
    // user selected a specific störung cause -> they assign it to the running stör timer
    setSelectedIssue(issueLabel);
    setShowStartOnly(true);
    setCurrentView('initial');
    setActiveButton('störung');
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

  // Funktion um Buttons in Reihen zu je 3 nebeneinander anzuzeigen
  const renderButtons = (buttons) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={protocolScreenStyles.buttonRow}>
        {row.map((buttonLabel, index) => (
          <AnimatedButton
            key={index}
            style={[protocolScreenStyles.buttonSize, protocolScreenStyles.actionButton]}
            onPress={() => handleIssueSelect(buttonLabel)}
          >
            <Text style={protocolScreenStyles.actionButtonText}>{buttonLabel}</Text>
          </AnimatedButton>
        ))}
      </View>
    ));
  };


  const handleZurückClick = () => {
    if (currentView === 'störung') {
      setCurrentView('initial');
    } else {
      onBack();
    }
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
            <Text style={protocolScreenStyles.selectedIssueText}>Aktuelle Störung: {selectedIssue}</Text>
          )}

          <View style={protocolScreenStyles.buttonsRowCentered}>

          </View>

          {/* Local logs table for today */}
          <View style={protocolScreenStyles.tableContainer}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text style={protocolScreenStyles.tableTitle}>Lokale Störungsprotokolle (Heute)</Text>
            <TouchableOpacity onPress={clearAllLocalLogs} accessibilityLabel="Logs leeren">
              <Text style={[protocolScreenStyles.smallDangerButton]}>Logs leeren</Text>
            </TouchableOpacity>
          </View>
            <View style={protocolScreenStyles.tableHeader}>
              <Text style={[protocolScreenStyles.tableCell, {flex:2}]}>Störung</Text>
              <Text style={[protocolScreenStyles.tableCell]}>Schicht</Text>
              <Text style={[protocolScreenStyles.tableCell]}>Start</Text>
              <Text style={[protocolScreenStyles.tableCell]}>Ende</Text>
              <Text style={[protocolScreenStyles.tableCell]}>Dauer</Text>
            </View>
            {localLogs.length === 0 && (
              <Text style={protocolScreenStyles.tableEmpty}>Keine Einträge für {shiftData.selectedShift ? shiftData.selectedShift + ' (Heute)' : 'heute'}</Text>
            )}

            {/* make rows scrollable if many entries */}
            <ScrollView style={protocolScreenStyles.tableScroll}>
              {localLogs.map((log) => (
                <View key={log.id} style={protocolScreenStyles.tableRow}>
                  <Text style={[protocolScreenStyles.tableCell, {flex:2}]}>{log.issue}</Text>
                  <Text style={[protocolScreenStyles.tableCell]}>{log.shift_type || log.shift || '-'}</Text>
                  <Text style={protocolScreenStyles.tableCell}>{new Date(log.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</Text>
                  <Text style={protocolScreenStyles.tableCell}>{new Date(log.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</Text>
                  <Text style={protocolScreenStyles.tableCell}>{formatTime(log.durationSeconds)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

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
                    <Text style={protocolScreenStyles.buttonIconSmall}>▶️</Text>
                    <Text style={protocolScreenStyles.buttonLabelOnButton}>Produktion starten</Text>
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
                      <Text style={protocolScreenStyles.buttonIconSmall}>▶️</Text>
                      <Text style={protocolScreenStyles.buttonLabelOnButton}>Produktion starten</Text>
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
                      <Text style={protocolScreenStyles.buttonIconSmall}>⚠️</Text>
                      <Text style={protocolScreenStyles.buttonLabelOnButton}>Störung melden</Text>
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
                      <Text style={protocolScreenStyles.buttonIconSmall}>⏸️</Text>
                      <Text style={protocolScreenStyles.buttonLabelOnButton}>Pause setzen</Text>
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
                      <Text style={protocolScreenStyles.buttonIconSmall}>⏹️</Text>
                      <Text style={protocolScreenStyles.buttonLabelOnButton}>Schicht beenden</Text>
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
              // If in "störung" view, keep existing störung buttons layout (rows of 3)
              lineButtonConfig[shiftData.selectedLine] && lineButtonConfig[shiftData.selectedLine].störung && renderButtons(lineButtonConfig[shiftData.selectedLine].störung)
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
