import { t } from '../i18n';

export const IMPORT_MAX_BYTES = 1024 * 1024;

export function utf8ByteLength(text) {
  if (typeof text !== 'string') return null;
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

export function finiteSize(n) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0 ? x : null;
}

/** Prefer file.size, then getInfo size, then UTF-8 length of the read text. */
export function resolveImportSize({ fileSize, infoSize, text } = {}) {
  return finiteSize(fileSize) ?? finiteSize(infoSize) ?? utf8ByteLength(text);
}

export function importSizeError(size) {
  if (size == null) return t('import.sizeUnknown');
  if (size > IMPORT_MAX_BYTES) return t('import.tooLarge');
  return null;
}
