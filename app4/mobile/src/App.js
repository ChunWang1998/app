import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeI18n } from './i18n';
import { initPrefs } from './data/prefs';
import MeterScreen from './screens/MeterScreen';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      initializeI18n();
      try {
        await initPrefs();
      } catch {
        // defaults already in memory
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MeterScreen />
    </SafeAreaProvider>
  );
}
