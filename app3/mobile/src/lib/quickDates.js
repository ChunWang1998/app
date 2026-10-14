/** Quick "last done" chips shared by Add/Edit and Backfill. */
export const QUICK_DATES = ['today', 'week', 'month', 'unknown'];

export const QUICK_DATE_KEYS = {
  today: 'common.today',
  week: 'date.weekAgo',
  month: 'date.monthAgo',
  unknown: 'date.unknown',
};

/** ISO for a chip, keeping the current time of day. `unknown` = no record (null). */
export function quickDateIso(kind, now = new Date()) {
  if (kind === 'unknown') return null;
  const d = new Date(now);
  if (kind === 'week') d.setDate(d.getDate() - 7);
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
  for (const k of ['today', 'week', 'month']) {
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
