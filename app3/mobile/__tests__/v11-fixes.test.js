import fs from 'fs';
import path from 'path';
import { formatLastDoneShort } from '../src/lib/time';
import { suggestIcon } from '../src/lib/suggestIcon';
import TABLE from '../src/lib/iconKeywords.json';
import en from '../languages/en.json';
import { webAlert } from '../src/lib/webAlert';

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

describe('v1.1 device fixes round 2', () => {
  it('list subtitle is short relative · date', () => {
    const ts = new Date(2026, 9, 11, 12).toISOString();
    const now = new Date(2026, 9, 14, 12).getTime();
    expect(formatLastDoneShort(ts, now, 'zh-Hant')).toBe('3 天前 · 10/11');
    expect(formatLastDoneShort(ts, now, 'en')).toBe('3 days ago · Oct 11');
    expect(formatLastDoneShort(ts, now, 'ja')).toBe('3日前 · 10/11');
    const home = read('../src/screens/HomeScreen.js');
    expect(home).toMatch(/numberOfLines=\{1\} style=\{\[styles\.st/);
    expect(home).not.toMatch(/formatLastDoneLine/);
  });

  it('new item defaults last-done to now so the form matches what is saved', () => {
    const edit = read('../src/screens/EditScreen.js');
    expect(edit).toMatch(/isNew \? new Date\(\)\.toISOString\(\)/);
    expect(edit).not.toMatch(/: t\('common\.today'\)/);
  });

  it('English remaining starts with capital In', () => {
    expect(en.home.remaining).toBe('In');
  });

  it('widgets page is Pro-gated', () => {
    const src = read('../src/screens/WidgetPickerScreen.js');
    expect(src).toMatch(/isProUnlocked/);
    expect(src).toMatch(/nav\.replace\('Paywall'\)/);
  });

  it('litter box and watering plants get different icons; no duplicate keys', () => {
    expect(suggestIcon('litter box')).toBe('paw');
    expect(suggestIcon('貓砂')).toBe('paw');
    expect(suggestIcon('澆花')).toBe('leaf');
    expect(suggestIcon('水やり')).toBe('leaf');
    const keys = TABLE.flatMap((r) => r.keys.map((k) => k.toLowerCase()));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('web Alert shim maps to confirm', () => {
    const ok = jest.fn();
    const cancel = jest.fn();
    global.window = global.window || {};
    window.confirm = jest.fn(() => true);
    webAlert('T', 'M', [{ text: 'c', style: 'cancel', onPress: cancel }, { text: 'd', onPress: ok }]);
    expect(ok).toHaveBeenCalled();
    window.confirm = jest.fn(() => false);
    webAlert('T', 'M', [{ text: 'c', style: 'cancel', onPress: cancel }, { text: 'd', onPress: ok }]);
    expect(cancel).toHaveBeenCalled();
  });
});
