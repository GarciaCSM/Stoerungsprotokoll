import { useEffect, useRef, useCallback } from 'react';
import { formatLocalDateYmd, epochMsToLocalMysqlDatetime, dateValueToLocalMysqlDatetime } from '../../../utils/dateSafe';

const API_BASE = 'https://cosmetic-service.com/php-api/produktion';
const SYNC_INTERVAL_MS = 10_000; // alle 10 Sekunden

/** IONOS/PHP liefert manchmal Warnungen vor dem JSON oder kaputte Antworten — nicht die App crashen lassen. */
async function parseJsonResponse(res, label) {
  try {
    const text = (await res.text()).trim().replace(/^\uFEFF/, '');
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      const i = text.search(/[\[{]/);
      if (i > 0) {
        try {
          return JSON.parse(text.slice(i));
        } catch { /* ignore */ }
      }
      if (__DEV__) {
        console.warn(`[useDbSync] ${label}: kein gültiges JSON (ersten 180 Zeichen):`, text.slice(0, 180));
      }
      return null;
    }
  } catch (e) {
    console.warn(`[useDbSync] ${label}: Lesen fehlgeschlagen`, e.message);
    return null;
  }
}

/**
 * Synct den laufenden Timer-Zustand alle 10s in die IONOS MariaDB.
 * Störungen werden sofort nach Abschluss übertragen.
 *
 * Verwendung in ProtocolScreen.js:
 *   const dbSync = useDbSync({ shiftData, timer, selectionConfirmed, selectedFA });
 *   // Störung direkt nach saveStoerLog übertragen:
 *   await dbSync.syncStoerung({ issue, startTime, endTime, durationSeconds, notes });
 */
export function useDbSync({ shiftData, timer, selectionConfirmed, selectedFA, istValue, sollPerHour, sollAktuell }) {
  const syncIntervalRef = useRef(null);
  const lastSyncedRef   = useRef(null); // verhindert doppelte Syncs bei identischem Zustand
  const lastIstRef      = useRef(0);   // zuletzt erfolgreich in die DB geschriebener IST-Wert

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

  const toDatetime = useCallback((epochMs) => epochMsToLocalMysqlDatetime(epochMs), []);

  const makeSessionRunKey = useCallback((baseKey, bereich) => {
    if (!baseKey) return null;
    if (!bereich) return baseKey;
    return `${baseKey}::${bereich}`;
  }, []);

  // ── Session-Snapshot bauen ────────────────────────────────────────────────
  const buildSessionPayload = useCallback(() => {
    if (!shiftData?.selectedLine || !shiftData?.selectedShift || !shiftData?.selectedBereich) {
      console.warn('[useDbSync] Skip session sync: line/shift/bereich missing', {
        line: shiftData?.selectedLine || null,
        shift: shiftData?.selectedShift || null,
        bereich: shiftData?.selectedBereich || null,
      });
      return null;
    }

    const today = formatLocalDateYmd();

    // timer_start_time: epoch ms → MySQL DATETIME string
    const baseRunKey = toDatetime(
      timer.productionStartTime?.current || timer.mainTimerStartTime?.current
    );
    const sessionRunKey = makeSessionRunKey(baseRunKey, shiftData.selectedBereich);

    return {
      linie:                shiftData.selectedLine,
      schicht:              shiftData.selectedShift,
      bereich:              shiftData.selectedBereich || null,
      datum:                today,
      session_run_key:      sessionRunKey,
      linienfuehrer:        shiftData.selectedLeader   || null,
      fa_nr:                selectedFA?.FANr           || null,
      artikel_nr:           selectedFA?.ArtikelNr      || null,
      artikel_bezeichnung:  selectedFA?.Artikelbezeichnung || null,

      timer_start_time:     toDatetime(timer.mainTimerStartTime?.current),
      elapsed_seconds:      timer.elapsed              || 0,
      running:              timer.running ? 1 : 0,
      active_button:        timer.activeButton         || null,
      show_start_only:      timer.showStartOnly ? 1 : 0,

      pause_running:        timer.pauseRunning ? 1 : 0,
      pause_start_time:     null, // nicht von außen zugänglich, wird beim Reload ignoriert
      pause_total_seconds:  timer.totalPauseSeconds    || 0,
      // netto = brutto minus Pausen (Störungen stehen separat in der stoerungen-Tabelle)
      netto_seconds:        Math.max(0, (timer.elapsed || 0) - (timer.totalPauseSeconds || 0)),

      stoerung_running:     timer.stoerRunning ? 1 : 0,
      stoerung_start_time:  toDatetime(timer.stoerStart),
      stoerung_aktiv_typ:   timer.selectedIssue        || null,
      stoerung_aktiv_notiz: timer.sonstigesText        || null,

      soll_pro_stunde:      sollPerHour != null ? Number(sollPerHour) : null,
      soll_aktuell:         sollAktuell != null ? Number(sollAktuell) : null,

      // only send IST when we have a positive number and it has increased since
      // the last sync. this prevents a stale tablet value from rolling the
      // value backwards in the database (the server also guards with
      // GREATEST, but this reduces unnecessary writes).
      ist_wert: (() => {
        const v = istValue != null ? Number(istValue) : null;
        if (v != null && v > 0 && v > lastIstRef.current) {
          lastIstRef.current = v;
          return v;
        }
        return null;
      })(),
    };
  }, [shiftData, timer, selectedFA]);

  // ── Session in DB schreiben ───────────────────────────────────────────────
  const syncSession = useCallback(async () => {
    if (!selectionConfirmed) return;
    // Nicht senden wenn der Timer zurückgesetzt ist (elapsed=0, running=false) –
    // verhindert Race-Condition nach "Schicht beenden", die netto_seconds auf 0 überschreiben würde.
    if (!timer.running && (timer.elapsed || 0) === 0) return;
    const payload = buildSessionPayload();
    if (!payload) return;

    

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
        const msg = await res.text();
        console.warn('[useDbSync] Session-Sync HTTP', res.status, msg);
      }
    } catch (e) {
      // Fehler still ignorieren – App läuft weiter
      if (e.name !== 'AbortError') {
        console.warn('[useDbSync] Session-Sync fehlgeschlagen:', e.message);
      }
    }
  }, [selectionConfirmed, buildSessionPayload]);

  // ── Störung sofort nach Abschluss übertragen ──────────────────────────────
  const syncStoerung = useCallback(async ({ issue, startTime, endTime, durationSeconds, notes }) => {
    if (!shiftData?.selectedLine || !shiftData?.selectedShift || !shiftData?.selectedBereich) {
      console.warn('[useDbSync] Skip stoerung sync: line/shift/bereich missing');
      return;
    }

    const today = formatLocalDateYmd();
    const lineNumber = shiftData.selectedLine?.match(/\d+/)?.[0] ?? shiftData.selectedLine;

    const payload = {
      linie:           shiftData.selectedLine,
      linie_nummer:    lineNumber,
      schicht:         shiftData.selectedShift,
      bereich:         shiftData.selectedBereich || null,
      datum:           today,
      linienfuehrer:   shiftData.selectedLeader || null,
      fa_nr:           selectedFA?.FANr         || null,
      stoerung_typ:    issue,
      notiz:           notes                   || null,
      start_time:      dateValueToLocalMysqlDatetime(startTime),
      end_time:        dateValueToLocalMysqlDatetime(endTime),
      dauer_sekunden:  durationSeconds          || 0,
    };

    try {
      const res = await apiFetch('/stoerungen.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        console.warn('[useDbSync] Stoerung-Sync HTTP', res.status, msg);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[useDbSync] Störung-Sync fehlgeschlagen:', e.message);
      }
    }
  }, [shiftData, selectedFA]);

  // ── 10s Intervall starten/stoppen ─────────────────────────────────────────
  useEffect(() => {
    if (!selectionConfirmed) {
      // Beim Beenden den IST-Ref zurücksetzen, damit ein neuer Auftrag
      // von 0 aufwärts synchronisiert wird (nicht erst ab dem alten Maximum).
      lastIstRef.current = 0;
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
    if (!shiftData?.selectedLine || !shiftData?.selectedShift || !shiftData?.selectedBereich) return;
    const today = formatLocalDateYmd();
    const bereich = shiftData?.selectedBereich || '';
    const baseRunKey = toDatetime(timer.productionStartTime?.current || timer.mainTimerStartTime?.current);
    const sessionRunKey = makeSessionRunKey(baseRunKey, bereich);
    try {
      const urlPath = `/session.php?linie=${encodeURIComponent(shiftData.selectedLine)}&schicht=${encodeURIComponent(shiftData.selectedShift)}&bereich=${encodeURIComponent(bereich)}&datum=${today}${sessionRunKey ? `&session_run_key=${encodeURIComponent(sessionRunKey)}` : ''}`;
      console.warn('[useDbSync] stopSession DELETE ->', urlPath);
      const res = await apiFetch(urlPath, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        console.warn('[useDbSync] stopSession HTTP', res.status, txt);
      } else {
        console.warn('[useDbSync] stopSession success', res.status);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[useDbSync] stopSession fehlgeschlagen:', e.message);
      }
    }
  }, [shiftData, timer, toDatetime]);

  

  // ── Load session + störungen + optional SOLL aus DB (used on app-open / schichtwechsel)
  const loadFromDb = useCallback(async (overrideLine, overrideShift, overrideBereich) => {
    const line = overrideLine || shiftData?.selectedLine;
    const shift = overrideShift || shiftData?.selectedShift;
    const bereich = overrideBereich || shiftData?.selectedBereich || '';
    if (!line || !shift || !bereich) return { session: null, stoerungen: null };
    const today = formatLocalDateYmd();

    try {
      const sessionRes = await apiFetch(`/session.php?linie=${encodeURIComponent(line)}&schicht=${encodeURIComponent(shift)}&bereich=${encodeURIComponent(bereich)}&datum=${today}`);
      const sessionRaw = sessionRes.status === 200 ? await parseJsonResponse(sessionRes, 'session.php') : null;
      const session =
        sessionRaw && typeof sessionRaw === 'object' && !Array.isArray(sessionRaw) ? sessionRaw : null;

      const stoerRes = await apiFetch(`/stoerungen.php?linie=${encodeURIComponent(line)}&schicht=${encodeURIComponent(shift)}&bereich=${encodeURIComponent(bereich)}&datum=${today}`);
      const stoerRaw = stoerRes.status === 200 ? await parseJsonResponse(stoerRes, 'stoerungen.php') : null;
      const stoerungen = Array.isArray(stoerRaw) ? stoerRaw : null;

      return { session, stoerungen };
    } catch (e) {
      console.warn('[useDbSync] loadFromDb failed', e);
      return { session: null, stoerungen: null };
    }
  }, [shiftData]);

  return { syncSession, syncStoerung, stopSession, loadFromDb };
}
