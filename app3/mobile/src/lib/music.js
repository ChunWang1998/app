import { Audio } from 'expo-av';
import { getMusicEnabled, setMusicEnabled } from '../storage/prefs';

let sound = null;
let starting = false;

async function ensureSound() {
  if (sound) return sound;
  if (starting) {
    while (starting && !sound) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return sound;
  }

  starting = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const created = await Audio.Sound.createAsync(
      require('../../assets/holy.mp3'),
      { isLooping: true, volume: 0.45 }
    );
    sound = created.sound;
    return sound;
  } finally {
    starting = false;
  }
}

export async function playBackgroundMusic() {
  const player = await ensureSound();
  const status = await player.getStatusAsync();
  if (!status.isLoaded) return;
  if (!status.isPlaying) {
    await player.playAsync();
  }
}

export async function stopBackgroundMusic() {
  if (!sound) return;
  const status = await sound.getStatusAsync();
  if (status.isLoaded && status.isPlaying) {
    await sound.pauseAsync();
  }
}

export async function applyMusicPreference(enabled) {
  await setMusicEnabled(enabled);
  if (enabled) {
    await playBackgroundMusic();
  } else {
    await stopBackgroundMusic();
  }
}

export async function initBackgroundMusic() {
  const enabled = await getMusicEnabled();
  if (enabled) {
    await playBackgroundMusic();
  }
  return enabled;
}

export async function unloadBackgroundMusic() {
  if (!sound) return;
  try {
    await sound.unloadAsync();
  } catch {
    // ignore unload errors on teardown
  }
  sound = null;
}
