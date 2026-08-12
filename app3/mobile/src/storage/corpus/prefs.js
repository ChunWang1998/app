import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREFS_KEYS } from './config';

let installedFullVersion = null;

export function getInstalledFullVersion() {
  return installedFullVersion;
}

export async function loadCorpusPrefs() {
  try {
    installedFullVersion = await AsyncStorage.getItem(PREFS_KEYS.fullVersion);
  } catch {
    installedFullVersion = null;
  }
}

export async function setInstalledFullVersion(version) {
  installedFullVersion = version;
  if (version) {
    await AsyncStorage.setItem(PREFS_KEYS.fullVersion, version);
    await AsyncStorage.setItem(PREFS_KEYS.fullInstalledAt, String(Date.now()));
  } else {
    await AsyncStorage.multiRemove([
      PREFS_KEYS.fullVersion,
      PREFS_KEYS.fullInstalledAt,
    ]);
  }
}
