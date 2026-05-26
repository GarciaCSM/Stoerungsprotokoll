import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as BackgroundFetch from 'expo-background-fetch';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import ProtocolScreen from './src/screens/ProtocolScreen';
import { ShiftProvider } from './src/context/ShiftContext';
import { BACKGROUND_SYNC_TASK } from './src/tasks/backgroundSyncTask';
import AppErrorBoundary from './src/components/AppErrorBoundary';

async function registerBgSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 900,   // 15 Minuten – seltener = weniger Störungen
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (_) {
    // Task bereits registriert – kein Problem
  }
}

async function unregisterBgSync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  } catch (_) {}
}

export default function App() {
  useEffect(() => {
    activateKeepAwakeAsync();

    // App ist geöffnet → Background-Task deaktivieren, damit kein Catalyst-Neuaufbau
    // (weißer Bildschirm) im Vordergrund ausgelöst wird.
    unregisterBgSync();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // Wieder im Vordergrund → Task stoppen
        unregisterBgSync();
      } else if (nextState === 'background') {
        // In den Hintergrund gewechselt → Task aktivieren
        registerBgSync();
      }
    });

    return () => {
      subscription.remove();
      deactivateKeepAwake();
    };
  }, []);

  return (
    <AppErrorBoundary>
      <ShiftProvider>
        <StatusBar style="light" hidden={true} translucent={true} />
        <ProtocolScreen onBack={() => { /* no-op: HomeScreen removed */ }} />
      </ShiftProvider>
    </AppErrorBoundary>
  );
}
