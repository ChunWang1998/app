/**
 * JS facade for the local Apple Foundation Models Expo module.
 * Never calls the network. Dates and numbers are computed in JS after the model returns phrases.
 */
import { hydrateIntent } from './ruleParser';

function loadNative() {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    return requireNativeModule('AppleFoundationModels');
  } catch {
    return null;
  }
}

let native = undefined;
function getNative() {
  if (native === undefined) native = loadNative();
  return native;
}

export async function getFoundationModelsAvailability(locale) {
  const mod = getNative();
  if (!mod?.getAvailability) return { status: 'unavailable', reason: 'no-native' };
  try {
    return await mod.getAvailability(String(locale || 'en'));
  } catch (e) {
    return { status: 'unavailable', reason: e?.message || 'error' };
  }
}

/**
 * @returns {Promise<object|null>} hydrated intent, or null to fall back to rules
 */
export async function tryFoundationModels(text, ctx = {}) {
  const mod = getNative();
  if (!mod?.parseIntent) return null;
  try {
    const raw = await mod.parseIntent(String(text || ''), String(ctx.locale || 'en'));
    if (!raw || raw.ok === false) return null;
    const intent = hydrateIntent(
      {
        type: raw.kind || raw.type,
        name: raw.name,
        lastDonePhrase: raw.lastDonePhrase,
        reminderPhrase: raw.reminderPhrase,
        source: 'fm',
      },
      ctx,
    );
    if (!intent || intent.type === 'unknown' || (intent.type !== 'query_week' && !intent.name)) {
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function __setNativeForTests(mod) {
  native = mod;
}
