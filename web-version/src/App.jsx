import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, DB_SYNC_BASE_URL, PI_SERVER_URL } from './config/api';
import {
  checkHealth,
  fetchSollHours,
  loadSession,
  loadStoerungen,
  searchFa,
  sendContext,
  stopSession,
  syncSession,
  syncStoerung,
} from './services/api';

const LINES = ['Linie 1', 'Linie 2', 'Linie 3', 'Linie 4', 'Linie 5', 'Linie 6'];
const SHIFTS = ['Fruehschicht', 'Spaetschicht'];
const BEREICHE = ['Abfuellung', 'Verpackung'];
const STOERUNGEN = {
  'Linie 1': ['Crompe/FL kaputt', 'Deckeldr./Sensor', 'Kragen/Tromel', 'Bulk Wechsel', 'Cod./ETBO', 'Sonstiges'],
  'Linie 2': ['Crompe/FL kaputt', 'Deckeldr./Sensor', 'Kragen/Tromel', 'Bulk Wechsel', 'Cod./ETBO', 'Sonstiges'],
  'Linie 6': ['Schlauch kaputt', 'Sonstiges'],
};

const SYNC_INTERVAL_MS = 10_000;

function formatDuration(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function parseDbDatetimeToMs(value) {
  if (!value) return null;
  const normalized = String(value).replace(' ', 'T');
  const utc = Date.parse(`${normalized}Z`);
  if (!Number.isNaN(utc)) return utc;
  const local = Date.parse(normalized);
  if (!Number.isNaN(local)) return local;
  return null;
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedBereich, setSelectedBereich] = useState('');
  const [selectedLeader, setSelectedLeader] = useState('');
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);

  const [statusText, setStatusText] = useState('Bereit');
  const [sollCount, setSollCount] = useState(null);
  const [faQuery, setFaQuery] = useState('');
  const [faResults, setFaResults] = useState([]);
  const [selectedFA, setSelectedFA] = useState(null);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [pauseRunning, setPauseRunning] = useState(false);
  const [totalPauseSeconds, setTotalPauseSeconds] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [stoerRunning, setStoerRunning] = useState(false);
  const [stoerElapsed, setStoerElapsed] = useState(0);
  const [stoerLogs, setStoerLogs] = useState([]);
  const [viewMode, setViewMode] = useState('initial');

  const productionStartRef = useRef(null);
  const pauseStartRef = useRef(null);
  const stoerStartRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const lastSnapshotRef = useRef('');
  const mountedRef = useRef(true);

  const canConfirm =
    Boolean(selectedLine) &&
    Boolean(selectedShift) &&
    Boolean(selectedBereich) &&
    Boolean(selectedLeader.trim());

  const selectedSummary = useMemo(
    () =>
      selectionConfirmed
        ? `${selectedLine} | ${selectedShift} | ${selectedBereich} | ${selectedLeader}`
        : 'Auswahl unvollstaendig',
    [selectionConfirmed, selectedLine, selectedShift, selectedBereich, selectedLeader]
  );

  const activeStoerButtons = STOERUNGEN[selectedLine] || ['Sonstiges'];
  const runtimeState = stoerRunning ? 'stoerung' : pauseRunning ? 'pause' : running ? 'running' : 'idle';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!running || !productionStartRef.current) return;
    const id = setInterval(() => {
      const now = Date.now();
      const pausePart = pauseRunning && pauseStartRef.current
        ? Math.floor((now - pauseStartRef.current) / 1000)
        : 0;
      const gross = Math.floor((now - productionStartRef.current) / 1000);
      setElapsed(Math.max(0, gross - (totalPauseSeconds + pausePart)));
    }, 1000);
    return () => clearInterval(id);
  }, [running, pauseRunning, totalPauseSeconds]);

  useEffect(() => {
    if (!stoerRunning || !stoerStartRef.current) return;
    const id = setInterval(() => {
      setStoerElapsed(Math.max(0, Math.floor((Date.now() - stoerStartRef.current) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [stoerRunning]);

  const onHealth = async () => {
    try {
      const health = await checkHealth();
      setStatusText(`API ok: ${health.status || 'unknown'}`);
    } catch (error) {
      setStatusText(`API Fehler: ${error.message}`);
    }
  };

  const onLoadSoll = async () => {
    try {
      const payload = await fetchSollHours();
      const count = Object.keys(payload.mapping || {}).length;
      setSollCount(count);
      setStatusText(`SOLL geladen (${count} Eintraege)`);
    } catch (error) {
      setStatusText(`SOLL Fehler: ${error.message}`);
    }
  };

  const onSearchFa = async () => {
    if (!faQuery.trim()) return;
    try {
      const payload = await searchFa(faQuery.trim());
      const results = payload.results || [];
      setFaResults(results);
      setStatusText(`FA Suche fertig (${results.length})`);
    } catch (error) {
      setStatusText(`FA Fehler: ${error.message}`);
    }
  };

  const loadFromDb = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const query = {
      linie: selectedLine,
      schicht: selectedShift,
      bereich: selectedBereich,
      datum: today,
    };
    try {
      const [session, stoerungen] = await Promise.all([
        loadSession(query),
        loadStoerungen(query),
      ]);

      if (session) {
        const startMs = parseDbDatetimeToMs(session.timer_start_time);
        productionStartRef.current = startMs || Date.now() - Number(session.elapsed_seconds || 0) * 1000;
        setElapsed(Number(session.elapsed_seconds || 0));
        setRunning(Boolean(Number(session.running || 0)));
        setPauseRunning(Boolean(Number(session.pause_running || 0)));
        setTotalPauseSeconds(Number(session.pause_total_seconds || 0));
        setSelectedIssue(session.stoerung_aktiv_typ || null);
        const stoerStart = parseDbDatetimeToMs(session.stoerung_start_time);
        stoerStartRef.current = stoerStart;
        setStoerRunning(Boolean(Number(session.stoerung_running || 0)));
        if (stoerStart) {
          setStoerElapsed(Math.max(0, Math.floor((Date.now() - stoerStart) / 1000)));
        }
        if (session.fa_nr) {
          setSelectedFA({
            FANr: session.fa_nr,
            ArtikelNr: session.artikel_nr || '',
            Artikelbezeichnung: session.artikel_bezeichnung || '',
          });
        }
      }

      if (Array.isArray(stoerungen)) {
        setStoerLogs(
          stoerungen.map((item) => ({
            id: item.id || `${item.start_time}-${item.stoerung_typ}`,
            issue: item.stoerung_typ,
            startTime: item.start_time,
            endTime: item.end_time,
            durationSeconds: Number(item.dauer_sekunden || 0),
            notes: item.notiz || '',
          }))
        );
      }
    } catch (error) {
      setStatusText(`DB Load Fehler: ${error.message}`);
    }
  };

  const onConfirmSelection = async () => {
    if (!canConfirm) return;
    setSelectionConfirmed(true);
    setStatusText('Auswahl bestaetigt');
    try {
      await sendContext({
        linie: selectedLine,
        schicht: selectedShift,
        bereich: selectedBereich,
        fa_nr: selectedFA?.FANr || null,
        selection_confirmed: true,
      });
    } catch (error) {
      setStatusText(`Context Fehler: ${error.message}`);
    }
    await loadFromDb();
  };

  const buildSessionPayload = () => {
    const today = new Date().toISOString().slice(0, 10);
    const toDatetime = (ms) => {
      if (!ms) return null;
      return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
    };

    const now = Date.now();
    const currentPause = pauseRunning && pauseStartRef.current
      ? Math.floor((now - pauseStartRef.current) / 1000)
      : 0;

    return {
      linie: selectedLine,
      schicht: selectedShift,
      bereich: selectedBereich,
      datum: today,
      session_run_key: toDatetime(productionStartRef.current),
      linienfuehrer: selectedLeader,
      fa_nr: selectedFA?.FANr || null,
      artikel_nr: selectedFA?.ArtikelNr || null,
      artikel_bezeichnung: selectedFA?.Artikelbezeichnung || null,
      timer_start_time: toDatetime(productionStartRef.current),
      elapsed_seconds: elapsed,
      running: running ? 1 : 0,
      active_button: running ? 'start' : (pauseRunning ? 'pause' : selectedIssue ? 'stoerung' : null),
      show_start_only: selectedIssue ? 1 : 0,
      pause_running: pauseRunning ? 1 : 0,
      pause_start_time: null,
      pause_total_seconds: totalPauseSeconds + currentPause,
      netto_seconds: Math.max(0, elapsed - (totalPauseSeconds + currentPause)),
      stoerung_running: stoerRunning ? 1 : 0,
      stoerung_start_time: toDatetime(stoerStartRef.current),
      stoerung_aktiv_typ: selectedIssue || null,
      stoerung_aktiv_notiz: null,
      ist_wert: null,
    };
  };

  const doSyncSession = async () => {
    if (!selectionConfirmed) return;
    if (!selectedLine || !selectedShift || !selectedBereich) return;
    const payload = buildSessionPayload();
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSnapshotRef.current) return;
    try {
      await syncSession(payload);
      lastSnapshotRef.current = snapshot;
    } catch (error) {
      setStatusText(`Sync Fehler: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!selectionConfirmed) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    doSyncSession();
    syncIntervalRef.current = setInterval(doSyncSession, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [selectionConfirmed, selectedLine, selectedShift, selectedBereich, selectedLeader, selectedFA, running, pauseRunning, totalPauseSeconds, elapsed, stoerRunning, selectedIssue]);

  const onStart = () => {
    if (!selectionConfirmed || !selectedFA) {
      setStatusText('Bitte Auswahl bestaetigen und FA waehlen');
      return;
    }
    if (!productionStartRef.current) {
      productionStartRef.current = Date.now() - elapsed * 1000;
    }
    if (pauseRunning && pauseStartRef.current) {
      const added = Math.floor((Date.now() - pauseStartRef.current) / 1000);
      setTotalPauseSeconds((prev) => prev + added);
      pauseStartRef.current = null;
      setPauseRunning(false);
    }
    setRunning(true);
    setViewMode('initial');
    setStatusText('Produktion laeuft');
  };

  const onTogglePause = () => {
    if (!running && !pauseRunning) return;
    if (!pauseRunning) {
      pauseStartRef.current = Date.now();
      setPauseRunning(true);
      setStatusText('Pause aktiv');
    } else {
      const added = pauseStartRef.current
        ? Math.floor((Date.now() - pauseStartRef.current) / 1000)
        : 0;
      setTotalPauseSeconds((prev) => prev + added);
      pauseStartRef.current = null;
      setPauseRunning(false);
      setStatusText('Pause beendet');
    }
  };

  const onOpenStoerung = () => {
    if (!running) {
      setStatusText('Stoerung nur bei laufender Produktion moeglich');
      return;
    }
    setViewMode('stoerung');
  };

  const onSelectIssue = (issue) => {
    if (pauseRunning && pauseStartRef.current) {
      const added = Math.floor((Date.now() - pauseStartRef.current) / 1000);
      setTotalPauseSeconds((prev) => prev + added);
      pauseStartRef.current = null;
      setPauseRunning(false);
    }
    setSelectedIssue(issue);
    stoerStartRef.current = Date.now();
    setStoerRunning(true);
    setStoerElapsed(0);
    setRunning(false);
    setViewMode('initial');
    setStatusText(`Stoerung aktiv: ${issue}`);
  };

  const onEndStoerung = async () => {
    if (!stoerRunning || !selectedIssue || !stoerStartRef.current) return;
    const end = Date.now();
    const durationSeconds = Math.max(0, Math.floor((end - stoerStartRef.current) / 1000));

    const log = {
      id: `${stoerStartRef.current}-${selectedIssue}`,
      issue: selectedIssue,
      startTime: new Date(stoerStartRef.current).toISOString(),
      endTime: new Date(end).toISOString(),
      durationSeconds,
      notes: '',
    };
    setStoerLogs((prev) => [log, ...prev]);

    try {
      const today = new Date().toISOString().slice(0, 10);
      await syncStoerung({
        linie: selectedLine,
        linie_nummer: selectedLine.match(/\d+/)?.[0] || selectedLine,
        schicht: selectedShift,
        bereich: selectedBereich,
        datum: today,
        linienfuehrer: selectedLeader,
        fa_nr: selectedFA?.FANr || null,
        stoerung_typ: selectedIssue,
        notiz: null,
        start_time: log.startTime,
        end_time: log.endTime,
        dauer_sekunden: durationSeconds,
      });
    } catch (error) {
      setStatusText(`Stoerung Sync Fehler: ${error.message}`);
    }

    stoerStartRef.current = null;
    setStoerRunning(false);
    setStoerElapsed(0);
    setSelectedIssue(null);
    setStatusText('Stoerung beendet');
  };

  const onEnde = async () => {
    try {
      await doSyncSession();
      const today = new Date().toISOString().slice(0, 10);
      await stopSession({
        linie: selectedLine,
        schicht: selectedShift,
        bereich: selectedBereich,
        datum: today,
        session_run_key: productionStartRef.current
          ? new Date(productionStartRef.current).toISOString().slice(0, 19).replace('T', ' ')
          : null,
      });
      await sendContext({ linie: null, schicht: null, bereich: null, fa_nr: null });
    } catch (error) {
      setStatusText(`Ende Fehler: ${error.message}`);
    }

    setRunning(false);
    setPauseRunning(false);
    setSelectionConfirmed(false);
    setSelectedFA(null);
    setSelectedIssue(null);
    setStoerRunning(false);
    setStoerElapsed(0);
    setElapsed(0);
    setTotalPauseSeconds(0);
    productionStartRef.current = null;
    pauseStartRef.current = null;
    stoerStartRef.current = null;
    setStatusText('Produktion beendet');
  };

  return (
    <main className="page">
      <section className="card">
        <header className="headerBar">
          <div className="headerLeft">
            <div className="appIcon">SP</div>
            <div>
              <h1>Stoerungsprotokoll</h1>
              <p className="headerSubtitle">Web Console</p>
            </div>
          </div>
          <div className="headerRight">
            <div className="headerTime">{currentTime.toLocaleTimeString('de-DE')}</div>
            <div className="statusIndicator">
              <span className={`statusDot ${runtimeState}`} />
              <span className="statusText">
                {runtimeState === 'running' && 'Produktion aktiv'}
                {runtimeState === 'pause' && 'Pause aktiv'}
                {runtimeState === 'stoerung' && 'Stoerung aktiv'}
                {runtimeState === 'idle' && 'Bereit'}
              </span>
            </div>
          </div>
        </header>

        <div className="endpointRow">
          <p className="muted">API: {API_BASE_URL}</p>
          <p className="muted">DB: {DB_SYNC_BASE_URL}</p>
          <p className="muted">PI: {PI_SERVER_URL}</p>
        </div>

        <div className="grid">
          <label className="fieldLabel">
            Linie
            <select className={`inputControl ${selectedLine ? 'filled' : 'missing'}`} value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}>
              <option value="">Bitte waehlen</option>
              {LINES.map((line) => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </label>

          <label className="fieldLabel">
            Schicht
            <select className={`inputControl ${selectedShift ? 'filled' : 'missing'}`} value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}>
              <option value="">Bitte waehlen</option>
              {SHIFTS.map((shift) => (
                <option key={shift} value={shift}>{shift}</option>
              ))}
            </select>
          </label>

          <label className="fieldLabel">
            Bereich
            <select className={`inputControl ${selectedBereich ? 'filled' : 'missing'}`} value={selectedBereich} onChange={(e) => setSelectedBereich(e.target.value)}>
              <option value="">Bitte waehlen</option>
              {BEREICHE.map((bereich) => (
                <option key={bereich} value={bereich}>{bereich}</option>
              ))}
            </select>
          </label>

          <label className="fieldLabel">
            Linienfuehrer
            <input
              type="text"
              className={`inputControl ${selectedLeader.trim() ? 'filled' : 'missing'}`}
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              placeholder="Name"
            />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btnNeutral" onClick={onHealth}>API Health</button>
          <button type="button" className="btnNeutral" onClick={onLoadSoll}>SOLL laden</button>
          <button type="button" className="btnPrimary" onClick={onConfirmSelection} disabled={!canConfirm}>Auswahl bestaetigen</button>
        </div>

        <div className="fa-search">
          <input
            type="text"
            value={faQuery}
            onChange={(e) => setFaQuery(e.target.value)}
            placeholder="FA suchen"
          />
          <button type="button" onClick={onSearchFa}>Suchen</button>
        </div>

        {faResults.length > 0 && (
          <ul className="results selectable">
            {faResults.slice(0, 12).map((item) => (
              <li key={`${item.FANr}-${item.ArtikelNr}`}>
                <button
                  type="button"
                  className={`listButton ${selectedFA?.FANr === item.FANr ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedFA({
                      FANr: item.FANr,
                      ArtikelNr: item.ArtikelNr,
                      Artikelbezeichnung: item.Artikelbezeichnung,
                    });
                    setStatusText(`FA gesetzt: ${item.FANr}`);
                    sendContext({
                      linie: selectedLine || null,
                      schicht: selectedShift || null,
                      bereich: selectedBereich || null,
                      fa_nr: item.FANr,
                    }).catch(() => {});
                  }}
                >
                  <strong>{item.FANr}</strong> - {item.ArtikelNr} - {item.Artikelbezeichnung}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="timerBox">
          <div className="metricsGrid">
            <p className="status">Status: {statusText}</p>
            <p className="status">Auswahl: {selectedSummary}</p>
            <p className="status">FA: {selectedFA ? `${selectedFA.FANr} / ${selectedFA.ArtikelNr}` : '-'}</p>
            <p className="status">SOLL Eintraege: {sollCount == null ? '-' : sollCount}</p>
            <p className="status">Produktion: {formatDuration(elapsed)}</p>
            <p className="status">Pause gesamt: {formatDuration(totalPauseSeconds)}</p>
            <p className="status">Stoerung aktiv: {selectedIssue || '-'}</p>
            {stoerRunning && <p className="status">Stoer-Timer: {formatDuration(stoerElapsed)}</p>}
          </div>
        </div>

        <div className="actions">
          <button type="button" className="btnStart" onClick={onStart} disabled={!selectionConfirmed || !selectedFA}>Produktion starten/weiter</button>
          <button type="button" className="btnPause" onClick={onTogglePause} disabled={!selectionConfirmed || (!running && !pauseRunning)}>
            {pauseRunning ? 'Pause beenden' : 'Pause'}
          </button>
          <button type="button" className="btnWarning" onClick={onOpenStoerung} disabled={!running}>Stoerung melden</button>
          <button type="button" className="btnWarning" onClick={onEndStoerung} disabled={!stoerRunning}>Stoerung beenden</button>
          <button type="button" className="btnDanger" onClick={onEnde} disabled={!selectionConfirmed}>Auftrags-/Schichtende</button>
        </div>

        {viewMode === 'stoerung' && (
          <div className="issueGrid">
            {activeStoerButtons.map((issue) => (
              <button key={issue} type="button" onClick={() => onSelectIssue(issue)}>
                {issue}
              </button>
            ))}
            <button type="button" className="cancelBtn" onClick={() => setViewMode('initial')}>
              Abbrechen
            </button>
          </div>
        )}

        {stoerLogs.length > 0 && (
          <div className="logsBox">
            <h3>Stoerungsprotokoll</h3>
            <ul className="results">
              {stoerLogs.slice(0, 20).map((log) => (
                <li key={log.id}>
                  <strong>{log.issue}</strong> | {new Date(log.startTime).toLocaleTimeString('de-DE')} - {new Date(log.endTime).toLocaleTimeString('de-DE')} | {formatDuration(log.durationSeconds)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
