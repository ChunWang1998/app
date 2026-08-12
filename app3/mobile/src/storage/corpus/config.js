/** CDN base for full offline corpus (no trailing slash). Set via EXPO_PUBLIC_CORPUS_CDN_BASE */
export const CORPUS_CDN_BASE = (
  process.env.EXPO_PUBLIC_CORPUS_CDN_BASE || ''
).replace(/\/$/, '');

export const STARTER_PACK_VERSION = '2026-starter-1';

export const CORPUS_DIR_NAME = 'cbeta';

/** Rough full-pack size shown in settings (~800 MB CBETA EPUB equivalent). */
export const FULL_PACK_ESTIMATE_BYTES = 800 * 1024 * 1024;

/** Warn before download if free space below this. */
export const MIN_FREE_BYTES_RECOMMENDED = 1.5 * 1024 * 1024 * 1024;

export const PREFS_KEYS = {
  fullVersion: 'gongchao:corpus_full_version',
  fullInstalledAt: 'gongchao:corpus_full_installed_at',
};
