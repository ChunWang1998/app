import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeI18n } from './i18n';
import { initRepository, resetRepositoryForTests, addActivity, updateActivity, logActivityNow } from './data/repository';
import AppNavigator from './navigation/AppNavigator';
import * as Font from 'expo-font';
import { StatusBar } from 'react-native';
import { verifyProOnLaunch } from './lib/iap';

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [initial, setInitial] = React.useState(null);
  useEffect(() => {
    (async () => {
      try {
        initializeI18n();
        try {
          await Font.loadAsync({
            'NaikaiSubset-Regular': require('../assets/fonts/naikai/NaikaiSubset-Regular.ttf'),
            'NaikaiSubset-SemiBold': require('../assets/fonts/naikai/NaikaiSubset-SemiBold.ttf'),
            'NaikaiSubset-Bold': require('../assets/fonts/naikai/NaikaiSubset-Bold.ttf'),
          });
        } catch {
          // fonts optional during tests
        }
        await initRepository();
        await verifyProOnLaunch();
        try {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const demo = url.searchParams.get('demo');
            const screen = url.searchParams.get('screen');
            if (demo || screen === 'Empty') {
              await resetRepositoryForTests();
            }
            let id = url.searchParams.get('id');
            if (demo === '1' || demo === 'logged') {
              const a1 = await addActivity({ title: '換濾水器濾心', icon: 'drop', reminderDays: 60 });
              const a2 = await addActivity({ title: '換隱形眼鏡', icon: 'eye', reminderDays: 14 });
              const a3 = await addActivity({ title: '剪頭髮', icon: 'scissors', reminderDays: null });
              const past = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5).toISOString();
              await updateActivity(a1.id, { lastDoneAt: past(74) });
              await updateActivity(a2.id, { lastDoneAt: past(19, 7) });
              await updateActivity(a3.id, { lastDoneAt: past(44) });
              if (demo === 'logged') await logActivityNow(a3.id);
              if (!id) id = a2.id;
            }
            if (screen === 'Empty') {
              setInitial({ name: 'Home', params: {} });
            } else if (screen === 'EditNew') {
              setInitial({ name: 'Edit', params: {} });
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
        <StatusBar barStyle="dark-content" />
        <AppNavigator initial={initial} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
