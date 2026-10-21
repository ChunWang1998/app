import { migrateActivity, createActivity } from '../src/data/models';
import {
  reminderConfigFromActivity,
  reminderFieldsFromConfig,
  ensureReminderEnabled,
  defaultReminderConfig,
  firstDueInstant,
  nextFireDate,
  nextRegularAfter,
  addCalendarMonths,
  addCalendarYears,
  formatReminderLabel,
  formatNextOccurrence,
  formatWeekdayList,
  hasReminder,
  clampMonthDay,
  sanitizeReminderTime,
  importedReminderTime,
  parseHm,
  formatHm,
  DEFAULT_REMINDER_TIME,
  MODE_WEEK,
  MODE_MONTH,
  MODE_INTERVAL,
} from '../src/lib/reminderSchedule';
import { dueInMs } from '../src/lib/time';
import { dueStatus, isDueToday } from '../src/lib/today';
import { nextDueDate } from '../src/lib/calendar';
import { nextTriggerDate } from '../src/notifications/reminders';
import { setLocale } from '../src/i18n';

function at(y, mo, d, h = 12, min = 0) {
  return new Date(y, mo, d, h, min, 0, 0);
}

function item(extra) {
  return {
    id: 'x',
    title: 'X',
    lastDoneAt: at(2026, 9, 14, 10).toISOString(),
    createdAt: at(2026, 8, 1).toISOString(),
    reminderTime: '09:00',
    snoozeEnabled: true,
    snoozeDays: 3,
    ...extra,
  };
}

describe('migration of reminderDays', () => {
  it('turns a days-only row into interval / days', () => {
    const migrated = migrateActivity({
      id: 'a',
      title: 'Brush',
      lastDoneAt: null,
      reminderDays: 90,
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
      deletedAt: null,
    });
    expect(migrated.reminderMode).toBe(MODE_INTERVAL);
    expect(migrated.reminderUnit).toBe('d');
    expect(migrated.reminderN).toBe(90);
    expect(migrated.reminderDays).toBe(90);
    const cfg = reminderConfigFromActivity({ reminderDays: 90 });
    expect(cfg).toMatchObject({ enabled: true, mode: MODE_INTERVAL, unit: 'd', n: 90 });
  });

  it('keeps reminders off when reminderDays is null', () => {
    const migrated = migrateActivity({
      id: 'a',
      title: 'X',
      lastDoneAt: null,
      reminderDays: null,
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
      deletedAt: null,
    });
    expect(migrated.reminderDays).toBeNull();
    expect(migrated.reminderMode).toBeNull();
    expect(hasReminder(migrated)).toBe(false);
  });

  it('createActivity with reminderDays 7 is interval days', () => {
    const a = createActivity({ title: 'Y', reminderDays: 7 });
    expect(a.reminderMode).toBe(MODE_INTERVAL);
    expect(a.reminderN).toBe(7);
    expect(a.reminderDays).toBe(7);
  });

  it.each([400, 3650])('keeps legacy reminderDays of %i unchanged (schema max 3650, not 365)', (days) => {
    const migrated = migrateActivity({
      id: 'a',
      title: 'Long',
      lastDoneAt: null,
      reminderDays: days,
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
      deletedAt: null,
    });
    expect(migrated.reminderMode).toBe(MODE_INTERVAL);
    expect(migrated.reminderUnit).toBe('d');
    expect(migrated.reminderN).toBe(days);
    expect(migrated.reminderDays).toBe(days);
    expect(reminderConfigFromActivity({ reminderDays: days }).n).toBe(days);
    expect(reminderConfigFromActivity(migrated).n).toBe(days);
  });

  it('defaults a missing reminderTime to 09:00 without turning reminders on', () => {
    const off = migrateActivity({
      id: 'a',
      title: 'X',
      lastDoneAt: null,
      reminderDays: null,
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
      deletedAt: null,
    });
    expect(off.reminderTime).toBe(DEFAULT_REMINDER_TIME);
    expect(hasReminder(off)).toBe(false);
    expect(off.reminderMode).toBeNull();

    const on = migrateActivity({
      id: 'b',
      title: 'Y',
      lastDoneAt: null,
      reminderDays: 7,
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
      deletedAt: null,
    });
    expect(on.reminderTime).toBe('09:00');
    expect(hasReminder(on)).toBe(true);
    expect(createActivity({ title: 'Z' }).reminderTime).toBe('09:00');
    expect(hasReminder(createActivity({ title: 'Z' }))).toBe(false);
  });

  it('clamps out-of-range hour and minute on migrate, keeps a valid time', () => {
    expect(sanitizeReminderTime(undefined)).toBe('09:00');
    expect(sanitizeReminderTime('')).toBe('09:00');
    expect(sanitizeReminderTime('18:30')).toBe('18:30');
    expect(sanitizeReminderTime('9:05')).toBe('09:05');
    expect(sanitizeReminderTime('25:00')).toBe('23:00');
    expect(sanitizeReminderTime('00:99')).toBe('00:59');
    expect(sanitizeReminderTime('-1:00')).toBeNull();
    expect(parseHm('25:99')).toEqual({ h: 23, min: 59 });
    expect(parseHm('0:00')).toEqual({ h: 0, min: 0 });
    expect(formatHm(24, 60)).toBe('23:59');
    expect(formatHm(-3, -1)).toBe('00:00');
    const migrated = migrateActivity({
      id: 'a',
      title: 'Late',
      lastDoneAt: null,
      reminderDays: 1,
      reminderTime: '25:70',
      createdAt: '2026-10-13T00:00:00.000Z',
      updatedAt: '2026-10-13T00:00:00.000Z',
      deletedAt: null,
    });
    expect(migrated.reminderTime).toBe('23:59');
    expect(hasReminder(migrated)).toBe(true);
  });
});

