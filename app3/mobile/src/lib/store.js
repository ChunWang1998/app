import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_CHAT,
  MAX_GATHERING_INTRO,
  MAX_GATHERING_NAME,
  DEFAULT_GATHERING_CAPACITY,
  TRIAL_CITIES,
  formatGatheringDate,
  isGatheringDateAllowed,
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
import {
  isCloudReady,
  isUuid,
  loadMyAccount,
  upsertProfile,
  loginWithPhone,
  registerFounder,
  listCityProfiles,
  listMyConnects,
  sendConnectCloud,
  setConnectStatusCloud,
  disconnectConnectCloud,
  listMessagesCloud,
  sendMessageCloud,
  confirmMeetCloud,
  listCityGatherings,
  createGatheringCloud,
  joinGatheringCloud,
  likeGatheringCloud,
  blockAccount,
  reportAccount,
  deleteMyAccount,
  uploadAvatar,
} from './cloud';

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
  if (isCloudReady()) {
    try {
      const row = await loadMyAccount(session.loginKey);
      if (row?.accountId) session.id = row.accountId;
      if (row?.subscription) session.subscription = row.subscription;
      await saveSession(session);
      if (row?.profile) await writeJson(KEYS.profile, row.profile);
    } catch {
      // Keep the cached session if the network is down.
    }
  }
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
  const session = await loadSession();
  let photoUri = profile.photoUri || null;
  if (isCloudReady() && session?.loginKey && photoUri) {
    photoUri = await uploadAvatar(session.loginKey, photoUri);
  }
  const next = {
    ...profile,
    photoUri,
    photoOk: Boolean(photoUri) || Boolean(profile.photoOk),
    slots: (profile.slots || []).map((s) => normalizeSlot(s)),
    captainCount: profile.captainCount || 0,
    memberCount: profile.memberCount || 0,
    captainScore: profile.captainScore || 0,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(KEYS.profile, next);
  if (isCloudReady() && session?.loginKey) {
    const row = await upsertProfile(session.loginKey, next);
    if (row?.profile) {
      await writeJson(KEYS.profile, row.profile);
      return row.profile;
    }
  }
  return next;
}

/**
 * Phone + dog profile must be saved together. Founder slot is claimed only then.
 */
export async function restoreAccount(phoneRaw) {
  const loginKey = normalizeLoginKey(phoneRaw);
  if (loginKey.length < 9) {
    const err = new Error('invalid phone');
    err.code = 'invalid';
    throw err;
  }
  if (!isCloudReady()) return null;
  const row = await loginWithPhone(loginKey);
  if (!row?.profile) return null;
  const session = {
    id: row.accountId,
    loginKey,
    phone: loginKey,
    provider: 'phone',
    registeredAt: row.profile.registeredAt || new Date().toISOString(),
    subscription:
      row.subscription === 'paid'
        ? 'paid'
        : row.subscription === 'founder'
          ? 'founder'
          : 'none',
  };
  if (session.subscription !== 'paid' && (await isWhitelisted(loginKey))) {
    session.subscription = 'founder';
  }
  await saveSession(session);
  await writeJson(KEYS.profile, row.profile);
  return {
    session,
    profile: row.profile,
    founderCount: await whitelistCount(),
  };
}

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
    id: claimed.accountId || accountIdFromKey(loginKey),
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
  const loginKey = normalizeLoginKey(phoneRaw);
  if (loginKey.length < 9) {
    const err = new Error('invalid phone');
    err.code = 'invalid';
    throw err;
  }

  if (isCloudReady()) {
    let photoUri = profile.photoUri || null;
    if (photoUri) {
      photoUri = await uploadAvatar(loginKey, photoUri);
    }
    const payload = {
      ...profile,
      photoUri,
      photoOk: Boolean(photoUri) || Boolean(profile.photoOk),
      slots: (profile.slots || []).map((s) => normalizeSlot(s)),
    };
    const row = await registerFounder(loginKey, 'phone', payload);
    const session = {
      id: row.accountId || row.account_id,
      loginKey,
      phone: loginKey,
      provider: 'phone',
      registeredAt: row.profile?.registeredAt || new Date().toISOString(),
      subscription: row.founder || row.subscription === 'founder' ? 'founder' : 'none',
    };
    await saveSession(session);
    if (row.profile) await writeJson(KEYS.profile, row.profile);
    return {
      session,
      profile: row.profile || payload,
      founderCount: await whitelistCount(),
      already: Boolean(row.already),
    };
  }

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

