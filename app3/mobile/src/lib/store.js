import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_CHAT,
  MAX_GATHERING_INTRO,
  MAX_GATHERING_NAME,
  DEFAULT_GATHERING_CAPACITY,
  TRIAL_CITIES,
  formatGatheringDate,
  isGatheringEnded,
  normalizeSlot,
} from '../data/constants';
import { findSeedGathering, seedGatheringsForCity } from '../data/gatherings';
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
  gatherings: 'linwang:gatherings',
  gatheringLikes: 'linwang:gatheringLikes',
  gatheringEnded: 'linwang:gatheringEnded',
  hiddenChats: 'linwang:hiddenChats',
  selectedCity: 'linwang:selectedCity',
  demoInvite: 'linwang:demoInvite',
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
    slots: (profile.slots || []).map((s) => normalizeSlot(s)),
    captainCount: profile.captainCount || 0,
    memberCount: profile.memberCount || 0,
    captainScore: profile.captainScore || 0,
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
    captainCount: profile.captainCount || 0,
    memberCount: profile.memberCount || 0,
    captainScore: profile.captainScore || 0,
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
  if (existing) {
    if (existing.status === 'disconnected') {
      const row = {
        ...existing,
        status: 'pending',
        disconnectedBy: undefined,
        disconnectedAt: undefined,
        createdAt: new Date().toISOString(),
      };
      const next = connects.map((c) => (c.id === existing.id ? row : c));
      await writeJson(KEYS.connects, next);
      return row;
    }
    return existing;
  }
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