describe('import reminderTime validation', () => {
  it('rejects unpadded, out-of-range, and garbage values', () => {
    expect(importedReminderTime(undefined)).toBeUndefined();
    expect(importedReminderTime('09:00')).toBe('09:00');
    expect(importedReminderTime('00:00')).toBe('00:00');
    expect(importedReminderTime('23:59')).toBe('23:59');
    for (const bad of ['', null, '9:00', '24:00', '09:60', '25:00', 'ab:cd', '09:00:00', 900, {}]) {
      expect(() => importedReminderTime(bad)).toThrow(/invalid reminderTime/);
    }
  });
});

describe('weekly scheduling after 剛剛做了', () => {
  const now = at(2026, 9, 14, 13).getTime(); // Wednesday

  it('skips the last-done day and jumps to the next matching weekday', () => {
    const a = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1, 3, 5],
      lastDoneAt: at(2026, 9, 14, 10).toISOString(), // Wednesday, just did
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a), now);
    expect(due.getDay()).toBe(5); // Friday
    expect(due.getDate()).toBe(16);
    expect(due.getHours()).toBe(9);
  });

  it('from Monday+Thursday, next after Monday log is Thursday', () => {
    const a = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1, 4],
      lastDoneAt: at(2026, 9, 12, 11).toISOString(), // Monday
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a), now);
    expect(due.getDay()).toBe(4);
    expect(due.getDate()).toBe(15);
  });

  it('never drops the last remaining weekday', () => {
    const fields = reminderFieldsFromConfig({
      enabled: true,
      mode: MODE_WEEK,
      weekdays: [1],
      time: '09:00',
    });
    expect(fields.reminderWeekdays).toEqual([1]);
  });
});

