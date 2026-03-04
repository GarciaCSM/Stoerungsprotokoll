import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lineButtonConfig } from '../../../config/lineButtonConfig';

/**
 * Manages local Störung logs (in AsyncStorage, scoped to today + line + shift + FA-Nr).
 *
 * @param {object} opts
 * @param {object} opts.shiftData        - { selectedLine, selectedLeader, selectedShift }
 * @param {boolean} opts.selectionConfirmed
 * @param {string|null} opts.localLine
 * @param {string|null} opts.localShift
 * @param {object|null} opts.selectedFA  - currently active FA object (needs .FANr)
 */
export function useLocalLogs({ shiftData, selectionConfirmed, localLine, localShift, selectedFA }) {
  const [localLogs, setLocalLogs] = useState([]);
  const [viewMode, setViewMode] = useState('logs'); // 'logs' | 'summary'

  const effectiveLine  = selectionConfirmed ? shiftData.selectedLine  : localLine;
  const effectiveShift = selectionConfirmed ? shiftData.selectedShift : localShift;
  const effectiveFaNr  = selectedFA?.FANr ?? null;

  const loadLocalLogs = async (overrideLine, overrideShift, overrideFaNr) => {
    try {
      const raw = await AsyncStorage.getItem('local_logs');
      const all = raw ? JSON.parse(raw) : [];
      const today = new Date().toDateString();
      const line  = overrideLine  ?? effectiveLine;
      const shift = overrideShift ?? effectiveShift;
      const faNr  = overrideFaNr  ?? selectedFA?.FANr ?? null;
      const filtered = all.filter(e => {
        const isToday   = new Date(e.createdAt).toDateString() === today;
        const sameLine  = line  ? e.line === line  : true;
        const sameShift = shift ? (e.shift_type === shift || e.shift === shift) : true;
        // When a FA is active, only show logs for that FA
        const sameFa    = faNr  ? (e.fa_nr === faNr) : true;
        return isToday && sameLine && sameShift && sameFa;
      });
      setLocalLogs(filtered.reverse());
    } catch (e) {
      console.warn('Failed to load local logs', e);
    }
  };

  const saveStoerLog = async ({ issue, startTime, endTime, durationSeconds, notes }) => {
    try {
      const raw = await AsyncStorage.getItem('local_logs');
      const existing = raw ? JSON.parse(raw) : [];
      const lineNumber = shiftData.selectedLine?.match(/\d+/)?.[0] ?? shiftData.selectedLine;
      existing.push({
        id: Date.now(),
        type: 'störung',
        line: shiftData.selectedLine,
        lineNumber,
        shift: shiftData.selectedShift,
        shift_type: shiftData.selectedShift,
        leader: shiftData.selectedLeader,
        fa_nr: selectedFA?.FANr || null,
        issue,
        notes: notes || null,
        startTime:  new Date(startTime).toISOString(),
        endTime:    new Date(endTime).toISOString(),
        durationSeconds,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('local_logs', JSON.stringify(existing));
      await loadLocalLogs();
    } catch (e) {
      console.warn('Failed to save störung log', e);
    }
  };

  const clearAllLocalLogs = async () => {
    try {
      // Only remove today's entries for the current line+shift
      const raw = await AsyncStorage.getItem('local_logs');
      const all = raw ? JSON.parse(raw) : [];
      const today = new Date().toDateString();
      const line  = effectiveLine;
      const shift = effectiveShift;
      const faNr = effectiveFaNr;
      const remaining = all.filter(e => {
        const isToday    = new Date(e.createdAt).toDateString() === today;
        const sameLine   = line  ? e.line === line  : true;
        const sameShift  = shift ? (e.shift_type === shift || e.shift === shift) : true;
        const sameFa     = faNr  ? (e.fa_nr === faNr) : true;
        // keep entries that are NOT (today + this line + this shift + this FA)
        return !(isToday && sameLine && sameShift && sameFa);
      });
      await AsyncStorage.setItem('local_logs', JSON.stringify(remaining));
      setLocalLogs([]);
    } catch (e) {
      console.warn('Failed to clear local logs', e);
    }
  };

  const computeIssueSummary = () => {
    const cfg = lineButtonConfig[effectiveLine]?.störung ?? [];
    const issues = cfg.length ? cfg : [...new Set(localLogs.map(l => l.issue).filter(Boolean))];
    return issues.map(label => {
      const entries = localLogs.filter(e => e.issue === label);
      return {
        label,
        count: entries.length,
        totalSeconds: entries.reduce((s, e) => s + (e.durationSeconds || 0), 0),
      };
    });
  };

  const setLocalLogsFromServer = (serverEntries=[]) => {
    // expect serverEntries to be in the same shape as localLogs; display newest first
    setLocalLogs((serverEntries || []).slice().reverse());
  };

  return {
    localLogs, viewMode, setViewMode,
    loadLocalLogs, saveStoerLog, clearAllLocalLogs, computeIssueSummary,
    setLocalLogsFromServer,
  };
}
