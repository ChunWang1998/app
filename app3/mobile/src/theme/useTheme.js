import { useColorScheme } from 'react-native';
import { light, dark } from './colors';

export function useThemeColors() {
  let scheme = useColorScheme?.() || 'light';
  try {
    // Allow forcing via web query param for screenshots: ?scheme=dark
    if (typeof window !== 'undefined' && window.__forceScheme) {
      scheme = window.__forceScheme;
    }
  } catch {}
  return scheme === 'dark' ? dark : light;
}