describe('monthly short months and leap years', () => {
  it('fires on the last day when 29–31 do not exist', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 31,
      lastDoneAt: at(2026, 0, 31, 8).toISOString(), // Jan 31
      reminderTime: '09:00',
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(1);
    expect(due.getDate()).toBe(28); // Feb 2026 is not leap
  });

  it('uses Feb 29 in a leap year', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 29,
      lastDoneAt: at(2028, 0, 29, 8).toISOString(),
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(1);
    expect(due.getDate()).toBe(29);
  });

  it('clamps 31 to the last local day of Apr/Jun/Sep/Nov', () => {
    expect(clampMonthDay(2026, 3, 31)).toBe(30);
    expect(clampMonthDay(2026, 5, 31)).toBe(30);
    expect(clampMonthDay(2026, 8, 31)).toBe(30);
    expect(clampMonthDay(2026, 10, 31)).toBe(30);
    expect(clampMonthDay(2026, 0, 31)).toBe(31);
    expect(clampMonthDay(2026, 1, 31)).toBe(28);
    expect(clampMonthDay(2028, 1, 31)).toBe(29);
    expect(clampMonthDay(2028, 1, 29)).toBe(29);
  });

  it('after May 31, the 31st lands on Jun 30; notify and next copy match', () => {
    setLocale('en');
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 31,
      lastDoneAt: at(2026, 4, 31, 8).toISOString(),
      reminderTime: '09:00',
    });
    const cfg = reminderConfigFromActivity(a);
    const due = firstDueInstant(a, cfg);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(5);
    expect(due.getDate()).toBe(30);
    expect(due.getHours()).toBe(9);
    const now = at(2026, 5, 1, 12).getTime();
    const fire = nextFireDate(a, now);
    expect(fire.getMonth()).toBe(5);
    expect(fire.getDate()).toBe(30);
    expect(fire.getHours()).toBe(9);
    expect(nextTriggerDate(a, now).getTime()).toBe(fire.getTime());
    expect(nextDueDate(a, new Date(now)).getDate()).toBe(30);
    expect(formatNextOccurrence(due, 'en', now)).toMatch(/6\/30/);
    expect(formatNextOccurrence(due, 'zh-Hant', now)).toMatch(/6\/30/);
  });

  it('keeps the stored 31st so later 31-day months still fire on the 31st', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 31,
      lastDoneAt: at(2026, 5, 30, 8).toISOString(), // Jun 30 (clamped)
      reminderTime: '09:00',
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(6);
    expect(due.getDate()).toBe(31);
  });

  it('uses local Y-M-D so a UTC ISO stamp cannot skip the clamped day', () => {
    const local = at(2026, 3, 30, 9);
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 31,
      lastDoneAt: local.toISOString(),
      reminderTime: '09:00',
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(4);
    expect(due.getDate()).toBe(31);
    const roundTrip = new Date(due.toISOString());
    expect(roundTrip.getDate()).toBe(31);
    expect(roundTrip.getHours()).toBe(9);
  });

  it('monthly 31st after Oct 31 lands on Nov 30 and stays 09:00 across DST', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 31,
      lastDoneAt: at(2026, 9, 31, 10).toISOString(),
      reminderTime: '09:00',
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(10);
    expect(due.getDate()).toBe(30);
    expect(due.getHours()).toBe(9);
  });

  it('after logging on the 15th, jumps to next month the 15th', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 15,
      lastDoneAt: at(2026, 9, 15, 10).toISOString(),
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(10);
    expect(due.getDate()).toBe(15);
  });
});

describe('interval months and years keep the same calendar day', () => {
  it('Jan 31 + 1 month is Feb 28, + 2 months is Mar 31', () => {
    const jan31 = at(2026, 0, 31, 10);
    const feb = addCalendarMonths(jan31, 1, 31);
    const mar = addCalendarMonths(jan31, 2, 31);
    expect(feb.getMonth()).toBe(1);
    expect(feb.getDate()).toBe(28);
    expect(mar.getMonth()).toBe(2);
    expect(mar.getDate()).toBe(31);
  });

  it('Feb 29 + 1 year is Feb 28 in a common year', () => {
    const leap = at(2028, 1, 29, 10);
    const next = addCalendarYears(leap, 1, 29);
    expect(next.getFullYear()).toBe(2029);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
    const leapAgain = addCalendarYears(leap, 4, 29);
    expect(leapAgain.getFullYear()).toBe(2032);
    expect(leapAgain.getDate()).toBe(29);
  });

  it('schedules interval months from last done', () => {
    const a = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'm',
      reminderN: 3,
      lastDoneAt: at(2026, 0, 15, 8).toISOString(),
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(3);
    expect(due.getDate()).toBe(15);
    expect(due.getHours()).toBe(9);
  });
});