export async function deleteAccount() {
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey) {
    await deleteMyAccount(session.loginKey);
  }
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function reportOwner(targetId, reason) {
  const session = await loadSession();
  if (!isCloudReady() || !session?.loginKey || !isUuid(targetId)) {
    const err = new Error('cloud');
    err.code = 'cloud';
    throw err;
  }
  return reportAccount(session.loginKey, targetId, reason);
}

export async function blockOwner(targetId) {
  const session = await loadSession();
  if (!isCloudReady() || !session?.loginKey || !isUuid(targetId)) {
    const err = new Error('cloud');
    err.code = 'cloud';
    throw err;
  }
  return blockAccount(session.loginKey, targetId);
}

export async function listOwners(city) {
  const seed = seedOwnersForCity(city);
  const overrides = await readJson(KEYS.overrides, {});
  const profile = await loadProfile();
  const session = await loadSession();
  const guides = GLOBAL_GUIDES.map((o) => ({ ...o, ...(overrides[o.id] || {}) }));
  const merged = seed.map((o) => ({ ...o, ...(overrides[o.id] || {}) }));
  let cloud = [];
  if (isCloudReady()) {
    try {
      cloud = await listCityProfiles(session?.loginKey, city);
    } catch {
      cloud = [];
    }
  }
  const seen = new Set(cloud.map((o) => o.id));
  if (profile?.photoOk && profile.city === city && session?.id && !seen.has(session.id)) {
    merged.push({
      ...profile,
      id: session.id,
      isMe: true,
      isSeed: false,
    });
  }
  const local = merged.filter((o) => o.photoOk);
  const remote = cloud.map((o) => ({
    ...o,
    isMe: session?.id === o.id,
  }));
  return [...guides, ...local, ...remote];
}

export async function getOwner(city, id) {
  const all = await listOwners(city);
  return all.find((o) => o.id === id) || getGuide(id) || null;
}

export async function listConnects() {
  const local = await readJson(KEYS.connects, []);
  if (!isCloudReady()) return local;
  const session = await loadSession();
  if (!session?.loginKey) return local;
  try {
    const remote = await listMyConnects(session.loginKey);
    const localOnly = local.filter((c) => !isUuid(c.id));
    return [...remote, ...localOnly];
  } catch {
    return local;
  }
}

export async function sendConnect(fromId, toId) {
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey && isUuid(toId)) {
    return sendConnectCloud(session.loginKey, toId);
  }
  const connects = await readJson(KEYS.connects, []);
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
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey && isUuid(id)) {
    await disconnectConnectCloud(session.loginKey, id);
    return listConnects();
  }
  const connects = await readJson(KEYS.connects, []);
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
  return listConnects();
}

export async function setConnectStatus(id, status) {
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey && isUuid(id)) {
    await setConnectStatusCloud(session.loginKey, id, status);
    return listConnects();
  }
  const connects = await readJson(KEYS.connects, []);
  const next = connects.map((c) => (c.id === id ? { ...c, status } : c));
  await writeJson(KEYS.connects, next);
  if (status === 'accepted') {
    const row = next.find((c) => c.id === id);
    if (row) await bumpConnectCount([row.fromId, row.toId]);
  }
  return listConnects();
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
      if (isCloudReady()) continue;
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
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey && isUuid(connectId)) {
    return listMessagesCloud(session.loginKey, connectId);
  }
  const all = await readJson(KEYS.messages, {});
  return all[connectId] || [];
}

