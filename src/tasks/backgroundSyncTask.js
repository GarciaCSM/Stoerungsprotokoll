import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_SYNC_TASK = 'STOERUNG_BACKGROUND_SYNC';
export const PAYLOAD_STORAGE_KEY   = '@dbSync_lastPayload';
const API_BASE = 'https://cosmetic-service.com/php-api/produktion';

// ── Task-Definition (muss auf Modul-Ebene stehen, vor App-Start) ─────────────
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const raw = await AsyncStorage.getItem(PAYLOAD_STORAGE_KEY);
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const payload = JSON.parse(raw);
    // Nur senden wenn der Timer noch läuft
    if (!payload || payload.running !== 1) return BackgroundFetch.BackgroundFetchResult.NoData;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}/session.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return res.ok
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.Failed;
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    console.warn('[BackgroundSync] Fehler:', e.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
