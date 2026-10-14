import { t } from '../i18n';

const DAY = 864e5;
const H = 36e5;
const MIN = 60e3;

export function formatSpan(ms) {
  if (!Number.isFinite(ms) || ms < MIN) return `0\u2009${t('time.min')}`;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / H);
  const m = Math.floor((ms % H) / MIN);
  if (d >= 30) {
    const mo = Math.floor(d / 30);
    const dd = d % 30;
    return `${mo}\u2009${t('time.month')}${dd ? `\u2009${dd}\u2009${t('time.day')}` : ''}`;
  }
  if (d >= 1) return `${d}\u2009${t('time.day')}${h ? `\u2009${h}\u2009${t('time.hour')}` : ''}`;
  if (h >= 1) return `${h}\u2009${t('time.hour')}${m ? `\u2009${m}\u2009${t('time.min')}` : ''}`;
  return `${m}\u2009${t('time.minute')}`;
}

/** Split span into up to `n` number/unit pairs for hero numerals. */
export function formatSpanParts(ms, n = 2) {
  if (!Number.isFinite(ms) || ms < MIN) return [{ n: 0, unit: t('time.min') }];
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / H);
  const m = Math.floor((ms % H) / MIN);
  let parts;
  if (d >= 30) {
    const mo = Math.floor(d / 30);
    const dd = d % 30;
    parts = [{ n: mo, unit: t('time.month') }, ...(dd ? [{ n: dd, unit: t('time.day') }] : [])];
  } else if (d >= 1) {
    parts = [{ n: d, unit: t('time.day') }, ...(h ? [{ n: h, unit: t('time.hour') }] : [])];
  } else if (h >= 1) {
    parts = [{ n: h, unit: t('time.hour') }, ...(m ? [{ n: m, unit: t('time.min') }] : [])];
  } else {
    parts = [{ n: m, unit: t('time.minute') }];
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
