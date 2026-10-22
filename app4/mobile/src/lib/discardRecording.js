/**
 * Delete the short-lived file expo-audio writes while metering.
 * Inject `deleteAsync` in tests. Missing files are ignored.
 */

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

export function isMissingFileError(err) {
  if (err == null) return false;
  const blob = `${err.code || ''} ${err.name || ''} ${err.message || err}`;
  return /not found|no such file|ENOENT|FileNotFound|not exist|idempotent/i.test(blob);
}

export async function discardRecordingUri(uri, deleteAsync) {
  if (uri == null) return false;
  const path = String(uri).trim();
  if (!path) return false;
  const del = deleteAsync || resolveDeleteAsync();
  if (typeof del !== 'function') return false;
  try {
    await del(path, { idempotent: true });
    return true;
  } catch (err) {
    if (isMissingFileError(err)) return false;
    return false;
  }
}

/**
 * Stop if needed, then delete recorder.uri (before and after stop, in case
 * the native module only assigns the path on stop).
 */
export async function stopAndDiscardCache(recorder, deleteAsync) {
  if (!recorder) return false;
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
  let deleted = false;
  for (const uri of uris) {
    deleted = (await discardRecordingUri(uri, deleteAsync)) || deleted;
  }
  return deleted;
}
