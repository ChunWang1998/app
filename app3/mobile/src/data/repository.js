import React from 'react';
import { createActivity, nowIso, migrateActivity, normalizeHistory, lastDoneFromHistory } from './models';
import { doneToday, sameLocalDay } from '../lib/today';
import { KeyValueStorage, loadState, saveState } from './storage';
import { isProUnlocked } from '../lib/entitlements';
import {
  OTHER_ID, OTHER_ICON, MAX_CATEGORIES, CATEGORIES_STATE_VERSION, migrateCategories, matchCategory, categoryExists,
  normalizeCategory, normalizeCategoryIcon, normalizeKeywords, newCategoryId, seedCategories, categoryNameTaken,
  iconForItem,
} from '../lib/categories';

const storage = new KeyValueStorage();
let state = { version: CATEGORIES_STATE_VERSION, activities: [], categories: seedCategories() };
let initialized = false;
const listeners = new Set();

export const DEFAULT_FREE_ACTIVITY_LIMIT = 10;
export const DEFAULT_FREE_HISTORY_LIMIT = 10;

/** Positive integer from env, else the given fallback (10). */
export function parseFreeLimit(raw, fallback = DEFAULT_FREE_ACTIVITY_LIMIT) {
  const s = String(raw ?? '').trim();
  if (!/^\d+$/.test(s)) return fallback;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

export const FREE_ACTIVITY_LIMIT = parseFreeLimit(process.env.EXPO_PUBLIC_FREE_ACTIVITY_LIMIT);
export const FREE_HISTORY_LIMIT = parseFreeLimit(
  process.env.EXPO_PUBLIC_FREE_HISTORY_LIMIT,
  DEFAULT_FREE_HISTORY_LIMIT,
);

/** One writer at a time so Pro/same-day/count checks see the latest item. */
let writeTail = Promise.resolve();

function enqueueWrite(fn) {
  const run = writeTail.then(() => fn());
  writeTail = run.then(() => undefined, () => undefined);
  return run;
}

function notify() {
  for (const l of listeners) l(state);
}

function freeLimitError(limit = FREE_ACTIVITY_LIMIT, kind = 'items') {
  const err = new Error(`Free tier limit ${limit}`);
  err.code = 'FREE_LIMIT';
  err.kind = kind;
  return err;
}

function historyOf(item) {
  return normalizeHistory(item?.history, item?.lastDoneAt);
}

/** After the Pro check, re-read state so a queued write cannot use a stale count. Existing rows are never dropped. */
async function assertCanWriteHistory(id, atIso) {
  if (await isProUnlocked()) return;
  const item = state.activities.find((a) => a.id === id);
  const current = historyOf(item);
  const next = normalizeHistory([{ at: atIso }, ...current]);
  if (next.length <= current.length) return;
  if (current.length >= FREE_HISTORY_LIMIT) throw freeLimitError(FREE_HISTORY_LIMIT, 'history');
}

function visibleCount(list = state.activities) {
  return (list || []).filter((a) => !a.deletedAt).length;
}

export const TRASH_DAYS = 3;
export const TRASH_MS = TRASH_DAYS * 864e5;

/** Pin a timestamp to now when it is later than now. Invalid values are left alone. */
export function clampIsoToNow(iso, now = Date.now()) {
  if (iso == null || iso === '') return iso;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  return t > now ? new Date(now).toISOString() : (typeof iso === 'string' ? iso : new Date(t).toISOString());
}

function clampHistoryToNow(history, now = Date.now()) {
  if (!Array.isArray(history)) return history;
  return history.map((e) => {
    if (e == null) return e;
    if (typeof e === 'string') return clampIsoToNow(e, now);
    if (typeof e === 'object') return { ...e, at: clampIsoToNow(e.at, now) };
    return e;
  });
}

export function isExpiredDeleted(item, now = Date.now()) {
  if (!item?.deletedAt) return false;
  const t = new Date(item.deletedAt).getTime();
  return Number.isFinite(t) && now - t >= TRASH_MS;
}

/** Whole days left in Recently Deleted (1–3). 0 means it should already be gone. */
export function trashDaysLeft(deletedAt, now = Date.now()) {
  const t = new Date(deletedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  const left = TRASH_MS - (now - t);
  if (left <= 0) return 0;
  return Math.max(1, Math.ceil(left / 864e5));
}

/** Drop rows past the 3-day window and persist. Launch + foreground. */
export async function purgeExpiredDeleted(now = Date.now()) {
  return enqueueWrite(async () => {
    if (!initialized) return { removed: 0 };
    const prev = state.activities || [];
    const next = prev.filter((a) => !isExpiredDeleted(a, now));
    const removed = prev.length - next.length;
    if (!removed) return { removed: 0 };
    await persist({ ...state, activities: next });
    return { removed };
  });
}

export async function initRepository() {
  if (initialized) return;
  const loaded = await loadState(storage);
  const loadedActs = loaded.activities || [];
  state = migrateCategories({ ...loaded, activities: loadedActs });
  initialized = true;
  if (
    loaded.version !== CATEGORIES_STATE_VERSION
    || !Array.isArray(loaded.categories)
    || loadedActs.some((a, i) => (
      a.categoryId !== state.activities[i].categoryId
      || a.icon !== state.activities[i].icon
    ))
  ) {
    await saveState(state, storage);
  }
  await purgeExpiredDeleted();
  notify();
}

export function getRecentlyDeleted() {
  return state.activities.filter((a) => a.deletedAt);
}

export async function resetRepositoryForTests() {
  writeTail = Promise.resolve();
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
  const categories = snap.categories || [];
  return {
    activities: snap.activities.filter((a) => !a.deletedAt).map((a) => ({ ...a, icon: iconForItem(a, categories) })),
    categories,
    ready: initialized,
    raw: snap.activities,
  };
}

export function getVisibleActivities() {
  const categories = state.categories || [];
  return (state.activities || [])
    .filter((a) => !a.deletedAt)
    .map((a) => ({ ...a, icon: iconForItem(a, categories) }));
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
  await refreshReminders();
}

export async function addActivity(input) {
  return enqueueWrite(async () => {
    const pro = await isProUnlocked();
    if (!pro && visibleCount() >= FREE_ACTIVITY_LIMIT) {
      throw freeLimitError(FREE_ACTIVITY_LIMIT, 'items');
    }
    const categoryId = input.categoryId && categoryExists(input.categoryId, state.categories)
      ? input.categoryId
      : matchCategory(input.title, state.categories);
    const a = createActivity({ ...input, categoryId, icon: iconForItem({ categoryId }, state.categories) });
    await persist({ ...state, activities: [a, ...state.activities] });
    return a;
  });
}

export async function updateActivity(id, changes) {
  return enqueueWrite(async () => {
    const now = Date.now();
    const patch = { ...(changes || {}) };
    if (patch.lastDoneAt !== undefined) patch.lastDoneAt = clampIsoToNow(patch.lastDoneAt, now);
    if (patch.history !== undefined) patch.history = clampHistoryToNow(patch.history, now);
    if (patch.history !== undefined || patch.lastDoneAt !== undefined) {
      const latest = state.activities.find((a) => a.id === id);
      const prev = historyOf(latest);
      const nextHist = normalizeHistory(
        patch.history !== undefined ? patch.history : latest?.history,
        patch.lastDoneAt !== undefined ? patch.lastDoneAt : latest?.lastDoneAt,
      );
      if (nextHist.length > prev.length && !(await isProUnlocked())) {
        const again = state.activities.find((a) => a.id === id);
        const prev2 = historyOf(again);
        const next2 = normalizeHistory(
          patch.history !== undefined ? patch.history : again?.history,
          patch.lastDoneAt !== undefined ? patch.lastDoneAt : again?.lastDoneAt,
        );
        if (next2.length > prev2.length && next2.length > FREE_HISTORY_LIMIT) {
          throw freeLimitError(FREE_HISTORY_LIMIT, 'history');
        }
      }
    }
    const ts = nowIso();
    const next = state.activities.map((a) => {
      if (a.id !== id) return a;
      const { icon: _ignored, ...rest } = patch;
      const merged = { ...a, ...rest, updatedAt: ts };
      if (patch.history || patch.lastDoneAt !== undefined) {
        const history = normalizeHistory(merged.history, merged.lastDoneAt);
        merged.history = history;
        merged.lastDoneAt = lastDoneFromHistory(history);
      }
      merged.icon = iconForItem(merged, state.categories);
      return merged;
    });
    await persist({ ...state, activities: next });
  });
}

async function logActivityAtUnlocked(id, ts) {
  const at = clampIsoToNow(ts || nowIso());
  await assertCanWriteHistory(id, at);
  let previousLastDoneAt = null;
  let previousHistory = [];
  const next = state.activities.map((a) => {
    if (a.id !== id) return a;
    previousLastDoneAt = a.lastDoneAt ?? null;
    previousHistory = Array.isArray(a.history) ? a.history : [];
    const history = normalizeHistory([{ at }, ...previousHistory]);
    return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: nowIso() };
  });
  await persist({ ...state, activities: next });
  return { previousLastDoneAt, previousHistory, loggedAt: at };
}

export async function logActivityAt(id, atIso) {
  return enqueueWrite(() => logActivityAtUnlocked(id, atIso || nowIso()));
}

function existingOnLocalDay(item, atIso) {
  if (!item) return null;
  return historyOf(item).find((e) => sameLocalDay(e.at, atIso)) || null;
}

/**
 * Log on a local calendar day. If that day already has a history row, skip.
 * AI backdated logs use this so "yesterday" twice does not create two rows.
 */
export async function logActivityOnDay(id, atIso) {
  return enqueueWrite(async () => {
    const ts = clampIsoToNow(atIso || nowIso());
    const item = state.activities.find((a) => a.id === id);
    const hit = existingOnLocalDay(item, ts);
    if (hit) {
      return {
        skipped: true,
        previousLastDoneAt: item.lastDoneAt ?? null,
        previousHistory: Array.isArray(item.history) ? item.history : [],
        loggedAt: hit.at,
      };
    }
    if (!item) {
      return {
        skipped: true,
        previousLastDoneAt: null,
        previousHistory: [],
        loggedAt: ts,
      };
    }
    return { skipped: false, ...(await logActivityAtUnlocked(id, ts)) };
  });
}

/**
 * Check-off "now". Same local calendar day as lastDoneAt → no new history row.
 * Home / detail use this; backfill still goes through logActivityAt.
 */
export async function logActivityNow(id, atIso) {
  return enqueueWrite(async () => {
    const ts = clampIsoToNow(atIso || nowIso());
    const item = state.activities.find((a) => a.id === id);
    if (item && doneToday(item, new Date(ts).getTime())) {
      return {
        skipped: true,
        previousLastDoneAt: item.lastDoneAt ?? null,
        previousHistory: Array.isArray(item.history) ? item.history : [],
        loggedAt: item.lastDoneAt,
      };
    }
    return { skipped: false, ...(await logActivityAtUnlocked(id, ts)) };
  });
}

/** Undo a check-off by removing only that timestamp. Same-day skips get no undo. */
export function undoHandlerForLog(id, result) {
  if (!result || result.skipped) return null;
  const at = result.loggedAt;
  if (!at) return null;
  return () => undoLogAt(id, at);
}

export async function undoLogActivity(id, previousLastDoneAt, previousHistory) {
  return enqueueWrite(async () => {
    const ts = nowIso();
    const next = state.activities.map((a) => {
      if (a.id !== id) return a;
      const history = Array.isArray(previousHistory)
        ? normalizeHistory(previousHistory)
        : normalizeHistory(a.history?.slice(1), previousLastDoneAt);
      return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: ts };
    });
    await persist({ ...state, activities: next });
  });
}

