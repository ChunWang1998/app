import * as Localization from 'expo-localization';
import fs from 'fs';
import path from 'path';
import {
  deviceLocaleTags,
  getLocale,
  initializeI18n,
  resolveLocale,
  resolveTag,
  setLocale,
  t,
  tLocale,
} from '../src/i18n';

describe('device locale resolver', () => {
  afterEach(() => {
    Localization.getLocales.mockReturnValue([{ languageTag: 'en' }]);
    setLocale('en');
  });

  it('maps ja* to ja', () => {
    expect(resolveTag('ja')).toBe('ja');
    expect(resolveTag('ja-JP')).toBe('ja');
    expect(resolveTag('ja_JP')).toBe('ja');
    expect(resolveTag('JA-jp')).toBe('ja');
    expect(resolveLocale('ja-JP')).toBe('ja');
  });

  it('maps Traditional and Simplified Chinese to zh-Hant', () => {
    for (const tag of ['zh-Hant', 'zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant-TW', 'zh_TW']) {
      expect(resolveTag(tag)).toBe('zh-Hant');
    }
    for (const tag of ['zh-Hans', 'zh-CN', 'zh-SG', 'zh-Hans-CN', 'zh']) {
      expect(resolveTag(tag)).toBe('zh-Hant');
    }
    expect(resolveLocale('zh-CN')).toBe('zh-Hant');
  });

  it('maps en* to en and everything else to en', () => {
    expect(resolveTag('en')).toBe('en');
    expect(resolveTag('en-US')).toBe('en');
    expect(resolveTag('en-GB')).toBe('en');
    expect(resolveTag('fr')).toBeNull();
    expect(resolveTag('de-DE')).toBeNull();
    expect(resolveTag('')).toBeNull();
    expect(resolveLocale('fr-FR')).toBe('en');
    expect(resolveLocale()).toBe('en');
  });

  it('walks preferred locale order and skips unsupported tags', () => {
    expect(resolveLocale(['fr-FR', 'ja-JP'])).toBe('ja');
    expect(resolveLocale(['en-US', 'ja'])).toBe('en');
    expect(resolveLocale(['de-DE', 'zh-Hans-CN'])).toBe('zh-Hant');
    expect(resolveLocale([{ languageTag: 'ko-KR' }, { languageCode: 'ja' }])).toBe('ja');
    expect(resolveLocale('pt-BR', 'zh-TW')).toBe('zh-Hant');
  });

  it('initializeI18n follows expo-localization getLocales order', () => {
    Localization.getLocales.mockReturnValue([
      { languageTag: 'fr-FR', languageCode: 'fr' },
      { languageTag: 'ja-JP', languageCode: 'ja' },
    ]);
    initializeI18n();
    expect(getLocale()).toBe('ja');
    expect(t('app.title')).toBe('久しぶり');

    Localization.getLocales.mockReturnValue([{ languageTag: 'zh-CN', languageCode: 'zh' }]);
    initializeI18n();
    expect(getLocale()).toBe('zh-Hant');
    expect(t('app.title')).toBe('好久沒了');

    Localization.getLocales.mockReturnValue([{ languageTag: 'de-DE', languageCode: 'de' }]);
    initializeI18n();
    expect(getLocale()).toBe('en');
    expect(t('app.title')).toBe('Been Ages');
  });

  it('tLocale uses the same resolver independently of current locale', () => {
    setLocale('en');
    expect(tLocale('ja', 'widget.upgrade')).toBe('アップグレードで使う');
    expect(tLocale('zh-SG', 'widget.upgrade')).toBe('升級就能用');
    expect(tLocale('it-IT', 'widget.upgrade')).toBe('Upgrade to use');
  });

  it('deviceLocaleTags reads getLocales()', () => {
    const list = [{ languageTag: 'ja-JP' }];
    Localization.getLocales.mockReturnValue(list);
    expect(deviceLocaleTags()).toBe(list);
  });

  it('has no in-app language picker', () => {
    const settings = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
    expect(settings).not.toMatch(/setLocale|language picker|Language|語言|言語/i);
    const prefs = fs.readFileSync(path.join(__dirname, '../src/data/prefs.js'), 'utf8');
    expect(prefs).not.toMatch(/locale|language/i);
  });
});
