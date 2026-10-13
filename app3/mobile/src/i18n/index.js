import * as Localization from 'expo-localization';
import en from '../../languages/en.json';
import zhHant from '../../languages/zh-Hant.json';

let current = 'en';
const bundles = { en, 'zh-Hant': zhHant, 'zh-TW': zhHant, 'zh-HK': zhHant };

export function initializeI18n() {
  const locale = (Localization?.locale || 'en').toLowerCase();
  if (locale.startsWith('zh') && (locale.includes('hant') || locale.includes('tw') || locale.includes('hk'))) {
    current = 'zh-Hant';
  } else {
    current = 'en';
  }
}

export function t(key, params) {
  const dict = bundles[current] || bundles.en;
  const raw = get(dict, key) ?? get(bundles.en, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ''));
}

function get(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
}
