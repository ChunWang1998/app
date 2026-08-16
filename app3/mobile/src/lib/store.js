import AsyncStorage from '@react-native-async-storage/async-storage';
import { GATHERING_CAP, MAX_CHAT, slotLabel } from '../data/constants';
import { findGathering, gatheringsForCity } from '../data/gatherings';
import { GLOBAL_GUIDES, getGuide, isGuideId } from '../data/globalGuides';
import { seedOwnersForCity } from '../data/seedOwners';
import {
  accountIdFromKey,
  claimFounder,
  isWhitelisted,
  normalizeLoginKey,
  whitelistCount,
} from './whitelist';

const KEYS = {
  session: 'linwang:session',
  profile: 'linwang:profile',
  connects: 'linwang:connects',
  messages: 'linwang:messages',
  overrides: 'linwang:overrides',
  meets: 'linwang:meets',
  tour: 'linwang:tour',
  gatheringJoins: 'linwang:gatheringJoins',
};

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function hasValidSub(session) {
  return session?.subscription === 'founder' || session?.subscription === 'paid';
}

export async function loadFounderCount() {
  return whitelistCount();
}

export async function loadSession() {
  const session = await readJson(KEYS.session, null);
  if (!session?.loginKey) return session;
  if (session.subscription !== 'paid' && (await isWhitelisted(session.loginKey))) {
    if (session.subscription !== 'founder') {
      session.subscription = 'founder';
      await saveSession(session);
    }
  }
  return session;
}

export async function loadProfile() {
  return readJson(KEYS.profile, null);
}

export async function saveSession(session) {
  await writeJson(KEYS.session, session);
  return session;
}

export async function saveProfile(profile) {
  const next = {
    ...profile,
    slots: (profile.slots || []).map((s) => ({
      ...s,
      label: s.label || slotLabel(s),
    })),
    updatedAt: new Date().toISOString(),
  };
  await writeJson(KEYS.profile, next);
  return next;
}

/**
 * Phone + dog profile must be saved together. Founder slot is claimed only then.
 */
export async function registerAccount(phoneRaw) {
  const loginKey = normalizeLoginKey(phoneRaw);
  if (loginKey.length < 9) {
    const err = new Error('invalid phone');
    err.code = 'invalid';
    throw err;
  }
  const existing = await readJson(KEYS.session, null);
  if (existing?.loginKey === loginKey) {
    const session = await loadSession();
    return { session, founderCount: await whitelistCount() };
  }
  if (existing?.loginKey && existing.loginKey !== loginKey) {
    await AsyncStorage.removeItem(KEYS.profile);
  }
  const claimed = await claimFounder(loginKey, 'phone');
  const session = {
    id: accountIdFromKey(loginKey),
    loginKey,
    phone: loginKey,
    provider: 'phone',
    registeredAt: new Date().toISOString(),
    subscription: claimed.founder ? 'founder' : 'none',
  };
  await saveSession(session);
  return { session, founderCount: claimed.count };
}

export async function registerWithProfile(phoneRaw, profile) {
  const { session, founderCount } = await registerAccount(phoneRaw);
  const saved = await saveProfile({
    ...profile,
    outingCount: profile.outingCount || 0,
    connectCount: profile.connectCount || 0,
    registeredAt: profile.registeredAt || new Date().toISOString(),
  });
  return { session, profile: saved, founderCount };
}

export async function markPaid() {
  const session = await loadSession();
  if (!session) return null;
  session.subscription = 'paid';
  return saveSession(session);
}

export async function signOut() {
  await AsyncStorage.multiRemove([KEYS.session, KEYS.profile]);
}

export async function listOwners(city) {
  const seed = seedOwnersForCity(city);
  const overrides = await readJson(KEYS.overrides, {});
  const profile = await loadProfile();
  const session = await loadSession();
  const guides = GLOBAL_GUIDES.map((o) => ({ ...o, ...(overrides[o.id] || {}) }));
  const merged = seed.map((o) => ({ ...o, ...(overrides[o.id] || {}) }));
  if (profile?.photoOk && profile.city === city && session?.id) {
    merged.push({
      ...profile,
      id: session.id,
      isMe: true,
      isSeed: false,
    });
  }
  const local = merged.filter((o) => o.photoOk);
  return [...guides, ...local];
}

export async function getOwner(city, id) {
  const all = await listOwners(city);
  return all.find((o) => o.id === id) || getGuide(id) || null;
}

export async function listConnects() {
  return readJson(KEYS.connects, []);
}

