import * as Notifications from 'expo-notifications';
import { getPrefs } from '../data/prefs';
import { t } from '../i18n';
import {
  hasReminder,
  nextFireDate,
  formatReminderLabel,
} from '../lib/reminderSchedule';

const MAX_IOS_PENDING = 64;
const CHANNEL_ID = 'default';

export function genericNotificationTitle() {
  return t('notify.title');
}

/**
 * Next fire time from the shared scheduler (interval / weekly / monthly).
 * Overdue + snooze → due + k * snoozeDays until after now, never past the
 * next regular occurrence. Overdue without snooze → next day's reminderTime
 * (or the next regular occurrence if that is sooner). Never now+1min.
 */
export function nextTriggerDate(activity, now = Date.now()) {
  return nextFireDate(activity, now);
}

export function notificationTitle(activity) {
  const prefs = getPrefs();
  if (prefs.showNameInNotifications === true && activity?.title) {
    return activity.title;
  }
  return genericNotificationTitle();
}

async function ensureChannel() {
  try {
    await Notifications.setNotificationChannelAsync?.(CHANNEL_ID, {
      name: t('notify.channel'),
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
    .filter((a) => !a.deletedAt && hasReminder(a))
    .map((a) => ({ a, when: nextTriggerDate(a) }))
    .filter((x) => x.when)
    .sort((x, y) => x.when.getTime() - y.when.getTime());

  const keep = candidates.slice(0, MAX_IOS_PENDING);
  for (const { a, when } of keep) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle(a),
        body: formatReminderLabel(a) || t('notify.body'),
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
