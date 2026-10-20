import React from 'react';
import renderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import { DateChips } from '../src/components/DateChips';
import { pickedDateIso, ymdToIso, isoToYmd, quickDateFor } from '../src/lib/quickDates';
import { historyStats } from '../src/lib/historyStats';
import { formatHomeCountdown } from '../src/lib/time';
import { setLocale, tLocale } from '../src/i18n';
import en from '../languages/en.json';
import zh from '../languages/zh-Hant.json';
import ja from '../languages/ja.json';
import de from '../languages/de.json';
import fr from '../languages/fr.json';

jest.mock('../src/theme/useTheme', () => ({
  useThemeColors: () => ({
    brand: '#a',
    fill: '#b',
    onbrand: '#c',
    label: '#d',
    l3: '#e',
    cell: '#f',
  }),
}));

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const LOCALES = ['en', 'zh-Hant', 'ja', 'de', 'fr'];

describe('F05/F07 last-done date picker', () => {
  it('clamps picker dates to now and parses YYYY-MM-DD', () => {
    const now = new Date(2026, 9, 20, 16, 0, 0);
    const future = pickedDateIso(new Date(2026, 9, 21, 8, 0, 0), now);
    expect(new Date(future).getTime()).toBe(now.getTime());
    expect(ymdToIso('2026-10-21', now)).toBe(now.toISOString());
    const sixWeeks = ymdToIso('2026-09-08', now);
    expect(isoToYmd(sixWeeks)).toBe('2026-09-08');
    expect(quickDateFor(sixWeeks, now)).toBeNull();
  });

  it('always renders a date picker, including a pick-a-day chip', () => {
    const src = read('../src/components/DateChips.js');
    expect(src).toMatch(/testID="date-picker"/);
    expect(src).toMatch(/type: 'date'/);
    expect(src).toMatch(/date-chip-pick/);
    expect(src).toMatch(/maximumDate/);
    expect(src).not.toMatch(/DateTimePicker && value/);
    let tree;
    act(() => {
      tree = renderer.create(<DateChips value={null} onChange={() => {}} />);
    });
    expect(tree.root.findByProps({ testID: 'date-chip-pick' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'date-picker' })).toBeTruthy();
  });

  it('backfill writes through logActivityOnDay', () => {
    const detail = read('../src/screens/DetailScreen.js');
    expect(detail).toMatch(/logActivityOnDay/);
    expect(detail).toMatch(/saveBackfill/);
    expect(detail).not.toMatch(/backfillHistory/);
  });
});

describe('F12 single-record avg/max', () => {
  it('fills avg and max from that log to today', () => {
    const now = new Date(2026, 9, 20, 12, 0, 0);
    const s = historyStats([{ at: new Date(2026, 9, 6, 12, 0, 0).toISOString() }], now);
    expect(s.avgDays).toBe(14);
    expect(s.maxDays).toBe(14);
    expect(s.avgDays).not.toBeNull();
  });
});

describe('F16 notes: no auto reminder, Off on every editor', () => {
  it('does not auto-apply suggestReminderDays on add or parse', () => {
    expect(read('../src/screens/EditScreen.js')).not.toMatch(/suggestReminderDays/);
    expect(read('../src/lib/ai/ruleParser.js')).not.toMatch(/suggestReminderDays/);
  });

  it('every edit surface has an Off control', () => {
    expect(read('../src/components/ReminderChips.js')).toMatch(/detail\.noReminder/);
    expect(read('../src/components/AiEditSheet.js')).toMatch(/detail\.noReminder/);
    expect(read('../src/screens/ReminderScreen.js')).toMatch(/testID="reminder-off"/);
    expect(read('../src/screens/ReminderScreen.js')).toMatch(/detail\.noReminder/);
    expect(read('../src/screens/EditScreen.js')).toMatch(/<ReminderChips/);
  });
});

describe('F04 undo after ticking a today-created item', () => {
  it('home and detail wire skipped logs through undoHandlerForLog', () => {
    expect(read('../src/screens/HomeScreen.js')).toMatch(/undoHandlerForLog/);
    expect(read('../src/screens/DetailScreen.js')).toMatch(/undoHandlerForLog/);
    expect(read('../src/data/repository.js')).toMatch(/undoLogAt/);
  });
});

describe('mic copy is plain language in 5 locales', () => {
  const bundles = { en, 'zh-Hant': zh, ja, de, fr };
  it.each(LOCALES)('%s avoids on-device / offline jargon', (locale) => {
    const hint = tLocale(locale, 'ai.micOffHint');
    const err = tLocale(locale, 'ai.speechUnavailable');
    expect(hint.length).toBeGreaterThan(0);
    expect(err.length).toBeGreaterThan(0);
    expect(`${hint} ${err}`.toLowerCase()).not.toMatch(/on-device|offline|離線|端末内|hors ligne/);
    expect(bundles[locale].date.pick.length).toBeGreaterThan(0);
  });
});

describe('F11 home countdown is days, not minutes', () => {
  it('uses formatHomeCountdown and never formatSpan on the list', () => {
    const home = read('../src/screens/HomeScreen.js');
    expect(home).toMatch(/formatHomeCountdown/);
    expect(home).not.toMatch(/formatSpan\(/);
    const now = new Date(2026, 9, 20, 19, 30, 0).getTime();
    setLocale('zh-Hant');
    expect(formatHomeCountdown(13 * 36e5 + 32 * 60e3, now, 'zh-Hant')).toBe('今天');
  });
});

describe('recently deleted 3-day window', () => {
  it('purges on launch and foreground via enqueueWrite', () => {
    const repo = read('../src/data/repository.js');
    const app = read('../src/App.js');
    const screen = read('../src/screens/RecentlyDeletedScreen.js');
    expect(repo).toMatch(/export const TRASH_DAYS = 3/);
    expect(repo).toMatch(/export async function purgeExpiredDeleted/);
    expect(repo).toMatch(/enqueueWrite\(async \(\) => \{[\s\S]*isExpiredDeleted/);
    expect(app).toMatch(/AppState\.addEventListener\('change'/);
    expect(app).toMatch(/purgeExpiredDeleted/);
    expect(screen).toMatch(/deleted\.daysLeft/);
    expect(screen).toMatch(/deleted\.oneDayLeft/);
    expect(screen).toMatch(/deleted\.purge/);
  });

  it.each(LOCALES)('%s copy is 3 days, with remaining days', (locale) => {
    const purge = tLocale(locale, 'deleted.purge');
    expect(purge).toMatch(/3/);
    expect(purge).not.toMatch(/30/);
    expect(tLocale(locale, 'deleted.daysLeft', { n: 2 }).length).toBeGreaterThan(0);
    expect(tLocale(locale, 'deleted.oneDayLeft').length).toBeGreaterThan(0);
    expect(tLocale(locale, 'deleted.daysLeft', { n: 2 })).toMatch(/2/);
  });
});
