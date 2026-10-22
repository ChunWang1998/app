/**
 * Delete the short-lived file expo-audio writes while metering.
 *
 * Inject `deleteAsync` in tests. If a delete fails (including a missing-file
 * throw on some platforms), the URI is kept in an in-memory retry list
 * (cap PENDING_DISCARD_CAP, oldest dropped) and tried again on the next
 * stop / unmount / start cleanup. Paths are never logged.
 */

export const PENDING_DISCARD_CAP = 20;

const pendingUris = new Set();

function rememberFailed(fileUri) {
  if (pendingUris.has(fileUri)) return;
  while (pendingUris.size >= PENDING_DISCARD_CAP) {
    const oldest = pendingUris.values().next().value;
    pendingUris.delete(oldest);
  }
  pendingUris.add(fileUri);
}

function resolveDeleteAsync() {
  try {
    const legacy = require('expo-file-system/legacy');
    if (typeof legacy.deleteAsync === 'function') return legacy.deleteAsync.bind(legacy);
  } catch {
    // SDK entry may only expose the new File API
  }
  try {
    const fs = require('expo-file-system');
    if (typeof fs.deleteAsync === 'function') return fs.deleteAsync.bind(fs);
  } catch {
    // Expo Go always ships expo-file-system; tests may omit it
  }
  return null;
}

export function pendingDiscardCount() {
  return pendingUris.size;
}

export function pendingDiscardUrisForTests() {
  return Array.from(pendingUris);
}

export function resetPendingDiscardsForTests() {
  pendingUris.clear();
}

export async function discardRecordingUri(uri, deleteAsync) {
  if (uri == null) return false;
  const fileUri = String(uri).trim();
  if (!fileUri) return false;
  const del = deleteAsync || resolveDeleteAsync();
  if (typeof del !== 'function') {
    rememberFailed(fileUri);
    return false;
  }
  try {
    await del(fileUri, { idempotent: true });
    pendingUris.delete(fileUri);
    return true;
  } catch {
    rememberFailed(fileUri);
    return false;
  }
}

export async function retryPendingDiscards(deleteAsync) {
  const queued = Array.from(pendingUris);
  let any = false;
  for (let i = 0; i < queued.length; i += 1) {
    any = (await discardRecordingUri(queued[i], deleteAsync)) || any;
  }
  return any;
}

/**
 * Stop if needed, then delete recorder.uri (before and after stop, in case
 * the native module only assigns the path on stop). Also retries any URIs
 * whose previous delete failed.
 */
export async function stopAndDiscardCache(recorder, deleteAsync) {
  if (!recorder) {
    await retryPendingDiscards(deleteAsync);
    return false;
  }
  const uris = [];
  const remember = (uri) => {
    if (uri && !uris.includes(uri)) uris.push(uri);
  };
  remember(recorder.uri);
  try {
    if (recorder.isRecording && typeof recorder.stop === 'function') {
      await recorder.stop();
    }
  } catch {
    try {
      recorder.pause?.();
    } catch {
      // already stopped
    }
  }
  remember(recorder.uri);
  await retryPendingDiscards(deleteAsync);
  let deleted = false;
  for (let i = 0; i < uris.length; i += 1) {
    deleted = (await discardRecordingUri(uris[i], deleteAsync)) || deleted;
  }
  return deleted;
}
