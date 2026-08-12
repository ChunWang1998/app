import AsyncStorage from '@react-native-async-storage/async-storage';

const ZHUYIN_KEY = 'gongchao:show_zhuyin';
const MUSIC_KEY = 'gongchao:music_enabled';

export async function getShowZhuyin() {
  try {
    const raw = await AsyncStorage.getItem(ZHUYIN_KEY);
    if (raw === null) return false;
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setShowZhuyin(value) {
  await AsyncStorage.setItem(ZHUYIN_KEY, value ? '1' : '0');
}

export async function getMusicEnabled() {
  try {
    const raw = await AsyncStorage.getItem(MUSIC_KEY);
    if (raw === null) return false;
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setMusicEnabled(value) {
  await AsyncStorage.setItem(MUSIC_KEY, value ? '1' : '0');
}
