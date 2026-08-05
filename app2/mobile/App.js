import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingScreen from './src/screens/LandingScreen';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        {started ? (
          <MapScreen onBack={() => setStarted(false)} />
        ) : (
          <LandingScreen onStart={() => setStarted(true)} />
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
