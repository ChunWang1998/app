import AsyncStorage from '@react-native-async-storage/async-storage';
import { FOUNDER_CAP } from '../data/constants';
import { FOUNDER_WHITELIST_SNAPSHOT } from '../data/founderWhitelist.snapshot';
import { isSupabaseConfigured, supabase } from './supabase';

const LOCAL_KEYS = 'linwang:founder_whitelist';

/** Taiwan-ish phone as stable login_key. No OTP. */
export function normalizeLoginKey(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('886') && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export function accountIdFromKey(loginKey) {
  return `u_${loginKey}`;
}

function inSnapshot(loginKey) {
  return FOUNDER_WHITELIST_SNAPSHOT.includes(loginKey);
}

async function readLocal() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEYS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeLocal(keys) {
  await AsyncStorage.setItem(LOCAL_KEYS, JSON.stringify(keys));
}

export async function isWhitelisted(loginKey) {
  if (!loginKey) return false;
  if (inSnapshot(loginKey)) return true;
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('is_founder', { p_key: loginKey });
    if (!error) return Boolean(data);
  }
  const local = await readLocal();
  return local.includes(loginKey);
}

export async function whitelistCount() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('founder_count');
    if (!error && typeof data === 'number') return data;
  }
  const local = await readLocal();
  const merged = new Set([...FOUNDER_WHITELIST_SNAPSHOT, ...local]);
  return merged.size;
}

/**
 * First 100 login_keys become founders. Same key later is a no-op.
 * Prefers cloud RPC; falls back to this-device list if Supabase is unset.
 */
export async function claimFounder(loginKey, provider = 'phone') {
  if (inSnapshot(loginKey)) {
    return { founder: true, already: true, count: await whitelistCount() };
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('claim_founder', {
      p_key: loginKey,
      p_provider: provider,
    });
    if (error) throw error;
    const row = data && typeof data === 'object' && !Array.isArray(data) ? data : data?.[0];
    return {
      founder: Boolean(row?.ok || row?.already),
      already: Boolean(row?.already),
      count: await whitelistCount(),
      accountId: row?.account_id || null,
    };
  }

  const local = await readLocal();
  if (local.includes(loginKey)) {
    return { founder: true, already: true, count: local.length };
  }
  if (local.length >= FOUNDER_CAP) {
    return { founder: false, already: false, count: local.length };
  }
  local.push(loginKey);
  await writeLocal(local);
  return { founder: true, already: false, count: local.length };
}
