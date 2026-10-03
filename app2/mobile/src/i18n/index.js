import React, { createContext, useContext, useMemo } from 'react';
import { useLocales } from 'expo-localization';
import { resolveLanguage, resolveMarket } from './language';
import { STRINGS } from './strings';

let currentLanguage = 'en';
let currentMarket = 'generic';

const LanguageContext = createContext('en');

function applyParams(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] == null ? '' : String(params[key]),
  );
}

function lookup(table, key) {
  if (currentMarket !== 'generic') {
    const specific = table[`${key}.${currentMarket}`];
    if (specific) return specific;
  }
  return table[key];
}

export function t(key, params) {
  const table = STRINGS[currentLanguage] || STRINGS.en;
  const template = lookup(table, key) ?? lookup(STRINGS.en, key) ?? key;
  return applyParams(template, params);
}

export function LanguageProvider({ children }) {
  const locales = useLocales();
  const language = resolveLanguage(locales);
  const market = resolveMarket(locales);
  currentLanguage = language;
  currentMarket = market;
  const value = useMemo(() => `${language}:${market}`, [language, market]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Subscribe so the screen rerenders when the system language changes. */
export function useLanguage() {
  return useContext(LanguageContext);
}
