/** First supported language in the device preference list. Otherwise English. */
export function resolveLanguage(locales) {
  const list = Array.isArray(locales) ? locales : [];
  for (const locale of list) {
    const code = String(locale?.languageCode || '').toLowerCase();
    if (code === 'zh') return 'zh-Hant';
    if (code === 'ja') return 'ja';
    if (code === 'en') return 'en';
  }
  return 'en';
}

function localeRegion(locale) {
  const region = String(locale?.regionCode || locale?.languageRegionCode || '').toUpperCase();
  if (region) return region;
  const parts = String(locale?.languageTag || '').split('-');
  const last = parts[parts.length - 1] || '';
  if (last.length === 2 && last === last.toUpperCase()) return last;
  return '';
}

/**
 * Which place catalog to describe, walking the language list in order.
 * Japanese → Japan. zh-HK → Hong Kong. zh-TW → Taiwan.
 * English uses the region on that locale (en-JP, en-HK, en-TW) the same way.
 * Otherwise a short description with no country list.
 */
export function resolveMarket(locales) {
  const list = Array.isArray(locales) ? locales : [];
  for (const locale of list) {
    const code = String(locale?.languageCode || '').toLowerCase();
    const region = localeRegion(locale);
    if (code === 'ja') return 'jp';
    if (code === 'zh' && (region === 'HK' || region === 'MO')) return 'hk';
    if (code === 'zh' && region === 'TW') return 'tw';
    if (region === 'JP') return 'jp';
    if (region === 'HK' || region === 'MO') return 'hk';
    if (region === 'TW') return 'tw';
  }
  return 'generic';
}
