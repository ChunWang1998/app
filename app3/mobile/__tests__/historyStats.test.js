import { historyStats, backfillEntry } from '../src/lib/historyStats';

describe('historyStats', () => {
  it('computes count, average and max from newest-first history', () => {
    const t0 = Date.parse('2026-10-13T00:00:00.000Z');
    const hist = [0, 14, 28].map((d) => new Date(t0 - d * 864e5).toISOString());
    const s = historyStats(hist);
    expect(s.count).toBe(3);
    expect(s.avgDays).toBeCloseTo(14);
    expect(s.maxDays).toBeCloseTo(14);
    expect(s.gaps).toHaveLength(2);
  });

  it('returns empty stats without inventing numbers', () => {
    const s = historyStats([]);
    expect(s).toEqual({ count: 0, avgDays: null, maxDays: null, gaps: [] });
  });

  it('builds a backfill entry', () => {
    expect(backfillEntry('2026-10-01T00:00:00.000Z')).toEqual({ at: '2026-10-01T00:00:00.000Z' });
  });
});
