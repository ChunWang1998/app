import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FREE_DAILY_MATCHES,
  INTEREST_COOLDOWN_MS,
  PAID_DAILY_MATCHES,
  CHAT_CAP,
} from '../data/identities';

const PROFILE_KEY = 'app4:local_profile';
const MATCHES_KEY = 'app4:local_matches';
const MESSAGES_KEY = 'app4:local_messages';
const USAGE_KEY = 'app4:local_usage';
const REPORTS_KEY = 'app4:local_reports';
const SEEDS_KEY = 'app4:local_seeds_v1';

const SEED_REPLIES = [
  '你好！想多了解你的日常工作～',
  '我這行入行大概幾年了，可以問我。',
  '面試時最常被問的其實是實務經驗。',
  '如果你有想轉職，我可以分享一點心得。',
  '證照有幫助，但專案經驗更重要。',
];

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Asia/Taipei calendar date YYYY-MM-DD */
export function taipeiDayKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function overlaps(a, b) {
  const set = new Set(b || []);
  return (a || []).some((x) => set.has(x));
}

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function maskOther(other, includeLine) {
  if (!other) return other;
  return {
    ...other,
    line_id: includeLine ? other.line_id : null,
  };
}

function isSeedId(id) {
  return String(id || '').startsWith('seed-');
}

const SEED_PROFILES = [
  {
    id: 'seed-engineer',
    own_identities: ['engineer'],
    interest_identities: ['teacher', 'mother'],
    line_id: 'demo_engineer',
  },
  {
    id: 'seed-teacher',
    own_identities: ['teacher'],
    interest_identities: ['engineer', 'designer'],
    line_id: 'demo_teacher',
  },
  {
    id: 'seed-mother',
    own_identities: ['mother'],
    interest_identities: ['teacher', 'engineer'],
    line_id: 'demo_mother',
  },
  {
    id: 'seed-designer',
    own_identities: ['designer'],
    interest_identities: ['engineer', 'writer'],
    line_id: 'demo_designer',
  },
  {
    id: 'seed-writer',
    own_identities: ['writer'],
    interest_identities: ['designer', 'teacher'],
    line_id: 'demo_writer',
  },
];

async function ensureSeeds() {
  const existing = await readJson(SEEDS_KEY, null);
  if (existing) return existing;
  await writeJson(SEEDS_KEY, SEED_PROFILES);
  return SEED_PROFILES;
}

async function loadMatchesRaw() {
  return readJson(MATCHES_KEY, []);
}

async function saveMatchesRaw(matches) {
  await writeJson(MATCHES_KEY, matches);
}

async function loadAllMessages() {
  return readJson(MESSAGES_KEY, {});
}

async function saveAllMessages(map) {
  await writeJson(MESSAGES_KEY, map);
}

async function purgeMessages(matchId) {
  const map = await loadAllMessages();
  delete map[matchId];
  await saveAllMessages(map);
}

function findMatch(matches, matchId) {
  return matches.find((m) => m.match_id === matchId);
}

export async function localLoadProfile() {
  return readJson(PROFILE_KEY, null);
}

