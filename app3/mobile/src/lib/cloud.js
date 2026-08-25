import { isSupabaseConfigured, supabase } from './supabase';
import { formatGatheringDate } from '../data/constants';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCloudReady() {
  return Boolean(isSupabaseConfigured && supabase);
}

export function isUuid(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

function fail(code, message) {
  const err = new Error(message || code || 'cloud');
  err.code = code || 'cloud';
  throw err;
}

async function rpc(name, args) {
  if (!isCloudReady()) fail('offline', 'Supabase is not configured');
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const msg = error.message || '';
    if (msg.includes('auth')) fail('auth', msg);
    if (msg.includes('invalid')) fail('invalid', msg);
    fail('cloud', msg);
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && data.ok === false) {
    fail(data.code || 'cloud', data.code || 'cloud');
  }
  return data;
}

export async function loadMyAccount(loginKey) {
  return rpc('load_my_account', { p_key: loginKey });
}

/** Existing founder with a dog profile. Returns null if the number is new or incomplete. */
export async function loginWithPhone(loginKey) {
  if (!isCloudReady()) fail('offline', 'Supabase is not configured');
  const { data, error } = await supabase.rpc('login_with_phone', { p_key: loginKey });
  if (error) fail('cloud', error.message || '');
  if (!data || data.ok === false) return null;
  return data;
}

export async function registerFounder(loginKey, provider, profile) {
  return rpc('register_founder', {
    p_key: loginKey,
    p_provider: provider || 'phone',
    p_profile: profile,
  });
}

export async function upsertProfile(loginKey, profile) {
  return rpc('upsert_profile', { p_key: loginKey, p_profile: profile });
}

export async function listCityProfiles(loginKey, city) {
  const data = await rpc('list_city_profiles', { p_key: loginKey || '', p_city: city });
  return Array.isArray(data) ? data : [];
}

/** All photo-ok profiles (optional city filter still available via listCityProfiles). */
export async function listAllProfiles(loginKey) {
  const data = await rpc('list_profiles', { p_key: loginKey || '' });
  return Array.isArray(data) ? data : [];
}

export async function listMyConnects(loginKey) {
  const data = await rpc('list_my_connects', { p_key: loginKey });
  return Array.isArray(data) ? data : [];
}

export async function sendConnectCloud(loginKey, toId) {
  const data = await rpc('send_connect', { p_key: loginKey, p_to: toId });
  return data.connect;
}

export async function setConnectStatusCloud(loginKey, id, status) {
  const data = await rpc('set_connect_status', {
    p_key: loginKey,
    p_id: id,
    p_status: status,
  });
  return data.connect;
}

export async function disconnectConnectCloud(loginKey, id) {
  const data = await rpc('disconnect_connect', { p_key: loginKey, p_id: id });
  return data.connect;
}

export async function listMessagesCloud(loginKey, connectId) {
  const data = await rpc('list_messages', {
    p_key: loginKey,
    p_connect_id: connectId,
  });
  return data.messages || [];
}

export async function sendMessageCloud(loginKey, connectId, text) {
  const data = await rpc('send_message', {
    p_key: loginKey,
    p_connect_id: connectId,
    p_body: text,
  });
  return data.messages || [];
}

export async function confirmMeetCloud(loginKey, connectId) {
  return rpc('confirm_meet', { p_key: loginKey, p_connect_id: connectId });
}

function decorateGatheringRow(g) {
  const date = g.dateISO ? new Date(g.dateISO) : new Date();
  return {
    ...g,
    dateISO: date.toISOString(),
    dateLabel: formatGatheringDate(date),
  };
}

export async function listCityGatherings(loginKey, city) {
  const data = await rpc('list_city_gatherings', {
    p_key: loginKey || '',
    p_city: city,
  });
  return (Array.isArray(data) ? data : []).map(decorateGatheringRow);
}

export async function listAllGatherings(loginKey) {
  const data = await rpc('list_gatherings', { p_key: loginKey || '' });
  return (Array.isArray(data) ? data : []).map(decorateGatheringRow);
}

export async function createGatheringCloud(loginKey, payload) {
  const data = await rpc('create_gathering', { p_key: loginKey, p_payload: payload });
  return decorateGatheringRow(data.gathering);
}

export async function joinGatheringCloud(loginKey, id) {
  return rpc('join_gathering', { p_key: loginKey, p_id: id });
}

export async function likeGatheringCloud(loginKey, id) {
  return rpc('like_gathering_host', { p_key: loginKey, p_id: id });
}

export async function blockAccount(loginKey, targetId) {
  return rpc('block_account', { p_key: loginKey, p_target: targetId });
}

export async function reportAccount(loginKey, targetId, reason) {
  return rpc('report_account', {
    p_key: loginKey,
    p_target: targetId,
    p_reason: reason,
  });
}

export async function deleteMyAccount(loginKey) {
  return rpc('delete_my_account', { p_key: loginKey });
}

export async function uploadAvatar(loginKey, uri) {
  if (!isCloudReady() || !uri) return uri;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  const ext = (uri.split('.').pop() || 'jpg').split('?')[0].replace(/[^a-z0-9]/gi, '') || 'jpg';
  const path = `${loginKey}/${Date.now()}.${ext}`;
  const res = await fetch(uri);
  if (!res.ok) fail('photo', '無法讀取照片');
  const buf = await res.arrayBuffer();
  const { error } = await supabase.storage.from('avatars').upload(path, buf, {
    upsert: true,
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
  });
  if (error) fail('photo', error.message);
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data?.publicUrl || uri;
}
