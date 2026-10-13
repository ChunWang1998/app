import { z } from 'zod';

export const activitySchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  lastDoneAt: z.string().datetime().nullable(),
  reminderDays: z.number().int().positive().max(3650).nullable(),
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
