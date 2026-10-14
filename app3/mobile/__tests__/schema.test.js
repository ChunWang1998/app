import { activitySchema } from '../src/data/schema';

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

describe('dates 2000–2100', () => {
  it('accepts years inside the range', () => {
    expect(activitySchema.parse({
      ...base,
      lastDoneAt: '2000-01-01T00:00:00.000Z',
      createdAt: '2100-12-31T23:59:59.000Z',
      updatedAt: '2026-10-14T00:00:00.000Z',
    }).lastDoneAt).toBe('2000-01-01T00:00:00.000Z');
  });

  it('rejects years outside 2000–2100', () => {
    expect(() => activitySchema.parse({ ...base, lastDoneAt: '1999-12-31T23:59:59.000Z' })).toThrow();
    expect(() => activitySchema.parse({ ...base, createdAt: '2101-01-01T00:00:00.000Z' })).toThrow();
  });
});

describe('icon', () => {
  it('accepts built-in kinds including mono', () => {
    expect(activitySchema.parse({ ...base, icon: 'drop' }).icon).toBe('drop');
    expect(activitySchema.parse({ ...base, icon: 'mono' }).icon).toBe('mono');
  });
});
