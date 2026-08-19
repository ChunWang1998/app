import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const VERSION_KEY = 'toiletgo:placesVersion';
const CACHE_ROOT = `${FileSystem.documentDirectory}places/`;

let currentVersion = '';

function fileUri(relPath) {
  return `${CACHE_ROOT}${String(relPath || '').replace(/^\//, '')}`;
}

/**
 * Fetch CDN manifest and remember `version` / `builtAt`.
 * Existing disk files with a different version are treated as misses (lazy invalidation).
 * @param {string} baseUrl
 */
export async function syncPlacesManifest(baseUrl) {
  currentVersion = (await AsyncStorage.getItem(VERSION_KEY)) || '';
  const root = String(baseUrl || '').replace(/\/$/, '');
  if (!root) return currentVersion;

  try {
    const res = await fetch(`${root}/manifest.json`);
    if (!res.ok) return currentVersion;
    const manifest = await res.json();
    const remote = String(manifest.version || manifest.builtAt || '');
    if (remote && remote !== currentVersion) {
      currentVersion = remote;
      await AsyncStorage.setItem(VERSION_KEY, remote);
    }
  } catch (e) {
    console.warn('places manifest sync failed', e?.message || e);
  }
  return currentVersion;
}

/**
 * Disk cache adapter for `@shared/places` (injected so shared stays Expo-free).
 */
export function createPlacesCacheAdapter() {
  return {
    async get(relPath) {
      try {
        const uri = fileUri(relPath);
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) return null;
        const parsed = JSON.parse(await FileSystem.readAsStringAsync(uri));
        if (parsed && Array.isArray(parsed.rows)) {
          if (currentVersion && parsed.version !== currentVersion) {
            return null;
          }
          return parsed.rows;
        }
        if (Array.isArray(parsed)) return parsed;
        return null;
      } catch {
        return null;
      }
    },

    async set(relPath, rows) {
      if (!Array.isArray(rows) || !rows.length) return;
      try {
        const uri = fileUri(relPath);
        const dir = uri.slice(0, uri.lastIndexOf('/'));
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        await FileSystem.writeAsStringAsync(
          uri,
          JSON.stringify({ version: currentVersion, rows }),
        );
      } catch (e) {
        console.warn('places cache write failed', relPath, e?.message || e);
      }
    },
  };
}
