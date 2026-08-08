import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function mapRpcError(error) {
  const msg = String(error?.message || error || '');
  const table = {
    not_authenticated: '請先登入',
    listing_unavailable: '案件不存在或未上架',
    cannot_attempt_own_listing: '不能填自己發布的案件',
    cannot_redeem_own_listing: '不能領自己案件的獎',
    listing_not_open: '案件尚未開放',
    listing_closed: '案件已結束',
    already_redeemed: '你已領過此案件獎勵',
    quota_full: '名額已滿',
    no_vouchers: '禮券已發完',
    rate_limited: '操作太頻繁，請稍後再試',
    invalid_token: '完成碼無效',
    token_not_yours: '此完成碼不屬於你的帳號',
    too_many_attempts: '嘗試次數過多，請稍後再試',
    already_used: '完成碼已使用',
    token_expired: '完成碼已過期（超過 48 小時）',
  };
  for (const [code, zh] of Object.entries(table)) {
    if (msg.includes(code)) return zh;
  }
  return msg || '發生錯誤';
}