describe('interval-day next time uses reminderTime everywhere', () => {
  it('preview, notification and calendar agree on 90 days at 09:00', () => {
    const last = at(2026, 9, 14, 23, 28);
    const now = at(2026, 9, 14, 23, 40).getTime();
    const a = item({
      reminderDays: 90,
      reminderTime: '09:00',
      lastDoneAt: last.toISOString(),
      createdAt: last.toISOString(),
    });
    const cfg = reminderConfigFromActivity(a);
    const due = firstDueInstant(a, cfg, now);
    expect(due.getFullYear()).toBe(2027);
    expect(due.getMonth()).toBe(0);
    expect(due.getDate()).toBe(12);
    expect(due.getHours()).toBe(9);
    expect(due.getMinutes()).toBe(0);
    expect(due.getTime()).not.toBe(last.getTime() + 90 * 864e5);

    const preview = formatNextOccurrence(due, 'zh-Hant', now);
    expect(preview).toMatch(/09:00/);
    expect(preview).not.toMatch(/23:28/);

    const fire = nextTriggerDate(a, now);
    expect(fire.getTime()).toBe(due.getTime());
    expect(nextFireDate(a, now).getHours()).toBe(9);

    expect(dueInMs(a, now)).toBe(due.getTime() - now);

    const cal = nextDueDate(a, new Date(now));
    expect(cal.getFullYear()).toBe(2027);
    expect(cal.getMonth()).toBe(0);
    expect(cal.getDate()).toBe(12);
  });
});

describe('snooze cap', () => {
  it('does not snooze past the next weekly occurrence', () => {
    const now = at(2026, 9, 13, 12).getTime(); // Tuesday
    const a = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1, 4],
      lastDoneAt: at(2026, 9, 8, 10).toISOString(), // Thursday; next due was Monday 12th
      snoozeEnabled: true,
      snoozeDays: 3,
      reminderTime: '09:00',
    });
    const fire = nextFireDate(a, now);
    // Missed Monday 12th 09:00; snooze +3d would be Thursday 15th, which is the next regular.
    expect(fire.getDay()).toBe(4);
    expect(fire.getDate()).toBe(15);
    const regular = nextRegularAfter(a, reminderConfigFromActivity(a), firstDueInstant(a, reminderConfigFromActivity(a)));
    expect(fire.getTime()).toBe(regular.getTime());
  });

  it('caps a 1-day interval snooze at the next day, not +3', () => {
    const now = at(2026, 9, 14, 15).getTime();
    const a = item({
      reminderDays: 1,
      lastDoneAt: at(2026, 9, 13, 10).toISOString(),
      snoozeEnabled: true,
      snoozeDays: 3,
      reminderTime: '09:00',
    });
    const fire = nextTriggerDate(a, now);
    expect(fire.getDate()).toBe(15);
    expect(fire.getHours()).toBe(9);
    const plus3 = new Date(now + 3 * 864e5);
    expect(fire.getTime()).toBeLessThan(plus3.getTime());
  });
});

