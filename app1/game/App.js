import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import StartScreen from './src/screens/StartScreen';
import GameScreen from './src/screens/GameScreen';

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <>
      <StatusBar style="dark" />
      {started ? (
        <GameScreen />
      ) : (
        <StartScreen onStart={() => setStarted(true)} />
      )}
    </>
  );
}
