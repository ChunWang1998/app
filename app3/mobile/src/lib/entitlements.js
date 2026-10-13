import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_KEY = 'beenages/proUnlocked/v1';

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
    } else {
      await AsyncStorage.removeItem(PRO_KEY);
    }
  } catch {
    // ignore
  }
}

export async function clearProUnlocked() {
  try {
    await AsyncStorage.removeItem(PRO_KEY);
  } catch {
    // ignore
  }
}