export async function sendMessage(connectId, fromId, text) {
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey && isUuid(connectId)) {
    return sendMessageCloud(session.loginKey, connectId, text);
  }
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
  const session = await loadSession();
  if (isCloudReady() && session?.loginKey && isUuid(connectId)) {
    return confirmMeetCloud(session.loginKey, connectId);
  }
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
      if (isCloudReady()) continue;
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
      if (isCloudReady()) continue;
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
  const seed = findSeedGathering(id);
  if (seed) return seed;
  const local = (await createdGatherings()).find((g) => g.id === id);
  if (local) return local;
  if (isCloudReady() && isUuid(id)) {
    const session = await loadSession();
    for (const city of TRIAL_CITIES) {
      try {
        const rows = await listCityGatherings(session?.loginKey, city);
        const hit = rows.find((g) => g.id === id);
        if (hit) return hit;
      } catch {
        // ignore one city
      }
    }
  }
  return null;
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
  const seeds = isCloudReady() ? [] : seedGatheringsForCity(city);
  let created = (await createdGatherings()).filter((g) => g.city === city);
  if (isCloudReady()) {
    try {
      const session = await loadSession();
      created = await listCityGatherings(session?.loginKey, city);
    } catch {
      created = [];
    }
  } else {
    await applyEndedCounts(created);
  }
  const rows = [...seeds, ...created];
  const joins = await readJson(KEYS.gatheringJoins, {});
  const likes = await readJson(KEYS.gatheringLikes, {});
  const { map } = await ownerLookup();
  const decorated = rows.map((g) =>
    g.isSeed === false && isCloudReady() && isUuid(g.id)
      ? g
      : decorateGathering(g, joins, likes, userId, map[g.hostId]),
  );
  decorated.sort((a, b) => {
    const s = (b.hostCaptainScore || 0) - (a.hostCaptainScore || 0);
    if (s !== 0) return s;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
  return decorated;
}

export async function listMyGatherings(city, userId) {
  if (!userId) return [];
  const rows = await listGatherings(city, userId);
  return rows.filter((g) => g.iJoined || g.iHost);
}

export async function hostHasOpenGathering(userId) {
  if (!userId) return false;
  if (isCloudReady()) {
    const session = await loadSession();
    for (const city of TRIAL_CITIES) {
      try {
        const rows = await listCityGatherings(session?.loginKey, city);
        if (rows.some((g) => g.iHost && !g.ended)) return true;
      } catch {
        // ignore
      }
    }
  }
  const created = await createdGatherings();
  return created.some(
    (g) => g.hostId === userId && !isGatheringEnded(g.dateISO),
  );
}

export async function createGathering(payload, host) {
  if (isCloudReady()) {
    const session = await loadSession();
    return createGatheringCloud(session.loginKey, {
      ...payload,
      city: host.city,
      hostName: host.dogName,
    });
  }
  if (await hostHasOpenGathering(host?.id)) {
    const err = new Error('already hosting');
    err.code = 'already';
    throw err;
  }
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
  if (Number.isNaN(date.getTime()) || !isGatheringDateAllowed(date)) {
    const err = new Error('date');
    err.code = 'invalid';
    throw err;
  }
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
  if (isCloudReady() && isUuid(id)) {
    const session = await loadSession();
    await joinGatheringCloud(session.loginKey, id);
    const g = await findGathering(id);
    return listGatherings(g?.city, userId);
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
  if (isCloudReady() && isUuid(id)) {
    const session = await loadSession();
    await likeGatheringCloud(session.loginKey, id);
    const g = await findGathering(id);
    return listGatherings(g?.city, userId);
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
  if (isCloudReady()) return null;
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

export { isGuideId, getGuide, isCloudReady };
