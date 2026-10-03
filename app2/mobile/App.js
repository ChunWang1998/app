import React, { useState, Suspense, lazy } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingScreen from './src/screens/LandingScreen';
import { LanguageProvider, t, useLanguage } from './src/i18n';

const MapScreen = lazy(() => import('./src/screens/MapScreen'));

function MapLoadError({ message, onRetry }) {
  useLanguage();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        backgroundColor: '#E8FBF7',
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
        {t('map.crashTitle')}
      </Text>
      <Text style={{ textAlign: 'center', color: '#4D6B66', marginBottom: 16 }}>
        {message}
      </Text>
      <TouchableOpacity onPress={onRetry}>
        <Text style={{ color: '#1A9B8E', fontWeight: '700' }}>{t('map.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

class MapCrashGuard extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <MapLoadError
          message={String(this.state.error?.message || this.state.error)}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          {started ? (
            <Suspense
              fallback={
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#1A9B8E" />
                </View>
              }
            >
              <MapCrashGuard>
                <MapScreen />
              </MapCrashGuard>
            </Suspense>
          ) : (
            <LandingScreen onStart={() => setStarted(true)} />
          )}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </LanguageProvider>
  );
}
