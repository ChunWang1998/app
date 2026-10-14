import React from 'react';
import { createActivity, nowIso, migrateActivity, normalizeHistory, lastDoneFromHistory } from './models';
import { KeyValueStorage, loadState, saveState } from './storage';
import { validateExport } from './schema';
import { isProUnlocked } from '../lib/entitlements';

const storage = new KeyValueStorage();
let state = { version: 1, activities: [] };
let initialized = false;
const listeners = new Set();

export const FREE_ACTIVITY_LIMIT = Number(process.env.EXPO_PUBLIC_FREE_ACTIVITY_LIMIT || 3);

function notify() {
  for (const l of listeners) l(state);
}

function freeLimitError() {
  const err = new Error(`Free tier limit ${FREE_ACTIVITY_LIMIT}`);
  err.code = 'FREE_LIMIT';
  return err;
}

function visibleCount(list = state.activities) {
  return (list || []).filter((a) => !a.deletedAt).length;
}

export async function initRepository() {
  if (initialized) return;
  const loaded = await loadState(storage);
  // v1.0: leftover soft-deletes (crash during the 5s undo window, or older 30-day rows) are dropped.
  const visible = (loaded.activities || []).filter((a) => !a.deletedAt);
  state = { ...loaded, activities: visible };
  initialized = true;
  notify();
}

export async function resetRepositoryForTests() {
  initialized = false;
  state = { version: 1, activities: [] };
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

export function getVisibleActivities() {
  return (state.activities || []).filter((a) => !a.deletedAt);
}

async function persist(nextState) {
  state = { ...nextState, activities: nextState.activities || [] };
  await saveState(state, storage);
  notify();
  if (typeof process === 'undefined' || !process.env.JEST_WORKER_ID) {
    try {
      const { scheduleWidgetSync } = require('../widgets/sync');
      scheduleWidgetSync();
    } catch {
      // widgets optional in tests / web
    }
  }
}

export async function addActivity(input) {
  const pro = await isProUnlocked();
  if (!pro && visibleCount() >= FREE_ACTIVITY_LIMIT) {
    throw freeLimitError();
  }
  const a = createActivity(input);
  await persist({ ...state, activities: [a, ...state.activities] });
  return a;
}

export async function updateActivity(id, changes) {
  const ts = nowIso();
  const next = state.activities.map((a) => {
    if (a.id !== id) return a;
    const merged = { ...a, ...changes, updatedAt: ts };
    if (changes.history || changes.lastDoneAt !== undefined) {
      const history = normalizeHistory(merged.history, merged.lastDoneAt);
      return { ...merged, history, lastDoneAt: lastDoneFromHistory(history) };
    }
    return merged;
  });
  await persist({ ...state, activities: next });
}

export async function logActivityAt(id, atIso) {
  const ts = atIso || nowIso();
  let previousLastDoneAt = null;
  let previousHistory = [];
  const next = state.activities.map((a) => {
    if (a.id !== id) return a;
    previousLastDoneAt = a.lastDoneAt ?? null;
    previousHistory = Array.isArray(a.history) ? a.history : [];
    const history = normalizeHistory([{ at: ts }, ...previousHistory]);
    return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: nowIso() };
  });
  await persist({ ...state, activities: next });
  return { previousLastDoneAt, previousHistory, loggedAt: ts };
}

export async function logActivityNow(id) {
  return logActivityAt(id, nowIso());
}

export async function undoLogActivity(id, previousLastDoneAt, previousHistory) {
  const ts = nowIso();
  const next = state.activities.map((a) => {
    if (a.id !== id) return a;
    const history = Array.isArray(previousHistory)
      ? normalizeHistory(previousHistory)
      : normalizeHistory(a.history?.slice(1), previousLastDoneAt);
    return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: ts };
  });
  await persist({ ...state, activities: next });
}

export async function backfillHistory(id, atIso) {
  const at = new Date(atIso).toISOString();
  const ts = nowIso();
  const next = state.activities.map((a) => {
    if (a.id !== id) return a;
    const history = normalizeHistory([{ at }, ...(a.history || [])]);
    return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: ts };
  });
  await persist({ ...state, activities: next });
}

/** Hide from the list for the 5s undo window. Call hardDeleteActivity when the window ends. */
export async function softDeleteActivity(id) {
  const ts = nowIso();
  const next = state.activities.map(a => (a.id === id ? { ...a, deletedAt: ts, updatedAt: ts } : a));
  await persist({ ...state, activities: next });
}

export async function hardDeleteActivity(id) {
  const next = state.activities.filter((a) => a.id !== id);
  await persist({ ...state, activities: next });
}

export async function undoDelete(id) {
  const target = state.activities.find((a) => a.id === id);
  if (!target || !target.deletedAt) return;
  const pro = await isProUnlocked();
  if (!pro && visibleCount() >= FREE_ACTIVITY_LIMIT) {
    throw freeLimitError();
  }
  const ts = nowIso();
  const next = state.activities.map(a => (a.id === id ? { ...a, deletedAt: null, updatedAt: ts } : a));
  await persist({ ...state, activities: next });
}

export async function exportToJson() {
  const blob = {
    schema: 'been-ages/export',
    version: 1,
    exportedAt: nowIso(),
    activities: state.activities.filter((a) => !a.deletedAt).map(migrateActivity),
  };
  return validateExport(blob);
}

export async function importFromJson(data) {
  const valid = validateExport(data);
  const map = new Map();
  for (const a of valid.activities) {
    const existing = map.get(a.id);
    if (!existing || new Date(a.updatedAt) > new Date(existing.updatedAt)) {
      map.set(a.id, migrateActivity(a));
    }
  }
  let nextActivities = Array.from(map.values()).filter((a) => !a.deletedAt);
  let truncated = false;
  const pro = await isProUnlocked();
  if (!pro) {
    if (nextActivities.length > FREE_ACTIVITY_LIMIT) {
      truncated = true;
      nextActivities = nextActivities.slice(0, FREE_ACTIVITY_LIMIT);
    }
  }
  await persist({ ...state, activities: nextActivities });
  return { truncated };
}
