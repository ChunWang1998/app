import { activitySchema, validateExport } from '../src/data/schema';

const base = {
  id: 'act_test',
  title: 'Test',
  lastDoneAt: null,
  reminderDays: 7,
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
  deletedAt: null,
};

describe('reminderTime HH:MM', () => {
  it('accepts 00:00–23:59', () => {
    for (const reminderTime of ['00:00', '09:00', '12:30', '23:59']) {
      expect(activitySchema.parse({ ...base, reminderTime }).reminderTime).toBe(reminderTime);
    }
  });

  it('rejects hours or minutes outside the clock', () => {
    for (const reminderTime of ['24:00', '09:60', '9:00', '9:0', '25:00', 'ab:cd', '09:00:00', '']) {
      expect(() => activitySchema.parse({ ...base, reminderTime })).toThrow();
    }
  });

  it('allows omitting reminderTime on export rows', () => {
    const blob = validateExport({
      schema: 'been-ages/export',
      version: 1,
      exportedAt: '2026-10-13T00:00:00.000Z',
      activities: [base],
    });
    expect(blob.activities[0].reminderTime).toBeUndefined();
  });
});

describe('snoozeDays 1–365', () => {
  it('clamps fractional, huge, zero and negative values', () => {
    expect(activitySchema.parse({ ...base, snoozeDays: 0.5 }).snoozeDays).toBe(1);
    expect(activitySchema.parse({ ...base, snoozeDays: 1e10 }).snoozeDays).toBe(365);
    expect(activitySchema.parse({ ...base, snoozeDays: 0 }).snoozeDays).toBe(1);
    expect(activitySchema.parse({ ...base, snoozeDays: -3 }).snoozeDays).toBe(1);
    expect(activitySchema.parse({ ...base, snoozeDays: 3 }).snoozeDays).toBe(3);
  });
});
