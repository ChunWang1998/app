export const colors = {
  bgTop: '#E8FBF7',
  bgBottom: '#FFF7E8',
  ink: '#17332F',
  muted: '#4D6B66',
  brand: '#1A9B8E',
  brandDeep: '#0F6F66',
  accent: '#FFB703',
  card: '#FFFFFF',
  sheet: 'rgba(255,255,255,0.96)',
  mapBg: '#F3FAF8',
  /** Rich metallic gold (vote > 0) */
  voteGold: '#D4A017',
  voteGoldBright: '#FFE566',
  voteGoldDeep: '#B8860B',
  voteGoldBg: '#FFF4C2',
  voteGreen: '#1A9B8E',
  voteGreenBg: '#E8F7F4',
  voteRed: '#E88A86',
  voteRedBg: '#FDECEC',
  wood: '#8B5A2B',
  woodLight: '#C4A574',
  soil: '#A67C52',
};

export const radius = {
  card: 18,
  sheet: 28,
  pill: 999,
};

/** vote > 0 gold, = 0 green, < 0 light red */
export function voteTone(score = 0) {
  if (score > 0) {
    return {
      border: colors.voteGoldDeep,
      fill: colors.voteGold,
      bg: colors.voteGoldBg,
      sparkle: true,
    };
  }
  if (score < 0) {
    return {
      border: colors.voteRed,
      fill: colors.voteRed,
      bg: colors.voteRedBg,
      sparkle: false,
    };
  }
  return {
    border: colors.voteGreen,
    fill: colors.voteGreen,
    bg: colors.voteGreenBg,
    sparkle: false,
  };
}
