import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  CORPUS_CDN_BASE,
  CORPUS_DIR_NAME,
  FULL_PACK_ESTIMATE_BYTES,
  MIN_FREE_BYTES_RECOMMENDED,
  PREFS_KEYS,
} from './config';
import { setInstalledFullVersion } from './prefs';

let downloadProgress = { phase: 'idle', fraction: 0, label: '' };

export function getDownloadProgress() {
  return { ...downloadProgress };
}

export function clearDownloadProgress() {
  downloadProgress = { phase: 'idle', fraction: 0, label: '' };
}

function corpusRoot() {
  return `${FileSystem.documentDirectory}${CORPUS_DIR_NAME}/`;
}

function fullPackDir() {
  return `${corpusRoot()}full/`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`無法取得資料（${res.status}）`);
  }
  return res.json();
}

export async function checkFullPackUpdate() {
  if (!CORPUS_CDN_BASE) {
    return { ok: false, error: '尚未設定 CDN（EXPO_PUBLIC_CORPUS_CDN_BASE）' };
  }
  const manifest = await fetchJson(`${CORPUS_CDN_BASE}/manifest.json`);
  const remoteVersion = manifest.version;
  const localVersion = (await AsyncStorage.getItem(PREFS_KEYS.fullVersion)) || null;
  return {
    ok: true,
    remoteVersion,
    localVersion,
    needsDownload: !localVersion,
    needsUpdate: localVersion && localVersion !== remoteVersion,
    totalBytes: manifest.totalBytes || FULL_PACK_ESTIMATE_BYTES,
    workCount: manifest.files?.length ?? 0,
  };
}

/**
 * @param {{ onProgress?: (p: { fraction: number, label: string, phase: string }) => void }} opts
 */
export async function downloadFullPack(opts = {}) {
  if (!CORPUS_CDN_BASE) {
    return { ok: false, error: '尚未設定 CDN 位址，無法下載全庫。' };
  }

  const free = await FileSystem.getFreeDiskStorageAsync();
  if (free < MIN_FREE_BYTES_RECOMMENDED) {
    return {
      ok: false,
      error: '儲存空間不足，請先釋放至少 1.5 GB 再下載全庫。',
    };
  }

  downloadProgress = { phase: 'manifest', fraction: 0, label: '讀取目錄…' };
  opts.onProgress?.(downloadProgress);

  const manifest = await fetchJson(`${CORPUS_CDN_BASE}/manifest.json`);
  const base = CORPUS_CDN_BASE.replace(/\/$/, '');
  const root = fullPackDir();
  const unitsDir = `${root}units/`;

  await FileSystem.makeDirectoryAsync(unitsDir, { intermediates: true });

  const catalog = await fetchJson(`${base}/${manifest.catalogPath || 'catalog.json'}`);
  await FileSystem.writeAsStringAsync(`${root}catalog.json`, JSON.stringify(catalog));

  const files = manifest.files || [];
  let doneBytes = 0;
  const totalBytes =
    manifest.totalBytes || files.reduce((n, f) => n + (f.bytes || 0), 0);

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const url = `${base}/${file.path}`;
    const dest = `${root}${file.path}`;
    const parent = dest.slice(0, dest.lastIndexOf('/'));
    if (parent) {
      await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
    }

    downloadProgress = {
      phase: 'units',
      fraction: totalBytes ? doneBytes / totalBytes : (i + 1) / files.length,
      label: `下載 ${file.workId}（${i + 1}/${files.length}）`,
    };
    opts.onProgress?.(downloadProgress);

    await FileSystem.downloadAsync(url, dest);
    doneBytes += file.bytes || 0;
  }

  await FileSystem.writeAsStringAsync(`${root}manifest.json`, JSON.stringify(manifest));
  await setInstalledFullVersion(manifest.version);

  downloadProgress = { phase: 'done', fraction: 1, label: '完成' };
  opts.onProgress?.(downloadProgress);

  return { ok: true, version: manifest.version, workCount: files.length };
}

export async function deleteFullPack() {
  const root = fullPackDir();
  try {
    const info = await FileSystem.getInfoAsync(root);
    if (info.exists) {
      await FileSystem.deleteAsync(root, { idempotent: true });
    }
  } catch {
    /* ignore */
  }
  await setInstalledFullVersion(null);
  clearDownloadProgress();
  return { ok: true };
}
