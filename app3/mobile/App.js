import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { initCorpus } from './src/data/sutras';
import { colors, type } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import CreateRoomScreen from './src/screens/CreateRoomScreen';
import JoinRoomScreen from './src/screens/JoinRoomScreen';
import RoomScreen from './src/screens/RoomScreen';
import CopyScreen from './src/screens/CopyScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { initBackgroundMusic, unloadBackgroundMusic } from './src/lib/music';

/**
 * Lightweight screen stack (matches app1/app2 style — no react-navigation yet).
 * Screens: home | create | join | room | copy | settings
 */
export default function App() {
  const [corpusReady, setCorpusReady] = useState(false);
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState(null);
  const [copyStartIndex, setCopyStartIndex] = useState(0);
  const [homeToken, setHomeToken] = useState(0);

  useEffect(() => {
    initBackgroundMusic();
    initCorpus()
      .then(() => setCorpusReady(true))
      .catch(() => setCorpusReady(true));
    return () => {
      unloadBackgroundMusic();
    };
  }, []);

  const goHome = () => {
    setScreen('home');
    setRoomCode(null);
    setHomeToken((t) => t + 1);
  };

  const openRoom = (code) => {
    setRoomCode(code);
    setScreen('room');
  };

  if (!corpusReady) {
    return (
      <SafeAreaProvider>
        <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.boot}>
          <SafeAreaView style={styles.bootInner}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={styles.bootText}>載入經文目錄…</Text>
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen === 'home' && (
        <HomeScreen
          refreshToken={homeToken}
          onCreate={() => setScreen('create')}
          onJoin={() => setScreen('join')}
          onOpenRoom={openRoom}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'settings' && <SettingsScreen onBack={goHome} />}
      {screen === 'create' && (
        <CreateRoomScreen onBack={goHome} onCreated={openRoom} />
      )}
      {screen === 'join' && (
        <JoinRoomScreen onBack={goHome} onJoined={openRoom} />
      )}
      {screen === 'room' && roomCode && (
        <RoomScreen
          roomCode={roomCode}
          onBack={goHome}
          onStartCopy={(code, startIndex) => {
            setRoomCode(code);
            setCopyStartIndex(startIndex);
            setScreen('copy');
          }}
        />
      )}
      {screen === 'copy' && roomCode && (
        <CopyScreen
          roomCode={roomCode}
          startIndex={copyStartIndex}
          onBack={() => setScreen('room')}
          onFinishedSession={() => setScreen('room')}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1 },
  bootInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootText: {
    fontSize: type.body,
    color: colors.muted,
  },
});