/** Remove only the history row this check-off added, leaving later backfills. */
export async function undoLogAt(id, loggedAt) {
  return enqueueWrite(async () => {
    const at = loggedAt ? String(loggedAt) : '';
    if (!at) return;
    const ts = nowIso();
    const next = state.activities.map((a) => {
      if (a.id !== id) return a;
      const history = normalizeHistory((a.history || []).filter((e) => e.at !== at));
      return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: ts };
    });
    await persist({ ...state, activities: next });
  });
}

export async function backfillHistory(id, atIso) {
  return enqueueWrite(async () => {
    const at = clampIsoToNow(new Date(atIso).toISOString());
    await assertCanWriteHistory(id, at);
    const ts = nowIso();
    const next = state.activities.map((a) => {
      if (a.id !== id) return a;
      const history = normalizeHistory([{ at }, ...(a.history || [])]);
      return { ...a, history, lastDoneAt: lastDoneFromHistory(history), updatedAt: ts };
    });
    await persist({ ...state, activities: next });
  });
}

/** Hide from the list for the 2s undo toast. Call hardDeleteActivity when the window ends. */
export async function softDeleteActivity(id) {
  return enqueueWrite(async () => {
    const ts = nowIso();
    const next = state.activities.map((a) => (a.id === id ? { ...a, deletedAt: ts, updatedAt: ts } : a));
    await persist({ ...state, activities: next });
  });
}

