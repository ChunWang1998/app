import { Audio } from 'expo-av';
import { resumeBgmIfNeeded } from './bgm';

const VOLUME = 0.55;

let clickSound = null;
let playing = false;

async function ensureClick() {
  if (clickSound) return clickSound;
  const { sound } = await Audio.Sound.createAsync(
    require('../../assets/audio/click.wav'),
    { volume: VOLUME, shouldPlay: false, isLooping: false },
  );
  clickSound = sound;
  return clickSound;
}

/** Preload click SFX (call once at app boot). */
export async function initSfx() {
  try {
    await ensureClick();
  } catch {
    // Audio may fail on web / missing asset
  }
}

/**
 * Play a short tap/click sound.
 * Uses setPosition + play (not unload/recreate) so BGM keeps its place.
 */
export async function playClick() {
  try {
    const s = await ensureClick();
    // Avoid stacking replayAsync storms; still allow rapid taps
    if (playing) {
      await s.setPositionAsync(0);
      await s.playAsync();
    } else {
      playing = true;
      await s.setPositionAsync(0);
      await s.playAsync();
      s.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) {
          playing = false;
        }
      });
    }
    // If platform briefly paused BGM, resume without seeking to start
    resumeBgmIfNeeded();
  } catch {
    playing = false;
  }
}
