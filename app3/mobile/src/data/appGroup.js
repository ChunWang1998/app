/**
 * Shared App Group contract for widgets (v1.1) and later Siri (v1.2).
 *
 * Identifiers are fixed and must not change after first ship:
 *   App Group: group.com.beenages.app
 *   Widget extension: com.beenages.app.widget
 *
 * Files live in the App Group container (expo-widgets `widgetsDirectory`):
 *   snapshot.json  — app is the only writer (items + Pro)
 *   queue.json     — extensions append; app merges then clears
 *   selection.json — which items the user pinned on a widget
 *
 * The widget runtime cannot do async I/O. Interactive ✓ updates widget props;
 * the app copies those pending logs into queue.json and merges them.
 */

export const APP_GROUP_ID = 'group.com.beenages.app';
export const WIDGET_BUNDLE_ID = 'com.beenages.app.widget';

export const SNAPSHOT_FILENAME = 'snapshot.json';
export const QUEUE_FILENAME = 'queue.json';
export const SELECTION_FILENAME = 'selection.json';

export const HOME_WIDGET_NAME = 'BeenAgesHome';
export const LOCK_WIDGET_NAME = 'BeenAgesLock';

export const PAYWALL_URL = 'beenages://paywall';
export const WIDGET_UNDO_MS = 5000;
/** Widget-sent completion times may not be earlier than createdAt or later than now+5min. */
export const WIDGET_FUTURE_SLACK_MS = 5 * 60 * 1000;

export const SNAPSHOT_VERSION = 1;
export const QUEUE_VERSION = 1;

export function emptySnapshot() {
  return {
    version: SNAPSHOT_VERSION,
    writtenAt: null,
    proUnlocked: false,
    activities: [],
    selectedIds: emptySelection(),
  };
}

export function emptyQueue() {
  return { version: QUEUE_VERSION, logs: [] };
}

export function emptySelection() {
  return { small: 'auto', medium: [] };
}

export function normalizeSelection(sel) {
  const small = sel && typeof sel.small === 'string' && sel.small ? sel.small : 'auto';
  const medium = Array.isArray(sel?.medium)
    ? sel.medium.filter((id) => typeof id === 'string' && id && id !== 'auto').slice(0, 3)
    : [];
  return { small, medium };
}

/**
 * Clamp a widget-sent completion time to [createdAt, now + 5 minutes].
 * Invalid / missing values fall back to `now`.
 */
export function clampWidgetCompletionTime(sent, createdAt, now = Date.now()) {
  const parsed = typeof sent === 'number' ? sent : Date.parse(sent);
  const raw = Number.isFinite(parsed) ? parsed : now;
  const created = createdAt == null ? NaN : Date.parse(createdAt);
  const min = Number.isFinite(created) ? created : 0;
  const max = now + WIDGET_FUTURE_SLACK_MS;
  return Math.min(max, Math.max(min, raw));
}

export function activityToSnapshotRow(a) {
  if (!a || typeof a !== 'object') return null;
  return {
    id: String(a.id),
    title: String(a.title || '').trim() || 'Untitled',
    icon: a.icon || 'brush',
    lastDoneAt: a.lastDoneAt ?? null,
    reminderDays: a.reminderDays ?? null,
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
  };
}

/**
 * Free users never publish more than `freeLimit` items into the App Group.
 * Widget / Siri cannot create items, so they cannot bypass the cap.
 */
export function capActivities(activities, proUnlocked, freeLimit) {
  const visible = (activities || []).filter((a) => a && !a.deletedAt);
  const rows = visible.map(activityToSnapshotRow).filter(Boolean);
  if (proUnlocked) return rows;
  const limit = Number.isFinite(freeLimit) && freeLimit > 0 ? freeLimit : 3;
  return rows.slice(0, limit);
}

export function buildSnapshot({
  activities,
  proUnlocked,
  selectedIds,
  freeLimit,
  now = Date.now(),
} = {}) {
  return {
    version: SNAPSHOT_VERSION,
    writtenAt: new Date(now).toISOString(),
    proUnlocked: !!proUnlocked,
    activities: capActivities(activities, proUnlocked, freeLimit),
    selectedIds: normalizeSelection(selectedIds),
  };
}

export function parseSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return emptySnapshot();
  return {
    version: SNAPSHOT_VERSION,
    writtenAt: raw.writtenAt ?? null,
    proUnlocked: !!raw.proUnlocked,
    activities: capActivities(raw.activities || [], !!raw.proUnlocked, 999),
    selectedIds: normalizeSelection(raw.selectedIds),
  };
}

