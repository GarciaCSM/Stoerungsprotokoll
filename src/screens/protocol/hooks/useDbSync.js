import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYLOAD_STORAGE_KEY } from '../../../tasks/backgroundSyncTask';

const API_BASE = 'https://cosmetic-service.com/php-api/produktion';
const SYNC_INTERVAL_MS = 1_000; // alle 1 Sekunde

/**
 * Synct den laufenden Timer-Zustand jede Sekunde in die IONOS MariaDB.
 * Störungen werden sofort nach Abschluss übertragen.
 *
 * Verwendung in ProtocolScreen.js:
 *   const dbSync = useDbSync({ shiftData, timer, selectionConfirmed, selectedFA });
 *   // Störung direkt nach saveStoerLog übertragen:
 *   await dbSync.syncStoerung({ issue, startTime, endTime, durationSeconds, notes });
 */
export function useDbSync({ shiftData, timer, selectionConfirmed, selectedFA, istValue, sollPerHour, sollAktuell, stoerTotalSeconds }) {
  const syncIntervalRef = useRef(null);
  const lastSyncedRef   = useRef(null); // verhindert doppelte Syncs bei identischem Zustand

  // ── Hilfsfunktion: fetch mit Timeout ─────────────────────────────────────
  const apiFetch = async (path, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      });
      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  const parseJsonResponse = async (res, label) => {
    const raw = await res.text().catch(() => '');
    const text = (raw || '').trim();

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      // Some PHP hosts prepend notices/BOM before JSON; try to recover JSON body.
      const startObj = text.indexOf('{');
      const endObj = text.lastIndexOf('}');
      const startArr = text.indexOf('[');
      const endArr = text.lastIndexOf(']');

      const objCandidate = startObj >= 0 && endObj > startObj ? text.slice(startObj, endObj + 1) : null;
      const arrCandidate = startArr >= 0 && endArr > startArr ? text.slice(startArr, endArr + 1) : null;
      const candidate = objCandidate || arrCandidate;

      if (candidate) {
        try {
          return JSON.parse(candidate);
        } catch {
          // fall through to warning
        }
      }

      const preview = text.slice(0, 220).replace(/\s+/g, ' ');
      console.warn(`[useDbSync] ${label} returned non-json:`, res.status, preview || '<empty>');
      return null;
    }
  };

  // ── Session-Snapshot bauen ────────────────────────────────────────────────
  const buildSessionPayload = useCallback(() => {
    if (!shiftData?.selectedLine || !shiftData?.selectedShift) return null;

    // current date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // timer_start_time: epoch ms → MySQL DATETIME string
    const toDatetime = (epochMs) => {
      if (!epochMs) return null;
      return new Date(Number(epochMs)).toISOString().slice(0, 19).replace('T', ' ');
    };

    // calculate ongoing störung duration (in seconds) in addition to stored logs
    const activeStoerSeconds = timer.stoerRunning && timer.stoerStart
      ? Math.floor((Date.now() - timer.stoerStart) / 1000)
      : 0;

    const timerStart = toDatetime(timer.productionStartTime?.current || timer.mainTimerStartTime?.current);

    return {
      linie:                shiftData.selectedLine,
      schicht:              shiftData.selectedShift,
      bereich:              shiftData.selectedBereich    || null,
      datum:                today,
      // Jede Produktion (neuer Start) bekommt damit einen eindeutigen Session-Run-Key.
      session_run_key:      timerStart,
      linienfuehrer:        shiftData.selectedLeader   || null,
      fa_nr:                selectedFA?.FANr           || null,
      artikel_nr:           selectedFA?.ArtikelNr      || null,
      artikel_bezeichnung:  selectedFA?.Artikelbezeichnung || null,

      timer_start_time:     timerStart,
      elapsed_seconds:      timer.elapsed              || 0,
      running:              timer.running ? 1 : 0,
      active_button:        timer.activeButton         || null,
      show_start_only:      timer.showStartOnly ? 1 : 0,

      pause_running:        timer.pauseRunning ? 1 : 0,
      pause_start_time:     null, // nicht von außen zugänglich, wird beim Reload ignoriert
      pause_total_seconds:  timer.totalPauseSeconds    || 0,
      // netto = brutto minus pauses minus both logged + running störungen
      netto_seconds:        Math.max(0,
                                (timer.elapsed || 0)
                                - (timer.totalPauseSeconds || 0)
                                - ((stoerTotalSeconds || 0) + activeStoerSeconds)),

      stoerung_running:     timer.stoerRunning ? 1 : 0,
      stoerung_start_time:  toDatetime(timer.stoerStart),
      stoerung_aktiv_typ:   timer.selectedIssue        || null,
      stoerung_aktiv_notiz: timer.sonstigesText        || null,

      // optional soll information – consumer can pass per-hour and calculated
      // current expectation value (e.g. sollPerHour*elapsed/3600)
      soll_pro_stunde:      typeof sollPerHour === 'number' ? sollPerHour : null,
      soll_aktuell:         typeof sollAktuell === 'number' ? sollAktuell : null,

      // IST wird nicht mehr vom Tablet in session.php geschrieben.
      // Quelle ist ausschließlich ist.php (Sensor/Server), damit neue Produktionen
      // keinen alten Tageswert automatisch übernehmen.
      ist_wert: null,
    };
  }, [shiftData, timer, selectedFA, sollPerHour, sollAktuell, stoerTotalSeconds]);

  // ── Session in DB schreiben ───────────────────────────────────────────────
  const syncSession = useCallback(async () => {
    if (!selectionConfirmed) return;

    // Erlaube initialen Upload direkt nach bestätigter Auswahl (auch vor Timer-Start),
    // blocke danach aber "leere" Zustände, damit ein Reset nicht wieder 0-Werte hochlädt.
    const hasActivity = Boolean(
      timer.running ||
      (timer.elapsed || 0) > 0 ||
      timer.pauseRunning ||
      timer.stoerRunning ||
      timer.showStartOnly ||
      timer.activeButton
    );
    if (!hasActivity && lastSyncedRef.current !== null) return;

    const payload = buildSessionPayload();
    if (!payload) return;

    // debug payload
    console.log('[useDbSync] payload', payload);

    // Nur senden wenn sich etwas geändert hat
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSyncedRef.current) return;

    try {
      const res = await apiFetch('/session.php', {
        method: 'POST',
        body: snapshot,
      });
      if (res.ok) {
        lastSyncedRef.current = snapshot;
      } else {
        const text = await res.text().catch(() => '');
        console.warn('[useDbSync] Session-Sync HTTP-Fehler:', res.status, text);
      }
    } catch (e) {
      // Fehler still ignorieren – App läuft weiter
      if (e.name !== 'AbortError') {
        console.warn('[useDbSync] Session-Sync fehlgeschlagen:', e.message);
      }
    }
    // Payload in AsyncStorage speichern → Background-Task kann ihn im Hintergrund senden
    try {
      await AsyncStorage.setItem(PAYLOAD_STORAGE_KEY, snapshot);
    } catch (_) { /* ignorieren */ }
  }, [selectionConfirmed, buildSessionPayload, timer, selectedFA]);

  // ── Störung sofort nach Abschluss übertragen ──────────────────────────────
  const syncStoerung = useCallback(async ({ issue, startTime, endTime, durationSeconds, notes }) => {
    if (!shiftData?.selectedLine || !shiftData?.selectedShift) return;

    // send tomorrow's date
    const today = new Date().toISOString().slice(0, 10);
    const lineNumber = shiftData.selectedLine?.match(/\d+/)?.[0] ?? shiftData.selectedLine;

    const payload = {
      linie:           shiftData.selectedLine,
      linie_nummer:    lineNumber,
      schicht:         shiftData.selectedShift,
      bereich:         shiftData.selectedBereich        || null,
      datum:           today,
      linienfuehrer:   shiftData.selectedLeader || null,
      fa_nr:           selectedFA?.FANr         || null,
      stoerung_typ:    issue,
      notiz:           notes                   || null,
      start_time:      new Date(startTime).toISOString(),
      end_time:        new Date(endTime).toISOString(),
      dauer_sekunden:  durationSeconds          || 0,
    };

    try {
      const res = await apiFetch('/stoerungen.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // success
      } else {
        const text = await res.text().catch(() => '');
        console.warn('[useDbSync] Störung-Sync HTTP-Fehler:', res.status, text);
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[useDbSync] Störung-Sync fehlgeschlagen:', e.message);
    }
  }, [shiftData, selectedFA]);

  // ── 10s Intervall starten/stoppen ─────────────────────────────────────────
  useEffect(() => {
    if (!selectionConfirmed) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Sofort einmal syncen wenn Schicht bestätigt wird
    syncSession();

    syncIntervalRef.current = setInterval(syncSession, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [selectionConfirmed, syncSession]);

  // ── Session beim Beenden auf running=0 setzen ─────────────────────────────
  // DELETE → PHP setzt running/stoerung_running/pause_running auf 0,
  // lässt elapsed_seconds und alle anderen Daten aber UNANGETASTET.
  // Der letzte 10s-Sync hat elapsed_seconds bereits korrekt in der DB,
  // kein erneutes Schreiben aus einer möglicherweise veralteten Closure nötig.
  const stopSession = useCallback(async () => {
    if (!shiftData?.selectedLine || !shiftData?.selectedShift) return;
    const today = new Date().toISOString().slice(0, 10);
    const bereichParam = shiftData?.selectedBereich ? `&bereich=${encodeURIComponent(shiftData.selectedBereich)}` : '';
    try {
      await apiFetch(
        `/session.php?linie=${encodeURIComponent(shiftData.selectedLine)}&schicht=${encodeURIComponent(shiftData.selectedShift)}${bereichParam}&datum=${today}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[useDbSync] stopSession fehlgeschlagen:', e.message);
      }
    }
  }, [shiftData]);

  // ── Load session + störungen + optional SOLL aus DB (used on app-open / schichtwechsel)
  const loadFromDb = useCallback(async (overrideLine, overrideShift) => {
    const line = overrideLine || shiftData?.selectedLine;
    const shift = overrideShift || shiftData?.selectedShift;
    if (!line || !shift) return { session: null, stoerungen: null };
    const today = new Date().toISOString().slice(0, 10);
    const bereichParam = shiftData?.selectedBereich ? `&bereich=${encodeURIComponent(shiftData.selectedBereich)}` : '';

    try {
      const sessionRes = await apiFetch(`/session.php?linie=${encodeURIComponent(line)}&schicht=${encodeURIComponent(shift)}${bereichParam}&datum=${today}`);
      let session = null;
      if (sessionRes.status === 200) {
        session = await parseJsonResponse(sessionRes, 'session.php');
      }

      const stoerRes = await apiFetch(`/stoerungen.php?linie=${encodeURIComponent(line)}&schicht=${encodeURIComponent(shift)}&datum=${today}`);
      let stoerungen = null;
      if (stoerRes.status === 200) {
        stoerungen = await parseJsonResponse(stoerRes, 'stoerungen.php');
      }

      return { session, stoerungen };
    } catch (e) {
      console.warn('[useDbSync] loadFromDb failed', e);
      return { session: null, stoerungen: null };
    }
  }, [shiftData]);

  return { syncSession, syncStoerung, stopSession, loadFromDb };
}
