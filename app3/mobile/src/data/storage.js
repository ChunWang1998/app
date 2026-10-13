import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STATE_KEY = 'state/v1';

/**
 * Persist entire app state in one blob (simple and atomic for v1).
 * Shape: { activities: Activity[], version: 1 }
 */
export async function loadState(storage = new KeyValueStorage()) {
  try {
    const raw = await storage.getItem(STATE_KEY);
    if (!raw) return { version: 1, activities: [] };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('bad state');
    if (!Array.isArray(data.activities)) data.activities = [];
    return { version: 1, activities: data.activities };
  } catch {
    return { version: 1, activities: [] };
  }
}

export async function saveState(state, storage = new KeyValueStorage()) {
  const clean = {
    version: 1,
    activities: Array.isArray(state.activities) ? state.activities : [],
  };
  await storage.setItem(STATE_KEY, JSON.stringify(clean));
}