describe('due-status parity across app and calendar', () => {
  const now = at(2026, 9, 14, 12).getTime();

  it('interval days fire at reminderTime, not last + N×864e5', () => {
    const last = at(2026, 9, 9, 23, 28);
    const a = {
      lastDoneAt: last.toISOString(),
      reminderDays: 3,
      reminderTime: '09:00',
      createdAt: last.toISOString(),
    };
    const due = firstDueInstant(a, reminderConfigFromActivity(a), now);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(9);
    expect(due.getDate()).toBe(12);
    expect(due.getHours()).toBe(9);
    expect(due.getMinutes()).toBe(0);
    expect(due.getTime()).not.toBe(last.getTime() + 3 * 864e5);
    expect(dueStatus(dueInMs(a, now), now)).toBe('overdue');
    expect(nextTriggerDate(a, now).getHours()).toBe(9);
    const cal = nextDueDate(a, new Date(now));
    expect(cal.getDate()).toBe(12);
    expect(cal.getHours()).toBe(0);
  });

  it('weekly due today / overdue / upcoming agree with the app status', () => {
    const dueFri = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [5],
      lastDoneAt: at(2026, 9, 12, 10).toISOString(),
    });
    const due = firstDueInstant(dueFri, reminderConfigFromActivity(dueFri), now);
    expect(due.getDate()).toBe(16);
    expect(dueStatus(dueInMs(dueFri, now), now)).toBe('upcoming');

    const missedMon = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1],
      lastDoneAt: at(2026, 9, 5, 10).toISOString(),
    });
    expect(dueStatus(dueInMs(missedMon, now), now)).toBe('overdue');
    expect(isDueToday(missedMon, now)).toBe(true);
    const cal = nextDueDate(missedMon, new Date(now));
    expect(cal.getDay()).toBe(1);
  });
});

describe('natural copy en / zh-Hant / ja', () => {
  const weekly = {
    reminderMode: MODE_WEEK,
    reminderWeekdays: [1, 4],
    reminderTime: '09:00',
    reminderDays: null,
  };
  const monthly = {
    reminderMode: MODE_MONTH,
    reminderMonthDay: 15,
    reminderTime: '09:00',
    reminderDays: null,
  };

  it('formats weekly and monthly labels', () => {
    expect(formatReminderLabel(weekly, 'en')).toBe('Every Mon, Thu');
    expect(formatReminderLabel(weekly, 'zh-Hant')).toBe('每週一、四');
    expect(formatReminderLabel(weekly, 'ja')).toBe('毎週月・木');
    expect(formatReminderLabel(monthly, 'en')).toBe('Monthly on the 15th');
    expect(formatReminderLabel(monthly, 'zh-Hant')).toBe('每月 15 日');
    expect(formatReminderLabel(monthly, 'ja')).toBe('毎月15日');
    expect(formatWeekdayList([1, 4], 'zh-Hant')).toBe('一、四');
  });

  it.each([
    ['en', 5, 'Monthly on the 5th'],
    ['zh-Hant', 5, '每月 5 日'],
    ['ja', 5, '毎月5日'],
    ['de', 5, 'Monatlich am 5.'],
    ['fr', 5, 'Le 5 du mois'],
    ['en', 1, 'Monthly on the 1st'],
    ['de', 31, 'Monatlich am 31.'],
    ['fr', 31, 'Le 31 du mois'],
  ])('%s day %s label', (loc, day, copy) => {
    expect(formatReminderLabel({
      reminderMode: MODE_MONTH,
      reminderMonthDay: day,
      reminderTime: '09:00',
    }, loc)).toBe(copy);
  });

  it('keeps interval-day presets short, with 每 / Every on numeric chips', () => {
    setLocale('en');
    expect(formatReminderLabel({ reminderDays: 90 }, 'en')).toBe('Every 3 months');
    expect(formatReminderLabel({ reminderDays: 90 }, 'zh-Hant')).toBe('每 3 個月');
    expect(formatReminderLabel({ reminderDays: 90 }, 'ja')).toBe('3か月ごと');
    expect(formatReminderLabel({ reminderDays: 14 }, 'en')).toBe('Every 2 weeks');
    expect(formatReminderLabel({ reminderDays: 14 }, 'zh-Hant')).toBe('每 2 週');
    expect(formatReminderLabel({ reminderDays: 14 }, 'ja')).toBe('2週間ごと');
    expect(formatReminderLabel({ reminderDays: 7 }, 'ja')).toBe('毎週');
  });
});

describe('ensureReminderEnabled for add-screen 更多…', () => {
  it('turns a default-off draft on without changing the interval', () => {
    const off = defaultReminderConfig();
    expect(off.enabled).toBe(false);
    const on = ensureReminderEnabled(off);
    expect(on.enabled).toBe(true);
    expect(on.mode).toBe(MODE_INTERVAL);
    expect(on.unit).toBe('d');
    expect(on.n).toBe(14);
    expect(ensureReminderEnabled({
      ...off,
      enabled: true,
      mode: MODE_WEEK,
      weekdays: [1, 4],
    }).mode).toBe(MODE_WEEK);
  });
});

