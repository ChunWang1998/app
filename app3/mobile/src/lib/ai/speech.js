import { Platform } from 'react-native';
import { getLocale, resolveLocale } from '../../i18n';

const LANG = { en: 'en-US', 'zh-Hant': 'zh-TW', ja: 'ja-JP', de: 'de-DE', fr: 'fr-FR' };

function loadModule() {
  try {
    return require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

function loadFoundation() {
  try {
    return require('apple-foundation-models');
  } catch {
    return null;
  }
}

let onDeviceOverride;

/** Test hook: boolean, `(locale) => boolean`, or `undefined` to use native. */
export function __setOnDeviceSpeechForTests(value) {
  onDeviceOverride = value;
}

export function speechLocale(locale) {
  return LANG[resolveLocale(locale)] || 'en-US';
}

/**
 * On-device only. Uses the same app/system language mapping as recognition
 * (`zh-Hant`→`zh-TW`, `ja`→`ja-JP`, `en`→`en-US`, `de`→`de-DE`, `fr`→`fr-FR`).
 * Never falls back to servers.
 */
export function supportsOnDeviceSpeech(locale) {
  const tag = locale || getLocale();
  if (onDeviceOverride !== undefined) {
    return typeof onDeviceOverride === 'function' ? !!onDeviceOverride(tag) : !!onDeviceOverride;
  }
  const native = loadFoundation();
  if (typeof native?.supportsOnDeviceSpeech !== 'function') return false;
  try {
    return !!native.supportsOnDeviceSpeech(tag);
  } catch {
    return false;
  }
}

export function isSpeechAvailable(locale) {
  if (!supportsOnDeviceSpeech(locale)) return false;
  const mod = loadModule();
  if (!mod) return false;
  try {
    if (typeof mod.isRecognitionAvailable === 'function' && !mod.isRecognitionAvailable()) return false;
    return true;
  } catch {
    return false;
  }
}

export function prefersOnDevice(locale) {
  return supportsOnDeviceSpeech(locale);
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
 * Start on-device recognition only. `onResult(text, isFinal)`, `onError(err)`.
 * Returns a stop function. Never starts if the locale lacks on-device support.
 */
export function startSpeech({ locale, onResult, onError, onEnd }) {
  const mod = loadModule();
  if (!mod) {
    onError?.({ reason: 'unavailable' });
    return () => {};
  }
  if (!supportsOnDeviceSpeech(locale)) {
    onError?.({ reason: 'on-device-unavailable' });
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

  mod.start({
    lang: speechLocale(locale),
    interimResults: true,
    continuous: Platform.OS === 'ios',
    requiresOnDeviceRecognition: true,
    addsPunctuation: false,
  });

  return () => {
    try { mod.stop(); } catch { /* already stopped */ }
    try { mod.abort(); } catch { /* already stopped */ }
    listeners.forEach((l) => { try { l.remove(); } catch { /* */ } });
  };
}