export async function localRegisterOrLoad(deviceId, payload) {
  const existing = await localLoadProfile();
  if (existing) {
    existing.last_active_at = new Date().toISOString();
    await writeJson(PROFILE_KEY, existing);
    return { ok: true, already: true, profile: existing };
  }
  if (!payload?.own_identities || !payload?.interest_identities || !payload?.line_id) {
    return { ok: false, code: 'need_onboarding' };
  }
  const profile = {
    id: uuid(),
    device_id: deviceId,
    own_identities: payload.own_identities,
    interest_identities: payload.interest_identities,
    line_id: String(payload.line_id).trim(),
    interests_changed_at: null,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  await writeJson(PROFILE_KEY, profile);
  await ensureSeeds();
  return { ok: true, already: false, profile };
}

export async function localUpdateLine(lineId) {
  const p = await localLoadProfile();
  if (!p) return { ok: false, code: 'not_registered' };
  const line = String(lineId || '').trim();
  if (!line || line.length > 64) return { ok: false, code: 'invalid_line' };
  p.line_id = line;
  p.last_active_at = new Date().toISOString();
  await writeJson(PROFILE_KEY, p);
  return { ok: true, profile: p };
}

export async function localUpdateInterests(interest, claimedPaid) {
  const p = await localLoadProfile();
  if (!p) return { ok: false, code: 'not_registered' };
  if (!claimedPaid) return { ok: false, code: 'need_paid' };
  if (p.interests_changed_at) {
    const next =
      new Date(p.interests_changed_at).getTime() + INTEREST_COOLDOWN_MS;
    if (Date.now() < next) {
      return {
        ok: false,
        code: 'cooldown',
        next_at: new Date(next).toISOString(),
      };
    }
  }
  const cleaned = [
    ...new Set((interest || []).map((x) => String(x).trim()).filter(Boolean)),
  ];
  if (cleaned.length < 1 || cleaned.length > 2) {
    return { ok: false, code: 'invalid_interest' };
  }
  p.interest_identities = cleaned;
  p.interests_changed_at = new Date().toISOString();
  await writeJson(PROFILE_KEY, p);
  return { ok: true, profile: p };
}

export async function localGetUsage(claimedPaid) {
  const p = await localLoadProfile();
  if (!p) return { ok: false, code: 'not_registered' };
  const day = taipeiDayKey();
  const usage = await readJson(USAGE_KEY, {});
  const used = usage[day] || 0;
  const lim = claimedPaid ? PAID_DAILY_MATCHES : FREE_DAILY_MATCHES;
  return {
    ok: true,
    day,
    used,
    limit: lim,
    remaining: Math.max(lim - used, 0),
  };
}

export async function localDailyMatch(claimedPaid) {
  const me = await localLoadProfile();
  if (!me) return { ok: false, code: 'not_registered' };

  const usageInfo = await localGetUsage(claimedPaid);
  if (usageInfo.remaining <= 0) {
    return {
      ok: false,
      code: 'quota',
      used: usageInfo.used,
      limit: usageInfo.limit,
    };
  }

  const seeds = await ensureSeeds();
  const matches = await loadMatchesRaw();
  const reports = await readJson(REPORTS_KEY, []);
  const reported = new Set(reports.map((r) => r.target_id));
  const matchedIds = new Set(matches.map((m) => m.other?.id).filter(Boolean));

  const candidates = seeds.filter(
    (c) =>
      !reported.has(c.id) &&
      !matchedIds.has(c.id) &&
      overlaps(me.interest_identities, c.own_identities) &&
      overlaps(c.interest_identities, me.own_identities),
  );

  if (!candidates.length) {
    return { ok: false, code: 'no_candidates' };
  }

  const other = candidates[Math.floor(Math.random() * candidates.length)];
  const match = {
    match_id: uuid(),
    created_at: new Date().toISOString(),
    initiator_id: me.id,
    status: 'chatting',
    message_count: 0,
    my_consent: null,
    peer_consent: null,
    other: { ...other },
    me: { ...me },
  };
  matches.unshift(match);
  await saveMatchesRaw(matches);

  const day = taipeiDayKey();
  const usage = await readJson(USAGE_KEY, {});
  usage[day] = (usage[day] || 0) + 1;
  await writeJson(USAGE_KEY, usage);

  const used = usage[day];
  const lim = claimedPaid ? PAID_DAILY_MATCHES : FREE_DAILY_MATCHES;
  return {
    ok: true,
    match_id: match.match_id,
    status: 'chatting',
    message_count: 0,
    chat_cap: CHAT_CAP,
    me,
    other: maskOther(other, false),
    used,
    limit: lim,
    remaining: Math.max(lim - used, 0),
  };
}

export async function localListMatches() {
  const me = await localLoadProfile();
  const matches = await loadMatchesRaw();
  return {
    ok: true,
    matches: matches.map((m) => {
      const revealed = m.status === 'line_revealed';
      return {
        match_id: m.match_id,
        created_at: m.created_at,
        initiator_id: m.initiator_id,
        status: m.status || 'chatting',
        message_count: m.message_count || 0,
        chat_cap: CHAT_CAP,
        my_consent: m.my_consent ?? null,
        other: maskOther(m.other, revealed),
        me_line_id: revealed ? me?.line_id : null,
      };
    }),
  };
}

async function buildListPayload(match) {
  const me = await localLoadProfile();
  const revealed = match.status === 'line_revealed';
  const ended = String(match.status || '').startsWith('ended_');
  const map = await loadAllMessages();
  const messages = ended ? [] : map[match.match_id] || [];
  return {
    ok: true,
    match_id: match.match_id,
    status: match.status,
    message_count: match.message_count || 0,
    chat_cap: CHAT_CAP,
    my_consent: match.my_consent ?? null,
    peer_consent: match.peer_consent ?? null,
    messages,
    other: maskOther(match.other, revealed),
    me,
  };
}

export async function localListMessages(matchId) {
  const matches = await loadMatchesRaw();
  const match = findMatch(matches, matchId);
  if (!match) return { ok: false, code: 'not_found' };
  return buildListPayload(match);
}

export async function localSendMessage(matchId, body) {
  const me = await localLoadProfile();
  if (!me) return { ok: false, code: 'not_registered' };
  const text = String(body || '').trim();
  if (!text || text.length > 500) return { ok: false, code: 'invalid_body' };

  const matches = await loadMatchesRaw();
  const match = findMatch(matches, matchId);
  if (!match) return { ok: false, code: 'not_found' };
  if (match.status !== 'chatting') {
    return {
      ok: false,
      code: match.status === 'awaiting_consent' ? 'chat_cap_reached' : 'ended',
    };
  }
  if ((match.message_count || 0) >= CHAT_CAP) {
    match.status = 'awaiting_consent';
    await saveMatchesRaw(matches);
    return { ok: false, code: 'chat_cap_reached' };
  }

  const map = await loadAllMessages();
  const list = map[matchId] || [];
  list.push({
    id: uuid(),
    sender_id: me.id,
    body: text,
    created_at: new Date().toISOString(),
  });
  match.message_count = (match.message_count || 0) + 1;

  // 本機種子自動回一句，方便測到 20
  if (
    isSeedId(match.other?.id) &&
    match.message_count < CHAT_CAP &&
    match.status === 'chatting'
  ) {
    const reply =
      SEED_REPLIES[list.length % SEED_REPLIES.length] || SEED_REPLIES[0];
    list.push({
      id: uuid(),
      sender_id: match.other.id,
      body: reply,
      created_at: new Date().toISOString(),
    });
    match.message_count += 1;
  }

  if (match.message_count >= CHAT_CAP) {
    match.status = 'awaiting_consent';
  }

  map[matchId] = list;
  await saveAllMessages(map);
  await saveMatchesRaw(matches);
  return buildListPayload(match);
}

export async function localSubmitConsent(matchId, yes) {
  const me = await localLoadProfile();
  if (!me) return { ok: false, code: 'not_registered' };
  const matches = await loadMatchesRaw();
  const match = findMatch(matches, matchId);
  if (!match) return { ok: false, code: 'not_found' };

  if (match.status === 'line_revealed') {
    return {
      ok: true,
      status: 'line_revealed',
      other: maskOther(match.other, true),
      me,
    };
  }
  if (String(match.status || '').startsWith('ended_')) {
    return { ok: false, code: 'ended', status: match.status };
  }
  if (match.status === 'chatting' && (match.message_count || 0) < CHAT_CAP) {
    return { ok: false, code: 'too_early' };
  }
  if (match.status === 'chatting') match.status = 'awaiting_consent';

  if (!yes) {
    await purgeMessages(matchId);
    match.status = 'ended_declined';
    match.message_count = 0;
    match.ended_at = new Date().toISOString();
    await saveMatchesRaw(matches);
    return { ok: true, status: 'ended_declined', messages_deleted: true };
  }

  match.my_consent = true;
  // 種子對方自動同意，方便本機測露 LINE
  if (isSeedId(match.other?.id)) {
    match.peer_consent = true;
  }

  if (match.my_consent && match.peer_consent) {
    match.status = 'line_revealed';
    match.line_revealed_at = new Date().toISOString();
    await saveMatchesRaw(matches);
    return {
      ok: true,
      status: 'line_revealed',
      other: maskOther(match.other, true),
      me,
    };
  }

  await saveMatchesRaw(matches);
  return {
    ok: true,
    status: 'awaiting_consent',
    my_consent: true,
    peer_consent: match.peer_consent ?? null,
    waiting_peer: true,
  };
}

export async function localLeaveChat(matchId) {
  const matches = await loadMatchesRaw();
  const match = findMatch(matches, matchId);
  if (!match) return { ok: false, code: 'not_found' };
  if (match.status === 'line_revealed') {
    return { ok: false, code: 'already_revealed' };
  }
  if (String(match.status || '').startsWith('ended_')) {
    return { ok: true, status: match.status };
  }
  await purgeMessages(matchId);
  match.status = 'ended_left';
  match.message_count = 0;
  match.ended_at = new Date().toISOString();
  await saveMatchesRaw(matches);
  return { ok: true, status: 'ended_left', messages_deleted: true };
}

export async function localReport(targetId, reason, matchId) {
  const me = await localLoadProfile();
  if (!me) return { ok: false, code: 'not_registered' };
  const reports = await readJson(REPORTS_KEY, []);
  reports.push({
    id: uuid(),
    reporter_id: me.id,
    target_id: targetId,
    reason,
    match_id: matchId || null,
    created_at: new Date().toISOString(),
  });
  await writeJson(REPORTS_KEY, reports);

  if (matchId) {
    const matches = await loadMatchesRaw();
    const match = findMatch(matches, matchId);
    if (
      match &&
      match.status !== 'line_revealed' &&
      !String(match.status || '').startsWith('ended_')
    ) {
      await purgeMessages(matchId);
      match.status = 'ended_reported';
      match.message_count = 0;
      match.ended_at = new Date().toISOString();
      await saveMatchesRaw(matches);
    }
  }
  return { ok: true };
}
