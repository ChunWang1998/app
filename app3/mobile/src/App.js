import React, { useEffect } from 'react';
import { initializeI18n } from './i18n';
import { initRepository } from './data/repository';
import { ensureNotificationPermissions } from './notifications/reminders';
import AppNavigator from './navigation/AppNavigator';
import * as Font from 'expo-font';
import { verifyProOnLaunch } from './lib/iap';

export default function App() {
  const [ready, setReady] = React.useState(false);
  useEffect(() => {
    (async () => {
      try {
        initializeI18n();
        // Load Naikai fonts if available; fall back gracefully
        try {
          await Font.loadAsync({
            'Naikai-Regular': require('../assets/fonts/naikai/Naikai-Regular-subset.ttf'),
            'Naikai-SemiBold': require('../assets/fonts/naikai/Naikai-SemiBold-subset.ttf'),
            'Naikai-Bold': require('../assets/fonts/naikai/Naikai-Bold-subset.ttf'),
          });
        } catch {
          // fonts optional during dev/tests
        }
        await initRepository();
        await ensureNotificationPermissions();
        await verifyProOnLaunch();
      } finally {
        setReady(true);
      }
    })();
  }, []);
  if (!ready) return null;
  return <AppNavigator />;
}
