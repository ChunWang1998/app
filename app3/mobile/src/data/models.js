export const ICON_DEFAULT = 'brush';
export const ICON_KINDS = ['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye'];

export function nowIso() {
  return new Date().toISOString();
}

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} title
 * @property {string} icon stored glyph key
 * @property {string|null} lastDoneAt ISO string or null
 * @property {number|null} reminderDays Remind if not done in N days (null to disable)
 * @property {string} createdAt ISO
 * @property {string} updatedAt ISO
 * @property {string|null} deletedAt ISO or null (soft-delete)
 */

function normalizeIcon(icon) {
  if (icon && ICON_KINDS.includes(icon)) return icon;
  return ICON_DEFAULT;
}

/**
 * Create a new Activity
 * @param {{ title: string, reminderDays?: number|null, icon?: string }} input
 * @returns {Activity}
 */
export function createActivity(input) {
  const id = `act_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const ts = nowIso();
  return {
    id,
    title: String(input.title || '').trim() || 'Untitled',
    icon: normalizeIcon(input.icon),
    lastDoneAt: null,
    reminderDays: input.reminderDays ?? null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
}

/** Fill missing v1 fields so older persisted rows keep working. */
export function migrateActivity(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    icon: normalizeIcon(raw.icon),
    reminderDays: raw.reminderDays ?? null,
    deletedAt: raw.deletedAt ?? null,
  };
}
