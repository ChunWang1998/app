import fs from 'fs';
import path from 'path';
import { quickDateIso, quickDateFor, pickedDateIso, QUICK_DATES } from '../src/lib/quickDates';
import { suggestReminderDays } from '../src/lib/suggestReminder';
import { isDueToday, splitToday, homeMood } from '../src/lib/today';
import { reminderOptions } from '../src/components/ReminderChips';
import { FREE_ACTIVITY_LIMIT, FREE_HISTORY_LIMIT, parseFreeLimit, resetRepositoryForTests, addActivity } from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import en from '../languages/en.json';
import zh from '../languages/zh-Hant.json';
import ja from '../languages/ja.json';
import de from '../languages/de.json';
import fr from '../languages/fr.json';

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const DAY = 864e5;

describe('quick last-done dates', () => {
  const now = new Date(2026, 9, 14, 15, 20);
  it('maps chips to dates; unknown means no record', () => {
    expect(QUICK_DATES).toEqual(['today', 'yesterday', 'week', 'month', 'unknown']);
    expect(new Date(quickDateIso('today', now)).getDate()).toBe(14);
    expect(new Date(quickDateIso('yesterday', now)).getDate()).toBe(13);
    expect(new Date(quickDateIso('yesterday', now)).getHours()).toBe(15);
    expect(new Date(quickDateIso('week', now)).getDate()).toBe(7);
    const m = new Date(quickDateIso('month', now));
    expect([m.getMonth(), m.getDate()]).toEqual([8, 14]);
    expect(quickDateIso('unknown', now)).toBeNull();
  });
  it('recognises chip values and custom dates', () => {
    expect(quickDateFor(null, now)).toBe('unknown');
    expect(quickDateFor(quickDateIso('yesterday', now), now)).toBe('yesterday');
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
    expect(suggestReminderDays('Zahnbürste')).toBe(90);
    expect(suggestReminderDays('brosse à dents')).toBe(90);
    expect(suggestReminderDays('洗床單')).toBe(14);
    expect(suggestReminderDays('bed sheets')).toBe(14);
    expect(suggestReminderDays('剪頭髮')).toBe(42);
    expect(suggestReminderDays('量子力學')).toBeNull();
    expect(suggestReminderDays('')).toBeNull();
  });
  it('shows a custom chip only for non-preset intervals', () => {
    expect(reminderOptions(14).map((o) => o.d)).toEqual([null, 1, 7, 14, 30, 90, 'more']);
    expect(reminderOptions(1).map((o) => o.d)).toEqual([null, 1, 7, 14, 30, 90, 'more']);
    expect(reminderOptions(42).map((o) => o.d)).toEqual([null, 1, 7, 14, 30, 90, 42, 'more']);
  });
  it('add screen saves the interval directly', () => {
    const src = read('../src/screens/EditScreen.js');
    expect(src).toMatch(/<ReminderChips/);
    expect(src).toMatch(/\n\s+reminderDays,\n/);
    expect(src).not.toMatch(/reminderNew/);
    expect(src).toMatch(/onMore/);
    expect(src).toMatch(/ensureReminderEnabled/);
    expect(read('../src/screens/HomeScreen.js')).not.toMatch(/formatReminderLabel/);
    expect(read('../src/components/ReminderChips.js')).toMatch(/reminder\.more/);
    const reminder = read('../src/screens/ReminderScreen.js');
    expect(reminder).toMatch(/reminder-mode-\$\{m\.mode\}/);
    expect(reminder).toMatch(/MODE_INTERVAL/);
    expect(reminder).toMatch(/MODE_WEEK/);
    expect(reminder).toMatch(/MODE_MONTH/);
    expect(reminder).toMatch(/TimeWheel/);
    expect(reminder).toMatch(/reminder-next/);
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
    for (const l of [en, zh, ja, de, fr]) expect(l.paywall.headline).toMatch(/\{n\}/);
    expect(read('../src/screens/PaywallScreen.js')).toMatch(/paywall\.headline', \{ n: FREE_ACTIVITY_LIMIT \}/);
  });
  it('paywall lists unlimited logs per item in all languages', () => {
    expect(FREE_HISTORY_LIMIT).toBe(10);
    expect(en.paywall.history).toBe('Unlimited logs per item');
    expect(zh.paywall.history).toBe('每項紀錄無上限');
    expect(ja.paywall.history).toBe('項目ごとの記録は無制限');
    expect(ja.paywall.historySub).toBe('無料は1項目{n}件まで');
    for (const l of [en, zh, ja, de, fr]) expect(l.paywall.historySub).toMatch(/\{n\}/);
    expect(read('../src/screens/PaywallScreen.js')).toMatch(/paywall\.history/);
    expect(read('../src/screens/PaywallScreen.js')).toMatch(/FREE_HISTORY_LIMIT/);
    expect(en.paywall.historyHeadline).toBe('Log more than {n} times');
    expect(zh.paywall.historyHeadline).toBe('不只記 {n} 次');
    expect(ja.paywall.historyHeadline).toBe('{n}回以上記録');
    expect(read('../src/screens/PaywallScreen.js')).toMatch(/paywall\.historyHeadline/);
    expect(read('../src/screens/PaywallScreen.js')).toMatch(/reason === 'history'/);
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
    for (const l of [en, zh, ja, de, fr]) {
      for (const k of ['weekAgo', 'monthAgo', 'unknown']) expect(l.date[k]).toBeTruthy();
      expect(l.home.dueToday).toBeTruthy();
    }
    expect(zh.date.unknown).toBe('不記得');
    expect(ja.date.unknown).toBe('覚えてない');
  });
});

describe('due status (PR #20 preview fixes)', () => {
  const { dueStatus } = require('../src/lib/today');
  const at = (y, mo, d, h, mi = 0) => new Date(y, mo, d, h, mi).getTime();
  const status = (dueAt, now) => dueStatus(dueAt - now, now);
  it('due any time today is today, even if hours late', () => {
    const noon = at(2026, 9, 14, 12);
    expect(dueStatus(0, noon)).toBe('today');
    expect(status(at(2026, 9, 14, 0, 0), noon)).toBe('today');
    expect(status(at(2026, 9, 14, 23, 59), noon)).toBe('today');
  });
  it('due before local midnight is overdue (crosses midnight)', () => {
    expect(status(at(2026, 9, 13, 23), at(2026, 9, 14, 22))).toBe('overdue');
    expect(status(at(2026, 9, 13, 23, 59), at(2026, 9, 14, 0, 1))).toBe('overdue');
    expect(status(at(2026, 9, 15, 0, 0), at(2026, 9, 14, 23, 59))).toBe('upcoming');
    expect(dueStatus(Infinity, at(2026, 9, 14, 12))).toBe('none');
  });
  it('uses local calendar days across DST (America/New_York fall back / spring forward)', () => {
    // Runs in any TZ; these are local wall-clock times, so 23h/25h days must not shift the boundary.
    expect(status(at(2026, 10, 1, 0, 30), at(2026, 10, 1, 23, 30))).toBe('today'); // Nov 1 2026: 25h day
    expect(status(at(2026, 9, 31, 23, 30), at(2026, 10, 1, 0, 30))).toBe('overdue');
    expect(status(at(2026, 2, 8, 0, 30), at(2026, 2, 8, 23, 30))).toBe('today'); // Mar 8 2026: 23h day
    expect(status(at(2026, 2, 9, 0, 0), at(2026, 2, 8, 23, 59))).toBe('upcoming');
  });
  it('home row shows Today, not overdue 0 min', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.js'), 'utf8');
    expect(src).toMatch(/ds === 'today'\) status = t\('common\.today'\)/);
    expect(src).not.toMatch(/const od = due < 0/);
  });
  it('category icon picker wraps instead of clipping', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/screens/CategoryEditScreen.js'), 'utf8');
    expect(src).toMatch(/flexWrap: 'wrap'/);
    expect(src).toMatch(/icCell: \{ width: '20%'/);
  });
});

describe('backfill later than last done (intended)', () => {
  it('moves last done forward', async () => {
    const repo = require('../src/data/repository');
    await repo.resetRepositoryForTests();
    const a = await repo.addActivity({ title: 'B', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    await repo.backfillHistory(a.id, '2026-10-01T00:00:00.000Z');
    expect(repo.getVisibleActivities().find((x) => x.id === a.id).lastDoneAt).toBe('2026-10-01T00:00:00.000Z');
  });
});
