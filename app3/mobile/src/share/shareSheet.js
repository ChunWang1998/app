import { IG_STORIES_DIRECT } from './config';

/**
 * Always uses the system share sheet in v1.1.
 * Direct IG Stories is gated on META_APP_ID and is not implemented yet.
 */
export async function shareCardImage(uri, { dialogTitle = 'Been Ages' } = {}) {
  if (!uri) throw new Error('missing image');
  const Sharing = require('expo-sharing');
  if (typeof Sharing.isAvailableAsync === 'function') {
    const ok = await Sharing.isAvailableAsync();
    if (!ok) throw new Error('sharing unavailable');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle,
  });
}

export function igStoriesStatus() {
  return {
    enabled: IG_STORIES_DIRECT,
    reason: IG_STORIES_DIRECT
      ? 'ready-when-implemented'
      : 'waiting-for-meta-app-id',
  };
}

export async function cleanupShareFile(uri) {
  if (!uri) return;
  try {
    const FileSystem = require('expo-file-system');
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {}
}
