/** Direct IG Stories needs a Meta App ID. Leave off until Chun provides one. */
export const META_APP_ID = process.env.EXPO_PUBLIC_META_APP_ID || '';
export const IG_STORIES_DIRECT = Boolean(META_APP_ID);

export const SHARE_SIZES = {
  story: { key: 'story', label: '9:16', width: 1080, height: 1920, ratio: 9 / 16 },
  feed: { key: 'feed', label: '4:5', width: 1080, height: 1350, ratio: 4 / 5 },
};

export const SHARE_STYLES = [
  { id: 'cream', name: '奶油', free: true, bg: '#FBF7F0', ink: '#2E2925', accent: '#3E9180', wash: '#E4EEE7' },
  { id: 'mint', name: '薄荷', free: false, bg: '#E4EEE7', ink: '#2E2925', accent: '#2F8476', wash: '#DCF0EE' },
  { id: 'sky', name: '天空', free: false, bg: '#DCEBF5', ink: '#2E2925', accent: '#3C7DAA', wash: '#C9DFF0' },
  { id: 'blush', name: '腮紅', free: false, bg: '#FBE3DC', ink: '#2E2925', accent: '#C0653F', wash: '#F6BDAA' },
];

export function styleById(id) {
  return SHARE_STYLES.find((s) => s.id === id) || SHARE_STYLES[0];
}

export function canUseStyle(style, proUnlocked) {
  if (!style) return false;
  return !!style.free || !!proUnlocked;
}

export function headlineForDays(daysNum, daysUnit, locale = 'zh') {
  if (daysNum == null) {
    return locale === 'en' ? 'Not yet' : '還沒記錄';
  }
  if (locale === 'en') {
    return `${daysNum} ${daysUnit === '天' ? 'days' : daysUnit}`;
  }
  return `好久沒了 ${daysNum} ${daysUnit}`;
}

export function footerBrand(locale = 'zh') {
  return locale === 'en' ? 'Been Ages' : 'Been Ages';
}
