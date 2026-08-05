import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import StartScreen from './src/screens/StartScreen';
import GameScreen from './src/screens/GameScreen';
import { colors } from './src/theme';
import { loadProgress, saveProgress } from './src/storage/progress';
import { initBgm, setBgmEnabled } from './src/audio/bgm';
import { initSfx, playClick } from './src/audio/sfx';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [started, setStarted] = useState(false);
  const [bgmOn, setBgmOn] = useState(false);
  const [progress, setProgress] = useState({
    currentIndex: 0,
    completed: [],
    started: false,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [saved, musicOn] = await Promise.all([
        loadProgress(),
        initBgm(),
        initSfx(),
      ]);
      if (!alive) return;
      setProgress(saved);
      setBgmOn(musicOn);
      // 重新打開直接回到上次退出的關卡畫面
      if (saved.started) setStarted(true);
      setBooting(false);
    })();
    // Keep singleton BGM across Strict Mode / re-renders — do not unload on cleanup
    return () => {
      alive = false;
    };
  }, []);

  const handleToggleBgm = async () => {
    const next = !bgmOn;
    setBgmOn(next);
    await setBgmEnabled(next);
  };

  const handleStart = async () => {
    playClick();
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
          key="game"
          initialIndex={progress.currentIndex}
          initialCompleted={progress.completed}
          onProgressChange={setProgress}
          bgmOn={bgmOn}
          onToggleBgm={handleToggleBgm}
        />
      ) : (
        <StartScreen
          onStart={handleStart}
          bgmOn={bgmOn}
          onToggleBgm={handleToggleBgm}
          hasProgress={progress.completed.length > 0}
        />
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
