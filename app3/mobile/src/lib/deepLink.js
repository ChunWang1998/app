import { Linking } from 'react-native';

export const PAYWALL_PATH = 'paywall';

export function parseAppUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const stripped = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    const path = stripped.split('?')[0].replace(/^\//, '').replace(/\/$/, '');
    if (path === PAYWALL_PATH || path === 'Paywall') return { name: 'Paywall' };
    return null;
  } catch {
    return null;
  }
}

export function subscribePaywallLink(navigate) {
  const open = (url) => {
    const dest = parseAppUrl(url);
    if (dest) navigate(dest.name, dest.params || {});
  };
  Linking.getInitialURL().then((url) => { if (url) open(url); }).catch(() => {});
  const sub = Linking.addEventListener('url', (e) => open(e?.url));
  return () => {
    try { sub?.remove?.(); } catch {}
  };
}
