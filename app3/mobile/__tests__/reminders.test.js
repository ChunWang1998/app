import { nextTriggerDate } from '../src/notifications/reminders';

describe('nextTriggerDate', () => {
  const now = Date.parse('2026-10-13T14:50:00.000Z');

  it('returns null when reminder is off', () => {
    expect(nextTriggerDate({ reminderDays: null, lastDoneAt: new Date(now).toISOString() }, now)).toBeNull();
  });

  it('schedules lastDone + days at reminderTime when still upcoming', () => {
    const last = new Date(now - 2 * 864e5).toISOString();
    const when = nextTriggerDate({
      reminderDays: 7,
      reminderTime: '09:00',
      lastDoneAt: last,
      snoozeEnabled: true,
    }, now);
    expect(when).toBeInstanceOf(Date);
    expect(when.getTime()).toBeGreaterThan(now);
    expect(when.getHours()).toBe(9);
    expect(when.getMinutes()).toBe(0);
  });

  it('snoozes overdue items by snoozeDays', () => {
    const last = new Date(now - 20 * 864e5).toISOString();
    const when = nextTriggerDate({
      reminderDays: 7,
      reminderTime: '09:00',
      lastDoneAt: last,
      snoozeEnabled: true,
      snoozeDays: 3,
    }, now);
    expect(when.getTime()).toBe(now + 3 * 864e5);
  });
});