export async function sendConnect(fromId, toId) {
  const connects = await listConnects();
  const existing = connects.find(
    (c) =>
      (c.fromId === fromId && c.toId === toId) ||
      (c.fromId === toId && c.toId === fromId),
  );
  if (existing) return existing;
  const row = {
    id: uid('c'),
    fromId,
    toId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  connects.unshift(row);
  await writeJson(KEYS.connects, connects);
  return row;
}

export async function setConnectStatus(id, status) {
  const connects = await listConnects();
  const next = connects.map((c) => (c.id === id ? { ...c, status } : c));
  await writeJson(KEYS.connects, next);
  if (status === 'accepted') {
    const row = next.find((c) => c.id === id);
    if (row) await bumpConnectCount([row.fromId, row.toId]);
  }
  return next;
}

async function bumpConnectCount(ids) {
  const overrides = await readJson(KEYS.overrides, {});
  const profile = await loadProfile();
  const session = await loadSession();
  const seedById = {};
  for (const g of GLOBAL_GUIDES) seedById[g.id] = g;
  for (const city of ['高雄市', '臺南市', '新北市', '臺北市']) {
    for (const o of seedOwnersForCity(city)) seedById[o.id] = o;
  }
  for (const id of ids) {
    if (session && id === session.id && profile) {
      await saveProfile({
        ...profile,
        connectCount: (profile.connectCount || 0) + 1,
      });
    } else {
      const base = seedById[id]?.connectCount || 0;
      const current = overrides[id]?.connectCount ?? base;
      overrides[id] = { ...(overrides[id] || {}), connectCount: current + 1 };
    }
  }
  await writeJson(KEYS.overrides, overrides);
}

export async function listMessages(connectId) {
  const all = await readJson(KEYS.messages, {});
  return all[connectId] || [];
}

export async function sendMessage(connectId, fromId, text) {
  const all = await readJson(KEYS.messages, {});
  const rows = all[connectId] || [];
  if (rows.length >= MAX_CHAT) {
    const err = new Error('chat full');
    err.code = 'full';
    throw err;
  }
  rows.push({ fromId, text: String(text).trim(), at: new Date().toISOString() });
  all[connectId] = rows;
  await writeJson(KEYS.messages, all);
  return rows;
}

export async function completeGuideConnect(connectId, guideId) {
  const guide = getGuide(guideId);
  if (!guide) return null;
  await setConnectStatus(connectId, 'accepted');
  for (const text of guide.messages || []) {
    await sendMessage(connectId, guideId, text);
  }
  return listConnects().then((rows) => rows.find((c) => c.id === connectId));
}

export async function confirmMeet(connectId, userId) {
  const meets = await readJson(KEYS.meets, {});
  const row = meets[connectId] || { confirmedBy: [] };
  if (!row.confirmedBy.includes(userId)) row.confirmedBy.push(userId);
  meets[connectId] = row;
  await writeJson(KEYS.meets, meets);
  if (row.confirmedBy.length >= 2 && !row.counted) {
    row.counted = true;
    meets[connectId] = row;
    await writeJson(KEYS.meets, meets);
    const connects = await listConnects();
    const c = connects.find((x) => x.id === connectId);
    if (c) await bumpOutingCount([c.fromId, c.toId]);
  }
  return row;
}

async function bumpOutingCount(ids) {
  const overrides = await readJson(KEYS.overrides, {});
  const profile = await loadProfile();
  const session = await loadSession();
  const seedById = {};
  for (const g of GLOBAL_GUIDES) seedById[g.id] = g;
  for (const city of ['高雄市', '臺南市', '新北市', '臺北市']) {
    for (const o of seedOwnersForCity(city)) seedById[o.id] = o;
  }
  for (const id of ids) {
    if (session && id === session.id && profile) {
      await saveProfile({
        ...profile,
        outingCount: (profile.outingCount || 0) + 1,
      });
    } else {
      const base = seedById[id]?.outingCount || 0;
      const current = overrides[id]?.outingCount ?? base;
      overrides[id] = { ...(overrides[id] || {}), outingCount: current + 1 };
    }
  }
  await writeJson(KEYS.overrides, overrides);
}

export async function demoAccept(connectId) {
  return setConnectStatus(connectId, 'accepted');
}

export async function demoOtherConfirm(connectId) {
  return confirmMeet(connectId, 'seed-other');
}

export async function loadTour() {
  return readJson(KEYS.tour, { done: false, step: null });
}

export async function saveTour(tour) {
  await writeJson(KEYS.tour, tour);
  return tour;
}

export async function listGatherings(city, userId) {
  const joins = await readJson(KEYS.gatheringJoins, {});
  return gatheringsForCity(city).map((g) => {
    const extra = joins[g.id] || [];
    return {
      ...g,
      joinedCount: Math.min(GATHERING_CAP, g.baseJoined + extra.length),
      iJoined: userId ? extra.includes(userId) : false,
    };
  });
}

export async function joinGathering(id, userId) {
  if (!userId) {
    const err = new Error('need account');
    err.code = 'auth';
    throw err;
  }
  const g = findGathering(id);
  if (!g) {
    const err = new Error('missing gathering');
    err.code = 'missing';
    throw err;
  }
  const joins = await readJson(KEYS.gatheringJoins, {});
  const extra = joins[id] || [];
  if (extra.includes(userId)) {
    return listGatherings(g.city, userId);
  }
  const count = g.baseJoined + extra.length;
  if (count >= GATHERING_CAP) {
    const err = new Error('full');
    err.code = 'full';
    throw err;
  }
  extra.push(userId);
  joins[id] = extra;
  await writeJson(KEYS.gatheringJoins, joins);
  return listGatherings(g.city, userId);
}

export { isGuideId, getGuide };
