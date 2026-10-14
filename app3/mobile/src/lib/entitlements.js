import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_KEY = 'beenages/proUnlocked/v1';
const EMPTY_PURCHASE_STREAK_KEY = 'beenages/emptyPurchaseStreak/v1';

export async function isProUnlocked() {
  try {
    const v = await AsyncStorage.getItem(PRO_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setProUnlocked(unlocked) {
  try {
    if (unlocked) {
      await AsyncStorage.setItem(PRO_KEY, '1');
      await AsyncStorage.removeItem(EMPTY_PURCHASE_STREAK_KEY);
    } else {
      await AsyncStorage.removeItem(PRO_KEY);
    }
  } catch {
    // ignore
  }
  try {
    require('../widgets/sync').scheduleWidgetSync();
  } catch {}
}

export async function clearProUnlocked() {
  try {
    await AsyncStorage.removeItem(PRO_KEY);
    await AsyncStorage.removeItem(EMPTY_PURCHASE_STREAK_KEY);
  } catch {
    // ignore
  }
  try {
    require('../widgets/sync').scheduleWidgetSync();
  } catch {}
}

export async function getEmptyPurchaseStreak() {
  try {
    const v = await AsyncStorage.getItem(EMPTY_PURCHASE_STREAK_KEY);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function setEmptyPurchaseStreak(n) {
  try {
    if (n <= 0) {
      await AsyncStorage.removeItem(EMPTY_PURCHASE_STREAK_KEY);
    } else {
      await AsyncStorage.setItem(EMPTY_PURCHASE_STREAK_KEY, String(n));
    }
  } catch {
    // ignore
  }
}
