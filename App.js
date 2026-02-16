import React from 'react';
import ProtocolScreen from './src/screens/ProtocolScreen';
import { ShiftProvider } from './src/context/ShiftContext';

export default function App() {
  return (
    <ShiftProvider>
      <ProtocolScreen onBack={() => { /* no-op: HomeScreen removed */ }} />
    </ShiftProvider>
  );
}
