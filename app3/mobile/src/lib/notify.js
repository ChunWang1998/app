import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;
let channelReady = false;

async function ensureAndroidChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('linwang', {
      name: '鄰汪',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 180, 80, 180],
    });
    channelReady = true;
  } catch {
    channelReady = true;
  }
}

export async function ensureNotifyPermission() {
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (permissionAsked && current.status !== 'undetermined') return false;
    permissionAsked = true;
    const next = await Notifications.requestPermissionsAsync();
    return next.status === 'granted';
  } catch {
    return false;
  }
}

export async function notifyUser({ title, body }) {
  const ok = await ensureNotifyPermission();
  if (!ok) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'linwang' } : {}),
      },
      trigger: null,
    });
  } catch {
    // Simulator / web without permission — ignore.
  }
}
