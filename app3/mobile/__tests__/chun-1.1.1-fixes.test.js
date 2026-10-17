import fs from 'fs';
import path from 'path';
import en from '../languages/en.json';
import zh from '../languages/zh-Hant.json';
import ja from '../languages/ja.json';
import { TOAST_MS } from '../src/components/UndoToast';
import { doneToday } from '../src/lib/today';

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

describe('1.1.1 device-test follow-ups', () => {
  it('keeps last-done / reminder chips and toast copy in sync', () => {
    expect(en.common.yesterday).toBe('Yesterday');
    expect(zh.common.yesterday).toBe('昨天');
    expect(ja.common.yesterday).toBe('昨日');
    expect(en.reminder.daily).toBe('Daily');
    expect(zh.reminder.daily).toBe('每天');
    expect(ja.reminder.daily).toBe('毎日');
    expect(en.home.logged).toBe('Logged today');
    expect(zh.home.logged).toBe('已記下今天');
    expect(ja.home.logged).toBe('今日記録済み');
  });

  it('uses one 2s fade toast for home delete/log and detail log', () => {
    expect(TOAST_MS).toBe(2000);
    const toast = read('../src/components/UndoToast.js');
    expect(toast).toMatch(/Animated\.timing/);
    expect(toast).toMatch(/toValue: 0/);
    expect(toast).toMatch(/toValue: 1/);
    const home = read('../src/screens/HomeScreen.js');
    const detail = read('../src/screens/DetailScreen.js');
    expect(home).toMatch(/<UndoToast/);
    expect(detail).toMatch(/<UndoToast/);
    expect(home).not.toMatch(/5000/);
    expect(detail).not.toMatch(/5000/);
  });

  it('detail hero / overdue / history gaps use reminder-based units', () => {
    const detail = read('../src/screens/DetailScreen.js');
    expect(detail).toMatch(/formatDetailSpanParts/);
    expect(detail).toMatch(/formatDetailSpan/);
    expect(detail).not.toMatch(/formatSpanParts\(/);
    expect(detail).not.toMatch(/formatSpan\(/);
  });

  it('check-off skips a same-calendar-day duplicate and uses light haptic', () => {
    const now = new Date(2026, 9, 14, 18, 0, 0).getTime();
    expect(doneToday({ lastDoneAt: new Date(2026, 9, 14, 8, 0, 0).toISOString() }, now)).toBe(true);
    expect(doneToday({ lastDoneAt: new Date(2026, 9, 13, 23, 30, 0).toISOString() }, now)).toBe(false);
    const home = read('../src/screens/HomeScreen.js');
    const detail = read('../src/screens/DetailScreen.js');
    const repo = read('../src/data/repository.js');
    expect(repo).toMatch(/doneToday/);
    expect(repo).toMatch(/skipped: true/);
    expect(home).toMatch(/result\.skipped/);
    expect(detail).toMatch(/result\.skipped/);
    expect(home).toMatch(/ImpactFeedbackStyle\.Light/);
    expect(detail).toMatch(/ImpactFeedbackStyle\.Light/);
    expect(home).toMatch(/home\.logged/);
    expect(detail).toMatch(/home\.logged/);
  });

  it('history-limit check-off and backfill open the existing paywall', () => {
    const home = read('../src/screens/HomeScreen.js');
    const detail = read('../src/screens/DetailScreen.js');
    expect(home).toMatch(/handleCheck/);
    expect(home).toMatch(/e\?\.code === 'FREE_LIMIT'/);
    expect(detail).toMatch(/logNow/);
    expect(detail).toMatch(/saveBackfill/);
    expect(detail).toMatch(/nav\.navigate\('Paywall'\)/);
    expect(read('../src/lib/calendar.js')).not.toMatch(/icon/);
  });
});
