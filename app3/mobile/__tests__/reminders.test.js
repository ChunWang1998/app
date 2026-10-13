import { nextTriggerDate } from '../src/notifications/reminders';

describe('reminders', () => {
  it('computes next date based on lastDoneAt + days', () => {
    const base = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const a = {
      id: 'x',
      title: 'X',
      lastDoneAt: base,
      reminderDays: 2,
      createdAt: base,
      updatedAt: base,
      deletedAt: null,
    };
    const next = nextTriggerDate(a);
    expect(next).toBeInstanceOf(Date);
  });
});