describe('long-overdue next occurrence from last-done + k periods', () => {
  // Wednesday 2026-10-14. Last done Monday 2000-01-03.
  const nowDate = at(2026, 9, 14, 12);
  const now = nowDate.getTime();
  const lastMon = at(2000, 0, 3, 10);

  it('every 7 days from Monday 2000-01-03 stays on Monday (not a clamped Thursday)', () => {
    expect(lastMon.getDay()).toBe(1);
    expect(nowDate.getDay()).toBe(3);
    const a = item({
      reminderDays: 7,
      lastDoneAt: lastMon.toISOString(),
      reminderTime: '09:00',
      snoozeEnabled: true,
      snoozeDays: 365,
    });
    const cfg = reminderConfigFromActivity(a);
    const next = nextRegularAfter(a, cfg, nowDate);
    expect(next.getDay()).toBe(1);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(19);
    expect(next.getHours()).toBe(9);
    expect(next.getTime()).toBeGreaterThan(now);
    const fire = nextFireDate(a, now);
    expect(fire.getDay()).toBe(1);
    expect(fire.getDate()).toBe(19);
  });

  it('interval weeks from Monday 2000-01-03 stay on Monday', () => {
    const a = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'w',
      reminderN: 1,
      lastDoneAt: lastMon.toISOString(),
      reminderTime: '09:00',
    });
    const next = nextRegularAfter(a, reminderConfigFromActivity(a), nowDate);
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(19);
    expect(next.getHours()).toBe(9);
  });

  it('interval months keep the same calendar day', () => {
    const a = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'm',
      reminderN: 1,
      lastDoneAt: at(2000, 0, 15, 10).toISOString(),
      reminderTime: '09:00',
    });
    const next = nextRegularAfter(a, reminderConfigFromActivity(a), nowDate);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(15);
    expect(next.getHours()).toBe(9);
    expect(next.getTime()).toBeGreaterThan(now);
  });

  it('interval years keep the same calendar day', () => {
    const a = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'y',
      reminderN: 1,
      lastDoneAt: lastMon.toISOString(),
      reminderTime: '09:00',
    });
    const next = nextRegularAfter(a, reminderConfigFromActivity(a), nowDate);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(3);
    expect(next.getHours()).toBe(9);
  });

  it('weekly Mondays jump to the next Monday after now', () => {
    const a = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1],
      lastDoneAt: lastMon.toISOString(),
      reminderTime: '09:00',
      snoozeEnabled: true,
      snoozeDays: 365,
    });
    const fire = nextFireDate(a, now);
    expect(fire.getDay()).toBe(1);
    expect(fire.getDate()).toBe(19);
    expect(fire.getHours()).toBe(9);
  });

  it('monthly on the 15th jumps to this month if that day is still upcoming', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 15,
      lastDoneAt: at(2000, 0, 15, 10).toISOString(),
      reminderTime: '09:00',
      snoozeEnabled: true,
      snoozeDays: 365,
    });
    const fire = nextFireDate(a, now);
    expect(fire.getFullYear()).toBe(2026);
    expect(fire.getMonth()).toBe(9);
    expect(fire.getDate()).toBe(15);
    expect(fire.getHours()).toBe(9);
  });

  it('keeps the weekday across a US DST fall-back', () => {
    // US DST ends 2026-11-01. Last done is the Monday before; now is the Wednesday after.
    const last = at(2026, 9, 26, 10); // Monday Oct 26
    const afterDst = at(2026, 10, 4, 12); // Wednesday Nov 4
    expect(last.getDay()).toBe(1);
    expect(afterDst.getDay()).toBe(3);
    const a = item({
      reminderDays: 7,
      lastDoneAt: last.toISOString(),
      reminderTime: '09:00',
    });
    const next = nextRegularAfter(a, reminderConfigFromActivity(a), afterDst);
    expect(next.getDay()).toBe(1);
    expect(next.getMonth()).toBe(10);
    expect(next.getDate()).toBe(9);
    expect(next.getHours()).toBe(9);
  });
});

