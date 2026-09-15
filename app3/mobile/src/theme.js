export const lightColors = {
  bgTop: '#FFF6E8',
  bgBottom: '#E8F6EE',
  ink: '#2C2416',
  muted: '#7A6A58',
  brand: '#E07A3D',
  brandDeep: '#B85A28',
  card: '#FFFFFF',
  line: '#F0E4D4',
  newGlow: '#F4C15D',
  danger: '#C45C4A',
  ok: '#2F8F6B',
  chipOn: '#FBE6D4',
};

export const darkColors = {
  bgTop: '#1A1714',
  bgBottom: '#12141A',
  ink: '#F5EDE3',
  muted: '#A89A8A',
  brand: '#E07A3D',
  brandDeep: '#F0A06A',
  card: '#242018',
  line: '#3A3228',
  newGlow: '#F4C15D',
  danger: '#E07A6A',
  ok: '#3CB88A',
  chipOn: '#3A2A1E',
};

/** @deprecated Prefer usePrefs().colors — kept for modules not yet migrated. */
export const colors = lightColors;

export const radius = {
  card: 18,
  sheet: 28,
  pill: 999,
  row: 16,
};

export function colorsForTheme(theme) {
  return theme === 'dark' ? darkColors : lightColors;
}

export function landingGradient(theme) {
  if (theme === 'dark') {
    return ['#2A2218', '#1A1714', '#152018', '#12141A'];
  }
  return ['#FFE7C4', lightColors.bgTop, '#E7F7EE', '#D8F0E4'];
}

export function screenGradient(theme) {
  const c = colorsForTheme(theme);
  return [c.bgTop, c.bgBottom];
}
