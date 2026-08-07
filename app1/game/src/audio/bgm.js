import { AppState } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@xiangyin/bgmEnabled';
const VOLUME = 0.32;

let sound = null;
let enabled = false;
let appStateSub = null;
let modeReady = false;

async function loadPreference() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // Default off — user turns on via the toggle
    if (raw === null) return false;
    return raw === '1';
  } catch {
    return false;
  }
}

async function persistPreference(on) {
  try {
    await AsyncStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

async function ensureAudioMode() {
  if (modeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    // Keep BGM mixing with in-app SFX (clicks) — do not restart on button taps
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  });
  modeReady = true;
}

async function ensureSound() {
  if (sound) return sound;
  await ensureAudioMode();
  const { sound: s } = await Audio.Sound.createAsync(
    require('../../assets/audio/happy-happy-happy-song.mp3'),
    { isLooping: true, volume: VOLUME, shouldPlay: false },
  );
  sound = s;
  return sound;
}

async function applyPlayback() {
  const s = await ensureSound();
  const status = await s.getStatusAsync();
  if (!status.isLoaded) return;

  if (enabled) {
    // Resume from current position — never seek to 0
    if (!status.isPlaying) {
      await s.playAsync();
    }
  } else if (status.isPlaying) {
    await s.pauseAsync();
  }
}

/**
 * If BGM should be on but was paused by SFX / focus blip, resume without seeking.
 * Safe to call after every click.
 */
export async function resumeBgmIfNeeded() {
  if (!enabled || !sound) return;
  try {
    const status = await sound.getStatusAsync();
    if (status.isLoaded && !status.isPlaying) {
      await sound.playAsync();
    }
  } catch {
    // ignore
  }
}

function onAppStateChange(next) {
  if (!sound) return;
  if (next === 'active') {
    resumeBgmIfNeeded();
  } else if (next === 'background' || next === 'inactive') {
    sound.pauseAsync().catch(() => {});
  }
}

/** Boot BGM once at app start. Returns whether music is on. */
export async function initBgm() {
  enabled = await loadPreference();
  try {
    await ensureSound();
    await applyPlayback();
  } catch {
    // Audio may fail on web / missing asset — keep UI toggleable
  }
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', onAppStateChange);
  }
  return enabled;
}

export async function setBgmEnabled(on) {
  enabled = Boolean(on);
  await persistPreference(enabled);
  try {
    await applyPlayback();
  } catch {
    // ignore playback errors
  }
  return enabled;
}
