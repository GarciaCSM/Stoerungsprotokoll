import React from 'react';
import HomeScreen from './src/screens/HomeScreen';
import { ShiftProvider } from './src/context/ShiftContext';

export default function App() {
  return (
    <ShiftProvider>
      <HomeScreen />
    </ShiftProvider>
  );
}
