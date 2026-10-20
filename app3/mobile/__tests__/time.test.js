import {
  formatSpan,
  formatSpanParts,
  dueInMs,
  elapsedMs,
  progressRatio,
  formatLastDoneDate,
  formatLastDoneRelative,
  formatLastDoneLine,
  localCalendarDays,
  detailSpanPrecision,
  formatDetailSpan,
  formatDetailSpanParts,
  isDetailHeroToday,
} from '../src/lib/time';
import { tLocale } from '../src/i18n';
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
    expect(formatLastDoneRelative(ts, now, 'de')).toBe('vor 3 Tagen');
    expect(formatLastDoneRelative(ts, now, 'fr')).toBe('il y a 3 jours');
    const deDate = new Intl.DateTimeFormat('de-DE', { month: 'short', day: 'numeric' }).format(new Date(2026, 9, 11));
    const frDate = new Intl.DateTimeFormat('fr-FR', { month: 'short', day: 'numeric' }).format(new Date(2026, 9, 11));
    expect(formatLastDoneDate(ts, 'de')).toBe(deDate);
    expect(formatLastDoneDate(ts, 'fr')).toBe(frDate);
  });

  it('counts calendar days across local midnight, not 24h blocks', () => {
    const { tLocale } = require('../src/i18n');
    const ts = new Date(2026, 9, 13, 23, 0, 0).toISOString();
    const now = new Date(2026, 9, 14, 9, 0, 0).getTime();
    for (const loc of ['en', 'zh-Hant', 'ja', 'de', 'fr']) {
      expect(formatLastDoneRelative(ts, now, loc)).toBe(tLocale(loc, 'common.yesterday'));
      expect(formatLastDoneRelative(ts, now, loc)).not.toBe(tLocale(loc, 'common.today'));
    }
    const sameDay = new Date(2026, 9, 14, 0, 30, 0).toISOString();
    expect(formatLastDoneRelative(sameDay, new Date(2026, 9, 14, 23, 59).getTime(), 'en')).toBe(tLocale('en', 'common.today'));
    const late = new Date(2026, 9, 11, 23, 30, 0).toISOString();
    expect(formatLastDoneRelative(late, new Date(2026, 9, 14, 0, 10).getTime(), 'zh-Hant')).toBe('3 天前');
  });
});

describe('detail screen units follow the reminder', () => {
  const at = (y, mo, d, h = 12, mi = 0) => new Date(y, mo, d, h, mi);

  it('daily (or sub-day) allows hours and minutes; others stay on calendar days', () => {
    expect(detailSpanPrecision({ reminderDays: 1 })).toBe('fine');
    expect(detailSpanPrecision({ reminderMode: 'interval', reminderUnit: 'd', reminderN: 1 })).toBe('fine');
    expect(detailSpanPrecision({ reminderDays: 3 })).toBe('coarse');
    expect(detailSpanPrecision({ reminderDays: 7 })).toBe('coarse');
    expect(detailSpanPrecision({ reminderDays: null })).toBe('coarse');
    expect(detailSpanPrecision({ reminderMode: 'week', reminderWeekdays: [1] })).toBe('coarse');
    expect(detailSpanPrecision({ reminderMode: 'month', reminderMonthDay: 15 })).toBe('coarse');
    expect(detailSpanPrecision({ reminderMode: 'interval', reminderUnit: 'w', reminderN: 1 })).toBe('coarse');
    expect(detailSpanPrecision({ reminderMode: 'interval', reminderUnit: 'm', reminderN: 1 })).toBe('coarse');
    expect(detailSpanPrecision({ reminderMode: 'interval', reminderUnit: 'y', reminderN: 1 })).toBe('coarse');
  });

  it('coarse uses local midnights, matching N days ago — not wall-clock hours', () => {
    const from = at(2026, 9, 13, 23, 0);
    const to = at(2026, 9, 14, 9, 0);
    expect(localCalendarDays(from, to)).toBe(1);
    const weekly = { reminderDays: 7, lastDoneAt: from.toISOString() };
    expect(formatDetailSpan(weekly, from, to, 'zh-Hant')).toBe('1\u2009天');
    expect(formatDetailSpanParts(weekly, from, to, 2, 'en')[0]).toEqual({ n: 1, unit: 'd' });
    const none = { reminderDays: null, lastDoneAt: from.toISOString() };
    expect(formatDetailSpan(none, from, to, 'en')).toBe('1\u2009d');
    const sameDay = { reminderDays: null, lastDoneAt: at(2026, 9, 14, 0, 30).toISOString() };
    expect(formatDetailSpan(sameDay, at(2026, 9, 14, 0, 30), at(2026, 9, 14, 23, 0), 'en')).toBe('0\u2009d');
  });

  it('daily still shows hours across the same calendar day', () => {
    const from = at(2026, 9, 14, 8, 0);
    const to = at(2026, 9, 14, 18, 30);
    const daily = { reminderDays: 1, lastDoneAt: from.toISOString() };
    const parts = formatDetailSpanParts(daily, from, to, 2, 'en');
    expect(parts[0]).toEqual({ n: 10, unit: 'h' });
    expect(parts[1]).toEqual({ n: 30, unit: 'm' });
  });

  it('coarse groups leftover calendar days into weeks / months / years', () => {
    const from = at(2026, 9, 1, 9);
    const weekly = { reminderDays: 7 };
    expect(formatDetailSpanParts(weekly, from, at(2026, 9, 11, 9), 2, 'en')).toEqual([
      { n: 1, unit: 'w' },
      { n: 3, unit: 'd' },
    ]);
    const monthly = { reminderDays: 30 };
    expect(formatDetailSpanParts(monthly, from, at(2026, 10, 15, 9), 2, 'en')).toEqual([
      { n: 1, unit: 'mo' },
      { n: 15, unit: 'd' },
    ]);
    const yearly = { reminderMode: 'interval', reminderUnit: 'y', reminderN: 1 };
    expect(formatDetailSpanParts(yearly, from, at(2027, 9, 11, 9), 2, 'en')).toEqual([
      { n: 1, unit: 'y' },
      { n: 10, unit: 'd' },
    ]);
  });

  it('detail hero uses today for a no-reminder item done today', () => {
    const now = at(2026, 9, 17, 18, 0);
    const todayIso = at(2026, 9, 17, 9, 0).toISOString();
    const yesterdayIso = at(2026, 9, 16, 22, 0).toISOString();
    expect(isDetailHeroToday({ reminderDays: null, lastDoneAt: todayIso }, now)).toBe(true);
    expect(isDetailHeroToday({ reminderDays: 7, lastDoneAt: todayIso }, now)).toBe(false);
    expect(isDetailHeroToday({ reminderDays: null, lastDoneAt: yesterdayIso }, now)).toBe(false);
    expect(tLocale('zh-Hant', 'common.today')).toBe('今天');
    expect(tLocale('en', 'common.today')).toBe('Today');
    expect(tLocale('ja', 'common.today')).toBe('今日');
    const detail = require('fs').readFileSync(require('path').join(__dirname, '../src/screens/DetailScreen.js'), 'utf8');
    expect(detail).toMatch(/isDetailHeroToday/);
    expect(detail).toMatch(/common\.today/);
  });
});
