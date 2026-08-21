import { supabase, isSupabaseConfigured } from './supabase';
import { getDeviceId } from './deviceId';

export const MAX_COMMENT_LEN = 30;
export const MAX_COMMENTS_PER_PLACE = 10;

/**
 * @typedef {{ id: string, text: string, createdAt: number }} Comment
 */

function assertBackendReady() {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error(
      '尚未設定 Supabase。請在 mobile/.env 填入 EXPO_PUBLIC_SUPABASE_URL 與 EXPO_PUBLIC_SUPABASE_ANON_KEY，並執行 supabase/schema.sql。',
    );
    err.code = 'NO_BACKEND';
    throw err;
  }
}

/**
 * @param {string[]} placeIds
 * @returns {Promise<Record<string, Comment[]>>}
 */
export async function fetchComments(placeIds = []) {
  assertBackendReady();
  const ids = [...new Set(placeIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('comments')
    .select('id, place_id, body, created_at')
    .in('place_id', ids)
    .order('created_at', { ascending: false });

  if (error) throw error;

  /** @type {Record<string, Comment[]>} */
  const byPlace = {};
  for (const row of data || []) {
    const list = byPlace[row.place_id] || (byPlace[row.place_id] = []);
    if (list.length >= MAX_COMMENTS_PER_PLACE) continue;
    list.push({
      id: row.id,
      text: row.body,
      createdAt: new Date(row.created_at).getTime(),
    });
  }
  return byPlace;
}

/**
 * @param {string} placeId
 * @param {string} text
 * @returns {Promise<Comment[]>}
 */
export async function submitComment(placeId, text) {
  assertBackendReady();
  const trimmed = String(text || '').trim().slice(0, MAX_COMMENT_LEN);
  if (!trimmed) return [];

  const deviceId = await getDeviceId();
  const { error } = await supabase.from('comments').insert({
    place_id: placeId,
    device_id: deviceId,
    body: trimmed,
  });
  if (error) throw error;

  const map = await fetchComments([placeId]);
  return map[placeId] || [];
}
