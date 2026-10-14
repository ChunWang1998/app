import { formatSpan, formatSpanParts, dueInMs, elapsedMs, progressRatio, formatLastDoneDate, formatLastDoneRelative, formatLastDoneLine } from '../src/lib/time';
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

  it('computes due at reminderTime, not last-done clock time', () => {
    const last = new Date(2026, 9, 9, 23, 28, 0);
    const now = new Date(2026, 9, 14, 12, 0, 0).getTime();
    const item = {
      lastDoneAt: last.toISOString(),
      reminderDays: 3,
      reminderTime: '09:00',
      createdAt: last.toISOString(),
    };
    const dueAt = now + dueInMs(item, now);
    const due = new Date(dueAt);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(9);
    expect(due.getDate()).toBe(12);
    expect(due.getHours()).toBe(9);
    expect(due.getMinutes()).toBe(0);
    expect(dueAt).not.toBe(last.getTime() + 3 * 864e5);
    expect(elapsedMs(item, now)).toBe(now - last.getTime());
    const start = new Date(2026, 9, 4, 9, 0, 0);
    const mid = new Date(2026, 9, 9, 9, 0, 0).getTime();
    expect(progressRatio({
      lastDoneAt: start.toISOString(),
      reminderDays: 10,
      reminderTime: '09:00',
    }, mid)).toBeCloseTo(0.5);
  });

  it('hides due when reminder is off', () => {
    const item = { lastDoneAt: new Date().toISOString(), reminderDays: null };
    expect(dueInMs(item)).toBe(Infinity);
    expect(progressRatio(item)).toBe(0);
  });
});

describe('last-done copy', () => {
  it('uses relative + dated wording in en / zh-Hant / ja', () => {
    const ts = new Date(2026, 9, 11, 12, 0, 0).toISOString();
    const now = new Date(2026, 9, 14, 12, 0, 0).getTime();
    expect(formatLastDoneRelative(ts, now, 'en')).toBe('3 days ago');
    expect(formatLastDoneRelative(ts, now, 'zh-Hant')).toBe('3 天前');
    expect(formatLastDoneRelative(ts, now, 'ja')).toBe('3日前');
    expect(formatLastDoneDate(ts, 'en')).toBe('Oct 11');
    expect(formatLastDoneDate(ts, 'zh-Hant')).toBe('10/11');
    expect(formatLastDoneDate(ts, 'ja')).toBe('10/11');
    expect(formatLastDoneLine(ts, now, 'en')).toBe('3 days ago · Last done Oct 11');
    expect(formatLastDoneLine(ts, now, 'zh-Hant')).toBe('3 天前 · 上次做是 10/11');
    expect(formatLastDoneLine(ts, now, 'ja')).toBe('3日前 · 前回 10/11');
  });

  it('counts calendar days across local midnight, not 24h blocks', () => {
    const { tLocale } = require('../src/i18n');
    const ts = new Date(2026, 9, 13, 23, 0, 0).toISOString();
    const now = new Date(2026, 9, 14, 9, 0, 0).getTime();
    for (const loc of ['en', 'zh-Hant', 'ja']) {
      expect(formatLastDoneRelative(ts, now, loc)).toBe(tLocale(loc, 'common.yesterday'));
      expect(formatLastDoneRelative(ts, now, loc)).not.toBe(tLocale(loc, 'common.today'));
    }
    const sameDay = new Date(2026, 9, 14, 0, 30, 0).toISOString();
    expect(formatLastDoneRelative(sameDay, new Date(2026, 9, 14, 23, 59).getTime(), 'en')).toBe(tLocale('en', 'common.today'));
    const late = new Date(2026, 9, 11, 23, 30, 0).toISOString();
    expect(formatLastDoneRelative(late, new Date(2026, 9, 14, 0, 10).getTime(), 'zh-Hant')).toBe('3 天前');
  });
});
