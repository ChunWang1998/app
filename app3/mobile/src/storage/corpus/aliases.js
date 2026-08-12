/**
 * Canonical work IDs match CBETA plain-text / full pack: T0251, T0235, …
 * XML-style IDs (T08n0251) and old room slugs (heart) resolve to the same.
 */

/** Old room sutraId → plain CBETA work id */
export const LEGACY_WORK_IDS = {
  heart: 'T0251',
  'diamond-excerpt': 'T0235',
  'amitabha-excerpt': 'T0366',
  'medicine-buddha': 'T0450',
  'universal-gate': 'T0262',
  ksitigarbha: 'T0412',
  'eight-awareness': 'T0779',
  'forty-two': 'T0784',
  'great-compassion': 'T1060',
  'rebirth-mantra': 'rebirth-mantra',
};

/** Explicit XML-style → plain (also covered by toPlainWorkId). */
export const XML_TO_PLAIN_WORK_IDS = {
  T08n0251: 'T0251',
  T08n0235: 'T0235',
  T12n0366: 'T0366',
  T14n0450: 'T0450',
  T09n0262: 'T0262',
  T13n0412: 'T0412',
  T17n0779: 'T0779',
  T17n0784: 'T0784',
  T20n1060: 'T1060',
};

/**
 * Convert CBETA XML work id (e.g. T08n0251) to plain-text id (T0251).
 * Leaves already-plain ids unchanged.
 * @param {string} workId
 * @returns {string}
 */
export function toPlainWorkId(workId) {
  if (!workId) return workId;
  if (XML_TO_PLAIN_WORK_IDS[workId]) return XML_TO_PLAIN_WORK_IDS[workId];
  const m = /^([A-Za-z]+)(\d+)n(.+)$/.exec(workId);
  if (m) return `${m[1]}${m[3]}`;
  return workId;
}

/**
 * @param {string | undefined | null} workId
 * @returns {string}
 */
export function resolveWorkId(workId) {
  if (!workId) return 'T0251';
  if (LEGACY_WORK_IDS[workId]) return LEGACY_WORK_IDS[workId];
  return toPlainWorkId(workId);
}
