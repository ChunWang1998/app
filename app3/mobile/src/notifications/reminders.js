import * as Notifications from 'expo-notifications';
import { getPrefs } from '../data/prefs';

const MAX_IOS_PENDING = 64;
const CHANNEL_ID = 'default';

export const GENERIC_NOTIFICATION_TITLE = '好久沒了';

function parseHm(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || '09:00'));
  if (!m) return { h: 9, min: 0 };
  return { h: Math.min(23, Number(m[1])), min: Math.min(59, Number(m[2])) };
}

/**
 * Next fire time: lastDone (or created) + reminderDays, at reminderTime.
 * Overdue + snooze → due + k * snoozeDays (default 3) until after now.
 *   Anchored on due, not on the current write, so opening the app does not
 *   keep pushing the reminder out.
 * Overdue without snooze → next day's reminderTime (never now+1min).
 */
export function nextTriggerDate(activity, now = Date.now()) {
  if (!activity || !activity.reminderDays || activity.deletedAt) return null;
  const base = new Date(activity.lastDoneAt || activity.createdAt);
  if (Number.isNaN(base.getTime())) return null;
  const due = new Date(base.getTime() + activity.reminderDays * 864e5);
  const { h, min } = parseHm(activity.reminderTime);
  due.setHours(h, min, 0, 0);
  if (due.getTime() > now) return due;
  if (activity.snoozeEnabled !== false) {
    const days = Number.isFinite(activity.snoozeDays) && activity.snoozeDays > 0
      ? activity.snoozeDays
      : 3;
    const when = new Date(due);
    when.setDate(when.getDate() + days);
    while (when.getTime() <= now) {
      when.setDate(when.getDate() + days);
    }
    return when;
  }
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(h, min, 0, 0);
  if (next.getTime() <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function notificationTitle(activity) {
  const prefs = getPrefs();
  if (prefs.showNameInNotifications === true && activity?.title) {
    return activity.title;
  }
  return GENERIC_NOTIFICATION_TITLE;
}

async function ensureChannel() {
  try {
    await Notifications.setNotificationChannelAsync?.(CHANNEL_ID, {
      name: 'Reminders',
      importance: 3,
    });
  } catch {
    // android only / web no-op
  }
}

/** Read current permission. Does not prompt. */
export async function getNotificationPermissions() {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) await ensureChannel();
  return !!cur.granted;
}

/** Prompt only when the user turns a reminder on. */
export async function requestNotificationPermissions() {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) {
    await ensureChannel();
    return true;
  }
  const next = await Notifications.requestPermissionsAsync();
  if (next.granted) await ensureChannel();
  return !!next.granted;
}

export async function enforceReminderBudget(activities) {
  const granted = await getNotificationPermissions();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) return;

  const candidates = (activities || [])
    .filter((a) => !a.deletedAt && a.reminderDays)
    .map((a) => ({ a, when: nextTriggerDate(a) }))
    .filter((x) => x.when)
    .sort((x, y) => x.when.getTime() - y.when.getTime());

  const keep = candidates.slice(0, MAX_IOS_PENDING);
  for (const { a, when } of keep) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle(a),
        body: '該做這件事了',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
  }
}

export async function refreshAllReminders() {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}