export async function disconnectConnect(id, byUserId) {
  const connects = await listConnects();
  const next = connects.map((c) =>
    c.id === id
      ? {
          ...c,
          status: 'disconnected',
          disconnectedBy: byUserId,
          disconnectedAt: new Date().toISOString(),
        }
      : c,
  );
  await writeJson(KEYS.connects, next);
  return next;
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
  const connects = await listConnects();
  const row = connects.find((c) => c.id === connectId);
  if (!row || row.status === 'disconnected') {
    const err = new Error('disconnected');
    err.code = 'disconnected';
    throw err;
  }
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

async function ownerLookup() {
  const overrides = await readJson(KEYS.overrides, {});
  const profile = await loadProfile();
  const session = await loadSession();
  const map = {};
  for (const g of GLOBAL_GUIDES) map[g.id] = { ...g, ...(overrides[g.id] || {}) };
  for (const city of TRIAL_CITIES) {
    for (const o of seedOwnersForCity(city)) {
      map[o.id] = { ...o, ...(overrides[o.id] || {}) };
    }
  }
  if (profile && session?.id) map[session.id] = { ...profile, id: session.id };
  return { map, profile, session, overrides };
}

async function bumpOwnerField(ids, field, by = 1) {
  const { map, profile, session, overrides } = await ownerLookup();
  let nextProfile = profile;
  for (const id of ids) {
    if (session && id === session.id && nextProfile) {
      nextProfile = await saveProfile({
        ...nextProfile,
        [field]: (nextProfile[field] || 0) + by,
      });
    } else {
      const base = map[id]?.[field] || 0;
      const current = overrides[id]?.[field] ?? base;
      overrides[id] = { ...(overrides[id] || {}), [field]: current + by };
    }
  }
  await writeJson(KEYS.overrides, overrides);
}

async function createdGatherings() {
  return readJson(KEYS.gatherings, []);
}

export async function findGathering(id) {
  return (
    findSeedGathering(id) ||
    (await createdGatherings()).find((g) => g.id === id) ||
    null
  );
}

function decorateGathering(g, joins, likes, userId, host) {
  const extra = joins[g.id] || [];
  const likeIds = likes[g.id] || [];
  const ended = isGatheringEnded(g.dateISO);
  const joinedCount = (g.baseJoined || 0) + extra.length;
  const capacity = g.capacity || DEFAULT_GATHERING_CAPACITY;
  const iJoined = userId ? extra.includes(userId) : false;
  const iHost = userId ? g.hostId === userId : false;
  return {
    ...g,
    hostCaptainScore: host?.captainScore || 0,
    joinedCount,
    capacity,
    full: joinedCount >= capacity,
    iJoined,
    iHost,
    ended,
    liked: userId ? likeIds.includes(userId) : false,
    likeCount: likeIds.length,
  };
}

async function applyEndedCounts(rows) {
  const counted = await readJson(KEYS.gatheringEnded, []);
  const joins = await readJson(KEYS.gatheringJoins, {});
  let dirty = false;
  for (const g of rows) {
    if (g.isSeed || !isGatheringEnded(g.dateISO) || counted.includes(g.id)) continue;
    counted.push(g.id);
    dirty = true;
    await bumpOwnerField([g.hostId], 'captainCount');
    const extras = joins[g.id] || [];
    if (extras.length) await bumpOwnerField(extras, 'memberCount');
  }
  if (dirty) await writeJson(KEYS.gatheringEnded, counted);
}

export async function listGatherings(city, userId) {
  const seeds = seedGatheringsForCity(city);
  const created = (await createdGatherings()).filter((g) => g.city === city);
  const rows = [...seeds, ...created];
  await applyEndedCounts(created);
  const joins = await readJson(KEYS.gatheringJoins, {});
  const likes = await readJson(KEYS.gatheringLikes, {});
  const { map } = await ownerLookup();
  const decorated = rows.map((g) =>
    decorateGathering(g, joins, likes, userId, map[g.hostId]),
  );
  decorated.sort((a, b) => {
    const s = (b.hostCaptainScore || 0) - (a.hostCaptainScore || 0);
    if (s !== 0) return s;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
  return decorated;
}

export async function listMyGatherings(_city, userId) {
  if (!userId) return [];
  const mine = [];
  for (const c of TRIAL_CITIES) {
    mine.push(...(await listGatherings(c, userId)));
  }
  return mine.filter((g) => g.iJoined || g.iHost);
}

export async function createGathering(payload, host) {
  const name = String(payload.name || '').trim();
  const place = String(payload.place || '').trim();
  const intro = String(payload.intro || '').trim();
  const lineGroupUrl = String(payload.lineGroupUrl || '').trim();
  const type = payload.type;
  const fee = Number(payload.fee);
  const dateISO = payload.dateISO;
  if (!name || name.length > MAX_GATHERING_NAME) {
    const err = new Error('name');
    err.code = 'invalid';
    throw err;
  }
  if (!place || !type || !dateISO) {
    const err = new Error('fields');
    err.code = 'invalid';
    throw err;
  }
  if (!Number.isFinite(fee) || fee < 0) {
    const err = new Error('fee');
    err.code = 'invalid';
    throw err;
  }
  if (intro.length > MAX_GATHERING_INTRO) {
    const err = new Error('intro');
    err.code = 'invalid';
    throw err;
  }
  if (!lineGroupUrl) {
    const err = new Error('line');
    err.code = 'line';
    throw err;
  }
  const date = new Date(dateISO);
  const row = {
    id: uid('g'),
    city: host.city,
    name,
    place,
    type,
    fee,
    intro,
    lineGroupUrl,
    hostId: host.id,
    hostName: host.dogName,
    dateISO: date.toISOString(),
    dateLabel: formatGatheringDate(date),
    createdAt: new Date().toISOString(),
    isSeed: false,
    baseJoined: 0,
    capacity: payload.capacity || DEFAULT_GATHERING_CAPACITY,
  };
  const all = await createdGatherings();
  all.unshift(row);
  await writeJson(KEYS.gatherings, all);
  return row;
}

export async function joinGathering(id, userId) {
  if (!userId) {
    const err = new Error('need account');
    err.code = 'auth';
    throw err;
  }
  const g = await findGathering(id);
  if (!g) {
    const err = new Error('missing gathering');
    err.code = 'missing';
    throw err;
  }
  if (g.hostId === userId) {
    const err = new Error('host');
    err.code = 'host';
    throw err;
  }
  if (isGatheringEnded(g.dateISO) && !g.allowJoinAfterEnd) {
    const err = new Error('ended');
    err.code = 'ended';
    throw err;
  }
  const joins = await readJson(KEYS.gatheringJoins, {});
  const extra = joins[id] || [];
  if (!extra.includes(userId)) {
    const count = (g.baseJoined || 0) + extra.length;
    const cap = g.capacity || DEFAULT_GATHERING_CAPACITY;
    if (count >= cap) {
      const err = new Error('full');
      err.code = 'full';
      throw err;
    }
    extra.push(userId);
    joins[id] = extra;
    await writeJson(KEYS.gatheringJoins, joins);
  }
  return listGatherings(g.city, userId);
}

export async function likeGatheringHost(id, userId) {
  if (!userId) {
    const err = new Error('need account');
    err.code = 'auth';
    throw err;
  }
  const g = await findGathering(id);
  if (!g) {
    const err = new Error('missing gathering');
    err.code = 'missing';
    throw err;
  }
  if (!isGatheringEnded(g.dateISO)) {
    const err = new Error('not ended');
    err.code = 'early';
    throw err;
  }
  if (g.hostId === userId) {
    const err = new Error('host');
    err.code = 'host';
    throw err;
  }
  const joins = await readJson(KEYS.gatheringJoins, {});
  if (!(joins[id] || []).includes(userId)) {
    const err = new Error('not joined');
    err.code = 'join';
    throw err;
  }
  const likes = await readJson(KEYS.gatheringLikes, {});
  const row = likes[id] || [];
  if (row.includes(userId)) {
    const err = new Error('already');
    err.code = 'already';
    throw err;
  }
  row.push(userId);
  likes[id] = row;
  await writeJson(KEYS.gatheringLikes, likes);
  await bumpOwnerField([g.hostId], 'captainScore');
  return listGatherings(g.city, userId);
}

export async function loadHiddenChats() {
  return readJson(KEYS.hiddenChats, []);
}

export async function hideChat(connectId) {
  const ids = await readJson(KEYS.hiddenChats, []);
  if (!ids.includes(connectId)) ids.push(connectId);
  await writeJson(KEYS.hiddenChats, ids);
  return ids;
}

export async function unhideChat(connectId) {
  const ids = (await readJson(KEYS.hiddenChats, [])).filter((id) => id !== connectId);
  await writeJson(KEYS.hiddenChats, ids);
  return ids;
}

export async function loadSelectedCity() {
  const city = await readJson(KEYS.selectedCity, null);
  return TRIAL_CITIES.includes(city) ? city : null;
}

export async function saveSelectedCity(city) {
  await writeJson(KEYS.selectedCity, city);
  return city;
}

export async function maybeSendDemoInvite(userId, city) {
  if (!userId || !city) return null;
  const sent = await readJson(KEYS.demoInvite, false);
  if (sent) return null;
  const owners = await listOwners(city);
  const peer = owners.find((o) => !o.isGuide && !o.isMe && o.id !== userId);
  if (!peer) {
    await writeJson(KEYS.demoInvite, true);
    return null;
  }
  const row = await sendConnect(peer.id, userId);
  await writeJson(KEYS.demoInvite, true);
  return { row, peer };
}

export { isGuideId, getGuide };
