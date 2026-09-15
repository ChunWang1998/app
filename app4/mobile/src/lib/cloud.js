import { supabase, isSupabaseConfigured } from './supabase';

async function rpc(name, args) {
  if (!supabase) throw new Error('Supabase 未設定');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || String(error));
  return data;
}

export { isSupabaseConfigured };

export async function registerOrLoadProfile(deviceId, payload) {
  return rpc('register_or_load_profile', {
    p_device_id: deviceId,
    p_own: payload?.own_identities ?? null,
    p_interest: payload?.interest_identities ?? null,
    p_line_id: payload?.line_id ?? null,
  });
}

export async function updateLineIdCloud(deviceId, lineId) {
  return rpc('update_line_id', {
    p_device_id: deviceId,
    p_line_id: lineId,
  });
}

export async function updateInterestsCloud(deviceId, interest, claimedPaid) {
  return rpc('update_interests', {
    p_device_id: deviceId,
    p_interest: interest,
    p_claimed_paid: Boolean(claimedPaid),
  });
}

export async function touchActiveCloud(deviceId) {
  return rpc('touch_active', { p_device_id: deviceId });
}

export async function getDailyUsageCloud(deviceId, claimedPaid) {
  return rpc('get_daily_usage', {
    p_device_id: deviceId,
    p_claimed_paid: Boolean(claimedPaid),
  });
}

export async function dailyMatchCloud(deviceId, claimedPaid) {
  return rpc('daily_match', {
    p_device_id: deviceId,
    p_claimed_paid: Boolean(claimedPaid),
  });
}

export async function listMyMatchesCloud(deviceId) {
  return rpc('list_my_matches', { p_device_id: deviceId });
}

export async function reportUserCloud(deviceId, targetId, reason, matchId) {
  return rpc('report_user', {
    p_device_id: deviceId,
    p_target_id: targetId,
    p_reason: reason,
    p_match_id: matchId ?? null,
  });
}
