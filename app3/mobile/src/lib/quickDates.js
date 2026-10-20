/** Quick "last done" chips shared by Add/Edit and Backfill. */
export const QUICK_DATES = ['today', 'yesterday', 'week', 'month', 'unknown'];

export const QUICK_DATE_KEYS = {
  today: 'common.today',
  yesterday: 'common.yesterday',
  week: 'date.weekAgo',
  month: 'date.monthAgo',
  unknown: 'date.unknown',
};

/** ISO for a chip, keeping the current time of day. `unknown` = no record (null). */
export function quickDateIso(kind, now = new Date()) {
  if (kind === 'unknown') return null;
  const d = new Date(now);
  if (kind === 'yesterday') d.setDate(d.getDate() - 1);
  else if (kind === 'week') d.setDate(d.getDate() - 7);
  else if (kind === 'month') d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Which chip a value corresponds to, or null for a custom date. */
export function quickDateFor(iso, now = new Date()) {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  for (const k of ['today', 'yesterday', 'week', 'month']) {
    if (sameLocalDay(d, new Date(quickDateIso(k, now)))) return k;
  }
  return null;
}

/** Keep the date the picker chose, but never later than now. */
export function pickedDateIso(date, now = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return (d.getTime() > now.getTime() ? now : d).toISOString();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Local calendar `YYYY-MM-DD` for an ISO timestamp (empty if invalid). */
export function isoToYmd(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Local midnight-preserving ISO from a `YYYY-MM-DD` field, clamped to now.
 * Keeps the current time of day, matching quick chips.
 */
export function ymdToIso(ymd, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
  if (Number.isNaN(d.getTime())) return null;
  return pickedDateIso(d, now);
}
