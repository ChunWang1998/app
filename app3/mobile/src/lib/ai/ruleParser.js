import { resolveLocale } from '../../i18n';
import { suggestReminderDays } from '../suggestReminder';
import PHRASES from './phrases.json';
import {
  parseReminderDays,
  parseLastDoneDaysAgo,
  lastDoneIsoFromDaysAgo,
  stripLastDone,
  stripReminder,
  stripPrefixes,
  tidyName,
  table,
} from './relative';

function hasPattern(text, patterns) {
  const raw = String(text || '');
  for (const p of patterns || []) {
    if (new RegExp(p, 'i').test(raw)) return true;
  }
  return false;
}

function captureName(text, patterns) {
  const raw = String(text || '').trim();
  for (const p of patterns || []) {
    const m = raw.match(new RegExp(p.re, 'i'));
    if (m) return tidyName(m[p.name] || '');
  }
  return '';
}

function looksLikeQueryWeek(text, locale) {
  return hasPattern(text, table('queryWeek', locale));
}

function extractCreateName(text, locale) {
  let s = String(text || '');
  s = stripLastDone(s, locale);
  s = stripReminder(s, locale);
  s = stripPrefixes(s, table('createPrefixes', locale));
  return tidyName(s);
}

function extractLogName(text, locale) {
  let s = stripPrefixes(String(text || ''), table('logPrefixes', locale));
  for (const re of table('logSuffixes', locale)) {
    s = s.replace(new RegExp(re, 'i'), ' ');
  }
  return tidyName(s);
}

function startsWithLogPrefix(text, locale) {
  const s = String(text || '').trim();
  return stripPrefixes(s, table('logPrefixes', locale)) !== s;
}

function buildCreate(text, locale, now) {
  const name = extractCreateName(text, locale);
  if (!name) return null;
  const lastDoneDaysAgo = parseLastDoneDaysAgo(text, locale);
  const reminderDays = parseReminderDays(text, locale) ?? suggestReminderDays(name);
  const lastDoneAt = lastDoneDaysAgo === undefined
    ? new Date(now).toISOString()
    : lastDoneIsoFromDaysAgo(lastDoneDaysAgo, now);
  return {
    type: 'create',
    name,
    lastDoneDaysAgo: lastDoneDaysAgo === undefined ? 0 : lastDoneDaysAgo,
    lastDoneAt,
    reminderDays,
  };
}

/**
 * Offline rule parser. Dates and intervals are computed in JS.
 * @returns {{ type: string, name?: string, lastDoneDaysAgo?: number|null, lastDoneAt?: string|null, reminderDays?: number|null, source: 'rules' }}
 */
export function parseRules(text, { locale, now = new Date() } = {}) {
  const loc = resolveLocale(locale);
  const raw = String(text || '').trim();
  if (!raw) return { type: 'unknown', source: 'rules' };

  if (looksLikeQueryWeek(raw, loc)) {
    return { type: 'query_week', source: 'rules' };
  }

  const sinceName = captureName(raw, table('querySince', loc));
  if (sinceName) {
    return { type: 'query_since', name: sinceName, source: 'rules' };
  }

  const logName = extractLogName(raw, loc);
  const hadLogPrefix = startsWithLogPrefix(raw, loc);
  const hadLogSuffix = hasPattern(raw, table('logSuffixes', loc));
  if ((hadLogPrefix || hadLogSuffix) && logName) {
    return { type: 'log', name: logName, source: 'rules' };
  }

  const created = buildCreate(raw, loc, now);
  if (created) return { ...created, source: 'rules' };
  return { type: 'unknown', source: 'rules' };
}

/** Fill lastDoneAt / reminderDays from phrases. Always compute numbers in JS. */
export function hydrateIntent(partial, { locale, now = new Date(), text = '' } = {}) {
  const loc = resolveLocale(locale);
  const type = normalizeType(partial?.type || partial?.kind);
  const name = tidyName(partial?.name || '');
  if (type === 'query_week') return { type, source: partial?.source || 'fm' };
  if (type === 'unknown' || !type) return { type: 'unknown', source: partial?.source || 'fm' };
  if (type === 'log' || type === 'query_since') {
    return { type, name, source: partial?.source || 'fm' };
  }
  const phraseLast = parseLastDoneDaysAgo(partial?.lastDonePhrase || '', loc);
  const textLast = parseLastDoneDaysAgo(text, loc);
  const lastDoneDaysAgo = phraseLast !== undefined ? phraseLast : textLast;
  const phraseRem = parseReminderDays(partial?.reminderPhrase || '', loc);
  const textRem = parseReminderDays(text, loc);
  const reminderDays = phraseRem ?? textRem ?? suggestReminderDays(name);
  const lastDoneAt = lastDoneDaysAgo === undefined
    ? new Date(now).toISOString()
    : lastDoneIsoFromDaysAgo(lastDoneDaysAgo, now);
  return {
    type: 'create',
    name,
    lastDoneDaysAgo: lastDoneDaysAgo === undefined ? 0 : lastDoneDaysAgo,
    lastDoneAt,
    reminderDays,
    source: partial?.source || 'fm',
  };
}

export function normalizeType(kind) {
  const k = String(kind || '').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (k === 'create') return 'create';
  if (k === 'log') return 'log';
  if (k === 'query_week' || k === 'queryweek' || k === 'week') return 'query_week';
  if (k === 'query_since' || k === 'querysince' || k === 'since') return 'query_since';
  return 'unknown';
}
