import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LandingScreen from './src/screens/LandingScreen';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <>
      <StatusBar style="dark" />
      {started ? (
        <MapScreen onBack={() => setStarted(false)} />
      ) : (
        <LandingScreen onStart={() => setStarted(true)} />
      )}
    </>
  );
}
