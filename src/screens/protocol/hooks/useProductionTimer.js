import { useState, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getPauseKey = (line, shift) => `pause_total:${line || 'none'}:${shift || 'none'}`;

/**
 * Manages all timer state: main production timer, Störung timer, Pause timer.
 * Also handles persistence (timer_state in AsyncStorage).
 *
 * @param {object} opts
 * @param {object} opts.shiftData     - from ShiftContext
 * @param {function} opts.saveStoerLog - async fn({ issue, startTime, endTime, durationSeconds, notes })
 */
export function useProductionTimer({ shiftData, saveStoerLog }) {
  // Main timer
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [activeButton, setActiveButton] = useState(null); // 'start' | 'störung' | 'pause' | null
  const [showStartOnly, setShowStartOnly] = useState(false);
  const intervalRef = useRef(null);
  const mainTimerStartTime = useRef(null);
  const runningRef = useRef(false); // Ref-Spiegel von `running` für Closures (z.B. AppState)
  const appStateRef = useRef(AppState.currentState);

  // ─── AppState: bei Rückkehr in den Vordergrund Intervall neu starten ────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        // Nur wenn Timer wirklich läuft (nicht pausiert)
        if (runningRef.current && mainTimerStartTime.current) {
          // Elapsed aus absolutem Startzeitpunkt neu berechnen
          const diffMs = Date.now() - Number(mainTimerStartTime.current);
          setElapsed(Math.max(0, Math.floor(diffMs / 1000)));
          // Intervall neu starten falls eingeschlafen
          if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
              const d = Date.now() - (Number(mainTimerStartTime.current) || 0);
              setElapsed(Math.max(0, Math.floor(d / 1000)));
            }, 1000);
          }
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Störung timer
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [sonstigesText, setSonstigesText] = useState('');
  const [stoerStart, setStoerStart] = useState(null);
  const [stoerRunning, setStoerRunning] = useState(false);
  const [stoerElapsed, setStoerElapsed] = useState(0);
  const stoerIntervalRef = useRef(null);
  const prevRunningBeforeStoer = useRef(false);

  // Pause timer
  const [pauseStart, setPauseStart] = useState(null);
  const [pauseRunning, setPauseRunning] = useState(false);
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const [totalPauseSeconds, setTotalPauseSeconds] = useState(0);
  const pauseIntervalRef = useRef(null);

  // ─── Main timer interval ─────────────────────────────────────────────────────
  useEffect(() => {
    runningRef.current = running; // Ref aktuell halten
    if (running) {
      if (!mainTimerStartTime.current) {
        mainTimerStartTime.current = Date.now() - elapsed * 1000;
      }
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          const diffMs = Date.now() - (Number(mainTimerStartTime.current) || 0);
          setElapsed(Math.max(0, Math.floor(diffMs / 1000)));
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [running]);

  // ─── Störung timer interval ─────────────────────────────────────────────────
  useEffect(() => {
    if (stoerRunning) {
      if (!stoerIntervalRef.current) {
        stoerIntervalRef.current = setInterval(() => {
          setStoerElapsed(Math.max(0, Math.round((Date.now() - (Number(stoerStart) || 0)) / 1000)));
        }, 1000);
      }
    } else {
      if (stoerIntervalRef.current) { clearInterval(stoerIntervalRef.current); stoerIntervalRef.current = null; }
    }
    return () => {
      if (stoerIntervalRef.current) { clearInterval(stoerIntervalRef.current); stoerIntervalRef.current = null; }
    };
  }, [stoerRunning, stoerStart]);

  // ─── Pause timer interval ───────────────────────────────────────────────────
  useEffect(() => {
    if (pauseRunning) {
      if (!pauseIntervalRef.current) {
        pauseIntervalRef.current = setInterval(() => {
          setPauseElapsed(Math.max(0, Math.round((Date.now() - (Number(pauseStart) || 0)) / 1000)));
        }, 1000);
      }
    } else {
      if (pauseIntervalRef.current) { clearInterval(pauseIntervalRef.current); pauseIntervalRef.current = null; }
      setPauseElapsed(0);
    }
    return () => {
      if (pauseIntervalRef.current) { clearInterval(pauseIntervalRef.current); pauseIntervalRef.current = null; }
    };
  }, [pauseRunning, pauseStart]);

  // Skip persisting on the very first render to avoid overwriting stored state
  // before the restore effect has a chance to read it
  const timerInitialized = useRef(false);

  // ─── Persist timer state ────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerInitialized.current) {
      timerInitialized.current = true;
      return;
    }
    const save = async () => {
      try {
        await AsyncStorage.setItem('timer_state', JSON.stringify({
          elapsed, running, activeButton, selectedIssue, showStartOnly,
          startTime: mainTimerStartTime.current,
          stoerStart, stoerRunning,
          pauseStart, pauseRunning, totalPauseSeconds,
          pauseLine: shiftData.selectedLine, pauseShift: shiftData.selectedShift,
        }));
        const key = getPauseKey(shiftData.selectedLine, shiftData.selectedShift);
        if (shiftData.selectedLine && shiftData.selectedShift) {
          await AsyncStorage.setItem(key, String(totalPauseSeconds || 0));
        }
      } catch (e) {
        console.warn('Failed to save timer state', e);
      }
    };
    save();
  }, [elapsed, running, activeButton, selectedIssue, showStartOnly, stoerStart, stoerRunning, pauseStart, pauseRunning, totalPauseSeconds]);

  // ─── Restore timer state on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('timer_state');
        if (!raw) {
          const perTotal = await AsyncStorage.getItem(getPauseKey(shiftData.selectedLine, shiftData.selectedShift));
          setTotalPauseSeconds(perTotal != null ? Number(perTotal) : 0);
          return;
        }
        const ts = JSON.parse(raw);
        const now = Date.now();

        if (ts.running && ts.startTime) {
          const startNum = Number(ts.startTime);
          if (isNaN(startNum)) {
            mainTimerStartTime.current = Date.now();
            setElapsed(0);
          } else {
            mainTimerStartTime.current = startNum;
            setElapsed(Math.max(0, Math.floor((now - startNum) / 1000)));
          }
          setRunning(true);
          setActiveButton(ts.activeButton || 'start');
        } else {
          setElapsed(Math.max(0, ts.elapsed || 0));
          setRunning(false);
          setActiveButton(ts.activeButton || null);
        }

        if (ts.selectedIssue) { setSelectedIssue(ts.selectedIssue); setShowStartOnly(true); }

        if (ts.stoerStart && ts.stoerRunning) {
          const stoerStartNum = Number(ts.stoerStart) || 0;
          setStoerStart(stoerStartNum);
          setStoerRunning(true);
          setStoerElapsed(Math.max(0, Math.floor((now - stoerStartNum) / 1000)));
        }

        const perKey = getPauseKey(shiftData.selectedLine, shiftData.selectedShift);
        const perTotal = await AsyncStorage.getItem(perKey);
        if (perTotal != null) {
          setTotalPauseSeconds(Number(perTotal));
        } else if (ts.pauseLine === shiftData.selectedLine && ts.pauseShift === shiftData.selectedShift) {
          setTotalPauseSeconds(ts.totalPauseSeconds || 0);
        } else {
          setTotalPauseSeconds(0);
        }

        const pauseStartNum = Number(ts.pauseStart) || null;
        if (ts.pauseRunning && ts.pauseLine === shiftData.selectedLine && ts.pauseShift === shiftData.selectedShift) {
          setPauseStart(pauseStartNum);
          setPauseRunning(true);
          setPauseElapsed(Math.max(0, Math.floor((now - pauseStartNum) / 1000)));
        }
      } catch (e) {
        console.warn('Failed to load timer state', e);
      }
    })();
  }, []);

  // ─── Re-restore full timer state when shiftData (line/shift) becomes available
  useEffect(() => {
    if (!shiftData.selectedLine || !shiftData.selectedShift) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('timer_state');
        if (!raw) return;
        const ts = JSON.parse(raw);
        const now = Date.now();

        if (ts.running && ts.startTime) {
          const startNum = Number(ts.startTime);
          if (!isNaN(startNum)) {
            mainTimerStartTime.current = startNum;
            setElapsed(Math.max(0, Math.floor((now - startNum) / 1000)));
          }
          setRunning(true);
          setActiveButton(ts.activeButton || 'start');
        }

        const perKey = getPauseKey(shiftData.selectedLine, shiftData.selectedShift);
        const perTotal = await AsyncStorage.getItem(perKey);
        if (perTotal != null) {
          setTotalPauseSeconds(Number(perTotal));
        } else if (ts.pauseLine === shiftData.selectedLine && ts.pauseShift === shiftData.selectedShift) {
          setTotalPauseSeconds(ts.totalPauseSeconds || 0);
        }

        const pauseStartNum = Number(ts.pauseStart) || null;
        if (ts.pauseRunning && ts.pauseLine === shiftData.selectedLine && ts.pauseShift === shiftData.selectedShift) {
          setPauseStart(pauseStartNum);
          setPauseRunning(true);
          setPauseElapsed(Math.max(0, Math.floor((now - pauseStartNum) / 1000)));
        }
      } catch (e) {
        console.warn('Failed to re-restore timer state after shift load', e);
      }
    })();
  }, [shiftData.selectedLine, shiftData.selectedShift]);

  // ─── Restore pause totals when line/shift selection changes ────────────────
  const restorePauseTotalsForSelection = async (line, shift) => {
    try {
      const key = getPauseKey(line, shift);
      const stored = await AsyncStorage.getItem(key);
      setTotalPauseSeconds(stored != null ? Number(stored) : 0);

      const raw = await AsyncStorage.getItem('timer_state');
      if (raw) {
        const ts = JSON.parse(raw);
        if (ts.pauseRunning && ts.pauseLine === line && ts.pauseShift === shift) {
          setPauseStart(Number(ts.pauseStart) || Date.now());
          setPauseRunning(true);
        } else {
          setPauseRunning(false);
          setPauseStart(null);
          setPauseElapsed(0);
        }
      }
    } catch (e) {
      console.warn('Failed to load pause totals for selection', e);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const endPause = () => {
    if (!pauseRunning || !pauseStart) return 0;
    const added = Math.round((Date.now() - pauseStart) / 1000);
    setTotalPauseSeconds(prev => (Number(prev) || 0) + added);
    setPauseRunning(false);
    setPauseStart(null);
    setPauseElapsed(0);
    // mainTimerStartTime NICHT verschieben: elapsed zählt Wanduhr-Zeit,
    // _pauseSec wird separat abgezogen → kein Doppelabzug
    return added;
  };

  // ─── Button handlers ────────────────────────────────────────────────────────
  const handleStart = async (selectedFA, setFaSearchError, setCurrentView) => {
    if (!selectedFA) { setFaSearchError('Bitte zuerst einen Fertigungsauftrag auswählen'); return; }

    if (selectedIssue && stoerStart) {
      const end = Date.now();
      const notes = selectedIssue === 'Sonstiges' ? sonstigesText : undefined;
      await saveStoerLog({ issue: selectedIssue, startTime: stoerStart, endTime: end, durationSeconds: Math.round((end - stoerStart) / 1000), notes });
      setStoerStart(null); setStoerRunning(false); setStoerElapsed(0); setSonstigesText('');
      prevRunningBeforeStoer.current = false;
    }

    endPause();

    setActiveButton('start');
    setRunning(true);
    setSelectedIssue(null);
    setShowStartOnly(false);
    setCurrentView('initial');
  };

  const handlePause = (selectedFA, setFaSearchError) => {
    if (!selectedFA) { setFaSearchError('Bitte zuerst einen Fertigungsauftrag auswählen'); return; }
    if (!pauseRunning) {
      setPauseStart(Date.now());
      setPauseRunning(true);
      setActiveButton('pause');
      // Brutto-Timer läuft weiter → SOLL-Zähler springt nicht zurück
    }
  };

  const handleStörungClick = (setCurrentView) => {
    prevRunningBeforeStoer.current = running;
    setCurrentView('störung');
    setActiveButton('störung');
    setRunning(false);
  };

  const handleIssueSelect = (issueLabel) => {
    // End any running pause before starting a Störung so pause time isn't included in brutto
    endPause();

    setSelectedIssue(issueLabel);
    if (issueLabel !== 'Sonstiges') setSonstigesText('');
    prevRunningBeforeStoer.current = running;

    if (!stoerRunning) {
      setStoerStart(Date.now());
      setStoerRunning(true);
      setStoerElapsed(0);
    }
    setShowStartOnly(true);
    setActiveButton('störung');
    setRunning(false);
  };

  const handleCancelStoer = (setCurrentView) => {
    if (stoerRunning) { setStoerRunning(false); setStoerStart(null); setStoerElapsed(0); }
    setSelectedIssue(null);
    setShowStartOnly(false);
    setCurrentView('initial');
    setActiveButton(prevRunningBeforeStoer.current ? 'start' : null);
    if (prevRunningBeforeStoer.current) setRunning(true);
    prevRunningBeforeStoer.current = false;
  };

  const resetTimer = async () => {
    setActiveButton(null);
    setRunning(false);
    setElapsed(0);
    setSelectedIssue(null);
    setShowStartOnly(false);
    mainTimerStartTime.current = null;
    try { await AsyncStorage.removeItem('timer_state'); } catch (e) {}
  };

  // Apply session payload from server (DB) — server values overwrite local state
  const applyRemoteSession = async (session) => {
    if (!session) return;
    try {
      // Parse helpers
      const parseDatetimeToMs = (dt) => dt ? Date.parse(dt + (dt.length === 19 ? 'Z' : '')) : null; // assume UTC-like

      if (session.timer_start_time) {
        const ms = parseDatetimeToMs(session.timer_start_time);
        if (ms) {
          mainTimerStartTime.current = ms;
          // Elapsed immer live aus dem absoluten Startzeitpunkt berechnen –
          // so ist der Wert auf jedem Gerät sekundengenau, egal wie alt der DB-Eintrag ist.
          setElapsed(Math.max(0, Math.floor((Date.now() - ms) / 1000)));
        } else {
          mainTimerStartTime.current = Date.now() - ((session.elapsed_seconds || 0) * 1000);
          setElapsed(Number(session.elapsed_seconds || 0));
        }
      } else if (session.elapsed_seconds != null) {
        mainTimerStartTime.current = Date.now() - (Number(session.elapsed_seconds) * 1000);
        setElapsed(Number(session.elapsed_seconds || 0));
      }

      setRunning(Boolean(Number(session.running || 0)));
      setActiveButton(session.active_button || null);
      setShowStartOnly(Boolean(Number(session.show_start_only || 0)));

      setTotalPauseSeconds(Number(session.pause_total_seconds || 0));
      setPauseRunning(Boolean(Number(session.pause_running || 0)));
      // pause_start_time currently not persisted in DB — keep local pauseStart null unless DB provided
      if (session.pause_start_time) {
        const pms = parseDatetimeToMs(session.pause_start_time);
        setPauseStart(pms || null);
      }

      setStoerRunning(Boolean(Number(session.stoerung_running || 0)));
      if (session.stoerung_start_time) {
        const sms = parseDatetimeToMs(session.stoerung_start_time);
        setStoerStart(sms || null);
        setStoerElapsed(Math.max(0, Math.floor(((Date.now()) - (sms || Date.now())) / 1000)));
      } else {
        setStoerElapsed(Number(session.stoerung_elapsed || 0) || 0);
      }
      if (session.stoerung_aktiv_typ) setSelectedIssue(session.stoerung_aktiv_typ);
      if (session.stoerung_aktiv_notiz) setSonstigesText(session.stoerung_aktiv_notiz);

      // Persist the server-session into AsyncStorage so local cache reflects DB (server wins)
      try {
        const toStore = {
          elapsed: Number(session.elapsed_seconds || 0),
          running: Boolean(Number(session.running || 0)),
          activeButton: session.active_button || null,
          selectedIssue: session.stoerung_aktiv_typ || null,
          showStartOnly: Boolean(Number(session.show_start_only || 0)),
          startTime: mainTimerStartTime.current,
          stoerStart: session.stoerung_start_time ? parseDatetimeToMs(session.stoerung_start_time) : null,
          stoerRunning: Boolean(Number(session.stoerung_running || 0)),
          pauseStart: session.pause_start_time ? parseDatetimeToMs(session.pause_start_time) : null,
          pauseRunning: Boolean(Number(session.pause_running || 0)),
          totalPauseSeconds: Number(session.pause_total_seconds || 0),
          pauseLine: session.linie || null,
          pauseShift: session.schicht || null,
        };
        await AsyncStorage.setItem('timer_state', JSON.stringify(toStore));
      } catch (e) {
        console.warn('Failed to persist server session locally', e);
      }
    } catch (e) {
      console.warn('applyRemoteSession failed', e);
    }
  };

  // ── Per-shift local persistence (save/load timer state scoped to line+shift)
  // Save per-shift timer state. If `pause` is true we store the elapsed time and
  // persist the session as *paused* (running=false) so time doesn't continue while user is on another shift.
  const saveStateForSelection = async (line, shift, pause = false) => {
    if (!line || !shift) return;
    try {
      const payload = {
        elapsed,
        running: pause ? false : running,
        activeButton,
        selectedIssue,
        showStartOnly,
        startTime: pause ? null : mainTimerStartTime.current,
        stoerStart: pause ? null : stoerStart,
        stoerRunning: pause ? false : stoerRunning,
        pauseStart: pause ? null : pauseStart,
        pauseRunning: pause ? false : pauseRunning,
        totalPauseSeconds,
        pauseLine: line, pauseShift: shift,
      };
      const key = `timer_state:${line}:${shift}`;
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('saveStateForSelection failed', e);
    }
  };

  const loadStateForSelection = async (line, shift) => {
    if (!line || !shift) return false;
    try {
      const key = `timer_state:${line}:${shift}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return false;
      const ts = JSON.parse(raw);
      const now = Date.now();

      // apply similar logic as restore effect
      if (ts.running && ts.startTime) {
        const startNum = Number(ts.startTime);
        if (!isNaN(startNum)) {
          mainTimerStartTime.current = startNum;
          setElapsed(Math.max(0, Math.floor((now - startNum) / 1000)));
        }
        setRunning(Boolean(ts.running));
        setActiveButton(ts.activeButton || 'start');
      } else {
        setElapsed(Math.max(0, ts.elapsed || 0));
        setRunning(false);
        setActiveButton(ts.activeButton || null);
      }

      if (ts.selectedIssue) { setSelectedIssue(ts.selectedIssue); setShowStartOnly(true); }

      if (ts.stoerStart && ts.stoerRunning) {
        const stoerStartNum = Number(ts.stoerStart) || 0;
        setStoerStart(stoerStartNum);
        setStoerRunning(true);
        setStoerElapsed(Math.max(0, Math.floor((now - stoerStartNum) / 1000)));
      } else {
        setStoerRunning(false);
        setStoerStart(null);
        setStoerElapsed(0);
      }

      setTotalPauseSeconds(Number(ts.totalPauseSeconds || 0));
      if (ts.pauseStart && ts.pauseRunning) {
        const pauseStartNum = Number(ts.pauseStart) || null;
        setPauseStart(pauseStartNum);
        setPauseRunning(true);
        setPauseElapsed(Math.max(0, Math.floor((now - pauseStartNum) / 1000)));
      } else {
        setPauseRunning(false);
        setPauseStart(null);
        setPauseElapsed(0);
      }

      return true;
    } catch (e) {
      console.warn('loadStateForSelection failed', e);
      return false;
    }
  };

  return {
    // state
    elapsed, running, activeButton, showStartOnly,
    selectedIssue, sonstigesText, setSonstigesText,
    stoerStart, stoerRunning, stoerElapsed,
    pauseRunning, pauseElapsed, totalPauseSeconds,
    mainTimerStartTime,
    // actions
    handleStart, handlePause, handleStörungClick,
    handleIssueSelect, handleCancelStoer, resetTimer,
    restorePauseTotalsForSelection,
    // external API
    applyRemoteSession,
    saveStateForSelection,
    loadStateForSelection,
    setCurrentView: undefined, // not managed here
  };
}
