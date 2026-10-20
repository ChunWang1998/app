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

  it('maps de* to de and fr* to fr', () => {
    expect(resolveTag('de')).toBe('de');
    expect(resolveTag('de-DE')).toBe('de');
    expect(resolveTag('de_AT')).toBe('de');
    expect(resolveTag('DE-ch')).toBe('de');
    expect(resolveTag('fr')).toBe('fr');
    expect(resolveTag('fr-FR')).toBe('fr');
    expect(resolveTag('fr_CA')).toBe('fr');
    expect(resolveTag('FR-be')).toBe('fr');
    expect(resolveLocale('de-DE')).toBe('de');
    expect(resolveLocale('fr-FR')).toBe('fr');
  });

  it('maps en* to en and everything else to en', () => {
    expect(resolveTag('en')).toBe('en');
    expect(resolveTag('en-US')).toBe('en');
    expect(resolveTag('en-GB')).toBe('en');
    expect(resolveTag('ko')).toBeNull();
    expect(resolveTag('pt-BR')).toBeNull();
    expect(resolveTag('')).toBeNull();
    expect(resolveLocale('it-IT')).toBe('en');
    expect(resolveLocale()).toBe('en');
  });

  it('walks preferred locale order and skips unsupported tags', () => {
    expect(resolveLocale(['ko-KR', 'ja-JP'])).toBe('ja');
    expect(resolveLocale(['en-US', 'ja'])).toBe('en');
    expect(resolveLocale(['pt-BR', 'zh-Hans-CN'])).toBe('zh-Hant');
    expect(resolveLocale([{ languageTag: 'ko-KR' }, { languageCode: 'ja' }])).toBe('ja');
    expect(resolveLocale('pt-BR', 'zh-TW')).toBe('zh-Hant');
    expect(resolveLocale(['de-DE', 'en-US'])).toBe('de');
    expect(resolveLocale(['fr-FR', 'ja-JP'])).toBe('fr');
  });

  it('initializeI18n follows expo-localization getLocales order', () => {
    Localization.getLocales.mockReturnValue([
      { languageTag: 'ko-KR', languageCode: 'ko' },
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
    expect(getLocale()).toBe('de');
    expect(t('paywall.once')).toBe('Einmalkauf. Kein Abo.');

    Localization.getLocales.mockReturnValue([{ languageTag: 'fr-FR', languageCode: 'fr' }]);
    initializeI18n();
    expect(getLocale()).toBe('fr');
    expect(t('paywall.once')).toBe('Achat unique. Sans abonnement.');

    Localization.getLocales.mockReturnValue([{ languageTag: 'ko-KR', languageCode: 'ko' }]);
    initializeI18n();
    expect(getLocale()).toBe('en');
    expect(t('app.title')).toBe('Been Ages');
  });

  it('tLocale uses the same resolver independently of current locale', () => {
    setLocale('en');
    expect(tLocale('ja', 'app.title')).toBe('久しぶり');
    expect(tLocale('zh-SG', 'app.title')).toBe('好久沒了');
    expect(tLocale('it-IT', 'app.title')).toBe('Been Ages');
    expect(tLocale('de-AT', 'settings.restore')).toBe('Käufe wiederherstellen');
    expect(tLocale('fr-CA', 'settings.restore')).toBe('Restaurer les achats');
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
