export function nowIso() {
  return new Date().toISOString();
}

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} title
 * @property {string|null} lastDoneAt ISO string or null
 * @property {number|null} reminderDays Remind if not done in N days (null to disable)
 * @property {string} createdAt ISO
 * @property {string} updatedAt ISO
 * @property {string|null} deletedAt ISO or null (soft-delete)
 */

/**
 * Create a new Activity
 * @param {{ title: string, reminderDays?: number|null }} input
 * @returns {Activity}
 */
export function createActivity(input) {
  const id = `act_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const ts = nowIso();
  return {
    id,
    title: String(input.title || '').trim() || 'Untitled',
    lastDoneAt: null,
    reminderDays: input.reminderDays ?? null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
}
