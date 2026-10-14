import TABLE from './reminderKeywords.json';
import { hasKey } from './suggestIcon';

const FLAT = TABLE.flatMap((row) => (row.keys || []).map((key) => ({ days: row.days, key: String(key) })))
  .sort((a, b) => b.key.length - a.key.length);

/** Offline name → reminder interval in days, or null (no reminder). */
export function suggestReminderDays(title) {
  const raw = String(title || '').trim();
  if (!raw) return null;
  for (const row of FLAT) {
    if (hasKey(raw, row.key)) return row.days;
  }
  return null;
}
