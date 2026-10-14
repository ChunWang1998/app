const DAY = 864e5;

function lastTs(item) {
  const v = item?.lastDoneAt || item?.createdAt;
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
}

function endOfDay(now) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfDay(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Local calendar days: due before today's 00:00 is 'overdue', due any time today is 'today'.
 * `due` is ms until due (negative = late), as from dueInMs. DST-safe (uses local midnights).
 */
export function dueStatus(due, now = Date.now()) {
  if (!Number.isFinite(due)) return 'none';
  const at = now + due;
  if (at < startOfDay(now)) return 'overdue';
  if (at <= endOfDay(now)) return 'today';
  return 'upcoming';
}

/** Has a reminder and is due by the end of today (includes overdue). */
export function isDueToday(item, now = Date.now()) {
  if (!item?.reminderDays) return false;
  const last = lastTs(item);
  if (last == null) return false;
  return last + item.reminderDays * DAY <= endOfDay(now);
}

export function doneToday(item, now = Date.now()) {
  if (!item?.lastDoneAt) return false;
  const t = new Date(item.lastDoneAt).getTime();
  return t >= startOfDay(now) && t <= now;
}

/** Split home items into the Today section and the rest. */
export function splitToday(items, now = Date.now()) {
  const today = [];
  const rest = [];
  for (const a of items) (isDueToday(a, now) ? today : rest).push(a);
  return { today, rest };
}

/** Alarm clock mood for the home band. */
export function homeMood(items, now = Date.now()) {
  if (!items.length) return 'idle';
  if (items.some((a) => isDueToday(a, now))) return 'worry';
  if (items.some((a) => a.reminderDays && doneToday(a, now))) return 'happy';
  return 'idle';
}
