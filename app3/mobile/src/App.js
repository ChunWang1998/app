import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getLocale, initializeI18n, setLocale, t } from './i18n';
import { initRepository, resetRepositoryForTests, addActivity, updateActivity, logActivityNow } from './data/repository';
import { initPrefs, updatePrefs } from './data/prefs';
import AppNavigator from './navigation/AppNavigator';
import * as Font from 'expo-font';
import { Platform, StatusBar } from 'react-native';
import { startPurchaseUpdates, verifyProOnLaunch } from './lib/iap';
import { ThemeProvider, useForcedScheme } from './theme/useTheme';
import { setProUnlocked } from './lib/entitlements';
import { initWidgets } from './widgets/sync';
if (Platform.OS !== 'web') {
  require('./widgets/BeenAgesHome');
  require('./widgets/BeenAgesLock');
}

function AppStatusBar() {
  const scheme = useForcedScheme();
  return <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />;
}

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [initial, setInitial] = React.useState(null);
  useEffect(() => {
    (async () => {
      try {
        initializeI18n();
        try {
          if (typeof window !== 'undefined') {
            const lang = new URL(window.location.href).searchParams.get('lang');
            if (lang) setLocale(lang);
          }
        } catch {}
        try {
          await Font.loadAsync({
            'NaikaiSubset-Regular': require('../assets/fonts/naikai/NaikaiSubset-Regular.ttf'),
            'NaikaiSubset-SemiBold': require('../assets/fonts/naikai/NaikaiSubset-SemiBold.ttf'),
            'NaikaiSubset-Bold': require('../assets/fonts/naikai/NaikaiSubset-Bold.ttf'),
          });
        } catch {
          // fonts optional during tests
        }
        await initPrefs();
        await initRepository();
        try { await startPurchaseUpdates(); } catch {}
        await verifyProOnLaunch();
        try { await initWidgets({ locale: getLocale() }); } catch {}
        try {
          if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const demo = url.searchParams.get('demo');
            const screen = url.searchParams.get('screen');
            const mode = url.searchParams.get('mode');
            if (mode === 'dark' || mode === 'light') {
              await updatePrefs({ appearance: mode });
            }
            if (demo || screen === 'Empty') {
              await resetRepositoryForTests();
            }
            let id = url.searchParams.get('id');
            if (demo === '1' || demo === 'logged') {
              await setProUnlocked(true);
              const past = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5).toISOString();
              const a1 = await addActivity({ title: t('demo.filter'), icon: 'drop', reminderDays: 60, lastDoneAt: past(74) });
              const a2 = await addActivity({ title: t('demo.contacts'), icon: 'eye', reminderDays: 14, lastDoneAt: past(19, 7) });
              const a3 = await addActivity({ title: t('demo.vitamin'), icon: 'pill', reminderDays: 1, lastDoneAt: past(2) });
              const a4 = await addActivity({ title: t('demo.sheets'), icon: 'bed', reminderDays: 7, lastDoneAt: past(9) });
              const a5 = await addActivity({ title: t('demo.plant'), icon: 'leaf', reminderDays: 3, lastDoneAt: past(1) });
              const a6 = await addActivity({ title: t('demo.hair'), icon: 'scissors', reminderDays: null, lastDoneAt: past(44) });
              await updateActivity(a2.id, {
                history: [
                  { at: past(19, 7) },
                  { at: past(33, 7) },
                  { at: past(47, 7) },
                ],
              });
              if (demo === 'logged') await logActivityNow(a4.id);
              if (!id) id = a2.id;
              void a1; void a3; void a5; void a6;
            }
            if (screen === 'Empty') {
              setInitial({ name: 'Home', params: {} });
            } else if (screen === 'EditNew') {
              setInitial({ name: 'Edit', params: {} });
            } else if (screen === 'Remind' || screen === 'Reminder') {
              setInitial({ name: 'Reminder', params: { id } });
            } else if (screen) {
              const needsId = screen === 'Detail' || screen === 'Edit';
              setInitial({ name: screen, params: needsId ? { id } : {} });
            }
          }
        } catch {}
      } finally {
        setReady(true);
      }
    })();
  }, []);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppStatusBar />
          <AppNavigator initial={initial} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
