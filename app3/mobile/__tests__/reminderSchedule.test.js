import { migrateActivity, createActivity } from '../src/data/models';
import {
  reminderConfigFromActivity,
  reminderFieldsFromConfig,
  firstDueInstant,
  nextFireDate,
  nextRegularAfter,
  addCalendarMonths,
  addCalendarYears,
  formatReminderLabel,
  formatWeekdayList,
  hasReminder,
  MODE_WEEK,
  MODE_MONTH,
  MODE_INTERVAL,
} from '../src/lib/reminderSchedule';
import { dueInMs } from '../src/lib/time';
import { dueStatus, isDueToday } from '../src/lib/today';
import { nextDueDate } from '../src/lib/calendar';
import { nextTriggerDate } from '../src/notifications/reminders';
import { dueClassOf } from '../src/widgets/pick';
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

describe('due-status parity across app, widget and calendar', () => {
  const now = at(2026, 9, 14, 12).getTime();

  it('interval days still match historical last+N*864e5', () => {
    const last = new Date(now - 5 * 864e5).toISOString();
    const a = { lastDoneAt: last, reminderDays: 3, createdAt: last };
    expect(dueInMs(a, now)).toBe(-2 * 864e5);
    expect(dueStatus(dueInMs(a, now), now)).toBe('overdue');
  });

  it('weekly due today / overdue / upcoming agree with the widget class', () => {
    const dueFri = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [5],
      lastDoneAt: at(2026, 9, 12, 10).toISOString(),
    });
    const due = firstDueInstant(dueFri, reminderConfigFromActivity(dueFri), now);
    expect(due.getDate()).toBe(16);
    expect(dueStatus(dueInMs(dueFri, now), now)).toBe('upcoming');
    expect(dueClassOf(dueFri, now)).not.toBe('od');

    const missedMon = item({
      reminderMode: MODE_WEEK,
      reminderWeekdays: [1],
      lastDoneAt: at(2026, 9, 5, 10).toISOString(),
    });
    expect(dueStatus(dueInMs(missedMon, now), now)).toBe('overdue');
    expect(dueClassOf(missedMon, now)).toBe('od');
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

  it('keeps interval-day presets short', () => {
    setLocale('en');
    expect(formatReminderLabel({ reminderDays: 90 }, 'en')).toBe('3 months');
    expect(formatReminderLabel({ reminderDays: 90 }, 'zh-Hant')).toBe('3 個月');
    expect(formatReminderLabel({ reminderDays: 7 }, 'ja')).toBe('毎週');
  });
});
