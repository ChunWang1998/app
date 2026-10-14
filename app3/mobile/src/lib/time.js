import { getLocale, resolveLocale, t, tLocale } from '../i18n';

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

export function formatLastDoneDate(ts, locale) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const tag = resolveLocale(locale || getLocale());
  if (tag === 'en') return `${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

export function formatLastDoneRelative(ts, now = Date.now(), locale) {
  if (!ts) return '';
  const t0 = new Date(ts).getTime();
  if (Number.isNaN(t0)) return '';
  const a = new Date(t0);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  // Calendar days between local midnights; round absorbs DST 23h/25h days.
  const days = Math.max(0, Math.round((startB - startA) / DAY));
  const loc = locale || getLocale();
  if (days <= 0) return tLocale(loc, 'common.today');
  if (days === 1) return tLocale(loc, 'common.yesterday');
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
  if (!item?.reminderDays) return Infinity;
  const last = item.lastDoneAt
    ? new Date(item.lastDoneAt).getTime()
    : (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  if (!last) return Infinity;
  return last + item.reminderDays * DAY - now;
}

export function progressRatio(item, now = Date.now()) {
  if (!item?.reminderDays) return 0;
  const last = item.lastDoneAt
    ? new Date(item.lastDoneAt).getTime()
    : (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  if (!last) return 0;
  return Math.min(1, Math.max(0, (now - last) / (item.reminderDays * DAY)));
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
