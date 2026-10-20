import { hasReminder, firstDueInstant, reminderConfigFromActivity } from './reminderSchedule';

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

/** True when `a` and `b` fall on the same local calendar day. */
export function sameLocalDay(a, b) {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return startOfDay(ta) === startOfDay(tb);
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
  if (!hasReminder(item)) return false;
  const due = firstDueInstant(item, reminderConfigFromActivity(item), now);
  if (!due) return false;
  return due.getTime() <= endOfDay(now);
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
  if (items.some((a) => hasReminder(a) && doneToday(a, now))) return 'happy';
  return 'idle';
}
