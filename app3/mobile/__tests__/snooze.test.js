import { sanitizeSnoozeDays } from '../src/data/snooze';
import { createActivity, migrateActivity } from '../src/data/models';

describe('sanitizeSnoozeDays', () => {
  it('floors and clamps to 1–365', () => {
    expect(sanitizeSnoozeDays(0.5)).toBe(1);
    expect(sanitizeSnoozeDays(3.9)).toBe(3);
    expect(sanitizeSnoozeDays(1e10)).toBe(365);
    expect(sanitizeSnoozeDays(0)).toBe(1);
    expect(sanitizeSnoozeDays(-3)).toBe(1);
    expect(sanitizeSnoozeDays(undefined)).toBe(3);
  });
});

describe('migrateActivity snoozeDays', () => {
  const raw = {
    id: 'act_1',
    title: 'X',
    lastDoneAt: null,
    reminderDays: 7,
    createdAt: '2026-10-13T00:00:00.000Z',
    updatedAt: '2026-10-13T00:00:00.000Z',
    deletedAt: null,
  };

  it('clamps persisted junk instead of keeping 0.5 or 1e10', () => {
    expect(migrateActivity({ ...raw, snoozeDays: 0.5 }).snoozeDays).toBe(1);
    expect(migrateActivity({ ...raw, snoozeDays: 1e10 }).snoozeDays).toBe(365);
    expect(migrateActivity({ ...raw, snoozeDays: 0 }).snoozeDays).toBe(1);
    expect(migrateActivity({ ...raw, snoozeDays: -1 }).snoozeDays).toBe(1);
    expect(createActivity({ title: 'Y', snoozeDays: 0.5 }).snoozeDays).toBe(1);
  });
});
