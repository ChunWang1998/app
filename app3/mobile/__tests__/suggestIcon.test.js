import { suggestIcon, monogramLetter, itemCount, keywordCount, SUGGEST_ICONS } from '../src/lib/suggestIcon';

describe('suggestIcon', () => {
  it('maps the named examples in en / zh-Hant / ja', () => {
    expect(suggestIcon('toothbrush')).toBe('brush');
    expect(suggestIcon('換牙刷')).toBe('brush');
    expect(suggestIcon('歯ブラシ')).toBe('brush');
    expect(suggestIcon('bed sheets')).toBe('bed');
    expect(suggestIcon('床單')).toBe('bed');
    expect(suggestIcon('シーツ')).toBe('bed');
    expect(suggestIcon('water filter')).toBe('drop');
    expect(suggestIcon('濾水器')).toBe('drop');
    expect(suggestIcon('浄水器')).toBe('drop');
    expect(suggestIcon('cat litter')).toBe('paw');
    expect(suggestIcon('貓砂')).toBe('paw');
    expect(suggestIcon('猫砂')).toBe('paw');
    expect(suggestIcon('contact lenses')).toBe('eye');
    expect(suggestIcon('隱形眼鏡')).toBe('eye');
    expect(suggestIcon('コンタクト')).toBe('eye');
    expect(suggestIcon('haircut')).toBe('scissors');
    expect(suggestIcon('剪頭髮')).toBe('scissors');
    expect(suggestIcon('散髪')).toBe('scissors');
    expect(suggestIcon('Zahnbürste')).toBe('brush');
    expect(suggestIcon('brosse à dents')).toBe('brush');
    expect(suggestIcon('Bettwäsche')).toBe('bed');
    expect(suggestIcon('draps')).toBe('bed');
  });

  it('covers 60+ household / health / pet / car items and only built-in icons', () => {
    expect(itemCount()).toBeGreaterThanOrEqual(60);
    expect(keywordCount()).toBeGreaterThanOrEqual(150);
    expect(SUGGEST_ICONS).toEqual(['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye', 'paw', 'plug']);
  });

  it('falls back to a monogram when nothing matches', () => {
    expect(suggestIcon('')).toBe('mono');
    expect(suggestIcon('XYZ')).toBe('mono');
    expect(suggestIcon('量子力學')).toBe('mono');
    expect(monogramLetter('濾水器')).toBe('濾');
    expect(monogramLetter('Sheets')).toBe('S');
    expect(monogramLetter('')).toBe('');
  });

  it('does not treat latin keys as substrings of other words', () => {
    expect(suggestIcon('retired')).toBe('mono');
    expect(suggestIcon('toilet')).not.toBe('car');
  });
});
