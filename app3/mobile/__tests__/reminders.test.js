import * as Notifications from 'expo-notifications';
import {
  nextTriggerDate,
  notificationTitle,
  genericNotificationTitle,
  getNotificationPermissions,
  requestNotificationPermissions,
  enforceReminderBudget,
} from '../src/notifications/reminders';
import { resetPrefsForTests, updatePrefs } from '../src/data/prefs';
import { setLocale, t } from '../src/i18n';

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

  it('snoozes overdue items from due + snoozeDays, stable across later writes', () => {
    const last = new Date(now - 20 * 864e5).toISOString();
    const activity = {
      reminderDays: 7,
      reminderTime: '09:00',
      lastDoneAt: last,
      snoozeEnabled: true,
      snoozeDays: 3,
    };
    const when = nextTriggerDate(activity, now);
    const laterWrite = nextTriggerDate(activity, now + 90 * 60 * 1000);
    expect(when.getTime()).toBe(laterWrite.getTime());
    expect(when.getTime()).toBeGreaterThan(now);
    expect(when.getTime()).not.toBe(now + 3 * 864e5);
    expect(when.getHours()).toBe(9);
    expect(when.getMinutes()).toBe(0);

    const due = new Date(new Date(last).getTime() + 7 * 864e5);
    due.setHours(9, 0, 0, 0);
    let k = Math.ceil((now - due.getTime()) / (3 * 864e5));
    if (k < 1) k = 1;
    const expected = new Date(due);
    expected.setDate(expected.getDate() + k * 3);
    expect(when.getTime()).toBeGreaterThanOrEqual(expected.getTime());
    expect(Number.isFinite(when.getTime())).toBe(true);
  });

  it('sanitizes fractional, huge, zero and negative snoozeDays without looping', () => {
    const last = new Date(now - 20 * 864e5).toISOString();
    const base = {
      reminderDays: 7,
      reminderTime: '09:00',
      lastDoneAt: last,
      snoozeEnabled: true,
    };
    for (const snoozeDays of [0.5, 1e10, 0, -3]) {
      const when = nextTriggerDate({ ...base, snoozeDays }, now);
      expect(when).toBeInstanceOf(Date);
      expect(Number.isFinite(when.getTime())).toBe(true);
      expect(when.getTime()).toBeGreaterThan(now);
    }
    const half = nextTriggerDate({ ...base, snoozeDays: 0.5 }, now);
    const asOne = nextTriggerDate({ ...base, snoozeDays: 1 }, now);
    expect(half.getTime()).toBe(asOne.getTime());
    const huge = nextTriggerDate({ ...base, snoozeDays: 1e10 }, now);
    const capped = nextTriggerDate({ ...base, snoozeDays: 365 }, now);
    expect(huge.getTime()).toBe(capped.getTime());
  });

  it('computes a finite snooze from a 2001 due date', () => {
    const when = nextTriggerDate({
      reminderDays: 7,
      reminderTime: '09:00',
      lastDoneAt: '2001-01-01T00:00:00.000Z',
      snoozeEnabled: true,
      snoozeDays: 3,
    }, now);
    expect(when).toBeInstanceOf(Date);
    expect(Number.isFinite(when.getTime())).toBe(true);
    expect(when.getTime()).toBeGreaterThan(now);
    expect(when.getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('schedules overdue items with snooze off for the next day reminderTime', () => {
    const last = new Date(now - 20 * 864e5).toISOString();
    const activity = {
      reminderDays: 7,
      reminderTime: '09:00',
      lastDoneAt: last,
      snoozeEnabled: false,
    };
    const when = nextTriggerDate(activity, now);
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 1);
    expected.setHours(9, 0, 0, 0);
    expect(when.getTime()).toBe(expected.getTime());
    expect(when.getTime()).toBeGreaterThan(now);
    expect(when.getTime()).not.toBe(now + 60 * 1000);

    const again = nextTriggerDate(activity, now);
    expect(again.getTime()).toBe(when.getTime());
  });
});

describe('notificationTitle', () => {
  beforeEach(async () => {
    await resetPrefsForTests();
  });

  it('defaults to a generic title without the item name', () => {
    setLocale('zh-Hant');
    expect(notificationTitle({ title: 'Secret item' })).toBe(genericNotificationTitle());
    expect(genericNotificationTitle()).toBe(t('notify.title'));
    expect(genericNotificationTitle()).toBe('好久沒了');
  });

  it('uses the item name only when the setting is on', async () => {
    await updatePrefs({ showNameInNotifications: true });
    expect(notificationTitle({ title: 'Secret item' })).toBe('Secret item');
  });
});

describe('permissions and scheduling', () => {
  const activity = {
    id: 'a1',
    title: 'Secret item',
    reminderDays: 7,
    reminderTime: '09:00',
    lastDoneAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 10 * 864e5).toISOString(),
    deletedAt: null,
    snoozeEnabled: true,
  };

  beforeEach(async () => {
    await resetPrefsForTests();
    jest.clearAllMocks();
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
  });

  it('getNotificationPermissions does not prompt', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    const granted = await getNotificationPermissions();
    expect(granted).toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requestNotificationPermissions prompts when not yet granted', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
    const granted = await requestNotificationPermissions();
    expect(granted).toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('enforceReminderBudget skips scheduling when permission is not granted', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    await enforceReminderBudget([activity]);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('enforceReminderBudget schedules with a generic title when granted', async () => {
    setLocale('zh-Hant');
    await enforceReminderBudget([activity]);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.content.title).toBe(genericNotificationTitle());
    expect(arg.content.body).toBe(t('notify.body'));
  });

  it('does not schedule now+1min for overdue items with snooze off', async () => {
    const overdue = {
      ...activity,
      lastDoneAt: new Date(Date.now() - 20 * 864e5).toISOString(),
      snoozeEnabled: false,
    };
    const now = Date.now();
    await enforceReminderBudget([overdue]);
    const arg = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    const when = arg.trigger.date.getTime();
    expect(when).toBeGreaterThan(now + 60 * 60 * 1000);
    expect(when).not.toBeCloseTo(now + 60 * 1000, -3);
  });
});
