import { ICON_KINDS } from '../data/models';
import TABLE from './iconKeywords.json';

export const SUGGEST_ICONS = ICON_KINDS.filter((k) => k !== 'mono' && k !== 'dots');

const FLAT = TABLE.flatMap((row) =>
  (row.keys || []).map((key) => ({ icon: row.icon, key: String(key) })),
).sort((a, b) => b.key.length - a.key.length);

function isLatinKey(key) {
  return /^[\x00-\x7F]+$/.test(key) && /[a-z]/i.test(key);
}

export function hasKey(title, key) {
  if (!key) return false;
  const raw = String(title || '');
  if (isLatinKey(key)) {
    const escaped = key.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(raw);
  }
  return raw.includes(key);
}

/** Fully offline keyword match against the built-in glyph set. No AI. */
export function suggestIcon(title) {
  const raw = String(title || '').trim();
  if (!raw) return 'mono';
  for (const row of FLAT) {
    if (hasKey(raw, row.key) && SUGGEST_ICONS.includes(row.icon)) return row.icon;
  }
  return 'mono';
}

export function monogramLetter(title) {
  const s = String(title || '').trim();
  if (!s) return '';
  return [...s][0];
}

export function keywordCount() {
  return FLAT.length;
}

export function itemCount() {
  return TABLE.length;
}
