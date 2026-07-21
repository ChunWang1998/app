import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import GameScreen from './src/screens/GameScreen';

export default function App() {
  const [player, setPlayer] = useState(null);

  return (
    <>
      <StatusBar style="dark" />
      {player === null ? (
        <LoginScreen onLogin={setPlayer} />
      ) : (
        <GameScreen playerName={player} />
      )}
    </>
  );
}
