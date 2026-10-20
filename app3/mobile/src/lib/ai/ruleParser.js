import { resolveLocale } from '../../i18n';
import { suggestReminderDays } from '../suggestReminder';
import {
  parseReminderDays,
  parseLastDoneDaysAgo,
  lastDoneIsoFromDaysAgo,
  stripLastDone,
  stripReminder,
  stripNameExtras,
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

function captureName(text, patterns, locale) {
  const raw = String(text || '').trim();
  for (const p of patterns || []) {
    const m = raw.match(new RegExp(p.re, 'i'));
    if (m) return tidyName(m[p.name] || '', locale);
  }
  return '';
}

function looksLikeQueryWeek(text, locale) {
  return hasPattern(text, table('queryWeek', locale));
}

function looksLikeQueryToday(text, locale) {
  return hasPattern(text, table('queryToday', locale));
}

function extractCreateName(text, locale) {
  let s = String(text || '');
  s = stripLastDone(s, locale);
  s = stripReminder(s, locale);
  s = stripNameExtras(s, locale);
  s = stripPrefixes(s, table('createPrefixes', locale));
  return tidyName(s, locale);
}

function extractLogName(text, locale) {
  let s = stripLastDone(String(text || ''), locale);
  s = stripPrefixes(s, table('logPrefixes', locale));
  s = stripPrefixes(s, table('logNamePrefixes', locale));
  for (const re of table('logSuffixes', locale)) {
    s = s.replace(new RegExp(re, 'i'), ' ');
  }
  return tidyName(s, locale);
}

function startsWithLogPrefix(text, locale) {
  const s = String(text || '').trim();
  return stripPrefixes(s, table('logPrefixes', locale)) !== s;
}

function startsWithCreatePrefix(text, locale) {
  const s = String(text || '').trim();
  return stripPrefixes(s, table('createPrefixes', locale)) !== s;
}

function looksLikeLog(text, locale) {
  if (startsWithLogPrefix(text, locale)) return true;
  if (hasPattern(text, table('logSuffixes', locale))) return true;
  if (hasPattern(text, table('logPast', locale))) return true;
  return false;
}

function looksLikeCreateCue(text, locale) {
  if (startsWithCreatePrefix(text, locale)) return true;
  if (parseReminderDays(text, locale) != null) return true;
  return false;
}

function buildCreate(text, locale, now) {
  const name = extractCreateName(text, locale);
  if (!name) return null;
  const lastDoneDaysAgo = parseLastDoneDaysAgo(text, locale, now);
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

function buildLog(text, locale, now) {
  const name = extractLogName(text, locale);
  if (!name) return null;
  const lastDoneDaysAgo = parseLastDoneDaysAgo(text, locale, now);
  const lastDoneAt = lastDoneDaysAgo === undefined
    ? new Date(now).toISOString()
    : lastDoneIsoFromDaysAgo(lastDoneDaysAgo, now);
  return {
    type: 'log',
    name,
    lastDoneDaysAgo: lastDoneDaysAgo === undefined ? 0 : lastDoneDaysAgo,
    lastDoneAt,
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

  if (looksLikeQueryToday(raw, loc)) {
    return { type: 'query_today', source: 'rules' };
  }

  if (looksLikeQueryWeek(raw, loc)) {
    return { type: 'query_week', source: 'rules' };
  }

  const sinceName = captureName(raw, table('querySince', loc), loc);
  if (sinceName) {
    return { type: 'query_since', name: sinceName, source: 'rules' };
  }

  if (looksLikeLog(raw, loc) && !looksLikeCreateCue(raw, loc)) {
    const logged = buildLog(raw, loc, now);
    if (logged) return { ...logged, source: 'rules' };
  }

  const created = buildCreate(raw, loc, now);
  if (created) return { ...created, source: 'rules' };
  return { type: 'unknown', source: 'rules' };
}

/** Fill lastDoneAt / reminderDays from phrases. Always compute numbers in JS. */
export function hydrateIntent(partial, { locale, now = new Date(), text = '' } = {}) {
  const loc = resolveLocale(locale);
  const type = normalizeType(partial?.type || partial?.kind);
  const name = tidyName(partial?.name || '', loc);
  if (type === 'query_week' || type === 'query_today') {
    return { type, source: partial?.source || 'fm' };
  }
  if (type === 'unknown' || !type) return { type: 'unknown', source: partial?.source || 'fm' };
  if (type === 'query_since') {
    return { type, name, source: partial?.source || 'fm' };
  }
  if (type === 'log') {
    const lastDoneDaysAgo = parseLastDoneDaysAgo(partial?.lastDonePhrase || text, loc, now);
    const lastDoneAt = lastDoneDaysAgo === undefined
      ? new Date(now).toISOString()
      : lastDoneIsoFromDaysAgo(lastDoneDaysAgo, now);
    return {
      type,
      name,
      lastDoneDaysAgo: lastDoneDaysAgo === undefined ? 0 : lastDoneDaysAgo,
      lastDoneAt,
      source: partial?.source || 'fm',
    };
  }
  const phraseLast = parseLastDoneDaysAgo(partial?.lastDonePhrase || '', loc, now);
  const textLast = parseLastDoneDaysAgo(text, loc, now);
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
  if (k === 'query_today' || k === 'querytoday' || k === 'due_today') return 'query_today';
  if (k === 'query_since' || k === 'querysince' || k === 'since') return 'query_since';
  return 'unknown';
}
