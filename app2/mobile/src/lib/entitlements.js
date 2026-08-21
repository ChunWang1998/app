import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_KEY = 'toiletgo:proUnlocked';

/** @returns {Promise<boolean>} */
export async function isProUnlocked() {
  try {
    return (await AsyncStorage.getItem(PRO_KEY)) === '1';
  } catch {
    return false;
  }
}

/** @param {boolean} value */
export async function setProUnlocked(value) {
  await AsyncStorage.setItem(PRO_KEY, value ? '1' : '0');
}

/** Clear local Pro entitlement (does not refund store purchases). */
export async function clearProUnlocked() {
  await AsyncStorage.removeItem(PRO_KEY);
}