describe('each frequency fires at the chosen local time', () => {
  it('interval days at 18:30, and a later edit reschedules', () => {
    const last = at(2026, 9, 14, 10);
    const now = at(2026, 9, 14, 12).getTime();
    const a = item({
      reminderDays: 7,
      reminderTime: '18:30',
      lastDoneAt: last.toISOString(),
      createdAt: last.toISOString(),
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a), now);
    expect(due.getDate()).toBe(21);
    expect(due.getHours()).toBe(18);
    expect(due.getMinutes()).toBe(30);
    expect(nextFireDate(a, now).getTime()).toBe(due.getTime());
    expect(nextTriggerDate(a, now).getHours()).toBe(18);

    const edited = { ...a, reminderTime: '07:05' };
    const again = nextFireDate(edited, now);
    expect(again.getHours()).toBe(7);
    expect(again.getMinutes()).toBe(5);
    expect(again.getTime()).not.toBe(due.getTime());
  });

  it('interval weeks / months / years keep the clock time', () => {
    const last = at(2026, 0, 15, 8);
    const week = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'w',
      reminderN: 2,
      reminderTime: '21:15',
      lastDoneAt: last.toISOString(),
    });
    const wDue = firstDueInstant(week, reminderConfigFromActivity(week));
    expect(wDue.getHours()).toBe(21);
    expect(wDue.getMinutes()).toBe(15);

    const month = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'm',
      reminderN: 1,
      reminderTime: '14:00',
      lastDoneAt: last.toISOString(),
    });
    const mDue = firstDueInstant(month, reminderConfigFromActivity(month));
    expect(mDue.getMonth()).toBe(1);
    expect(mDue.getDate()).toBe(15);
    expect(mDue.getHours()).toBe(14);

    const year = item({
      reminderMode: MODE_INTERVAL,
      reminderUnit: 'y',
      reminderN: 1,
      reminderTime: '06:45',
      lastDoneAt: last.toISOString(),
    });
    const yDue = firstDueInstant(year, reminderConfigFromActivity(year));
    expect(yDue.getFullYear()).toBe(2027);
    expect(yDue.getHours()).toBe(6);
    expect(yDue.getMinutes()).toBe(45);
  });

  it('weekly matching days fire at 07:15', () => {
    const now = at(2026, 9, 14, 13).getTime();
    const a = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1, 5],
      reminderTime: '07:15',
      lastDoneAt: at(2026, 9, 14, 10).toISOString(),
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a), now);
    expect(due.getDay()).toBe(5);
    expect(due.getDate()).toBe(16);
    expect(due.getHours()).toBe(7);
    expect(due.getMinutes()).toBe(15);
    expect(nextTriggerDate(a, now).getTime()).toBe(due.getTime());
  });

  it('monthly day N including short months uses the chosen time', () => {
    const a = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 31,
      reminderTime: '21:45',
      lastDoneAt: at(2026, 0, 31, 8).toISOString(),
    });
    const due = firstDueInstant(a, reminderConfigFromActivity(a));
    expect(due.getMonth()).toBe(1);
    expect(due.getDate()).toBe(28);
    expect(due.getHours()).toBe(21);
    expect(due.getMinutes()).toBe(45);

    const mid = item({
      reminderMode: MODE_MONTH,
      reminderMonthDay: 15,
      reminderTime: '11:00',
      lastDoneAt: at(2026, 9, 15, 10).toISOString(),
    });
    const midDue = firstDueInstant(mid, reminderConfigFromActivity(mid));
    expect(midDue.getMonth()).toBe(10);
    expect(midDue.getDate()).toBe(15);
    expect(midDue.getHours()).toBe(11);
    expect(nextFireDate(mid, at(2026, 9, 20, 12).getTime()).getHours()).toBe(11);
  });
});
