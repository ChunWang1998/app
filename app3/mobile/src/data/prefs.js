import { KeyValueStorage } from './storage';

const storage = new KeyValueStorage();
export const PREFS_KEY = 'prefs/v1';

const DEFAULTS = {
  appearance: 'auto', // auto | light | dark
  preciseTime: true,
  sort: 'due', // due | last
  reminderTime: '09:00',
  hideName: false, // share cards + calendar event titles
};

let prefs = { ...DEFAULTS };
let initialized = false;
const listeners = new Set();

function notify() {
  for (const l of listeners) l(prefs);
}

export async function initPrefs() {
  if (initialized) return prefs;
  try {
    const raw = await storage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        prefs = { ...DEFAULTS, ...parsed };
      }
    }
  } catch {
    prefs = { ...DEFAULTS };
  }
  initialized = true;
  notify();
  return prefs;
}

export function getPrefs() {
  return prefs;
}

export function subscribePrefs(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function updatePrefs(patch) {
  prefs = { ...prefs, ...patch };
  await storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  notify();
  return prefs;
}

export async function resetPrefsForTests() {
  initialized = false;
  prefs = { ...DEFAULTS };
  await storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  initialized = true;
  notify();
}
