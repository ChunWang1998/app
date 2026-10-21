import { sanitizeSnoozeDays } from '../data/snooze';
import { getLocale, resolveLocale, tLocale } from '../i18n';
import * as Localization from 'expo-localization';

export const MODE_INTERVAL = 'interval';
export const MODE_WEEK = 'week';
export const MODE_MONTH = 'month';

export const UNIT_DAY = 'd';
export const UNIT_WEEK = 'w';
export const UNIT_MONTH = 'm';
export const UNIT_YEAR = 'y';

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const MONTH_DAY_CHIPS = [1, 5, 10, 15, 20, 25, 28];
export const INTERVAL_DAY_CHIPS = [1, 7, 14, 30, 90];

export const UNIT_MAX = { d: 365, w: 52, m: 52, y: 10 };
/** Schema / persistence cap. Legacy reminderDays allowed 1–3650. */
export const UNIT_STORE_MAX = { d: 3650, w: 52, m: 52, y: 10 };
export const UNIT_DEFAULT_N = { d: 14, w: 1, m: 1, y: 1 };

export const DEFAULT_REMINDER_TIME = '09:00';
export const REMINDER_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function clampClockPart(n, max, fallback) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(0, v));
}

export function parseHm(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? DEFAULT_REMINDER_TIME));
  if (!m) return { h: 9, min: 0 };
  return { h: clampClockPart(m[1], 23, 9), min: clampClockPart(m[2], 59, 0) };
}

export function formatHm(h, min) {
  return `${String(clampClockPart(h, 23, 0)).padStart(2, '0')}:${String(clampClockPart(min, 59, 0)).padStart(2, '0')}`;
}

/**
 * Persist / migrate a stored clock time.
 * Missing → 09:00 (legacy implicit time). Out-of-range hour/minute are clamped.
 * Unparseable strings return null so import can reject them.
 */
export function sanitizeReminderTime(raw) {
  if (raw == null || raw === '') return DEFAULT_REMINDER_TIME;
  const s = String(raw).trim();
  if (REMINDER_TIME_RE.test(s)) return s;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  return formatHm(m[1], m[2]);
}

/** Strict import: padded HH:MM only. Omitted field is allowed (caller defaults). */
export function importedReminderTime(raw) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !REMINDER_TIME_RE.test(raw)) {
    const err = new Error('invalid reminderTime');
    err.code = 'INVALID_REMINDER_TIME';
    throw err;
  }
  return raw;
}

export function normalizeTime(time) {
  const { h, min } = parseHm(time);
  return formatHm(h, min);
}

export function applyTime(date, time) {
  const { h, min } = parseHm(time);
  const d = new Date(date);
  d.setHours(h, min, 0, 0);
  return d;
}

export function startOfLocalDay(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function clampMonthDay(year, monthIndex, day) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const n = Math.min(31, Math.max(1, Number(day) || 1));
  return Math.min(n, last);
}

export function clampN(n, unit) {
  const max = UNIT_STORE_MAX[unit] || UNIT_STORE_MAX.d;
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return UNIT_DEFAULT_N[unit] || 1;
  return Math.min(max, Math.max(1, v));
}

export function clampNUi(n, unit) {
  const max = unit === UNIT_DAY ? UNIT_STORE_MAX.d : (UNIT_MAX[unit] || UNIT_MAX.d);
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return UNIT_DEFAULT_N[unit] || 1;
  return Math.min(max, Math.max(1, v));
}

export function normalizeUnit(unit) {
  return UNIT_MAX[unit] ? unit : UNIT_DAY;
}

export function normalizeMode(mode) {
  if (mode === MODE_WEEK || mode === MODE_MONTH || mode === MODE_INTERVAL) return mode;
  return MODE_INTERVAL;
}

export function normalizeWeekdays(raw) {
  const set = new Set();
  if (Array.isArray(raw)) {
    for (const d of raw) {
      const n = Number(d);
      if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
    }
  }
  return WEEKDAY_ORDER.filter((d) => set.has(d));
}

function uniqueSortedWeekdays(days) {
  const list = normalizeWeekdays(days);
  return list.length ? list : [1];
}

export function lastAnchor(item) {
  const v = item?.lastDoneAt || item?.createdAt;
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? new Date(t) : null;
}

