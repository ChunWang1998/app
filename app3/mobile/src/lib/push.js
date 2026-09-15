import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { isCloudReady, supabase } from './supabase';
import { ensureNotifyPermission } from './notify';

/** Register Expo push token with Supabase for the logged-in account. */
export async function registerPushToken(loginKey) {
  if (!loginKey || !isCloudReady()) return null;
  const ok = await ensureNotifyPermission();
  if (!ok) return null;
  try {
    const projectId =
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;
    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenRes?.data;
    if (!token) return null;
    await supabase.rpc('upsert_device_token', {
      p_key: loginKey,
      p_token: token,
      p_platform: Platform.OS,
    });
    return token;
  } catch {
    return null;
  }
}

/**
 * Ask server to push a Connect invite notification to the target.
 * Fails quietly if Edge Function is not deployed yet.
 */
export async function requestConnectPush(loginKey, toId, fromName) {
  if (!loginKey || !toId || !isCloudReady()) return;
  try {
    await supabase.functions.invoke('push-connect', {
      body: {
        loginKey,
        toId,
        fromName: fromName || '',
      },
    });
  } catch {
    // Edge Function optional until deployed.
  }
}
