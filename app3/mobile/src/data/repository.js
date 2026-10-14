import React from 'react';
import { createActivity, nowIso, migrateActivity, normalizeHistory, lastDoneFromHistory } from './models';
import { KeyValueStorage, loadState, saveState } from './storage';
import { isProUnlocked } from '../lib/entitlements';
import {
  OTHER_ID, MAX_CATEGORIES, CATEGORIES_STATE_VERSION, migrateCategories, matchCategory, categoryExists,
  normalizeCategory, normalizeCategoryIcon, normalizeKeywords, newCategoryId, seedCategories, categoryNameTaken,
} from '../lib/categories';

const storage = new KeyValueStorage();
let state = { version: CATEGORIES_STATE_VERSION, activities: [], categories: seedCategories() };
let initialized = false;
const listeners = new Set();

export const DEFAULT_FREE_ACTIVITY_LIMIT = 10;

/** Positive integer from env, else 10. */
export function parseFreeLimit(raw) {
  const s = String(raw ?? '').trim();
  if (!/^\d+$/.test(s)) return DEFAULT_FREE_ACTIVITY_LIMIT;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : DEFAULT_FREE_ACTIVITY_LIMIT;
}

export const FREE_ACTIVITY_LIMIT = parseFreeLimit(process.env.EXPO_PUBLIC_FREE_ACTIVITY_LIMIT);

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

const TRASH_MS = 30 * 864e5;

export async function initRepository() {
  if (initialized) return;
  const loaded = await loadState(storage);
  const now = Date.now();
  const kept = (loaded.activities || []).filter((a) => {
    if (!a.deletedAt) return true;
    const t = new Date(a.deletedAt).getTime();
    return Number.isFinite(t) && now - t < TRASH_MS;
  });
  state = migrateCategories({ ...loaded, activities: kept });
  initialized = true;
  if (
    loaded.version !== CATEGORIES_STATE_VERSION
    || !Array.isArray(loaded.categories)
    || kept.some((a, i) => a.categoryId !== state.activities[i].categoryId)
  ) {
    await saveState(state, storage);
  }
  notify();
}

export function getRecentlyDeleted() {
  return state.activities.filter((a) => a.deletedAt);
}

export async function resetRepositoryForTests() {
  initialized = false;
  state = { version: CATEGORIES_STATE_VERSION, activities: [], categories: seedCategories() };
  await saveState(state, storage);
  initialized = true;
  notify();
}

/** Tests: re-run the launch path (load + migrate) against whatever is in storage. */
export async function reloadRepositoryForTests() {
  initialized = false;
  await initRepository();
}

export { storage as repositoryStorageForTests, MAX_CATEGORIES };

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useActivities() {
  const [snap, setSnap] = React.useState(state);
  React.useEffect(() => subscribe(setSnap), []);
  return { activities: snap.activities.filter(a => !a.deletedAt), categories: snap.categories || [], ready: initialized, raw: snap.activities };
}

export function getVisibleActivities() {
  return (state.activities || []).filter((a) => !a.deletedAt);
}

export async function refreshReminders() {
  try {
    const { enforceReminderBudget } = require('../notifications/reminders');
    await enforceReminderBudget(state.activities);
  } catch {
    // web / tests / missing permission — never block a save
  }
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
  await refreshReminders();
}

export async function addActivity(input) {
  const pro = await isProUnlocked();
  if (!pro && visibleCount() >= FREE_ACTIVITY_LIMIT) {
    throw freeLimitError();
  }
  const categoryId = input.categoryId && categoryExists(input.categoryId, state.categories)
    ? input.categoryId
    : matchCategory(input.title, state.categories);
  const a = createActivity({ ...input, categoryId });
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


// ---- Categories (free; no Pro gate) ----

export function getCategories() {
  return state.categories || [];
}

function categoryError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export async function addCategory({ name, icon, keywords } = {}) {
  if (getCategories().length >= MAX_CATEGORIES) {
    throw categoryError('CATEGORY_LIMIT', 'category limit');
  }
  const trimmed = String(name || '').trim();
  if (categoryNameTaken(trimmed, getCategories())) {
    throw categoryError('CATEGORY_DUP', 'duplicate name');
  }
  const cat = normalizeCategory({ id: newCategoryId(), name: trimmed, icon, keywords });
  await persist({ ...state, categories: [...getCategories(), cat] });
  return cat;
}

/** Keyword edits only affect items added later; existing items keep their category. */
export async function updateCategory(id, changes = {}) {
  if (changes.name !== undefined) {
    const trimmed = String(changes.name || '').trim();
    if (trimmed && categoryNameTaken(trimmed, getCategories(), { exceptId: id })) {
      throw categoryError('CATEGORY_DUP', 'duplicate name');
    }
  }
  const next = getCategories().map((c) => {
    if (c.id !== id) return c;
    const merged = { ...c };
    if (changes.name !== undefined) merged.name = String(changes.name || '').trim().slice(0, 40) || null;
    if (changes.icon !== undefined) merged.icon = normalizeCategoryIcon(changes.icon);
    if (changes.keywords !== undefined) merged.keywords = normalizeKeywords(changes.keywords);
    return merged;
  });
  await persist({ ...state, categories: next });
}

/** Delete a category and move its items (including Recently Deleted ones) to Other. Returns the moved visible count. */
export async function deleteCategory(id) {
  if (id === OTHER_ID) return 0;
  let moved = 0;
  const activities = state.activities.map((a) => {
    if (a.categoryId !== id) return a;
    if (!a.deletedAt) moved += 1;
    return { ...a, categoryId: OTHER_ID };
  });
  await persist({ ...state, activities, categories: getCategories().filter((c) => c.id !== id) });
  return moved;
}

export function countByCategory(list = getVisibleActivities()) {
  const out = {};
  for (const a of list) {
    const k = a.categoryId || OTHER_ID;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
