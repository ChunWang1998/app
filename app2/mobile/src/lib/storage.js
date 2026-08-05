import AsyncStorage from '@react-native-async-storage/async-storage';

const VOTES_KEY = 'toiletgo:votes:v2';
const LEGACY_VOTES_KEYS = ['toiletgo:votes'];
const VOTES_RESET_FLAG = 'toiletgo:votes_reset_v1';
const COMMENTS_KEY = 'toiletgo:comments';
export const MAX_COMMENT_LEN = 30;
export const MAX_COMMENTS_PER_PLACE = 10;

/**
 * Vote state on this device (no login).
 * @typedef {{ scores: Record<string, number>, myVotes: Record<string, 1|-1> }} VoteState
 */

/** Drop all vote stores; comments are untouched. */
export async function clearVotes() {
  await AsyncStorage.multiRemove([VOTES_KEY, ...LEGACY_VOTES_KEYS]);
}

/** @returns {Promise<VoteState>} */
export async function loadVotes() {
  try {
    // One-shot wipe of all vote data (keeps comments).
    const resetDone = await AsyncStorage.getItem(VOTES_RESET_FLAG);
    if (!resetDone) {
      await clearVotes();
      await AsyncStorage.setItem(VOTES_RESET_FLAG, '1');
    }
    const raw = await AsyncStorage.getItem(VOTES_KEY);
    if (!raw) return { scores: {}, myVotes: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !parsed.scores && !parsed.myVotes) {
      return { scores: parsed, myVotes: {} };
    }
    return {
      scores: parsed?.scores && typeof parsed.scores === 'object' ? parsed.scores : {},
      myVotes: parsed?.myVotes && typeof parsed.myVotes === 'object' ? parsed.myVotes : {},
    };
  } catch {
    return { scores: {}, myVotes: {} };
  }
}

/** @param {VoteState} state */
export async function saveVotes(state) {
  await AsyncStorage.setItem(
    VOTES_KEY,
    JSON.stringify({ scores: state.scores || {}, myVotes: state.myVotes || {} }),
  );
}

/**
 * One vote per place per device. Returns same state if already voted.
 * @param {VoteState} state
 * @param {string} placeId
 * @param {1|-1} delta
 * @returns {{ state: VoteState, applied: boolean }}
 */
export function applyVote(state, placeId, delta) {
  const scores = { ...(state.scores || {}) };
  const myVotes = { ...(state.myVotes || {}) };
  if (myVotes[placeId]) {
    return { state: { scores, myVotes }, applied: false };
  }
  myVotes[placeId] = delta;
  scores[placeId] = (scores[placeId] || 0) + delta;
  return { state: { scores, myVotes }, applied: true };
}

/**
 * @returns {Promise<Record<string, { id: string, text: string, createdAt: number }[]>>}
 */
export async function loadComments() {
  try {
    const raw = await AsyncStorage.getItem(COMMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    // Cap existing lists (newest first → drop oldest beyond limit)
    const capped = {};
    for (const [id, list] of Object.entries(parsed)) {
      if (!Array.isArray(list)) continue;
      capped[id] = list.slice(0, MAX_COMMENTS_PER_PLACE);
    }
    return capped;
  } catch {
    return {};
  }
}

/** @param {Record<string, { id: string, text: string, createdAt: number }[]>} comments */
export async function saveComments(comments) {
  await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}

/**
 * @param {Record<string, { id: string, text: string, createdAt: number }[]>} comments
 * @param {string} placeId
 * @param {string} text
 */
export function appendComment(comments, placeId, text) {
  const trimmed = String(text || '').trim().slice(0, MAX_COMMENT_LEN);
  if (!trimmed) return comments;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    createdAt: Date.now(),
  };
  const list = comments[placeId] ? [...comments[placeId]] : [];
  list.unshift(entry);
  // Newest first; drop oldest when over limit
  return { ...comments, [placeId]: list.slice(0, MAX_COMMENTS_PER_PLACE) };
}
