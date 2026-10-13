/**
 * v1.0.1 WIP — detail stats from a real history list (newest-first).
 * Not wired in v1.0 because items only store lastDoneAt.
 *
 * @param {Array<Date|string|{at: string}>} hist
 */
export function historyStats(hist = []) {
  const times = hist
    .map((t) => {
      if (t instanceof Date) return t.getTime();
      if (typeof t === 'string') return new Date(t).getTime();
      if (t && t.at) return new Date(t.at).getTime();
      return NaN;
    })
    .filter(Number.isFinite)
    .sort((a, b) => b - a);

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