export function parseQueue(raw) {
  if (!raw || typeof raw !== 'object') return emptyQueue();
  const logs = Array.isArray(raw.logs) ? raw.logs.filter((l) => l && l.itemId && l.timestamp) : [];
  return { version: QUEUE_VERSION, logs };
}

export function appendQueueLog(queue, { itemId, timestamp, source = 'widget' }) {
  const current = parseQueue(queue);
  if (!itemId || !timestamp) return current;
  if (current.logs.some((l) => l.itemId === itemId && l.timestamp === timestamp)) {
    return current;
  }
  return {
    version: QUEUE_VERSION,
    logs: [
      ...current.logs,
      {
        id: `q_${itemId}_${String(timestamp).replace(/[^\w-]/g, '')}`,
        itemId,
        timestamp,
        source,
      },
    ],
  };
}

/**
 * Decide which queued logs the app may apply.
 * - Not Pro: drop everything (widget is Pro-gated; do not honor a tampered queue).
 * - Unknown / deleted item: drop (cannot create items from an extension).
 * - Duplicate item+timestamp already reflected in lastDoneAt: skip.
 */
export function planQueueMerge({ logs, activities, proUnlocked, now = Date.now() }) {
  const applied = [];
  const skipped = [];
  if (!proUnlocked) {
    for (const entry of logs || []) skipped.push({ ...entry, reason: 'NOT_PRO' });
    return { applied, skipped };
  }
  const known = new Map();
  for (const a of activities || []) {
    if (a && a.id && !a.deletedAt) known.set(a.id, a);
  }
  for (const entry of logs || []) {
    if (!entry?.itemId || !entry?.timestamp) {
      skipped.push({ ...entry, reason: 'INVALID' });
      continue;
    }
    const item = known.get(entry.itemId);
    if (!item) {
      skipped.push({ ...entry, reason: 'UNKNOWN_ITEM' });
      continue;
    }
    const timestamp = new Date(clampWidgetCompletionTime(entry.timestamp, item.createdAt, now)).toISOString();
    if (item.lastDoneAt && item.lastDoneAt === timestamp) {
      skipped.push({ ...entry, reason: 'ALREADY_APPLIED' });
      continue;
    }
    applied.push({ ...entry, timestamp });
  }
  return { applied, skipped };
}

export function pendingShouldCommit(pending, now = Date.now(), undoMs = WIDGET_UNDO_MS) {
  if (!pending || !pending.itemId) return false;
  const at = typeof pending.at === 'number' ? pending.at : Date.parse(pending.at);
  if (!Number.isFinite(at)) return false;
  return now - at >= undoMs;
}

export function applyWidgetCheck(props, itemId, now = Date.now()) {
  const items = Array.isArray(props?.items) ? props.items : [];
  const item = items.find((i) => i.id === itemId);
  if (!item) return props;
  return {
    ...props,
    pending: {
      itemId,
      at: now,
      previousLastDoneAt: item.lastDoneAt ?? null,
    },
    items: items.map((i) => (
      i.id === itemId
        ? { ...i, lastDoneAt: new Date(now).toISOString(), daysNum: 0, daysUnit: i.daysUnit || 'd', dueClass: '' }
        : i
    )),
  };
}

export function applyWidgetUndo(props) {
  const pending = props?.pending;
  if (!pending?.itemId) return { ...props, pending: null };
  const items = Array.isArray(props.items) ? props.items : [];
  return {
    ...props,
    pending: null,
    items: items.map((i) => (
      i.id === pending.itemId
        ? { ...i, lastDoneAt: pending.previousLastDoneAt ?? null }
        : i
    )),
  };
}

export function queueFromPending(pending, source = 'widget') {
  if (!pending?.itemId || pending.at == null) return emptyQueue();
  const timestamp = typeof pending.at === 'number'
    ? new Date(pending.at).toISOString()
    : String(pending.at);
  return appendQueueLog(emptyQueue(), { itemId: pending.itemId, timestamp, source });
}

export function sfSymbolForIcon(icon) {
  switch (icon) {
    case 'drop': return 'drop';
    case 'eye': return 'eye';
    case 'pill': return 'pills';
    case 'bed': return 'bed.double';
    case 'leaf': return 'leaf';
    case 'scissors': return 'scissors';
    case 'car': return 'car';
    case 'mono': return 'character';
    default: return 'paintbrush.pointed';
  }
}
