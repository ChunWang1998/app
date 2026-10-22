import { KeyValueStorage } from './storage';
import { clampOffset } from '../lib/meter';

const storage = new KeyValueStorage();
export const PREFS_KEY = 'prefs/v1';

const DEFAULTS = {
  offset: 0,
};

let prefs = { ...DEFAULTS };
let initialized = false;
const listeners = new Set();

function notify() {
  for (const l of listeners) l(prefs);
}

function normalize(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    offset: clampOffset(src.offset),
  };
}

export async function initPrefs() {
  if (initialized) return prefs;
  try {
    const raw = await storage.getItem(PREFS_KEY);
    if (raw) {
      prefs = normalize(JSON.parse(raw));
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

export function getOffset() {
  return prefs.offset;
}

export function subscribePrefs(cb) {
  listeners.add(cb);
  cb(prefs);
  return () => listeners.delete(cb);
}

export async function updatePrefs(patch) {
  prefs = normalize({ ...prefs, ...patch });
  await storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  notify();
  return prefs;
}

export async function setOffset(offset) {
  return updatePrefs({ offset: clampOffset(offset) });
}

export async function resetPrefsForTests() {
  initialized = false;
  prefs = { ...DEFAULTS };
  notify();
}
