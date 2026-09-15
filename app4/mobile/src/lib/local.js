import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FREE_DAILY_MATCHES,
  INTEREST_COOLDOWN_MS,
  PAID_DAILY_MATCHES,
} from '../data/identities';

const PROFILE_KEY = 'app4:local_profile';
const MATCHES_KEY = 'app4:local_matches';
const USAGE_KEY = 'app4:local_usage';
const REPORTS_KEY = 'app4:local_reports';
const SEEDS_KEY = 'app4:local_seeds_v1';

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
  const cleaned = [...new Set((interest || []).map((x) => String(x).trim()).filter(Boolean))];
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
  const matches = await readJson(MATCHES_KEY, []);
  const reports = await readJson(REPORTS_KEY, []);
  const reported = new Set(reports.map((r) => r.target_id));
  const matchedIds = new Set(
    matches.map((m) => (m.other.id === me.id ? null : m.other.id)).filter(Boolean),
  );

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
    other: { ...other },
    me: { ...me },
  };
  matches.unshift(match);
  await writeJson(MATCHES_KEY, matches);

  const day = taipeiDayKey();
  const usage = await readJson(USAGE_KEY, {});
  usage[day] = (usage[day] || 0) + 1;
  await writeJson(USAGE_KEY, usage);

  const used = usage[day];
  const lim = claimedPaid ? PAID_DAILY_MATCHES : FREE_DAILY_MATCHES;
  return {
    ok: true,
    match_id: match.match_id,
    me,
    other,
    used,
    limit: lim,
    remaining: Math.max(lim - used, 0),
  };
}

export async function localListMatches() {
  const matches = await readJson(MATCHES_KEY, []);
  return {
    ok: true,
    matches: matches.map((m) => ({
      match_id: m.match_id,
      created_at: m.created_at,
      initiator_id: m.initiator_id,
      other: m.other,
    })),
  };
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
  return { ok: true };
}
