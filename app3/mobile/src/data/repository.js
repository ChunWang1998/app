import React from 'react';
import { createActivity, nowIso } from './models';
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
  state = await loadState(storage);
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
  await enforceReminderBudget(state.activities);
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
  const next = state.activities.map(a => (a.id === id ? { ...a, lastDoneAt: ts, updatedAt: ts } : a));
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
    activities: state.activities,
  };
  return validateExport(blob);
}

export async function importFromJson(data) {
  const valid = validateExport(data);
  await persist({ ...state, activities: valid.activities });
}

export function getRecentlyDeleted(nowMs = Date.now()) {
  return state.activities.filter((a) => a.deletedAt && !isExpiredDeleted(a, nowMs));
}
