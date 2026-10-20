import { resolveLocale } from '../../i18n';
import PHRASES from './phrases.json';

function table(key, locale) {
  const loc = resolveLocale(locale);
  return PHRASES[key]?.[loc] || PHRASES[key]?.en || [];
}

function numeralMap(locale) {
  const loc = resolveLocale(locale);
  return PHRASES.numeral?.[loc] || PHRASES.numeral?.en || {};
}

/** Arabic digits or locale numeral words (e.g. 三 → 3). */
export function coerceCount(raw, locale) {
  const s = String(raw || '').trim();
  if (!s) return NaN;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const map = numeralMap(locale);
  if (Object.prototype.hasOwnProperty.call(map, s)) {
    const n = Number(map[s]);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function weekdayIndex(token, locale) {
  const key = String(token || '').trim().toLowerCase();
  if (!key) return null;
  const loc = resolveLocale(locale);
  const map = PHRASES.weekdays?.[loc] || PHRASES.weekdays?.en || {};
  if (!Object.prototype.hasOwnProperty.call(map, key) && !Object.prototype.hasOwnProperty.call(map, token)) {
    return null;
  }
  const n = Number(map[key] ?? map[token]);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
}

/** Most recent past occurrence of `weekday` (0=Sun … 6=Sat). Today counts as 7 days ago. */
export function daysSinceWeekday(weekday, now = new Date()) {
  const today = new Date(now).getDay();
  let delta = (today - Number(weekday) + 7) % 7;
  if (delta === 0) delta = 7;
  return delta;
}

function matchDays(text, rows, locale) {
  const raw = String(text || '');
  for (const row of rows) {
    const m = raw.match(new RegExp(row.re, 'i'));
    if (!m) continue;
    if (Object.prototype.hasOwnProperty.call(row, 'days')) return row.days;
    if (row.n) {
      const n = coerceCount(m[row.n], locale);
      if (!Number.isFinite(n) || n <= 0) continue;
      return n * (row.mult || 1);
    }
    if (row.daysFrom) {
      const n = coerceCount(m[row.daysFrom], locale);
      if (!Number.isFinite(n) || n < 0) continue;
      return n;
    }
    if (row.weekdayFrom) {
      const wd = weekdayIndex(m[row.weekdayFrom], locale);
      if (wd == null) continue;
      return daysSinceWeekday(wd, row._now);
    }
  }
  return undefined;
}

/** Reminder interval in days, or null when none found. Numbers are computed here, not by a model. */
export function parseReminderDays(text, locale) {
  const v = matchDays(text, table('reminderWord', locale), locale);
  if (v == null || v === undefined) return null;
  return Math.min(3650, Math.max(1, Math.round(v)));
}

/**
 * Days ago for last-done, or null when the user said they don't remember.
 * `undefined` means the clause was absent.
 */
export function parseLastDoneDaysAgo(text, locale, now = new Date()) {
  const rows = table('lastDone', locale).map((row) => (
    row.weekdayFrom ? { ...row, _now: now } : row
  ));
  const raw = String(text || '');
  for (const row of rows) {
    const m = raw.match(new RegExp(row.re, 'i'));
    if (!m) continue;
    if (Object.prototype.hasOwnProperty.call(row, 'days')) return row.days;
    if (row.daysFrom) {
      const n = coerceCount(m[row.daysFrom], locale);
      if (!Number.isFinite(n) || n < 0) continue;
      return n;
    }
    if (row.weekdayFrom) {
      const wd = weekdayIndex(m[row.weekdayFrom], locale);
      if (wd == null) continue;
      return daysSinceWeekday(wd, now);
    }
  }
  return undefined;
}

export function lastDoneIsoFromDaysAgo(daysAgo, now = new Date()) {
  if (daysAgo == null) return null;
  const d = new Date(now);
  d.setDate(d.getDate() - Number(daysAgo));
  const cap = new Date(now).getTime();
  if (d.getTime() > cap) return new Date(now).toISOString();
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

export function stripNameExtras(text, locale) {
  return stripList(text, table('nameExtraStrip', locale));
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

function foldTense(s) {
  const map = PHRASES.tenseFold || {};
  let out = s;
  for (const [from, to] of Object.entries(map)) {
    out = out.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  }
  return out;
}

function stripParticles(s, locale) {
  let out = String(s || '');
  for (const re of table('nameParticles', locale)) {
    out = out.replace(new RegExp(re, 'gi'), ' ');
  }
  return out;
}

export function tidyName(text, locale) {
  let s = String(text || '');
  for (const ch of PHRASES.foldStrip || []) s = s.split(ch).join('');
  s = foldTense(s);
  s = stripParticles(s, locale);
  return s.replace(/[?!.]/g, ' ').replace(/\s+/g, ' ').trim();
}

export { table };
