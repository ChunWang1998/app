import { Platform } from 'react-native';
import { resolveLocale } from '../../i18n';

const LANG = { en: 'en-US', 'zh-Hant': 'zh-TW', ja: 'ja-JP' };

function loadModule() {
  try {
    return require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

export function speechLocale(locale) {
  return LANG[resolveLocale(locale)] || 'en-US';
}

export function isSpeechAvailable() {
  const mod = loadModule();
  if (!mod) return false;
  try {
    if (typeof mod.isRecognitionAvailable === 'function' && !mod.isRecognitionAvailable()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Prefer on-device recognition; never send audio to Been Ages servers. */
export function prefersOnDevice() {
  const mod = loadModule();
  if (!mod) return false;
  try {
    return typeof mod.supportsOnDeviceRecognition === 'function' && !!mod.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

export async function requestSpeechPermission() {
  const mod = loadModule();
  if (!mod) return { granted: false, reason: 'unavailable' };
  try {
    if (typeof mod.requestMicrophonePermissionsAsync === 'function') {
      const mic = await mod.requestMicrophonePermissionsAsync();
      if (!mic?.granted) return { granted: false, reason: 'mic' };
    }
    return { granted: true };
  } catch (e) {
    return { granted: false, reason: e?.message || 'error' };
  }
}

/**
 * Start recognition. `onResult(text, isFinal)`, `onError(err)`.
 * Returns a stop function.
 */
export function startSpeech({ locale, onResult, onError, onEnd }) {
  const mod = loadModule();
  if (!mod) {
    onError?.({ reason: 'unavailable' });
    return () => {};
  }
  const listeners = [];
  const add = (name, fn) => {
    try {
      listeners.push(mod.addListener(name, fn));
    } catch {
      // web / tests
    }
  };

  add('result', (ev) => {
    const alt = ev?.results?.[0];
    const text = alt?.transcript || ev?.transcript || '';
    if (text) onResult?.(String(text), !!ev?.isFinal);
  });
  add('error', (ev) => onError?.(ev));
  add('end', () => onEnd?.());

  const onDevice = prefersOnDevice();
  mod.start({
    lang: speechLocale(locale),
    interimResults: true,
    continuous: Platform.OS === 'ios',
    requiresOnDeviceRecognition: onDevice,
    addsPunctuation: false,
  });

  return () => {
    try { mod.stop(); } catch { /* already stopped */ }
    try { mod.abort(); } catch { /* already stopped */ }
    listeners.forEach((l) => { try { l.remove(); } catch { /* */ } });
  };
}
