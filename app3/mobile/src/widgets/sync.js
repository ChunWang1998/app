import { AppState } from 'react-native';
import { FREE_ACTIVITY_LIMIT, getVisibleActivities, logActivityAt, undoLogActivity } from '../data/repository';
import { isProUnlocked } from '../lib/entitlements';
import {
  HOME_WIDGET_NAME,
  LOCK_WIDGET_NAME,
  WIDGET_UNDO_MS,
  appendQueueLog,
  applyWidgetUndo,
  buildSnapshot,
  pendingShouldCommit,
  planQueueMerge,
  queueFromPending,
} from '../data/appGroup';
import {
  KeyValueAppGroupStore,
  MemoryAppGroupStore,
  clearQueue,
  readQueue,
  readSelection,
  readSnapshot,
  writeQueue,
  writeSelection,
  writeSnapshot,
} from '../data/appGroupStore';
import { KeyValueStorage } from '../data/storage';
import { buildWidgetProps, timelineForProps } from './pick';

let store = null;
let fileStore = null;
let syncing = false;
let scheduled = null;
let interactionSub = null;
let appStateSub = null;
let lastIconUris = {};
let lastLogoUri = null;
let lastLocale = 'zh';
const recentLogs = new Map();

function fallbackStore() {
  if (!store) store = new KeyValueAppGroupStore(new KeyValueStorage({ namespace: 'beenages-appgroup' }));
  return store;
}

export function setAppGroupStoreForTests(next) {
  store = next || new MemoryAppGroupStore();
  fileStore = store;
}

export function getAppGroupStore() {
  return fileStore || fallbackStore();
}

async function resolveFileStore() {
  if (fileStore) return fileStore;
  try {
    const widgets = require('expo-widgets');
    const dir = widgets.widgetsDirectory;
    if (dir) {
      const { FileAppGroupStore } = require('./fileStore');
      fileStore = new FileAppGroupStore(dir);
      return fileStore;
    }
  } catch {
    // web / tests
  }
  fileStore = fallbackStore();
  return fileStore;
}

function widgetModules() {
  try {
    const home = require('./BeenAgesHome').default;
    const lock = require('./BeenAgesLock').default;
    return { home, lock };
  } catch {
    return { home: null, lock: null };
  }
}

function widgetsDisabled() {
  return typeof process !== 'undefined' && (
    process.env.JEST_WORKER_ID != null || process.env.NODE_ENV === 'test'
  );
}

export function scheduleWidgetSync() {
  if (widgetsDisabled()) return;
  if (scheduled) return;
  scheduled = setTimeout(() => {
    scheduled = null;
    syncWidgetsNow().catch(() => {});
  }, 0);
}

export async function syncWidgetsNow({ now = Date.now() } = {}) {
  if (syncing) return null;
  syncing = true;
  try {
    const [pro, selectionStore] = await Promise.all([
      isProUnlocked(),
      resolveFileStore(),
    ]);
    const selection = await readSelection(selectionStore);
    const snapshot = buildSnapshot({
      activities: getVisibleActivities(),
      proUnlocked: pro,
      selectedIds: selection,
      freeLimit: FREE_ACTIVITY_LIMIT,
      now,
    });
    await writeSnapshot(selectionStore, snapshot);

    const extras = {
      now,
      iconUris: lastIconUris,
      logoUri: lastLogoUri,
      locale: lastLocale,
    };
    const props = buildWidgetProps(snapshot, extras);
    pushTimelines({ props, snapshot, extras });
    return snapshot;
  } finally {
    syncing = false;
  }
}

function pushTimelines({ props, snapshot, extras }) {
  const { home, lock } = widgetModules();
  const entries = timelineForProps(props, snapshot, extras);
  try {
    home?.updateTimeline?.(entries);
  } catch {}
  try {
    lock?.updateTimeline?.(entries);
  } catch {}
}

export function setWidgetAssetUris({ iconUris, logoUri } = {}) {
  if (iconUris) lastIconUris = iconUris;
  if (logoUri) lastLogoUri = logoUri;
}

export function setWidgetLocale(locale) {
  lastLocale = locale === 'en' ? 'en' : 'zh';
}

export async function saveWidgetSelection(selection) {
  const s = await resolveFileStore();
  await writeSelection(s, selection);
  await syncWidgetsNow();
}

export async function loadWidgetSelection() {
  const s = await resolveFileStore();
  return readSelection(s);
}

