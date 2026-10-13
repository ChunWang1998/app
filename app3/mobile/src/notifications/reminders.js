import * as Notifications from 'expo-notifications';

const MAX_IOS_PENDING = 64;
const CHANNEL_ID = 'default';

function parseHm(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || '09:00'));
  if (!m) return { h: 9, min: 0 };
  return { h: Math.min(23, Number(m[1])), min: Math.min(59, Number(m[2])) };
}

/**
 * Next fire time: lastDone (or created) + reminderDays, at reminderTime.
 * Overdue + snooze → now + snoozeDays (default 3). Overdue without snooze → +1 minute.
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
    const days = Number.isFinite(activity.snoozeDays) ? activity.snoozeDays : 3;
    return new Date(now + days * 864e5);
  }
  return new Date(now + 60 * 1000);
}

export async function ensureNotificationPermissions() {
  const cur = await Notifications.getPermissionsAsync();
  if (!cur.granted) {
    await Notifications.requestPermissionsAsync();
  }
  try {
    await Notifications.setNotificationChannelAsync?.(CHANNEL_ID, {
      name: 'Reminders',
      importance: 3,
    });
  } catch {
    // android only / web no-op
  }
}

export async function enforceReminderBudget(activities) {
  await ensureNotificationPermissions();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const candidates = (activities || [])
    .filter((a) => !a.deletedAt && a.reminderDays)
    .map((a) => ({ a, when: nextTriggerDate(a) }))
    .filter((x) => x.when)
    .sort((x, y) => x.when.getTime() - y.when.getTime());

  const keep = candidates.slice(0, MAX_IOS_PENDING);
  for (const { a, when } of keep) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: a.title,
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
