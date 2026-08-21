import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { cellKey } from '@shared/places';

const PACK_DIR = `${FileSystem.documentDirectory}packs/`;
const PACK_FILE = `${PACK_DIR}full.json`;
const PACK_META_FILE = `${PACK_DIR}meta.json`;
const PACK_VERSION_KEY = 'toiletgo:fullPackVersion';

/** @type {Map<string, object[]>|null} */
let cellIndex = null;
let indexedVersion = '';

function packUrls(baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  return {
    manifest: `${root}/pack/manifest.json`,
    full: `${root}/pack/full.json`,
  };
}

export function isFullPackIndexed() {
  return cellIndex != null && cellIndex.size >= 0;
}

/** @param {string} key */
export function loadCellFromFullPack(key) {
  if (!cellIndex) return [];
  return cellIndex.get(key) || [];
}

export async function getInstalledPackMeta() {
  try {
    const info = await FileSystem.getInfoAsync(PACK_META_FILE);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(PACK_META_FILE));
  } catch {
    return null;
  }
}

export async function hasLocalFullPack() {
  try {
    const info = await FileSystem.getInfoAsync(PACK_FILE);
    return !!info.exists;
  } catch {
    return false;
  }
}

/**
 * Parse local full.json into an in-memory cell index.
 * @returns {Promise<boolean>}
 */
export async function ensureFullPackIndexed() {
  if (cellIndex) return true;
  const exists = await hasLocalFullPack();
  if (!exists) return false;

  const raw = await FileSystem.readAsStringAsync(PACK_FILE);
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) return false;

  const map = new Map();
  for (const p of rows) {
    if (p?.lat == null || p?.lng == null) continue;
    const key = cellKey(Number(p.lat), Number(p.lng));
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(p);
  }
  cellIndex = map;
  indexedVersion = (await AsyncStorage.getItem(PACK_VERSION_KEY)) || '';
  return true;
}

export function clearFullPackIndex() {
  cellIndex = null;
  indexedVersion = '';
}

/**
 * Fetch remote pack manifest (size / version) without downloading the body.
 * @param {string} baseUrl
 */
export async function fetchPackManifest(baseUrl) {
  const { manifest } = packUrls(baseUrl);
  const res = await fetch(manifest);
  if (!res.ok) throw new Error(`pack manifest HTTP ${res.status}`);
  return res.json();
}

/**
 * Download the full Pro pack and index it.
 * @param {string} baseUrl
 * @param {(ratio: number) => void} [onProgress] 0..1
 */
export async function downloadFullPack(baseUrl, onProgress) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  if (!root) throw new Error('缺少 EXPO_PUBLIC_PLACES_URL，無法下載資料包');

  const remote = await fetchPackManifest(root);
  await FileSystem.makeDirectoryAsync(PACK_DIR, { intermediates: true });

  // Remove previous file so resume never mixes versions.
  try {
    const prev = await FileSystem.getInfoAsync(PACK_FILE);
    if (prev.exists) await FileSystem.deleteAsync(PACK_FILE, { idempotent: true });
  } catch {
    // ignore
  }

  const { full } = packUrls(root);
  const downloadResumable = FileSystem.createDownloadResumable(
    full,
    PACK_FILE,
    {},
    (progress) => {
      const total = progress.totalBytesExpectedToWrite || 0;
      const written = progress.totalBytesWritten || 0;
      const ratio = total > 0 ? Math.min(1, written / total) : 0;
      onProgress?.(ratio);
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('下載失敗');

  await FileSystem.writeAsStringAsync(PACK_META_FILE, JSON.stringify(remote));
  const version = String(remote.version || remote.builtAt || '');
  if (version) await AsyncStorage.setItem(PACK_VERSION_KEY, version);

  clearFullPackIndex();
  const ok = await ensureFullPackIndexed();
  if (!ok) throw new Error('資料包損毀，請重試下載');
  onProgress?.(1);
  return remote;
}

/**
 * True when local pack version matches remote (or remote unreachable → keep local).
 * @param {string} baseUrl
 */
export async function isPackUpToDate(baseUrl) {
  const local = await getInstalledPackMeta();
  if (!local) return false;
  try {
    const remote = await fetchPackManifest(baseUrl);
    const rv = String(remote.version || remote.builtAt || '');
    const lv = String(local.version || local.builtAt || '');
    return !!rv && rv === lv;
  } catch {
    return true;
  }
}

export function getIndexedVersion() {
  return indexedVersion;
}

/** Format bytes for UI. */
export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}
