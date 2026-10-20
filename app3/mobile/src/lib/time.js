import { getLocale, resolveLocale, t, tLocale } from '../i18n';
import {
  hasReminder,
  firstDueInstant,
  reminderConfigFromActivity,
  lastAnchor,
  MODE_WEEK,
  MODE_MONTH,
  UNIT_DAY,
} from './reminderSchedule';

function unitLabel(key, locale) {
  return locale ? tLocale(locale, key) : t(key);
}

const DAY = 864e5;
const H = 36e5;
const MIN = 60e3;

export function formatSpan(ms, locale) {
  const u = (key) => unitLabel(key, locale);
  if (!Number.isFinite(ms) || ms < MIN) return `0\u2009${u('time.min')}`;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / H);
  const m = Math.floor((ms % H) / MIN);
  if (d >= 30) {
    const mo = Math.floor(d / 30);
    const dd = d % 30;
    return `${mo}\u2009${u('time.month')}${dd ? `\u2009${dd}\u2009${u('time.day')}` : ''}`;
  }
  if (d >= 1) return `${d}\u2009${u('time.day')}${h ? `\u2009${h}\u2009${u('time.hour')}` : ''}`;
  if (h >= 1) return `${h}\u2009${u('time.hour')}${m ? `\u2009${m}\u2009${u('time.min')}` : ''}`;
  return `${m}\u2009${u('time.minute')}`;
}

