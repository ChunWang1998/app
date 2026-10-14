import fs from 'fs';
import path from 'path';
import { quickDateIso, quickDateFor, pickedDateIso, QUICK_DATES } from '../src/lib/quickDates';
import { suggestReminderDays } from '../src/lib/suggestReminder';
import { isDueToday, splitToday, homeMood } from '../src/lib/today';
import { reminderOptions } from '../src/components/ReminderChips';
import { FREE_ACTIVITY_LIMIT, parseFreeLimit, resetRepositoryForTests, addActivity } from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import en from '../languages/en.json';
import zh from '../languages/zh-Hant.json';
import ja from '../languages/ja.json';

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const DAY = 864e5;

describe('quick last-done dates', () => {
  const now = new Date(2026, 9, 14, 15, 20);
  it('maps chips to dates; unknown means no record', () => {
    expect(QUICK_DATES).toEqual(['today', 'week', 'month', 'unknown']);
    expect(new Date(quickDateIso('today', now)).getDate()).toBe(14);
    expect(new Date(quickDateIso('week', now)).getDate()).toBe(7);
    const m = new Date(quickDateIso('month', now));
    expect([m.getMonth(), m.getDate()]).toEqual([8, 14]);
    expect(quickDateIso('unknown', now)).toBeNull();
  });
  it('recognises chip values and custom dates', () => {
    expect(quickDateFor(null, now)).toBe('unknown');
    expect(quickDateFor(quickDateIso('week', now), now)).toBe('week');
    expect(quickDateFor(new Date(2026, 7, 30).toISOString(), now)).toBeNull();
  });
  it('picker cannot set a future date', () => {
    expect(pickedDateIso(new Date(2027, 0, 1), now)).toBe(now.toISOString());
    expect(pickedDateIso(new Date(2026, 7, 30), now)).toBe(new Date(2026, 7, 30).toISOString());
  });
});

describe('reminder suggestion from name', () => {
  it('suggests intervals offline in en / zh-Hant / ja', () => {
    expect(suggestReminderDays('換牙刷')).toBe(90);
    expect(suggestReminderDays('toothbrush')).toBe(90);
    expect(suggestReminderDays('歯ブラシ')).toBe(90);
    expect(suggestReminderDays('洗床單')).toBe(14);
    expect(suggestReminderDays('bed sheets')).toBe(14);
    expect(suggestReminderDays('剪頭髮')).toBe(42);
    expect(suggestReminderDays('量子力學')).toBeNull();
    expect(suggestReminderDays('')).toBeNull();
  });
  it('shows a custom chip only for non-preset intervals', () => {
    expect(reminderOptions(14).map((o) => o.d)).toEqual([null, 7, 14, 30, 90]);
    expect(reminderOptions(42).map((o) => o.d)).toEqual([null, 7, 14, 30, 90, 42]);
  });
  it('add screen saves the interval directly', () => {
    const src = read('../src/screens/EditScreen.js');
    expect(src).toMatch(/<ReminderChips/);
    expect(src).toMatch(/\n\s+reminderDays,\n/);
    expect(src).not.toMatch(/reminderNew/);
  });
});

describe('free limit and paywall', () => {
  afterEach(() => jest.restoreAllMocks());
  it('free users get 10 items', async () => {
    expect(FREE_ACTIVITY_LIMIT).toBe(10);
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    for (let i = 0; i < 10; i++) await addActivity({ title: `F${i}` });
    await expect(addActivity({ title: 'F10' })).rejects.toHaveProperty('code', 'FREE_LIMIT');
  });
  it('env limit must be a positive integer, else 10', () => {
    expect(parseFreeLimit(undefined)).toBe(10);
    expect(parseFreeLimit('')).toBe(10);
    expect(parseFreeLimit('abc')).toBe(10);
    expect(parseFreeLimit('0')).toBe(10);
    expect(parseFreeLimit('-5')).toBe(10);
    expect(parseFreeLimit('2.5')).toBe(10);
    expect(parseFreeLimit('Infinity')).toBe(10);
    expect(parseFreeLimit('99999999999999999999')).toBe(10);
    expect(parseFreeLimit('7')).toBe(7);
    expect(parseFreeLimit(' 12 ')).toBe(12);
  });
  it('paywall headline uses the limit in all languages', () => {
    for (const l of [en, zh, ja]) expect(l.paywall.headline).toMatch(/\{n\}/);
    expect(read('../src/screens/PaywallScreen.js')).toMatch(/paywall\.headline', \{ n: FREE_ACTIVITY_LIMIT \}/);
  });
});

describe('today section', () => {
  const now = new Date(2026, 9, 14, 12).getTime();
  const item = (id, daysAgo, reminderDays) => ({
    id, reminderDays, lastDoneAt: new Date(now - daysAgo * DAY).toISOString(), createdAt: new Date(now - 99 * DAY).toISOString(),
  });
  it('includes overdue and due-by-tonight items only', () => {
    expect(isDueToday(item('a', 10, 7), now)).toBe(true);
    expect(isDueToday(item('b', 6.9, 7), now)).toBe(true);
    expect(isDueToday(item('c', 2, 7), now)).toBe(false);
    expect(isDueToday(item('d', 50, null), now)).toBe(false);
    const { today, rest } = splitToday([item('a', 10, 7), item('c', 2, 7)], now);
    expect(today.map((x) => x.id)).toEqual(['a']);
    expect(rest.map((x) => x.id)).toEqual(['c']);
  });
  it('alarm clock is happy once everything due is done today', () => {
    expect(homeMood([item('a', 10, 7)], now)).toBe('worry');
    expect(homeMood([item('a', 0.01, 7)], now)).toBe('happy');
    expect(homeMood([item('c', 2, 7)], now)).toBe('idle');
    expect(homeMood([], now)).toBe('idle');
  });
  it('home hides the section when nothing is due', () => {
    const src = read('../src/screens/HomeScreen.js');
    expect(src).toMatch(/ListHeaderComponent=\{today\.length \?/);
    expect(src).toMatch(/home\.dueToday/);
  });
});

describe('strings', () => {
  it('new keys exist in en / zh-Hant / ja', () => {
    for (const l of [en, zh, ja]) {
      for (const k of ['weekAgo', 'monthAgo', 'unknown']) expect(l.date[k]).toBeTruthy();
      expect(l.home.dueToday).toBeTruthy();
    }
    expect(zh.date.unknown).toBe('不記得');
  });
});
