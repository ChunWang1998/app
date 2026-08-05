import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

/** Base project URL only — strip /rest/v1 and trailing slashes. */
function normalizeSupabaseUrl(raw) {
  let u = String(raw || '').trim().replace(/^["']|["']$/g, '');
  u = u.replace(/\/+$/, '');
  u = u.replace(/\/rest\/v1$/i, '');
  u = u.replace(/\/+$/, '');
  return u;
}

const url = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '')
  .trim()
  .replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('YOUR_PROJECT') &&
    !anonKey.includes('YOUR_ANON'),
);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
