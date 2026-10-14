import { SHARE_SIZES, SHARE_STYLES, canUseStyle, headlineForDays, IG_STORIES_DIRECT } from '../src/share/config';
import { igStoriesStatus } from '../src/share/shareSheet';

describe('share cards', () => {
  it('ships 9:16 and 4:5', () => {
    expect(SHARE_SIZES.story).toMatchObject({ width: 1080, height: 1920 });
    expect(SHARE_SIZES.feed).toMatchObject({ width: 1080, height: 1350 });
  });

  it('one style is free; the rest are Pro', () => {
    expect(SHARE_STYLES.filter((s) => s.free)).toHaveLength(1);
    expect(SHARE_STYLES.filter((s) => !s.free).length).toBeGreaterThanOrEqual(3);
    expect(canUseStyle(SHARE_STYLES[0], false)).toBe(true);
    expect(canUseStyle(SHARE_STYLES[1], false)).toBe(false);
    expect(canUseStyle(SHARE_STYLES[1], true)).toBe(true);
  });

  it('headline is name-free (days only) and has no date', () => {
    expect(headlineForDays(47, '天')).toBe('好久沒了 47 天');
    expect(headlineForDays(47, '天')).not.toMatch(/\d{4}/);
  });

  it('skips direct IG Stories until a Meta App ID exists', () => {
    expect(IG_STORIES_DIRECT).toBe(false);
    expect(igStoriesStatus().reason).toBe('waiting-for-meta-app-id');
  });
});
