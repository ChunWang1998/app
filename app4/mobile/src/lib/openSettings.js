/**
 * Open the OS settings app when the platform supports it.
 * `Linking.openSettings` is missing on web and must never throw.
 */
export function openAppSettings(linking) {
  try {
    if (!linking || typeof linking.openSettings !== 'function') return false;
    const result = linking.openSettings();
    if (result != null && typeof result.then === 'function') {
      result.then(() => {}, () => {});
    }
    return true;
  } catch {
    return false;
  }
}

/** After a failed permission prompt: hint Settings when the OS will not ask again. */
export function shouldShowSettingsHint(status, { afterRequest } = {}) {
  if (!status || status.granted) return false;
  if (status.canAskAgain === false) return true;
  return !!afterRequest;
}
