import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as BackgroundFetch from 'expo-background-fetch';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import ProtocolScreen from './src/screens/ProtocolScreen';
import { ShiftProvider } from './src/context/ShiftContext';
import { BACKGROUND_SYNC_TASK } from './src/tasks/backgroundSyncTask';

export default function App() {
  useEffect(() => {
    // Bildschirm dauerhaft an halten (Produktionstablet)
    activateKeepAwakeAsync();

    // Hintergrund-Sync registrieren (alle 15 Min. durch OS – Minimum)
    BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60,        // 60 Sekunden – OS erlaubt weniger als 15min nur auf Android
      stopOnTerminate: false,     // auch nach App-Close weiter laufen
      startOnBoot: true,          // nach Neustart automatisch starten
    }).catch(() => {
      // schlägt fehl wenn Task bereits registriert – kein Problem
    });

    return () => {
      deactivateKeepAwake();
    };
  }, []);

  return (
    <ShiftProvider>
      <StatusBar style="light" hidden={true} translucent={true} />
      <ProtocolScreen onBack={() => { /* no-op: HomeScreen removed */ }} />
    </ShiftProvider>
  );
}
