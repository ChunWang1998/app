import { z } from 'zod';
import { sanitizeSnoozeDays } from './snooze';

const iconSchema = z.enum(['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye']);

const historyEntrySchema = z.object({
  at: z.string().datetime(),
}).strict();

export const activitySchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  icon: iconSchema.optional(),
  notes: z.string().max(2000).optional(),
  history: z.array(historyEntrySchema).max(500).optional(),
  lastDoneAt: z.string().datetime().nullable(),
  reminderDays: z.number().int().positive().max(3650).nullable(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  snoozeEnabled: z.boolean().optional(),
  snoozeDays: z.preprocess(
    (v) => (v === undefined ? undefined : sanitizeSnoozeDays(v)),
    z.number().int().min(1).max(365).optional(),
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
}).strict();

export const exportSchema = z.object({
  schema: z.literal('been-ages/export'),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  activities: z.array(activitySchema).max(200),
}).strict();

export function validateExport(data) {
  return exportSchema.parse(data);
}
