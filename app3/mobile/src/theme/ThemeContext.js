import React from 'react';
import { useColorScheme } from 'react-native';
import { light, dark, itemPalette } from './colors';
import { getPrefs, initPrefs, subscribePrefs, updatePrefs } from '../data/prefs';

export const ThemeContext = React.createContext({
  scheme: 'light',
  colors: light,
  appearance: 'auto',
  preciseTime: true,
  sort: 'due',
  reminderTime: '09:00',
  setAppearance: async () => {},
  setPreciseTime: async () => {},
  setSort: async () => {},
  setReminderTime: async () => {},
});

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [prefs, setPrefs] = React.useState(getPrefs);
  React.useEffect(() => {
    initPrefs().then(setPrefs);
    return subscribePrefs(setPrefs);
  }, []);

  const scheme = prefs.appearance === 'auto'
    ? (system === 'dark' ? 'dark' : 'light')
    : (prefs.appearance === 'dark' ? 'dark' : 'light');
  const colors = scheme === 'dark' ? dark : light;

  const value = React.useMemo(() => ({
    scheme,
    colors,
    appearance: prefs.appearance,
    preciseTime: prefs.preciseTime !== false,
    sort: prefs.sort === 'last' ? 'last' : 'due',
    reminderTime: prefs.reminderTime || '09:00',
    setAppearance: (appearance) => updatePrefs({ appearance }),
    setPreciseTime: (preciseTime) => updatePrefs({ preciseTime }),
    setSort: (sort) => updatePrefs({ sort }),
    setReminderTime: (reminderTime) => updatePrefs({ reminderTime }),
  }), [scheme, colors, prefs]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}

export function useItemTone(icon) {
  const { scheme } = useTheme();
  const pal = itemPalette[icon || 'brush'] || itemPalette.brush;
  return pal[scheme] || pal.light;
}
