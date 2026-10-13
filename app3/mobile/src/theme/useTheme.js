import { light } from './colors';

/**
 * v1.0 ships light-only (app.json userInterfaceStyle: "light").
 * Dark mode is deferred to v1.0.1.
 */
export function useThemeColors() {
  return light;
}

export function useForcedScheme() {
  return 'light';
}
