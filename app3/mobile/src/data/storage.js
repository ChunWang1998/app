import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateActivity } from './models';

// Pluggable storage adapter, App Group-ready in the future.
export class KeyValueStorage {
  /**
   * @param {{ namespace?: string }} options
   */
  constructor(options = {}) {
    this.namespace = options.namespace || 'beenages';
  }
  key(k) {
    return `${this.namespace}:${k}`;
  }
  async getItem(key) {
    return AsyncStorage.getItem(this.key(key));
  }
  async setItem(key, value) {
    return AsyncStorage.setItem(this.key(key), value);
  }
  async removeItem(key) {
    return AsyncStorage.removeItem(this.key(key));
  }
}

export const STATE_KEY = 'state/v1';
export const CORRUPT_KEY = 'state/v1.corrupt';

/**
 * Persist entire app state in one blob (simple and atomic for v1).
 * Shape: { activities: Activity[], version: number, categories?: Category[] }
 */
export async function loadState(storage = new KeyValueStorage()) {
  let raw = null;
  try {
    raw = await storage.getItem(STATE_KEY);
    if (!raw) return { version: 1, activities: [] };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('bad state');
    if (!Array.isArray(data.activities)) data.activities = [];
    return {
      version: Number.isInteger(data.version) ? data.version : 1,
      activities: data.activities.map(migrateActivity),
      ...(Array.isArray(data.categories) ? { categories: data.categories } : {}),
    };
  } catch {
    if (raw) {
      try {
        await storage.setItem(CORRUPT_KEY, raw);
      } catch {
        // backup is best-effort; never block launching on an empty store
      }
    }
    return { version: 1, activities: [] };
  }
}

export async function saveState(state, storage = new KeyValueStorage()) {
  const clean = {
    version: Number.isInteger(state.version) ? state.version : 1,
    activities: Array.isArray(state.activities) ? state.activities : [],
    ...(Array.isArray(state.categories) ? { categories: state.categories } : {}),
  };
  await storage.setItem(STATE_KEY, JSON.stringify(clean));
}
