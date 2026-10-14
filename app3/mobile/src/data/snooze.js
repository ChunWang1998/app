export const SNOOZE_DAYS_MIN = 1;
export const SNOOZE_DAYS_MAX = 365;
export const SNOOZE_DAYS_DEFAULT = 3;

/** Integer snooze length in 1–365. Fractional/zero/huge/NaN cannot loop or overflow Date. */
export function sanitizeSnoozeDays(value) {
  if (value === undefined || value === null || value === '') return SNOOZE_DAYS_DEFAULT;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return SNOOZE_DAYS_DEFAULT;
  return Math.min(SNOOZE_DAYS_MAX, Math.max(SNOOZE_DAYS_MIN, n));
}
