import { localCalendarDays } from './time';

/**
 * Detail stats from a real history list (newest-first).
 * One record: avg/max are calendar days from that log to today (0 if same day),
 * not an em dash — there is no gap between logs yet, so "so far" is the span.
 *
 * @param {Array<Date|string|{at: string}>} hist
 * @param {number|Date} [now]
 */
export function historyStats(hist = [], now = Date.now()) {
  const times = hist
    .map((t) => {
      if (t instanceof Date) return t.getTime();
      if (typeof t === 'string') return new Date(t).getTime();
      if (t && t.at) return new Date(t.at).getTime();
      return NaN;
    })
    .filter(Number.isFinite)
    .sort((a, b) => b - a);

  if (times.length === 1) {
    const days = Math.max(0, localCalendarDays(times[0], now));
    return { count: 1, avgDays: days, maxDays: days, gaps: [] };
  }

  const gaps = [];
  for (let i = 0; i < times.length - 1; i++) {
    gaps.push((times[i] - times[i + 1]) / 864e5);
  }
  const avgDays = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  const maxDays = gaps.length ? Math.max(...gaps) : null;
  return { count: times.length, avgDays, maxDays, gaps };
}

export function backfillEntry(atIso) {
  return { at: atIso };
}
