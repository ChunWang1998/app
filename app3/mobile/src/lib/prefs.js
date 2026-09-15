import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  theme: 'linwang:theme',
  lang: 'linwang:lang',
};

/** @returns {Promise<'light'|'dark'>} */
export async function loadThemePref() {
  try {
    const v = await AsyncStorage.getItem(KEYS.theme);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** @param {'light'|'dark'} theme */
export async function saveThemePref(theme) {
  await AsyncStorage.setItem(KEYS.theme, theme === 'dark' ? 'dark' : 'light');
}

/** @returns {Promise<'zh'|'en'>} */
export async function loadLangPref() {
  try {
    const v = await AsyncStorage.getItem(KEYS.lang);
    return v === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

/** @param {'zh'|'en'} lang */
export async function saveLangPref(lang) {
  await AsyncStorage.setItem(KEYS.lang, lang === 'en' ? 'en' : 'zh');
}