export async function mergeAppGroupQueue({ now = Date.now() } = {}) {
  const pro = await isProUnlocked();
  const s = await resolveFileStore();
  const queued = await readQueue(s);
  const activities = getVisibleActivities();
  const { applied, skipped } = planQueueMerge({
    logs: queued.logs,
    activities,
    proUnlocked: pro,
  });
  for (const entry of applied) {
    await logActivityAt(entry.itemId, entry.timestamp);
  }
  await clearQueue(s);
  return { applied, skipped };
}

async function ingestWidgetProps(props, { now = Date.now() } = {}) {
  if (!props) return;
  const pro = await isProUnlocked();
  if (!pro) return;
  const s = await resolveFileStore();
  let queue = await readQueue(s);
  if (props.pending && pendingShouldCommit(props.pending, now)) {
    queue = appendQueueLog(queue, {
      itemId: props.pending.itemId,
      timestamp: typeof props.pending.at === 'number'
        ? new Date(props.pending.at).toISOString()
        : String(props.pending.at),
      source: 'widget',
    });
    await writeQueue(s, queue);
  }
  await mergeAppGroupQueue({ now });
}

async function readLiveWidgetProps() {
  const { home, lock } = widgetModules();
  const out = [];
  for (const w of [home, lock]) {
    if (!w?.getTimeline) continue;
    try {
      const entries = await w.getTimeline();
      const last = Array.isArray(entries) && entries.length ? entries[entries.length - 1] : null;
      if (last?.props) out.push(last.props);
    } catch {}
  }
  return out;
}

export async function mergeLiveWidgetsAndQueue({ now = Date.now() } = {}) {
  const live = await readLiveWidgetProps();
  for (const props of live) {
    await ingestWidgetProps(props, { now });
  }
  await mergeAppGroupQueue({ now });
  await syncWidgetsNow({ now });
}

export async function handleWidgetInteraction(event, { now = Date.now() } = {}) {
  const target = String(event?.target || '');
  const source = event?.source;
  if (source && source !== HOME_WIDGET_NAME && source !== LOCK_WIDGET_NAME) return;

  if (target.startsWith('check:')) {
    const itemId = target.slice('check:'.length);
    const result = await logActivityAt(itemId, new Date(now).toISOString());
    recentLogs.set(itemId, { ...result, expiresAt: now + WIDGET_UNDO_MS });
    await syncWidgetsNow({ now });
    return result;
  }
  if (target.startsWith('undo:')) {
    const itemId = target.slice('undo:'.length);
    const prev = recentLogs.get(itemId);
    recentLogs.delete(itemId);
    if (prev) {
      await undoLogActivity(itemId, prev.previousLastDoneAt, prev.previousHistory);
    } else {
      const live = await readLiveWidgetProps();
      const pending = live.find((p) => p?.pending?.itemId === itemId)?.pending;
      if (pending) await undoLogActivity(itemId, pending.previousLastDoneAt, pending.previousHistory);
    }
    await syncWidgetsNow({ now });
    return { undone: true };
  }
  return null;
}

export async function recoverPendingFromWidgets({ now = Date.now() } = {}) {
  const live = await readLiveWidgetProps();
  for (const props of live) {
    const pending = props?.pending;
    if (!pending) continue;
    if (pendingShouldCommit(pending, now)) {
      const q = queueFromPending(pending);
      const s = await resolveFileStore();
      const existing = await readQueue(s);
      let next = existing;
      for (const log of q.logs) next = appendQueueLog(next, log);
      await writeQueue(s, next);
    }
  }
  await mergeAppGroupQueue({ now });
  // Drop leftover pending UI by publishing a fresh snapshot.
  await syncWidgetsNow({ now });
}

export async function initWidgets({ locale } = {}) {
  if (locale) setWidgetLocale(locale);
  try {
    const { ensureWidgetAssets } = require('./assets');
    const uris = await ensureWidgetAssets();
    if (uris) setWidgetAssetUris(uris);
  } catch {}

  await recoverPendingFromWidgets();

  try {
    const { addUserInteractionListener } = require('expo-widgets');
    interactionSub?.remove?.();
    interactionSub = addUserInteractionListener((event) => {
      handleWidgetInteraction(event).catch(() => {});
    });
  } catch {}

  try {
    appStateSub?.remove?.();
    appStateSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        recoverPendingFromWidgets().catch(() => {});
      }
    });
  } catch {}
}

export function teardownWidgetsForTests() {
  interactionSub?.remove?.();
  interactionSub = null;
  appStateSub?.remove?.();
  appStateSub = null;
  if (scheduled) clearTimeout(scheduled);
  scheduled = null;
  recentLogs.clear();
  syncing = false;
}

export { applyWidgetUndo, readSnapshot };
