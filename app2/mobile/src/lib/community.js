import { supabase, isSupabaseConfigured } from './supabase';
import { getDeviceId } from './deviceId';

export const MAX_COMMENT_LEN = 30;
export const MAX_COMMENTS_PER_PLACE = 10;

/**
 * @typedef {{ scores: Record<string, number>, myVotes: Record<string, 1|-1> }} VoteState
 * @typedef {{ id: string, text: string, createdAt: number }} Comment
 */

export function assertBackendReady() {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error(
      '尚未設定 Supabase。請在 mobile/.env 填入 EXPO_PUBLIC_SUPABASE_URL 與 EXPO_PUBLIC_SUPABASE_ANON_KEY，並執行 supabase/schema.sql。',
    );
    err.code = 'NO_BACKEND';
    throw err;
  }
}

/**
 * Load global scores + this device's votes for the given place ids.
 * @param {string[]} placeIds
 * @returns {Promise<VoteState>}
 */
export async function fetchVoteState(placeIds = []) {
  assertBackendReady();
  const ids = [...new Set(placeIds.filter(Boolean))];
  if (ids.length === 0) return { scores: {}, myVotes: {} };

  const deviceId = await getDeviceId();

  const [scoresRes, mineRes] = await Promise.all([
    supabase.from('votes').select('place_id, delta').in('place_id', ids),
    supabase
      .from('votes')
      .select('place_id, delta')
      .eq('device_id', deviceId)
      .in('place_id', ids),
  ]);

  if (scoresRes.error) throw scoresRes.error;
  if (mineRes.error) throw mineRes.error;

  /** @type {Record<string, number>} */
  const scores = {};
  for (const row of scoresRes.data || []) {
    scores[row.place_id] = (scores[row.place_id] || 0) + (Number(row.delta) || 0);
  }

  /** @type {Record<string, 1|-1>} */
  const myVotes = {};
  for (const row of mineRes.data || []) {
    const d = Number(row.delta);
    if (d === 1 || d === -1) myVotes[row.place_id] = d;
  }

  return { scores, myVotes };
}

/**
 * @param {string} placeId
 * @param {1|-1} delta
 * @returns {Promise<{ applied: boolean, scores: Record<string, number>, myVotes: Record<string, 1|-1> }>}
 */
export async function submitVote(placeId, delta) {
  assertBackendReady();
  if (delta !== 1 && delta !== -1) {
    return { applied: false, scores: {}, myVotes: {} };
  }

  const deviceId = await getDeviceId();

  const { error } = await supabase.from('votes').insert({
    place_id: placeId,
    device_id: deviceId,
    delta,
  });

  if (error) {
    // Unique violation → already voted
    if (error.code === '23505') {
      const state = await fetchVoteState([placeId]);
      return { applied: false, ...state };
    }
    throw error;
  }

  const state = await fetchVoteState([placeId]);
  return { applied: true, ...state };
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

/** Merge helper for UI state after a single-place vote refresh. */
export function mergeVoteState(prev, partial) {
  return {
    scores: { ...(prev.scores || {}), ...(partial.scores || {}) },
    myVotes: { ...(prev.myVotes || {}), ...(partial.myVotes || {}) },
  };
}