export async function hardDeleteActivity(id) {
  return enqueueWrite(async () => {
    const next = state.activities.filter((a) => a.id !== id);
    await persist({ ...state, activities: next });
  });
}

export async function undoDelete(id) {
  return enqueueWrite(async () => {
    const target = state.activities.find((a) => a.id === id);
    if (!target || !target.deletedAt) return;
    const pro = await isProUnlocked();
    if (!pro && visibleCount() >= FREE_ACTIVITY_LIMIT) {
      throw freeLimitError(FREE_ACTIVITY_LIMIT, 'items');
    }
    const ts = nowIso();
    const next = state.activities.map((a) => (a.id === id ? { ...a, deletedAt: null, updatedAt: ts } : a));
    await persist({ ...state, activities: next });
  });
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
  return enqueueWrite(async () => {
    if (getCategories().length >= MAX_CATEGORIES) {
      throw categoryError('CATEGORY_LIMIT', 'category limit');
    }
    const trimmed = String(name || '').trim().slice(0, 40);
    if (categoryNameTaken(trimmed, getCategories())) {
      throw categoryError('CATEGORY_DUP', 'duplicate name');
    }
    const cat = normalizeCategory({ id: newCategoryId(), name: trimmed, icon, keywords });
    if (!cat) throw new Error('invalid category');
    await persist({ ...state, categories: [...getCategories(), cat] });
    return cat;
  });
}

/** Keyword edits only affect items added later; existing items keep their category. */
export async function updateCategory(id, changes = {}) {
  return enqueueWrite(async () => {
    if (changes.name !== undefined) {
      const trimmed = String(changes.name || '').trim().slice(0, 40);
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
      return normalizeCategory(merged) || c;
    });
    const activities = state.activities.map((a) => ({ ...a, icon: iconForItem(a, next) }));
    await persist({ ...state, categories: next, activities });
  });
}

/** Delete a category and move its items (including Recently Deleted ones) to Other. Returns the moved visible count. */
export async function deleteCategory(id) {
  return enqueueWrite(async () => {
    if (id === OTHER_ID) return 0;
    let moved = 0;
    const activities = state.activities.map((a) => {
      if (a.categoryId !== id) return a;
      if (!a.deletedAt) moved += 1;
      return { ...a, categoryId: OTHER_ID, icon: OTHER_ICON };
    });
    await persist({ ...state, activities, categories: getCategories().filter((c) => c.id !== id) });
    return moved;
  });
}

export function countByCategory(list = getVisibleActivities()) {
  const out = {};
  for (const a of list) {
    const k = a.categoryId || OTHER_ID;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
