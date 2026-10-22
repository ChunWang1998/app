import { Platform } from 'react-native';

/**
 * Optional native helper for production iOS builds.
 *
 * expo-audio's setAudioModeAsync configures AVAudioSession with mode
 * `.default` (or leaves the mode unset when category options are present).
 * `.default` allows AGC / voice processing, which skews a level meter.
 *
 * Call `enableMeasurementMode()` *after* `setAudioModeAsync` and *after*
 * recording has started so our `.measurement` mode wins. Expo Go does not
 * ship this native module: load is feature-detected and every export
 * no-ops instead of throwing.
 */

function loadNative() {
  if (Platform.OS !== 'ios') return null;
  try {
    const core = require('expo-modules-core');
    if (typeof core.requireOptionalNativeModule === 'function') {
      return core.requireOptionalNativeModule('AudioMeasurementSession') || null;
    }
    if (typeof core.requireNativeModule === 'function') {
      return core.requireNativeModule('AudioMeasurementSession');
    }
  } catch {
    return null;
  }
  return null;
}

let native = null;
try {
  native = loadNative();
} catch {
  native = null;
}

export function isMeasurementModeAvailable() {
  return typeof native?.enableMeasurementMode === 'function';
}

export async function enableMeasurementMode() {
  if (typeof native?.enableMeasurementMode !== 'function') return false;
  try {
    return !!(await native.enableMeasurementMode());
  } catch {
    return false;
  }
}

export default native;
