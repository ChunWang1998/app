/**
 * Pure mapping from expo-audio recorder metering (dBFS) to a display estimate.
 *
 * expo-audio `RecorderState.metering` is dBFS, typically about -160 (silence)
 * to 0 (near clipping). It is not A-weighted SPL.
 *
 * displayDb = clamp(dBFS + 100 + offset, 0, 140)
 *
 * At offset 0, 0 dBFS maps to 100 dB. Phone microphones often clip around
 * there; users can add offset in [-20, 20] after comparing with a known meter.
 *
 * This is an estimate, not a professional or legal-grade measurement.
 */

export const OFFSET_BASE = 100;
export const DISPLAY_MIN = 0;
export const DISPLAY_MAX = 140;
export const OFFSET_MIN = -20;
export const OFFSET_MAX = 20;
export const DEFAULT_SMOOTH_ALPHA = 0.35;
export const DBFS_SILENCE = -160;

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function clampOffset(offset) {
  const n = Math.round(Number(offset));
  if (!Number.isFinite(n)) return 0;
  return clamp(n, OFFSET_MIN, OFFSET_MAX);
}

export function isValidDbfs(dbfs) {
  return Number.isFinite(dbfs);
}

/** Map one dBFS sample to a clamped display dB using the documented formula. */
export function mapDbfsToDisplayDb(dbfs, offset = 0) {
  if (!isValidDbfs(dbfs)) return null;
  return clamp(dbfs + OFFSET_BASE + clampOffset(offset), DISPLAY_MIN, DISPLAY_MAX);
}

/**
 * Exponential moving average on display dB.
 * First finite sample becomes the value; invalid next keeps previous.
 */
export function smoothLevel(previous, next, alpha = DEFAULT_SMOOTH_ALPHA) {
  if (!Number.isFinite(next)) return Number.isFinite(previous) ? previous : null;
  if (!Number.isFinite(previous)) return next;
  const a = clamp(alpha, 0, 1);
  return previous + a * (next - previous);
}

export function createSession() {
  return { count: 0, sum: 0, max: null };
}

/** Accumulate raw dBFS so max/avg can be remapped when offset changes. */
export function addDbfsSample(session, dbfs) {
  if (!session || !isValidDbfs(dbfs)) return session || createSession();
  return {
    count: session.count + 1,
    sum: session.sum + dbfs,
    max: session.max == null ? dbfs : Math.max(session.max, dbfs),
  };
}

/**
 * Session average is the mapped mean dBFS (not the mean of already-clamped
 * display values), so changing offset updates max/avg without resampling.
 */
export function sessionDisplayStats(session, offset = 0) {
  if (!session || !session.count) return { max: null, avg: null, count: 0 };
  return {
    max: mapDbfsToDisplayDb(session.max, offset),
    avg: mapDbfsToDisplayDb(session.sum / session.count, offset),
    count: session.count,
  };
}

export function gaugeFill(displayDb) {
  if (!Number.isFinite(displayDb)) return 0;
  return clamp(displayDb / DISPLAY_MAX, 0, 1);
}

/** Quiet / moderate / loud fill colors for the bar (not a calibrated scale). */
export function gaugeColor(displayDb) {
  if (!Number.isFinite(displayDb)) return '#C9C3BB';
  if (displayDb < 60) return '#3F8A57';
  if (displayDb < 85) return '#C48A1A';
  return '#C65B45';
}

export function formatDb(displayDb) {
  if (!Number.isFinite(displayDb)) return '—';
  return String(Math.round(displayDb));
}

export function formatOffset(offset) {
  const n = clampOffset(offset);
  if (n > 0) return `+${n}`;
  return String(n);
}
