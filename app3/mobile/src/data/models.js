export const ICON_DEFAULT = 'brush';
export const ICON_KINDS = ['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye'];

export function nowIso() {
  return new Date().toISOString();
}

function normalizeIcon(icon) {
  if (icon && ICON_KINDS.includes(icon)) return icon;
  return ICON_DEFAULT;
}

function toEntry(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? { at: new Date(t).toISOString() } : null;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? { at: new Date(t).toISOString() } : null;
  }
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
  const history = normalizeHistory(input.history, input.lastDoneAt ?? null);
  return {
    id,
    title: String(input.title || '').trim() || 'Untitled',
    icon: normalizeIcon(input.icon),
    notes: String(input.notes || ''),
    history,
    lastDoneAt: lastDoneFromHistory(history),
    reminderDays: input.reminderDays ?? null,
    reminderTime: input.reminderTime || '09:00',
    snoozeEnabled: input.snoozeEnabled !== false,
    snoozeDays: Number.isFinite(input.snoozeDays) ? input.snoozeDays : 3,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
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
    reminderDays: raw.reminderDays ?? null,
    reminderTime: raw.reminderTime || '09:00',
    snoozeEnabled: raw.snoozeEnabled !== false,
    snoozeDays: Number.isFinite(raw.snoozeDays) ? raw.snoozeDays : 3,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt ?? null,
  };
}
