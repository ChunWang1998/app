/** In-memory draft so the add-item screen can open Reminder before the row exists. */
let current = null;
const listeners = new Set();

export function setDraftReminder(fields) {
  current = fields && typeof fields === 'object' ? fields : null;
  for (const cb of listeners) cb(current);
}

export function getDraftReminder() {
  return current;
}

export function subscribeDraftReminder(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function clearDraftReminder() {
  current = null;
}
