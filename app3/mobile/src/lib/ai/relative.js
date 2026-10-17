import { resolveLocale } from '../../i18n';
import PHRASES from './phrases.json';

function table(key, locale) {
  const loc = resolveLocale(locale);
  return PHRASES[key]?.[loc] || PHRASES[key]?.en || [];
}

function matchDays(text, rows) {
  const raw = String(text || '');
  for (const row of rows) {
    const m = raw.match(new RegExp(row.re, 'i'));
    if (!m) continue;
    if (Object.prototype.hasOwnProperty.call(row, 'days')) return row.days;
    if (row.n) {
      const n = Number(m[row.n]);
      if (!Number.isFinite(n) || n <= 0) continue;
      return n * (row.mult || 1);
    }
    if (row.daysFrom) {
      const n = Number(m[row.daysFrom]);
      if (!Number.isFinite(n) || n < 0) continue;
      return n;
    }
  }
  return undefined;
}

/** Reminder interval in days, or null when none found. Numbers are computed here, not by a model. */
export function parseReminderDays(text, locale) {
  const v = matchDays(text, table('reminderWord', locale));
  if (v == null || v === undefined) return null;
  return Math.min(3650, Math.max(1, Math.round(v)));
}

/**
 * Days ago for last-done, or null when the user said they don't remember.
 * `undefined` means the clause was absent.
 */
export function parseLastDoneDaysAgo(text, locale) {
  const rows = table('lastDone', locale);
  const raw = String(text || '');
  for (const row of rows) {
    const m = raw.match(new RegExp(row.re, 'i'));
    if (!m) continue;
    if (Object.prototype.hasOwnProperty.call(row, 'days')) return row.days;
    if (row.daysFrom) {
      const n = Number(m[row.daysFrom]);
      if (!Number.isFinite(n) || n < 0) continue;
      return n;
    }
  }
  return undefined;
}

export function lastDoneIsoFromDaysAgo(daysAgo, now = new Date()) {
  if (daysAgo == null) return null;
  const d = new Date(now);
  d.setDate(d.getDate() - Number(daysAgo));
  if (d.getTime() > Date.now()) return new Date().toISOString();
  return d.toISOString();
}

function stripList(text, patterns) {
  let s = String(text || '');
  for (const re of patterns) {
    s = s.replace(new RegExp(re, 'gi'), ' ');
  }
  return s;
}

export function stripLastDone(text, locale) {
  return stripList(text, table('lastDoneStrip', locale));
}

export function stripReminder(text, locale) {
  return stripList(text, table('reminderStrip', locale));
}

export function stripPrefixes(text, prefixes) {
  let s = String(text || '').trim();
  const list = [...(prefixes || [])].sort((a, b) => b.length - a.length);
  for (const p of list) {
    const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    if (re.test(s)) {
      s = s.replace(re, '');
      break;
    }
  }
  return s;
}

export function tidyName(text) {
  let s = String(text || '');
  for (const ch of PHRASES.foldStrip || []) s = s.split(ch).join(' ');
  return s.replace(/[?!.]/g, ' ').replace(/\s+/g, ' ').trim();
}

export { table };
