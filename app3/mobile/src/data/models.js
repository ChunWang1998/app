import { isoYearInRange } from './schema';
import { reminderFieldsFromConfig, reminderConfigFromActivity } from '../lib/reminderSchedule';
import { sameLocalDay } from '../lib/today';

export const ICON_DEFAULT = 'brush';
export const ICON_KINDS = ['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye', 'paw', 'plug', 'dots', 'mono'];

export function nowIso() {
  return new Date().toISOString();
}

/** Pin a timestamp to now when it is later than now. Invalid values are left alone. */
export function clampIsoToNow(iso, now = Date.now()) {
  if (iso == null || iso === '') return iso;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  return t > now ? new Date(now).toISOString() : (typeof iso === 'string' ? iso : new Date(t).toISOString());
}

export function clampHistoryToNow(history, now = Date.now()) {
  if (!Array.isArray(history)) return history;
  return history.map((e) => {
    if (e == null) return e;
    if (typeof e === 'string') return clampIsoToNow(e, now);
    if (typeof e === 'object') return { ...e, at: clampIsoToNow(e.at, now) };
    return e;
  });
}

/** Keep the newest stamp per local calendar day. `entries` should already be newest-first. */
export function dedupeHistoryByLocalDay(entries) {
  if (!Array.isArray(entries)) return [];
  const kept = [];
  for (const e of entries) {
    if (!e?.at) continue;
    if (kept.some((k) => sameLocalDay(k.at, e.at))) continue;
    kept.push(e);
  }
  return kept;
}

/** Clamp future stamps, normalize, then keep one row per local day. */
export function prepareHistory(rawHistory, lastDoneAt, now = Date.now()) {
  return dedupeHistoryByLocalDay(
    normalizeHistory(clampHistoryToNow(rawHistory, now), clampIsoToNow(lastDoneAt ?? null, now)),
  );
}

function normalizeIcon(icon) {
  if (icon && ICON_KINDS.includes(icon)) return icon;
  return ICON_DEFAULT;
}

function toIsoEntry(t) {
  if (!Number.isFinite(t)) return null;
  const at = new Date(t).toISOString();
  return isoYearInRange(at) ? { at } : null;
}

function toEntry(value) {
  if (!value) return null;
  if (typeof value === 'string') return toIsoEntry(new Date(value).getTime());
  if (value instanceof Date) return toIsoEntry(value.getTime());
  if (value.at) return toEntry(value.at);
  return null;
}

export function normalizeHistory(rawHistory, lastDoneAt) {
  const fromList = Array.isArray(rawHistory) ? rawHistory.map(toEntry).filter(Boolean) : [];
  if (!fromList.length && lastDoneAt) {
    const one = toEntry(lastDoneAt);
    if (one) fromList.push(one);
  }
  const seen = new Set();
  const unique = [];
  for (const e of fromList) {
    if (seen.has(e.at)) continue;
    seen.add(e.at);
    unique.push(e);
  }
  unique.sort((a, b) => new Date(b.at) - new Date(a.at));
  return unique;
}

export function lastDoneFromHistory(history) {
  return history?.[0]?.at || null;
}

/**
 * Create a new Activity
 * @param {{ title: string, reminderDays?: number|null, icon?: string, notes?: string, lastDoneAt?: string|null, history?: Array, reminderTime?: string, snoozeEnabled?: boolean, snoozeDays?: number }} input
 */
export function createActivity(input) {
  const id = `act_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const ts = nowIso();
  const history = prepareHistory(input.history, input.lastDoneAt ?? null);
  return {
    id,
    title: String(input.title || '').trim() || 'Untitled',
    icon: normalizeIcon(input.icon),
    notes: String(input.notes || ''),
    history,
    lastDoneAt: lastDoneFromHistory(history),
    ...reminderFieldsFromConfig(reminderConfigFromActivity(input)),
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
    ...(input.categoryId ? { categoryId: String(input.categoryId) } : {}),
  };
}

/** Fill missing fields so older persisted rows keep working. */
export function migrateActivity(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const history = normalizeHistory(raw.history, raw.lastDoneAt ?? null);
  return {
    id: raw.id,
    title: raw.title,
    icon: normalizeIcon(raw.icon),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    history,
    lastDoneAt: lastDoneFromHistory(history),
    ...reminderFieldsFromConfig(reminderConfigFromActivity(raw)),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt ?? null,
    ...(typeof raw.categoryId === 'string' && raw.categoryId ? { categoryId: raw.categoryId } : {}),
  };
}
