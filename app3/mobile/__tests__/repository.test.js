import { initRepository, resetRepositoryForTests, addActivity, logActivityNow, logActivityAt, undoLogActivity, softDeleteActivity, undoDelete, hardDeleteActivity, backfillHistory, getRecentlyDeleted, getVisibleActivities, updateActivity, FREE_ACTIVITY_LIMIT, FREE_HISTORY_LIMIT } from '../src/data/repository';
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

  it('derives icon from the category and ignores a passed-in icon', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: '換貓砂', icon: 'drop' });
    expect(a.icon).toBe('paw');
    expect(a.categoryId).toBe('pet');
    const m = await addActivity({ title: '量子', icon: 'mono' });
    expect(getVisibleActivities().find((x) => x.id === m.id).icon).toBe('dots');
  });
});

function histDay(n) {
  return new Date(Date.UTC(2026, 0, n, 12)).toISOString();
}

describe('free history limit per item', () => {
  afterEach(() => jest.restoreAllMocks());

  async function itemWithHistory(n, title = 'HistCap') {
    const a = await addActivity({ title });
    for (let i = 1; i <= n; i++) {
      await backfillHistory(a.id, histDay(i));
    }
    return a;
  }

  it('lets the 10th record through and paywalls the 11th', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    expect(FREE_HISTORY_LIMIT).toBe(10);
    const a = await itemWithHistory(10);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
    await expect(backfillHistory(a.id, histDay(11))).rejects.toHaveProperty('code', 'FREE_LIMIT');
    await expect(logActivityAt(a.id, histDay(12))).rejects.toHaveProperty('code', 'FREE_LIMIT');
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
  });

  it('never truncates an item that already has more than 10 records', async () => {
    await resetRepositoryForTests();
    const pro = jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(true);
    const a = await addActivity({ title: 'Legacy' });
    const history = Array.from({ length: 15 }, (_, i) => ({ at: histDay(i + 1) }));
    await updateActivity(a.id, { history });
    pro.mockResolvedValue(false);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(15);
    await expect(logActivityAt(a.id, histDay(20))).rejects.toHaveProperty('code', 'FREE_LIMIT');
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(15);
    expect(getVisibleActivities().find((x) => x.id === a.id).history.map((e) => e.at)).toEqual(
      history.slice().sort((x, y) => new Date(y.at) - new Date(x.at)).map((e) => e.at),
    );
  });

  it('does not limit Pro users', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(true);
    const a = await itemWithHistory(12);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(12);
    await logActivityAt(a.id, histDay(20));
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(13);
  });

  it('allows a new write after a record is removed and the count drops below 10', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const a = await itemWithHistory(9);
    const logged = await logActivityAt(a.id, histDay(10));
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
    await expect(logActivityAt(a.id, histDay(11))).rejects.toHaveProperty('code', 'FREE_LIMIT');
    await undoLogActivity(a.id, logged.previousLastDoneAt, logged.previousHistory);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(9);
    await logActivityAt(a.id, histDay(11));
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
  });

  it('same-day check-off still skips without hitting the paywall at the cap', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const last = new Date(2026, 9, 14, 8, 0, 0).toISOString();
    const a = await addActivity({ title: 'TodayCap', lastDoneAt: last });
    const older = Array.from({ length: 9 }, (_, i) => ({ at: histDay(i + 1) }));
    await updateActivity(a.id, { history: [{ at: last }, ...older] });
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
    const noon = new Date(2026, 9, 14, 12, 0, 0).toISOString();
    const skipped = await logActivityNow(a.id, noon);
    expect(skipped.skipped).toBe(true);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
  });

  it('serializes a double tap so only one record is written', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 15)),
    );
    const a = await addActivity({ title: 'Double' });
    const t1 = new Date(2026, 9, 14, 12, 0, 0).toISOString();
    const t2 = new Date(2026, 9, 14, 12, 0, 1).toISOString();
    const [first, second] = await Promise.all([
      logActivityNow(a.id, t1),
      logActivityNow(a.id, t2),
    ]);
    expect([first.skipped, second.skipped].filter(Boolean)).toHaveLength(1);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(1);
  });

  it('caps concurrent writes that start at 9 records at 10 for free users', async () => {
    await resetRepositoryForTests();
    const pro = jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const a = await itemWithHistory(9, 'Race');
    pro.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 15)),
    );
    const results = await Promise.allSettled([
      backfillHistory(a.id, histDay(20)),
      backfillHistory(a.id, histDay(21)),
      logActivityAt(a.id, histDay(22)),
    ]);
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected').every((r) => r.reason?.code === 'FREE_LIMIT')).toBe(true);
  });

  it('blocks updateActivity from growing unique history past the free cap without dropping rows', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const a = await itemWithHistory(10, 'Patch');
    const kept = getVisibleActivities().find((x) => x.id === a.id).history;
    await expect(updateActivity(a.id, { history: [...kept, { at: histDay(30) }] })).rejects.toHaveProperty('code', 'FREE_LIMIT');
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(10);
    const shrunk = kept.slice(1);
    await updateActivity(a.id, { history: shrunk });
    expect(getVisibleActivities().find((x) => x.id === a.id).history).toHaveLength(9);
  });
});
