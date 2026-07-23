import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import StartScreen from './src/screens/StartScreen';
import GameScreen from './src/screens/GameScreen';
import { colors } from './src/theme';
import { loadProgress, saveProgress } from './src/storage/progress';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState({
    currentIndex: 0,
    completed: [],
    started: false,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadProgress();
      if (!alive) return;
      setProgress(saved);
      // 重新打開直接回到上次退出的關卡畫面
      if (saved.started) setStarted(true);
      setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleStart = async () => {
    const next = { ...progress, started: true };
    setProgress(next);
    setStarted(true);
    await saveProgress(next);
  };

  if (booting) {
    return (
      <View style={styles.boot}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {started ? (
        <GameScreen
          initialIndex={progress.currentIndex}
          initialCompleted={progress.completed}
          onProgressChange={setProgress}
        />
      ) : (
        <StartScreen onStart={handleStart} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgTop,
  },
});
