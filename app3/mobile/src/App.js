import React, { useEffect } from 'react';
import { initializeI18n } from './i18n';
import { initRepository, addActivity, logActivityNow } from './data/repository';
import { ensureNotificationPermissions } from './notifications/reminders';
import AppNavigator from './navigation/AppNavigator';
import * as Font from 'expo-font';
import { verifyProOnLaunch } from './lib/iap';

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [initial, setInitial] = React.useState(null);
  useEffect(() => {
    (async () => {
      try {
        initializeI18n();
        // Load Naikai fonts if available; fall back gracefully
        try {
          await Font.loadAsync({
            'NaikaiSubset-Regular': require('../assets/fonts/naikai/NaikaiSubset-Regular.ttf'),
            'NaikaiSubset-SemiBold': require('../assets/fonts/naikai/NaikaiSubset-SemiBold.ttf'),
            'NaikaiSubset-Bold': require('../assets/fonts/naikai/NaikaiSubset-Bold.ttf'),
          });
        } catch {
          // fonts optional during dev/tests
        }
        await initRepository();
        await ensureNotificationPermissions();
        await verifyProOnLaunch();
        // Read web query for screenshots: ?screen=Home|Detail|Reminder|Edit|Settings|Paywall&scheme=dark&id=xxx
        try {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.get('demo') === '1') {
              // Seed demo data for screenshots
              const a1 = await addActivity({ title: '換濾水器濾心', reminderDays: 60 });
              const a2 = await addActivity({ title: '換隱形眼鏡', reminderDays: 14 });
              await logActivityNow(a1.id);
              await logActivityNow(a2.id);
              // pass id for detail/reminder shots
              if (!url.searchParams.get('id')) {
                url.searchParams.set('id', a2.id);
              }
            }
            const scheme = url.searchParams.get('scheme');
            if (scheme) window.__forceScheme = scheme;
            const screen = url.searchParams.get('screen');
            if (screen) setInitial({ name: screen, params: screen === 'Detail' || screen === 'Reminder' || screen === 'Edit' ? { id: url.searchParams.get('id') } : {} });
          }
        } catch {}
      } finally {
        setReady(true);
      }
    })();
  }, []);
  if (!ready) return null;
  return <AppNavigator initial={initial} />;
}