/** Split span into up to `n` number/unit pairs for hero numerals. */
export function formatSpanParts(ms, n = 2, locale) {
  const u = (key) => unitLabel(key, locale);
  if (!Number.isFinite(ms) || ms < MIN) return [{ n: 0, unit: u('time.min') }];
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / H);
  const m = Math.floor((ms % H) / MIN);
  let parts;
  if (d >= 30) {
    const mo = Math.floor(d / 30);
    const dd = d % 30;
    parts = [{ n: mo, unit: u('time.month') }, ...(dd ? [{ n: dd, unit: u('time.day') }] : [])];
  } else if (d >= 1) {
    parts = [{ n: d, unit: u('time.day') }, ...(h ? [{ n: h, unit: u('time.hour') }] : [])];
  } else if (h >= 1) {
    parts = [{ n: h, unit: u('time.hour') }, ...(m ? [{ n: m, unit: u('time.min') }] : [])];
  } else {
    parts = [{ n: m, unit: u('time.minute') }];
  }
  return parts.slice(0, n);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateShort(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function intlTag(tag) {
  if (tag === 'de') return 'de-DE';
  if (tag === 'fr') return 'fr-FR';
  if (tag === 'zh-Hant') return 'zh-Hant';
  if (tag === 'ja') return 'ja-JP';
  return 'en';
}

export function formatLastDoneDate(ts, locale) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const tag = resolveLocale(locale || getLocale());
  if (tag === 'de' || tag === 'fr') {
    try {
      return new Intl.DateTimeFormat(intlTag(tag), { month: 'short', day: 'numeric' }).format(d);
    } catch {
      return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
    }
  }
  if (tag === 'en') return `${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

/**
 * Local calendar days from `from` to `to` (local midnights).
 * Same DST-safe rule as 「N 天前」 / "N days ago": round absorbs 23h/25h days.
 */
export function localCalendarDays(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / DAY);
}

export function formatLastDoneRelative(ts, now = Date.now(), locale) {
  if (!ts) return '';
  const t0 = new Date(ts).getTime();
  if (Number.isNaN(t0)) return '';
  const days = Math.max(0, localCalendarDays(t0, now));
  const loc = locale || getLocale();
  if (days <= 0) return tLocale(loc, 'common.today');
  if (days === 1) return tLocale(loc, 'common.yesterday');
  const tag = resolveLocale(loc);
  if (tag === 'de' || tag === 'fr') {
    try {
      return new Intl.RelativeTimeFormat(tag, { numeric: 'always' }).format(-days, 'day');
    } catch {
      return tLocale(loc, 'common.daysAgo', { n: days });
    }
  }
  return tLocale(loc, 'common.daysAgo', { n: days });
}

/** One-line list subtitle, e.g. "3 days ago · Oct 11" / "3 天前 · 10/11". */
export function formatLastDoneShort(ts, now = Date.now(), locale) {
  if (!ts) return '';
  const loc = locale || getLocale();
  return `${formatLastDoneRelative(ts, now, loc)} \u00b7 ${formatLastDoneDate(ts, loc)}`;
}

/** e.g. "3 days ago · Last done Oct 11" */
export function formatLastDoneLine(ts, now = Date.now(), locale) {
  if (!ts) return '';
  const loc = locale || getLocale();
  return tLocale(loc, 'time.lastDoneLine', {
    relative: formatLastDoneRelative(ts, now, loc),
    date: formatLastDoneDate(ts, loc),
  });
}

export function dueInMs(item, now = Date.now()) {
  if (!hasReminder(item)) return Infinity;
  const due = firstDueInstant(item, reminderConfigFromActivity(item), now);
  if (!due) return Infinity;
  return due.getTime() - now;
}

export function progressRatio(item, now = Date.now()) {
  if (!hasReminder(item)) return 0;
  const last = lastAnchor(item);
  if (!last) return 0;
  const due = firstDueInstant(item, reminderConfigFromActivity(item), now);
  if (!due) return 0;
  const span = due.getTime() - last.getTime();
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now - last.getTime()) / span));
}

export function dueClass(due) {
  if (due < 0) return 'od';
  if (due < 2 * DAY) return 'soon';
  return '';
}

export function elapsedMs(item, now = Date.now()) {
  if (!item?.lastDoneAt) return null;
  const t = new Date(item.lastDoneAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, now - t);
}

/**
 * Detail-screen unit precision from the item's reminder.
 *
 * fine — hours and minutes are allowed:
 *   interval mode + day unit + n === 1 (daily), or any interval shorter than one day.
 * coarse — calendar days, then weeks / months / years (no hours/minutes):
 *   no reminder; weekly / monthly modes; interval ≥ 1 week
 *   (2–6 day intervals stay coarse: still a calendar-day cadence).
 *
 * Coarse counts local midnights via localCalendarDays, same as "N days ago".
 */
export function detailSpanPrecision(item) {
  const cfg = reminderConfigFromActivity(item);
  if (!cfg.enabled) return 'coarse';
  if (cfg.mode === MODE_WEEK || cfg.mode === MODE_MONTH) return 'coarse';
  if (cfg.unit !== UNIT_DAY) return 'coarse';
  if (cfg.n <= 1) return 'fine';
  return 'coarse';
}

function formatCoarseDayParts(days, n = 2, locale) {
  const u = (key) => unitLabel(key, locale);
  const d = Math.max(0, Math.floor(Number(days) || 0));
  if (d < 1) return [{ n: 0, unit: u('time.day') }];
  let parts;
  if (d >= 365) {
    const y = Math.floor(d / 365);
    const rem = d % 365;
    parts = [{ n: y, unit: u('time.year') }, ...(rem ? [{ n: rem, unit: u('time.day') }] : [])];
  } else if (d >= 30) {
    const mo = Math.floor(d / 30);
    const dd = d % 30;
    parts = [{ n: mo, unit: u('time.month') }, ...(dd ? [{ n: dd, unit: u('time.day') }] : [])];
  } else if (d >= 7) {
    const w = Math.floor(d / 7);
    const dd = d % 7;
    parts = [{ n: w, unit: u('time.week') }, ...(dd ? [{ n: dd, unit: u('time.day') }] : [])];
  } else {
    parts = [{ n: d, unit: u('time.day') }];
  }
  return parts.slice(0, n);
}

function joinSpanParts(parts) {
  return parts.map((p) => `${p.n}\u2009${p.unit}`).join('');
}

/**
 * Home remaining / overdue: calendar days only (never hours or minutes).
 * Less than one day remaining reads as “today”.
 */
export function formatHomeCountdown(dueMs, now = Date.now(), locale) {
  if (!Number.isFinite(dueMs)) return '';
  const loc = locale || getLocale();
  const at = now + dueMs;
  if (dueMs < 0) {
    const days = Math.max(1, localCalendarDays(at, now));
    return joinSpanParts(formatCoarseDayParts(days, 2, loc));
  }
  if (dueMs < DAY || localCalendarDays(now, at) <= 0) {
    return tLocale(resolveLocale(loc), 'common.today');
  }
  const days = Math.max(1, localCalendarDays(now, at));
  return joinSpanParts(formatCoarseDayParts(days, 2, loc));
}

/** Format a span on the detail screen using the item's reminder precision. */
export function formatDetailSpanParts(item, fromTs, toTs, n = 2, locale) {
  if (detailSpanPrecision(item) === 'fine') {
    const ms = Math.abs(new Date(toTs).getTime() - new Date(fromTs).getTime());
    return formatSpanParts(ms, n, locale);
  }
  return formatCoarseDayParts(Math.abs(localCalendarDays(fromTs, toTs)), n, locale);
}

export function formatDetailSpan(item, fromTs, toTs, locale) {
  return joinSpanParts(formatDetailSpanParts(item, fromTs, toTs, 2, locale));
}

/**
 * Large elapsed count: calendar-same-day uses localized “Today”
 * instead of “0 days”. Daily (fine) reminders still show hours.
 */
export function isDetailHeroToday(item, now = Date.now()) {
  if (!item?.lastDoneAt) return false;
  if (localCalendarDays(item.lastDoneAt, now) !== 0) return false;
  return detailSpanPrecision(item) !== 'fine';
}
