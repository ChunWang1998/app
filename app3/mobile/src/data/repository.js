import React from 'react';
import { createActivity, nowIso, migrateActivity } from './models';
import { KeyValueStorage, loadState, saveState } from './storage';
import { validateExport } from './schema';
import { enforceReminderBudget } from '../notifications/reminders';
import { isProUnlocked } from '../lib/entitlements';

const storage = new KeyValueStorage();
let state = { version: 1, activities: [] };
let initialized = false;
const listeners = new Set();

export const FREE_ACTIVITY_LIMIT = Number(process.env.EXPO_PUBLIC_FREE_ACTIVITY_LIMIT || 3);

function notify() {
  for (const l of listeners) l(state);
}

export async function initRepository() {
  if (initialized) return;
  const loaded = await loadState(storage);
  // Purge expired deleted on load
  const purged = (loaded.activities || []).filter((a) => !isExpiredDeleted(a));
  state = { ...loaded, activities: purged };
  initialized = true;
  notify();
}

export async function resetRepositoryForTests() {
  initialized = false;
  state = { version: 1, activities: [] };
  // wipe persisted storage
  await saveState(state, storage);
  initialized = true;
  notify();
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useActivities() {
  const [snap, setSnap] = React.useState(state);
  React.useEffect(() => subscribe(setSnap), []);
  return { activities: snap.activities.filter(a => !a.deletedAt), ready: initialized, raw: snap.activities };
}

function isExpiredDeleted(activity, nowMs = Date.now()) {
  if (!activity.deletedAt) return false;
  const delMs = new Date(activity.deletedAt).getTime();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  return delMs + THIRTY_DAYS < nowMs;
}

async function persist(nextState) {
  // Purge items soft-deleted over 30 days ago
  const purgedActivities = (nextState.activities || []).filter((a) => !isExpiredDeleted(a));
  state = { ...nextState, activities: purgedActivities };
  await saveState(state, storage);
  notify();
  try {
    await enforceReminderBudget(state.activities);
  } catch {
    // Persistence must not fail if the OS rejects a notification schedule (e.g. web).
  }
}

export async function addActivity(input) {
  const pro = await isProUnlocked();
  const visible = state.activities.filter(a => !a.deletedAt).length;
  if (!pro && visible >= FREE_ACTIVITY_LIMIT) {
    const err = new Error(`Free tier limit ${FREE_ACTIVITY_LIMIT}`);
    err.code = 'FREE_LIMIT';
    throw err;
  }
  const a = createActivity(input);
  await persist({ ...state, activities: [a, ...state.activities] });
  return a;
}

export async function updateActivity(id, changes) {
  const ts = nowIso();
  const next = state.activities.map(a => (a.id === id ? { ...a, ...changes, updatedAt: ts } : a));
  await persist({ ...state, activities: next });
}

export async function logActivityNow(id) {
  const ts = nowIso();
  let previousLastDoneAt = null;
  const next = state.activities.map((a) => {
    if (a.id !== id) return a;
    previousLastDoneAt = a.lastDoneAt ?? null;
    return { ...a, lastDoneAt: ts, updatedAt: ts };
  });
  await persist({ ...state, activities: next });
  return { previousLastDoneAt, loggedAt: ts };
}

export async function undoLogActivity(id, previousLastDoneAt) {
  const ts = nowIso();
  const next = state.activities.map((a) => (
    a.id === id ? { ...a, lastDoneAt: previousLastDoneAt ?? null, updatedAt: ts } : a
  ));
  await persist({ ...state, activities: next });
}

export async function softDeleteActivity(id) {
  const ts = nowIso();
  const next = state.activities.map(a => (a.id === id ? { ...a, deletedAt: ts, updatedAt: ts } : a));
  await persist({ ...state, activities: next });
}

export async function undoDelete(id) {
  const ts = nowIso();
  const next = state.activities.map(a => (a.id === id ? { ...a, deletedAt: null, updatedAt: ts } : a));
  await persist({ ...state, activities: next });
}

export async function exportToJson() {
  const blob = {
    schema: 'been-ages/export',
    version: 1,
    exportedAt: nowIso(),
    activities: state.activities.filter((a) => !a.deletedAt),
  };
  return validateExport(blob);
}

export async function importFromJson(data) {
  const valid = validateExport(data);
  // de-dupe by id, keep latest updatedAt
  const map = new Map();
  for (const a of valid.activities) {
    const existing = map.get(a.id);
    if (!existing || new Date(a.updatedAt) > new Date(existing.updatedAt)) {
      map.set(a.id, migrateActivity(a));
    }
  }
  let nextActivities = Array.from(map.values());
  let truncated = false;
  // Enforce free tier for non-pro: only keep up to FREE_ACTIVITY_LIMIT visible items
  const pro = await isProUnlocked();
  if (!pro) {
    const visible = nextActivities.filter((a) => !a.deletedAt);
    if (visible.length > FREE_ACTIVITY_LIMIT) {
      truncated = true;
      const trimmedVisible = visible.slice(0, FREE_ACTIVITY_LIMIT);
      const keepIds = new Set(trimmedVisible.map((a) => a.id));
      nextActivities = nextActivities.filter((a) => a.deletedAt || keepIds.has(a.id));
    }
  }
  await persist({ ...state, activities: nextActivities });
  return { truncated };
}

export function getRecentlyDeleted(nowMs = Date.now()) {
  return state.activities.filter((a) => a.deletedAt && !isExpiredDeleted(a, nowMs));
}
