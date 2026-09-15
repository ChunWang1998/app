import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loadLangPref, loadThemePref, saveLangPref, saveThemePref } from '../lib/prefs';
import { t as translate } from '../lib/i18n';
import { colorsForTheme } from '../theme';

const AppPrefsContext = createContext(null);

export function AppPrefsProvider({ children }) {
  const [theme, setThemeState] = useState('light');
  const [lang, setLangState] = useState('zh');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [th, lg] = await Promise.all([loadThemePref(), loadLangPref()]);
      setThemeState(th);
      setLangState(lg);
      setReady(true);
    })();
  }, []);

  const setTheme = useCallback(async (next) => {
    const v = next === 'dark' ? 'dark' : 'light';
    setThemeState(v);
    await saveThemePref(v);
  }, []);

  const setLang = useCallback(async (next) => {
    const v = next === 'en' ? 'en' : 'zh';
    setLangState(v);
    await saveLangPref(v);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      lang,
      ready,
      colors: colorsForTheme(theme),
      setTheme,
      setLang,
      t: (key) => translate(lang, key),
    }),
    [theme, lang, ready, setTheme, setLang],
  );

  return (
    <AppPrefsContext.Provider value={value}>{children}</AppPrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(AppPrefsContext);
  if (!ctx) {
    throw new Error('usePrefs must be used within AppPrefsProvider');
  }
  return ctx;
}
