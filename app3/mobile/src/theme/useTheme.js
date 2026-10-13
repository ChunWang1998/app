import { useTheme } from './ThemeContext';
import { light } from './colors';

export function useThemeColors() {
  try {
    return useTheme().colors || light;
  } catch {
    return light;
  }
}

export function useForcedScheme() {
  try {
    return useTheme().scheme || 'light';
  } catch {
    return 'light';
  }
}

export { ThemeProvider, useTheme, useItemTone } from './ThemeContext';
