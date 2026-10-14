import { SNAPSHOT_FILENAME, QUEUE_FILENAME, SELECTION_FILENAME, emptyQueue, emptySelection, emptySnapshot, parseQueue, parseSnapshot, normalizeSelection } from './appGroup';

/**
 * Pluggable store for App Group JSON blobs.
 * Production writes files into expo-widgets `widgetsDirectory`.
 * Tests / web use an in-memory or KeyValue adapter.
 */
export class MemoryAppGroupStore {
  constructor() {
    this.map = new Map();
  }
  async readJson(name) {
    if (!this.map.has(name)) return null;
    try {
      return JSON.parse(this.map.get(name));
    } catch {
      return null;
    }
  }
  async writeJson(name, value) {
    this.map.set(name, JSON.stringify(value));
  }
}

export class KeyValueAppGroupStore {
  constructor(storage, prefix = 'beenages-appgroup') {
    this.storage = storage;
    this.prefix = prefix;
  }
  key(name) {
    return `${this.prefix}/${name}`;
  }
  async readJson(name) {
    const raw = await this.storage.getItem(this.key(name));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  async writeJson(name, value) {
    await this.storage.setItem(this.key(name), JSON.stringify(value));
  }
}

export async function readSnapshot(store) {
  return parseSnapshot(await store.readJson(SNAPSHOT_FILENAME));
}

export async function writeSnapshot(store, snapshot) {
  const clean = parseSnapshot(snapshot);
  await store.writeJson(SNAPSHOT_FILENAME, clean);
  return clean;
}

export async function readQueue(store) {
  return parseQueue(await store.readJson(QUEUE_FILENAME));
}

export async function writeQueue(store, queue) {
  const clean = parseQueue(queue);
  await store.writeJson(QUEUE_FILENAME, clean);
  return clean;
}

export async function clearQueue(store) {
  return writeQueue(store, emptyQueue());
}

export async function readSelection(store) {
  const raw = await store.readJson(SELECTION_FILENAME);
  return raw ? normalizeSelection(raw) : emptySelection();
}

export async function writeSelection(store, selection) {
  const clean = normalizeSelection(selection);
  await store.writeJson(SELECTION_FILENAME, clean);
  return clean;
}

export function emptyAppGroupState() {
  return {
    snapshot: emptySnapshot(),
    queue: emptyQueue(),
    selection: emptySelection(),
  };
}
