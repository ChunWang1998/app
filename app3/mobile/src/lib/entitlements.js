import AsyncStorage from '@react-native-async-storage/async-storage';

const PAID_KEY = 'linwang:iapPaid';

/** @returns {Promise<boolean>} */
export async function isIapPaid() {
  try {
    return (await AsyncStorage.getItem(PAID_KEY)) === '1';
  } catch {
    return false;
  }
}

/** @param {boolean} value */
export async function setIapPaid(value) {
  await AsyncStorage.setItem(PAID_KEY, value ? '1' : '0');
}

/** Clear local entitlement (does not cancel App Store subscription). */
export async function clearIapPaid() {
  await AsyncStorage.removeItem(PAID_KEY);
}
