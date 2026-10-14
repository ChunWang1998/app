import { z } from 'zod';
import { sanitizeSnoozeDays } from './snooze';

export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;

export function isoYearInRange(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const y = new Date(t).getUTCFullYear();
  return y >= YEAR_MIN && y <= YEAR_MAX;
}

const isoDate = z.string().datetime().refine(isoYearInRange, { message: 'year must be 2000–2100' });
const isoDateOrNull = isoDate.nullable();

const iconSchema = z.enum(['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye', 'paw', 'mono']);

const historyEntrySchema = z.object({
  at: isoDate,
}).strict();

export const activitySchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  icon: iconSchema.optional(),
  notes: z.string().max(2000).optional(),
  history: z.array(historyEntrySchema).max(500).optional(),
  lastDoneAt: isoDateOrNull,
  reminderDays: z.number().int().positive().max(3650).nullable(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  snoozeEnabled: z.boolean().optional(),
  snoozeDays: z.preprocess(
    (v) => (v === undefined ? undefined : sanitizeSnoozeDays(v)),
    z.number().int().min(1).max(365).optional(),
  ),
  createdAt: isoDate,
  updatedAt: isoDate,
  deletedAt: isoDateOrNull,
}).strict();

