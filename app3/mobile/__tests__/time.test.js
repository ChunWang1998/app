import { formatSpan, formatSpanParts, dueInMs, elapsedMs, progressRatio } from '../src/lib/time';
import { setLocale } from '../src/i18n';

describe('time helpers', () => {
  beforeAll(() => setLocale('zh-Hant'));

  it('formats spans with thin spaces', () => {
    expect(formatSpan(2 * 864e5)).toBe('2\u2009天');
    expect(formatSpan(90 * 864e5)).toBe('3\u2009個月');
    const parts = formatSpanParts(19 * 864e5 + 7 * 36e5, 2);
    expect(parts[0]).toEqual({ n: 19, unit: '天' });
    expect(parts[1]).toEqual({ n: 7, unit: '小時' });
  });

  it('computes due and elapsed from real lastDoneAt', () => {
    const now = Date.parse('2026-10-13T14:50:00.000Z');
    const last = new Date(now - 5 * 864e5).toISOString();
    const item = { lastDoneAt: last, reminderDays: 3, createdAt: last };
    expect(dueInMs(item, now)).toBe(-2 * 864e5);
    expect(elapsedMs(item, now)).toBe(5 * 864e5);
    expect(progressRatio({ lastDoneAt: last, reminderDays: 10 }, now)).toBeCloseTo(0.5);
  });

  it('hides due when reminder is off', () => {
    const item = { lastDoneAt: new Date().toISOString(), reminderDays: null };
    expect(dueInMs(item)).toBe(Infinity);
    expect(progressRatio(item)).toBe(0);
  });
});
