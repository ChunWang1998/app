import React, { useState, Suspense, lazy } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingScreen from './src/screens/LandingScreen';

const MapScreen = lazy(() => import('./src/screens/MapScreen'));

class MapCrashGuard extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
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
            地圖載入失敗
          </Text>
          <Text style={{ textAlign: 'center', color: '#4D6B66', marginBottom: 16 }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
          <TouchableOpacity onPress={() => this.setState({ error: null })}>
            <Text style={{ color: '#1A9B8E', fontWeight: '700' }}>再試一次</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [started, setStarted] = useState(false);

  return (
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
  );
}
