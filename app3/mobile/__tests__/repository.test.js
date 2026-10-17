import { initRepository, resetRepositoryForTests, addActivity, logActivityNow, undoLogActivity, softDeleteActivity, undoDelete, hardDeleteActivity, backfillHistory, getRecentlyDeleted, getVisibleActivities, FREE_ACTIVITY_LIMIT } from '../src/data/repository';
import * as ent from '../src/lib/entitlements';

describe('repository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes and adds, logs, deletes, undoes', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Test A', reminderDays: 3 });
    expect(a.id).toBeTruthy();

    const logged = await logActivityNow(a.id);
    expect(logged.previousLastDoneAt).toBeNull();
    expect(logged.previousHistory).toEqual([]);
    await undoLogActivity(a.id, logged.previousLastDoneAt, logged.previousHistory);
    await logActivityNow(a.id);

    await softDeleteActivity(a.id);
    await undoDelete(a.id);
    expect(getVisibleActivities().map((x) => x.id)).toContain(a.id);
  });

  it('enforces free tier limit', async () => {
    await resetRepositoryForTests();
    for (let i = 0; i < FREE_ACTIVITY_LIMIT; i++) {
      await addActivity({ title: `A${i}` });
    }
    await expect(addActivity({ title: 'one more' })).rejects.toHaveProperty('code', 'FREE_LIMIT');
  });

  it('pro unlock removes activity limit', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(true);
    for (let i = 0; i < FREE_ACTIVITY_LIMIT + 3; i++) {
      await addActivity({ title: `P${i}` });
    }
    expect(getVisibleActivities()).toHaveLength(FREE_ACTIVITY_LIMIT + 3);
  });

  it('keeps swipe-deletes in recently deleted', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Trash me' });
    await softDeleteActivity(a.id);
    const trash = getRecentlyDeleted();
    expect(trash.map((x) => x.id)).toContain(a.id);
    expect(getVisibleActivities().find((x) => x.id === a.id)).toBeUndefined();
  });

  it('hard-deletes after the undo window', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Old' });
    await softDeleteActivity(a.id);
    await hardDeleteActivity(a.id);
    expect(getVisibleActivities().find((x) => x.id === a.id)).toBeUndefined();
    expect(getRecentlyDeleted().find((x) => x.id === a.id)).toBeUndefined();
  });

  it('blocks undoDelete when restoring would exceed the free cap', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const kept = [];
    for (let i = 0; i < FREE_ACTIVITY_LIMIT; i++) {
      kept.push(await addActivity({ title: `Cap${i}` }));
    }
    await softDeleteActivity(kept[0].id);
    await addActivity({ title: 'Replacement' });
    await expect(undoDelete(kept[0].id)).rejects.toHaveProperty('code', 'FREE_LIMIT');
    expect(getVisibleActivities().find((x) => x.id === kept[0].id)).toBeUndefined();
    expect(getVisibleActivities()).toHaveLength(FREE_ACTIVITY_LIMIT);
  });

  it('logs into history and can backfill / undo', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Hist', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    expect(a.history[0].at).toBe('2026-09-01T00:00:00.000Z');
    const logged = await logActivityNow(a.id);
    let row = getVisibleActivities()[0];
    expect(row.history.length).toBe(2);
    expect(row.lastDoneAt).toBe(logged.loggedAt);
    await undoLogActivity(a.id, logged.previousLastDoneAt, logged.previousHistory);
    row = getVisibleActivities()[0];
    expect(row.history.length).toBe(1);
    await backfillHistory(a.id, '2026-08-01T00:00:00.000Z');
    row = getVisibleActivities()[0];
    expect(row.history.some((e) => e.at === '2026-08-01T00:00:00.000Z')).toBe(true);
    expect(row.notes).toBe('');
  });

  it('skips a second check-off on the same local calendar day', async () => {
    await resetRepositoryForTests();
    const last = new Date(2026, 9, 14, 8, 0, 0).toISOString();
    const a = await addActivity({ title: 'Once', lastDoneAt: last });
    const noon = new Date(2026, 9, 14, 12, 0, 0).toISOString();
    const first = await logActivityNow(a.id, noon);
    expect(first.skipped).toBe(true);
    expect(getVisibleActivities()[0].history).toHaveLength(1);
    expect(getVisibleActivities()[0].lastDoneAt).toBe(last);

    const nextDay = new Date(2026, 9, 15, 0, 10, 0).toISOString();
    const second = await logActivityNow(a.id, nextDay);
    expect(second.skipped).toBe(false);
    expect(getVisibleActivities()[0].history).toHaveLength(2);
    expect(getVisibleActivities()[0].lastDoneAt).toBe(nextDay);

    const laterSameDay = new Date(2026, 9, 15, 18, 0, 0).toISOString();
    const third = await logActivityNow(a.id, laterSameDay);
    expect(third.skipped).toBe(true);
    expect(getVisibleActivities()[0].history).toHaveLength(2);
    expect(getVisibleActivities()[0].lastDoneAt).toBe(nextDay);
  });

  it('still appends two check-offs when they fall on different local days across midnight', async () => {
    await resetRepositoryForTests();
    const late = new Date(2026, 9, 13, 23, 30, 0).toISOString();
    const a = await addActivity({ title: 'Midnight', lastDoneAt: late });
    const early = new Date(2026, 9, 14, 0, 10, 0).toISOString();
    const r = await logActivityNow(a.id, early);
    expect(r.skipped).toBe(false);
    expect(getVisibleActivities()[0].history).toHaveLength(2);
  });

  it('persists icon including mono', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: '濾心', icon: 'drop' });
    expect(a.icon).toBe('drop');
    const m = await addActivity({ title: '量子', icon: 'mono' });
    expect(getVisibleActivities().find((x) => x.id === m.id).icon).toBe('mono');
  });
});
