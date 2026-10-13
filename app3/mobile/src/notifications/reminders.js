import * as Notifications from 'expo-notifications';

// Strategy: at most one scheduled notification per activity.
// Next trigger = (lastDoneAt || createdAt) + reminderDays.
// Enforce iOS max 64 pending: if more, keep the soonest 64.

const MAX_IOS_PENDING = 64;
const CHANNEL_ID = 'default';

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
    // android only
  }
}

export function nextTriggerDate(activity) {
  if (!activity || !activity.reminderDays || activity.deletedAt) return null;
  const base = new Date(activity.lastDoneAt || activity.createdAt);
  const next = new Date(base.getTime() + activity.reminderDays * 24 * 60 * 60 * 1000);
  const now = Date.now();
  if (next.getTime() <= now) {
    // overdue: schedule for soon (in 1 minute)
    return new Date(now + 60 * 1000);
  }
  return next;
}

export async function enforceReminderBudget(activities) {
  // cancel all and reschedule to keep it simple and deterministic
  await Notifications.cancelAllScheduledNotificationsAsync();
  const candidates = (activities || [])
    .filter((a) => !a.deletedAt && a.reminderDays)
    .map((a) => ({ a, when: nextTriggerDate(a) }))
    .filter((x) => !!x.when)
    .sort((x, y) => x.when.getTime() - y.when.getTime());

  const keep = candidates.slice(0, MAX_IOS_PENDING);
  for (const { a, when } of keep) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: a.title,
        body: 'Time to do this again',
        sound: true,
      },
      trigger: when,
    });
  }
}

export async function refreshAllReminders() {
  // This placeholder provides a simple manual refresh hook;
  // actual scheduling is triggered by repository persist.
  // Here we query current scheduled for debugging.
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}
