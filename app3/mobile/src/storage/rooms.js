import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateRoomCode } from '../lib/roomCode';
import { getSutra, getWork, getWorkMeta } from '../data/sutras';
import { resolveWorkId } from '../storage/corpus/aliases';

const ROOMS_KEY = 'gongchao:rooms';
const MY_ROOMS_KEY = 'gongchao:my_rooms';
const MAX_MEMBERS = 5;
/** One device may keep at most this many rooms (create or join). */
export const MAX_ROOMS_PER_PERSON = 3;

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function readRooms() {
  try {
    const raw = await AsyncStorage.getItem(ROOMS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeRooms(rooms) {
  await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

async function readMyRoomIds() {
  try {
    const raw = await AsyncStorage.getItem(MY_ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function rememberRoom(code) {
  const list = await readMyRoomIds();
  if (!list.includes(code)) {
    list.unshift(code);
    await AsyncStorage.setItem(MY_ROOMS_KEY, JSON.stringify(list));
  }
}

function ensureMemberDay(member, dateKey) {
  if (!member.days) member.days = {};
  if (!member.days[dateKey]) {
    member.days[dateKey] = { completedUnitIds: [], makeUpDone: 0 };
  }
  return member.days[dateKey];
}

/**
 * Local-first room store (MVP).
 * Same-device open/join works; multi-device sync can plug into a backend later.
 */
/** Room list / header title; falls back for rooms created before roomName existed. */
export function getRoomDisplayName(room) {
  if (room?.roomName?.trim()) return room.roomName.trim();
  const meta = getWorkMeta(room?.sutraId);
  return meta?.shortTitle || '未命名房間';
}

export async function createRoom({
  deviceId,
  displayName,
  roomName,
  sutraId,
  dailyQuota,
}) {
  const allowed = await canAddRoom(null);
  if (!allowed.ok) {
    return { ok: false, error: allowed.error };
  }

  const rooms = await readRooms();
  let code = generateRoomCode();
  let guard = 0;
  while (rooms[code] && guard < 20) {
    code = generateRoomCode();
    guard += 1;
  }

  const sutra = await getWork(sutraId);
  if (!sutra) {
    return { ok: false, error: '找不到這部經' };
  }
  const quota = Math.max(1, Math.min(Number(dailyQuota) || 3, sutra.units.length));

  const trimmedRoomName = roomName?.trim();
  if (!trimmedRoomName) {
    return { ok: false, error: '請填寫房間名稱' };
  }

  const room = {
    code,
    roomName: trimmedRoomName,
    sutraId: resolveWorkId(sutra.id),
    dailyQuota: quota,
    hostDeviceId: deviceId,
    createdAt: Date.now(),
    members: [
      {
        deviceId,
        name: displayName?.trim() || '房主',
        joinedAt: Date.now(),
        days: {},
      },
    ],
  };

  rooms[code] = room;
  await writeRooms(rooms);
  await rememberRoom(code);
  return { ok: true, room };
}

export async function joinRoom({ code, deviceId, displayName }) {
  const rooms = await readRooms();
  const room = rooms[code];
  if (!room) {
    return { ok: false, error: '找不到這個房間碼' };
  }

  const existing = room.members.find((m) => m.deviceId === deviceId);
  if (existing) {
    if (displayName?.trim()) existing.name = displayName.trim();
    await writeRooms(rooms);
    await rememberRoom(code);
    return { ok: true, room };
  }

  const allowed = await canAddRoom(code);
  if (!allowed.ok) {
    return { ok: false, error: allowed.error };
  }

  if (room.members.length >= MAX_MEMBERS) {
    return { ok: false, error: `房間已滿（最多 ${MAX_MEMBERS} 人）` };
  }

  room.members.push({
    deviceId,
    name: displayName?.trim() || `成員${room.members.length + 1}`,
    joinedAt: Date.now(),
    days: {},
  });
  await writeRooms(rooms);
  await rememberRoom(code);
  return { ok: true, room };
}

export async function getRoom(code) {
  const rooms = await readRooms();
  return rooms[code] || null;
}

export async function listMyRooms() {
  const ids = await readMyRoomIds();
  const rooms = await readRooms();
  return ids.map((id) => rooms[id]).filter(Boolean);
}

/** True if this device can add a new room (already-in rooms are always ok). */
export async function canAddRoom(code) {
  const mine = await listMyRooms();
  if (code && mine.some((r) => r.code === code)) return { ok: true };
  if (mine.length >= MAX_ROOMS_PER_PERSON) {
    return {
      ok: false,
      error: `每人最多 ${MAX_ROOMS_PER_PERSON} 個房間，請先長按列表離開其中一間。`,
    };
  }
  return { ok: true };
}

/** Remove a room from this device's list (does not delete the room for others). */
export async function leaveMyRoom(code) {
  const list = await readMyRoomIds();
  const next = list.filter((id) => id !== code);
  await AsyncStorage.setItem(MY_ROOMS_KEY, JSON.stringify(next));
  return next;
}

export async function refreshRoom(code) {
  return getRoom(code);
}

/** Host-only: switch the room sutra; resets all member progress (unit ids are not sutra-scoped). */
export async function changeRoomSutra({ code, deviceId, sutraId }) {
  const rooms = await readRooms();
  const room = rooms[code];
  if (!room) return { ok: false, error: '房間不存在' };
  if (room.hostDeviceId !== deviceId) {
    return { ok: false, error: '只有房主可以更換經文' };
  }

  const sutra = await getWork(sutraId);
  if (!sutra) return { ok: false, error: '找不到這部經' };
  if (resolveWorkId(room.sutraId) === resolveWorkId(sutra.id)) {
    return { ok: true, room };
  }

  room.sutraId = resolveWorkId(sutra.id);
  room.dailyQuota = Math.max(1, Math.min(room.dailyQuota, sutra.units.length));
  room.sutraChangedAt = Date.now();
  room.members.forEach((member) => {
    member.days = {};
  });

  await writeRooms(rooms);
  return { ok: true, room };
}

/** Mark a sentence unit complete for today; excess counts as make-up. */
export async function completeUnit({ code, deviceId, unitId }) {
  const rooms = await readRooms();
  const room = rooms[code];
  if (!room) return { ok: false, error: '房間不存在' };

  const member = room.members.find((m) => m.deviceId === deviceId);
  if (!member) return { ok: false, error: '你不在這個房間' };

  const dateKey = todayKey();
  const day = ensureMemberDay(member, dateKey);
  if (!day.completedUnitIds.includes(unitId)) {
    day.completedUnitIds.push(unitId);
  }

  await writeRooms(rooms);
  return { ok: true, room };
}

export function getMemberTodayStats(room, member) {
  const dateKey = todayKey();
  const day = member?.days?.[dateKey] || { completedUnitIds: [] };
  const done = day.completedUnitIds.length;
  const quota = room.dailyQuota;
  const todayDone = Math.min(done, quota);
  const makeUpDone = Math.max(0, done - quota);
  const metQuota = done >= quota;
  return {
    dateKey,
    completedUnitIds: day.completedUnitIds,
    done,
    todayDone,
    quota,
    makeUpDone,
    metQuota,
    remainingToday: Math.max(0, quota - done),
  };
}

export function getNextUnitIndex(room, member) {
  const sutra = getSutra(room.sutraId);
  const meta = getWorkMeta(room.sutraId);
  if (!sutra?.units) {
    return meta?.unitCount ? 0 : 0;
  }
  const doneSet = new Set();
  Object.values(member.days || {}).forEach((day) => {
    (day.completedUnitIds || []).forEach((id) => doneSet.add(id));
  });
  const next = sutra.units.findIndex((u) => !doneSet.has(u.id));
  return next === -1 ? sutra.units.length : next;
}

export function getOverallProgress(room, member) {
  const sutra = getSutra(room.sutraId);
  const meta = getWorkMeta(room.sutraId);
  const total = sutra?.units?.length ?? meta?.unitCount ?? 0;
  const doneSet = new Set();
  Object.values(member.days || {}).forEach((day) => {
    (day.completedUnitIds || []).forEach((id) => doneSet.add(id));
  });
  return {
    completed: doneSet.size,
    total,
    doneSet,
  };
}

export { MAX_MEMBERS, todayKey };
