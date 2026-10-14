import * as Localization from 'expo-localization';
import en from '../../languages/en.json';
import zhHant from '../../languages/zh-Hant.json';

let current = 'en';
const bundles = { en, 'zh-Hant': zhHant, 'zh-TW': zhHant, 'zh-HK': zhHant };

export function isZhLocale(locale) {
  return String(locale || '').toLowerCase().startsWith('zh');
}

export function setLocale(locale) {
  current = isZhLocale(locale) ? 'zh-Hant' : 'en';
}

export function getLocale() {
  return current;
}

export function initializeI18n() {
  const locale = (Localization?.locale || Localization?.getLocales?.()?.[0]?.languageTag || 'en').toLowerCase();
  if (locale.startsWith('zh') && (locale.includes('hant') || locale.includes('tw') || locale.includes('hk') || locale === 'zh')) {
    current = 'zh-Hant';
  } else {
    current = 'en';
  }
}

export function t(key, params) {
  return format(get(bundles[current] || bundles.en, key) ?? get(bundles.en, key) ?? key, params);
}

export function tLocale(locale, key, params) {
  const dict = isZhLocale(locale) ? bundles['zh-Hant'] : bundles.en;
  return format(get(dict, key) ?? get(bundles.en, key) ?? key, params);
}

function format(raw, params) {
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ''));
}

function get(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
}
