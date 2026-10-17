import { Platform } from 'react-native';

function load() {
  if (Platform.OS !== 'ios') return null;
  try {
    const { requireNativeModule } = require('expo-modules-core');
    return requireNativeModule('AppleFoundationModels');
  } catch {
    return null;
  }
}

const native = load();

export async function getAvailability(locale) {
  if (!native?.getAvailability) return { status: 'unavailable', reason: 'no-native' };
  return native.getAvailability(locale);
}

export async function parseIntent(text, locale) {
  if (!native?.parseIntent) return { ok: false, reason: 'unavailable' };
  return native.parseIntent(text, locale);
}

/** True only when SFSpeechRecognizer exists, isAvailable, and supports on-device for this locale. */
export function supportsOnDeviceSpeech(locale) {
  if (!native?.supportsOnDeviceSpeech) return false;
  try {
    return !!native.supportsOnDeviceSpeech(String(locale || 'en'));
  } catch {
    return false;
  }
}

export default native;