/** Add n local calendar days. DST-safe (uses Y/M/D, not 864e5). */
export function addCalendarDays(date, n) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + n,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function localElapsedDays(from, to) {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 864e5);
}

/** Add n calendar months, keeping the original day-of-month (clamped per target month). */
export function addCalendarMonths(date, n, keepDay = date.getDate()) {
  const targetMonth = date.getMonth() + n;
  const y = date.getFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const day = clampMonthDay(y, m, keepDay);
  return new Date(y, m, day, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

/** Add n calendar years, keeping the original day-of-month (Feb 29 → Feb 28 in common years). */
export function addCalendarYears(date, n, keepDay = date.getDate()) {
  const y = date.getFullYear() + n;
  const m = date.getMonth();
  const day = clampMonthDay(y, m, keepDay);
  return new Date(y, m, day, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

export function addInterval(from, n, unit) {
  const d = new Date(from);
  const count = Math.trunc(Number(n));
  if (!Number.isFinite(count)) return d;
  if (unit === UNIT_WEEK) return addCalendarDays(d, count * 7);
  if (unit === UNIT_MONTH) return addCalendarMonths(d, count, d.getDate());
  if (unit === UNIT_YEAR) return addCalendarYears(d, count, d.getDate());
  return addCalendarDays(d, count);
}

export function defaultReminderConfig() {
  return {
    enabled: false,
    mode: MODE_INTERVAL,
    n: 14,
    unit: UNIT_DAY,
    weekdays: [1],
    monthDay: 15,
    time: DEFAULT_REMINDER_TIME,
    snoozeEnabled: true,
    snoozeDays: 3,
  };
}

/**
 * Read a reminder config from a persisted activity.
 * Old rows with only `reminderDays` become interval / days.
 */
export function reminderConfigFromActivity(item) {
  const base = defaultReminderConfig();
  if (!item || typeof item !== 'object') return base;
  const time = sanitizeReminderTime(item.reminderTime) || DEFAULT_REMINDER_TIME;
  const snoozeEnabled = item.snoozeEnabled !== false;
  const snoozeDays = sanitizeSnoozeDays(item.snoozeDays);
  const weekdays = uniqueSortedWeekdays(item.reminderWeekdays);
  const monthDay = Math.min(31, Math.max(1, Math.floor(Number(item.reminderMonthDay)) || 15));
  const unit = normalizeUnit(item.reminderUnit);
  const n = clampN(item.reminderN ?? item.reminderDays ?? 14, item.reminderMode === MODE_INTERVAL ? unit : UNIT_DAY);

  if (item.reminderMode === MODE_WEEK) {
    const days = normalizeWeekdays(item.reminderWeekdays);
    return {
      ...base,
      enabled: days.length > 0,
      mode: MODE_WEEK,
      n,
      unit,
      weekdays: days.length ? days : [1],
      monthDay,
      time,
      snoozeEnabled,
      snoozeDays,
    };
  }
  if (item.reminderMode === MODE_MONTH) {
    return {
      ...base,
      enabled: true,
      mode: MODE_MONTH,
      n,
      unit,
      weekdays,
      monthDay,
      time,
      snoozeEnabled,
      snoozeDays,
    };
  }
  if (item.reminderMode === MODE_INTERVAL) {
    return {
      ...base,
      enabled: true,
      mode: MODE_INTERVAL,
      n: clampN(item.reminderN ?? item.reminderDays ?? 14, unit),
      unit,
      weekdays,
      monthDay,
      time,
      snoozeEnabled,
      snoozeDays,
    };
  }
  if (item.reminderDays) {
    const days = Math.floor(Number(item.reminderDays));
    const valid = Number.isInteger(days) && days > 0;
    return {
      ...base,
      enabled: valid,
      mode: MODE_INTERVAL,
      n: valid ? clampN(days, UNIT_DAY) : 14,
      unit: UNIT_DAY,
      weekdays,
      monthDay,
      time,
      snoozeEnabled,
      snoozeDays,
    };
  }
  return {
    ...base,
    n,
    unit,
    weekdays,
    monthDay,
    time,
    snoozeEnabled,
    snoozeDays,
    enabled: false,
  };
}

/** Turn a draft/off config on so More… from the add screen opens with reminder enabled. */
export function ensureReminderEnabled(cfg) {
  const c = { ...defaultReminderConfig(), ...(cfg || {}) };
  if (c.enabled) return c;
  return {
    ...c,
    enabled: true,
    mode: normalizeMode(c.mode),
    unit: normalizeUnit(c.unit),
    n: clampN(c.n, normalizeMode(c.mode) === MODE_INTERVAL ? normalizeUnit(c.unit) : UNIT_DAY),
  };
}

export function reminderFieldsFromConfig(cfg) {
  const c = { ...defaultReminderConfig(), ...(cfg || {}) };
  c.mode = normalizeMode(c.mode);
  c.unit = normalizeUnit(c.unit);
  c.n = clampN(c.n, c.mode === MODE_INTERVAL ? c.unit : UNIT_DAY);
  c.weekdays = uniqueSortedWeekdays(c.weekdays);
  c.monthDay = Math.min(31, Math.max(1, Math.floor(Number(c.monthDay)) || 15));
  c.time = normalizeTime(c.time);
  c.snoozeEnabled = c.snoozeEnabled !== false;
  c.snoozeDays = sanitizeSnoozeDays(c.snoozeDays);
  if (!c.enabled) {
    return {
      reminderDays: null,
      reminderMode: null,
      reminderUnit: c.unit,
      reminderN: c.n,
      reminderWeekdays: c.weekdays,
      reminderMonthDay: c.monthDay,
      reminderTime: c.time,
      snoozeEnabled: c.snoozeEnabled,
      snoozeDays: c.snoozeDays,
    };
  }
  const reminderDays = c.mode === MODE_INTERVAL && c.unit === UNIT_DAY ? c.n : null;
  return {
    reminderDays,
    reminderMode: c.mode,
    reminderUnit: c.unit,
    reminderN: c.n,
    reminderWeekdays: c.weekdays,
    reminderMonthDay: c.monthDay,
    reminderTime: c.time,
    snoozeEnabled: c.snoozeEnabled,
    snoozeDays: c.snoozeDays,
  };
}

export function hasReminder(item) {
  return reminderConfigFromActivity(item).enabled;
}

function nextWeeklyAfter(fromExclusive, weekdays, time) {
  const days = normalizeWeekdays(weekdays);
  if (!days.length) return null;
  const start = startOfLocalDay(fromExclusive);
  start.setDate(start.getDate() + 1);
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (days.includes(d.getDay())) return applyTime(d, time);
  }
  return null;
}

function monthlyOn(year, monthIndex, day, time) {
  const date = new Date(year, monthIndex, clampMonthDay(year, monthIndex, day));
  return applyTime(date, time);
}

function nextMonthlyAfter(fromExclusive, day, time) {
  const from = new Date(fromExclusive);
  const fromDay = startOfLocalDay(from);
  let y = fromDay.getFullYear();
  let m = fromDay.getMonth();
  let candidate = monthlyOn(y, m, day, time);
  if (startOfLocalDay(candidate).getTime() <= fromDay.getTime()) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    candidate = monthlyOn(y, m, day, time);
  }
  return candidate;
}

/** Next matching weekday strictly after `afterDate`, including today if the time is still upcoming. */
function nextWeeklyOnOrAfter(afterDate, weekdays, time) {
  const same = applyTime(afterDate, time);
  const days = normalizeWeekdays(weekdays);
  if (days.includes(new Date(afterDate).getDay()) && same.getTime() > afterDate.getTime()) return same;
  return nextWeeklyAfter(afterDate, days, time);
}

/** Next month-day strictly after `afterDate`, including this month if the time is still upcoming. */
function nextMonthlyOnOrAfter(afterDate, day, time) {
  const from = new Date(afterDate);
  const candidate = monthlyOn(from.getFullYear(), from.getMonth(), day, time);
  if (candidate.getTime() > afterDate.getTime()) return candidate;
  return nextMonthlyAfter(afterDate, day, time);
}

function nextIntervalAfter(anchor, n, unit, time, afterDate) {
  const after = afterDate.getTime();
  const period = Math.max(1, Math.trunc(Number(n)) || 1);
  const keepDay = anchor.getDate();
  if (unit === UNIT_DAY || unit === UNIT_WEEK) {
    const periodDays = unit === UNIT_WEEK ? period * 7 : period;
    const elapsed = localElapsedDays(anchor, afterDate);
    let k = Math.floor(elapsed / periodDays);
    if (k < 1) k = 1;
    const occAt = (kk) => applyTime(addCalendarDays(anchor, kk * periodDays), time);
    while (occAt(k).getTime() <= after) k += 1;
    while (k > 1 && occAt(k - 1).getTime() > after) k -= 1;
    return occAt(k);
  }
  if (unit === UNIT_YEAR) {
    const afterDt = new Date(after);
    let k = Math.floor((afterDt.getFullYear() - anchor.getFullYear()) / period);
    if (k < 1) k = 1;
    const occAt = (kk) => applyTime(addCalendarYears(anchor, kk * period, keepDay), time);
    while (occAt(k).getTime() <= after) k += 1;
    while (k > 1 && occAt(k - 1).getTime() > after) k -= 1;
    return occAt(k);
  }
  const afterDt = new Date(after);
  const elapsedMonths = (afterDt.getFullYear() - anchor.getFullYear()) * 12 + (afterDt.getMonth() - anchor.getMonth());
  let k = Math.floor(elapsedMonths / period);
  if (k < 1) k = 1;
  const occAt = (kk) => applyTime(addCalendarMonths(anchor, kk * period, keepDay), time);
  while (occAt(k).getTime() <= after) k += 1;
  while (k > 1 && occAt(k - 1).getTime() > after) k -= 1;
  return occAt(k);
}

/**
 * First due instant after the last-done (or created) anchor.
 * Weekly/monthly skip the last-done local day so 「剛剛做了」 jumps to the next match.
 * May be in the past (overdue).
 */
export function firstDueInstant(item, cfg = reminderConfigFromActivity(item), now = Date.now()) {
  if (!cfg?.enabled) return null;
  const time = cfg.time || DEFAULT_REMINDER_TIME;
  const lastDone = item?.lastDoneAt ? new Date(item.lastDoneAt) : null;
  const created = item?.createdAt ? new Date(item.createdAt) : null;
  const skipDayAnchor = lastDone && Number.isFinite(lastDone.getTime()) ? lastDone : null;
  const createdAnchor = created && Number.isFinite(created.getTime()) ? created : null;

  if (cfg.mode === MODE_WEEK) {
    const days = normalizeWeekdays(cfg.weekdays);
    if (!days.length) return null;
    if (skipDayAnchor) return nextWeeklyAfter(skipDayAnchor, days, time);
    if (createdAnchor) {
      const same = applyTime(createdAnchor, time);
      if (days.includes(createdAnchor.getDay()) && same.getTime() > createdAnchor.getTime()) return same;
      return nextWeeklyAfter(createdAnchor, days, time);
    }
    const nowDate = new Date(now);
    const same = applyTime(nowDate, time);
    if (days.includes(nowDate.getDay()) && same.getTime() > now) return same;
    return nextWeeklyAfter(nowDate, days, time);
  }

  if (cfg.mode === MODE_MONTH) {
    const day = cfg.monthDay;
    if (skipDayAnchor) return nextMonthlyAfter(skipDayAnchor, day, time);
    if (createdAnchor) {
      const same = monthlyOn(createdAnchor.getFullYear(), createdAnchor.getMonth(), day, time);
      if (startOfLocalDay(same).getTime() >= startOfLocalDay(createdAnchor).getTime() && same.getTime() > createdAnchor.getTime()) {
        return same;
      }
      return nextMonthlyAfter(createdAnchor, day, time);
    }
    const nowDate = new Date(now);
    const same = monthlyOn(nowDate.getFullYear(), nowDate.getMonth(), day, time);
    if (same.getTime() > now) return same;
    return nextMonthlyAfter(nowDate, day, time);
  }

  const anchor = skipDayAnchor || createdAnchor;
  if (!anchor) return null;
  const due = addInterval(anchor, cfg.n, cfg.unit);
  return applyTime(due, time);
}

/** Next regular occurrence strictly after `afterDate`. */
export function nextRegularAfter(item, cfg, afterDate) {
  if (!cfg?.enabled || !afterDate) return null;
  const time = cfg.time || DEFAULT_REMINDER_TIME;
  if (cfg.mode === MODE_WEEK) return nextWeeklyAfter(afterDate, cfg.weekdays, time);
  if (cfg.mode === MODE_MONTH) return nextMonthlyAfter(afterDate, cfg.monthDay, time);
  const anchor = lastAnchor(item);
  if (!anchor) return null;
  return nextIntervalAfter(anchor, cfg.n, cfg.unit, time, afterDate);
}

/**
 * Notification fire time: upcoming first due, or snooze from that due,
 * never later than the next regular occurrence.
 */
export function nextFireDate(item, now = Date.now(), cfg = reminderConfigFromActivity(item)) {
  if (!cfg?.enabled || item?.deletedAt) return null;
  const statusDue = firstDueInstant(item, cfg, now);
  if (!statusDue) return null;
  const due = (cfg.mode === MODE_INTERVAL && cfg.unit === UNIT_DAY)
    ? applyTime(statusDue, cfg.time)
    : statusDue;
  if (due.getTime() > now) return due;
  const nowDate = new Date(now);
  let cap = null;
  if (cfg.mode === MODE_WEEK) {
    cap = nextWeeklyOnOrAfter(nowDate, cfg.weekdays, cfg.time);
  } else if (cfg.mode === MODE_MONTH) {
    cap = nextMonthlyOnOrAfter(nowDate, cfg.monthDay, cfg.time);
  } else {
    const anchor = lastAnchor(item);
    cap = anchor ? nextIntervalAfter(anchor, cfg.n, cfg.unit, cfg.time, nowDate) : null;
  }
  const { h, min } = parseHm(cfg.time);
  if (cfg.snoozeEnabled !== false) {
    const days = sanitizeSnoozeDays(cfg.snoozeDays);
    const stepMs = days * 864e5;
    let k = Math.ceil((now - due.getTime()) / stepMs);
    if (!Number.isFinite(k) || k < 1) k = 1;
    const when = new Date(due);
    when.setDate(when.getDate() + k * days);
    when.setHours(h, min, 0, 0);
    for (let i = 0; i < 4 && when.getTime() <= now; i += 1) {
      when.setDate(when.getDate() + days);
      when.setHours(h, min, 0, 0);
    }
    if (cap && when.getTime() >= cap.getTime()) return cap;
    return when;
  }
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(h, min, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  if (cap && cap.getTime() < next.getTime()) return cap;
  return next;
}

export function uses24HourClock() {
  try {
    const cals = Localization.getCalendars?.();
    if (Array.isArray(cals) && typeof cals[0]?.uses24hourClock === 'boolean') {
      return cals[0].uses24hourClock;
    }
  } catch {
    // fall through
  }
  return true;
}

export function formatClock(h, min, locale) {
  const hh = Math.min(23, Math.max(0, Number(h) || 0));
  const mm = Math.min(59, Math.max(0, Number(min) || 0));
  const loc = resolveLocale(locale || getLocale());
  if (uses24HourClock()) return formatHm(hh, mm);
  const am = hh < 12;
  let hr = hh % 12;
  if (hr === 0) hr = 12;
  const suffix = tLocale(loc, am ? 'reminder.am' : 'reminder.pm');
  return `${hr}:${String(mm).padStart(2, '0')} ${suffix}`;
}

function englishOrdinal(n, locale) {
  if (resolveLocale(locale) !== 'en') return n;
  const v = n % 100;
  const s = ['th', 'st', 'nd', 'rd'];
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function formatClockFromTime(time, locale) {
  const { h, min } = parseHm(time);
  return formatClock(h, min, locale);
}

function weekdayName(day, locale) {
  return tLocale(locale, `reminder.wdName${day}`);
}

export function formatWeekdayList(days, locale) {
  const loc = resolveLocale(locale || getLocale());
  const sorted = WEEKDAY_ORDER.filter((d) => days.includes(d));
  const parts = sorted.map((d) => weekdayName(d, loc));
  return parts.join(tLocale(loc, 'reminder.listJoin'));
}

export function formatWeekdayHint(days, locale) {
  const loc = resolveLocale(locale || getLocale());
  const sorted = WEEKDAY_ORDER.filter((d) => days.includes(d));
  if (!sorted.length) return tLocale(loc, 'reminder.pickWeekday');
  const parts = sorted.map((d) => tLocale(loc, 'reminder.nextWd', { d: weekdayName(d, loc) }));
  return parts.join(tLocale(loc, 'reminder.hintJoin'));
}

export function formatReminderLabel(itemOrCfg, locale) {
  const loc = resolveLocale(locale || getLocale());
  const cfg = itemOrCfg && itemOrCfg.mode
    ? itemOrCfg
    : reminderConfigFromActivity(itemOrCfg);
  if (!cfg?.enabled) return tLocale(loc, 'detail.noReminder');
  if (cfg.mode === MODE_WEEK) {
    const days = formatWeekdayList(cfg.weekdays, loc);
    return tLocale(loc, 'reminder.labelWeekly', { days });
  }
  if (cfg.mode === MODE_MONTH) {
    return tLocale(loc, 'reminder.labelMonthly', { n: englishOrdinal(cfg.monthDay, loc) });
  }
  const n = cfg.n;
  if (cfg.unit === UNIT_WEEK) {
    if (n === 1) return tLocale(loc, 'reminder.weekly');
    return tLocale(loc, 'reminder.labelIntervalWeek', { n });
  }
  if (cfg.unit === UNIT_MONTH) {
    if (n === 1) return tLocale(loc, 'reminder.monthly');
    return tLocale(loc, 'reminder.labelIntervalMonth', { n });
  }
  if (cfg.unit === UNIT_YEAR) {
    if (n === 1) return tLocale(loc, 'reminder.yearly');
    return tLocale(loc, 'reminder.labelIntervalYear', { n });
  }
  if (n === 1) return tLocale(loc, 'reminder.daily');
  if (n === 7) return tLocale(loc, 'reminder.weekly');
  if (n === 14) return tLocale(loc, 'reminder.twoWeeks');
  if (n === 30) return tLocale(loc, 'reminder.monthly');
  if (n === 90) return tLocale(loc, 'reminder.threeMonths');
  return tLocale(loc, 'reminder.labelIntervalDay', { n });
}

export function formatNextOccurrence(date, locale, now = Date.now()) {
  if (!date || Number.isNaN(new Date(date).getTime())) return '—';
  const loc = resolveLocale(locale || getLocale());
  const d = new Date(date);
  const nowDate = new Date(now);
  const yearPrefix = d.getFullYear() !== nowDate.getFullYear() ? `${d.getFullYear()}/` : '';
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const wd = tLocale(loc, 'reminder.nextWd', { d: weekdayName(d.getDay(), loc) });
  const time = formatClock(d.getHours(), d.getMinutes(), loc);
  return tLocale(loc, 'reminder.nextValue', { date: `${yearPrefix}${md}`, wd, time });
}

export function intervalUnitLabel(unit, locale) {
  const loc = resolveLocale(locale || getLocale());
  if (unit === UNIT_WEEK) return tLocale(loc, 'reminder.everyNWeeks');
  if (unit === UNIT_MONTH) return tLocale(loc, 'reminder.everyNMonths');
  if (unit === UNIT_YEAR) return tLocale(loc, 'reminder.everyNYears');
  return tLocale(loc, 'reminder.everyNDays');
}

export function chipDaysFromConfig(cfg) {
  if (!cfg?.enabled) return null;
  if (cfg.mode === MODE_INTERVAL && cfg.unit === UNIT_DAY) return cfg.n;
  return 'more';
}

export function configFromChipDays(days, previous) {
  const prev = { ...defaultReminderConfig(), ...(previous || {}) };
  if (days == null) return { ...prev, enabled: false };
  return {
    ...prev,
    enabled: true,
    mode: MODE_INTERVAL,
    unit: UNIT_DAY,
    n: clampN(days, UNIT_DAY),
  };
}

/** Migrate a raw activity in place-style: fill reminderMode from reminderDays. */
export function migrateReminderFields(raw) {
  const cfg = reminderConfigFromActivity(raw);
  return reminderFieldsFromConfig(cfg);
}
