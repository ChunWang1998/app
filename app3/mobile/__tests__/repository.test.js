import { initRepository, resetRepositoryForTests, reloadRepositoryForTests, addActivity, logActivityNow, logActivityAt, logActivityOnDay, undoLogActivity, undoLogAt, undoHandlerForLog, softDeleteActivity, undoDelete, hardDeleteActivity, backfillHistory, getRecentlyDeleted, getVisibleActivities, updateActivity, purgeExpiredDeleted, trashDaysLeft, clampIsoToNow, TRASH_DAYS, TRASH_MS, FREE_ACTIVITY_LIMIT, FREE_HISTORY_LIMIT } from '../src/data/repository';
import { createActivity } from '../src/data/models';
import { sameLocalDay } from '../src/lib/today';
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

  it('keeps recently deleted for 3 days and purges older rows on launch', async () => {
    await resetRepositoryForTests();
    expect(TRASH_DAYS).toBe(3);
    expect(TRASH_MS).toBe(3 * 864e5);
    const stale = await addActivity({ title: 'Stale trash' });
    const recent = await addActivity({ title: 'Recent trash' });
    const alive = await addActivity({ title: 'Still here' });
    await softDeleteActivity(stale.id);
    await softDeleteActivity(recent.id);
    const now = Date.parse('2026-10-20T16:00:00.000Z');
    await updateActivity(stale.id, { deletedAt: new Date(now - 4 * 864e5).toISOString() });
    await updateActivity(recent.id, { deletedAt: new Date(now - 1 * 864e5).toISOString() });
    const dropped = await purgeExpiredDeleted(now);
    expect(dropped.removed).toBe(1);
    expect(getRecentlyDeleted().map((x) => x.id)).toEqual([recent.id]);
    expect(getVisibleActivities().map((x) => x.id)).toContain(alive.id);

    await updateActivity(recent.id, { deletedAt: new Date(now - 4 * 864e5).toISOString() });
    await reloadRepositoryForTests();
    expect(getRecentlyDeleted().find((x) => x.id === recent.id)).toBeUndefined();
    expect(getRecentlyDeleted().find((x) => x.id === stale.id)).toBeUndefined();
    expect(getVisibleActivities().find((x) => x.id === alive.id)).toBeTruthy();
    await reloadRepositoryForTests();
    expect(getRecentlyDeleted().map((x) => x.id)).not.toContain(recent.id);
  });

  it('counts whole days left in recently deleted', () => {
    const now = Date.parse('2026-10-20T16:00:00.000Z');
    expect(trashDaysLeft(new Date(now).toISOString(), now)).toBe(3);
    expect(trashDaysLeft(new Date(now - 2 * 864e5).toISOString(), now)).toBe(1);
    expect(trashDaysLeft(new Date(now - 3 * 864e5).toISOString(), now)).toBe(0);
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

  it('undoLogAt removes only that timestamp and keeps later backfills', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Hist', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    const logged = await logActivityNow(a.id, '2026-10-17T12:00:00.000Z');
    await backfillHistory(a.id, '2026-08-01T00:00:00.000Z');
    let row = getVisibleActivities()[0];
    expect(row.history.map((e) => e.at)).toEqual([
      '2026-10-17T12:00:00.000Z',
      '2026-09-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    ]);
    await undoLogAt(a.id, logged.loggedAt);
    row = getVisibleActivities()[0];
    expect(row.history.map((e) => e.at)).toEqual([
      '2026-09-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    ]);
    expect(row.lastDoneAt).toBe('2026-09-01T00:00:00.000Z');
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

  it('logActivityOnDay skips a second write on the same local calendar day', async () => {
    await resetRepositoryForTests();
    const seed = new Date(2026, 8, 1, 9, 0, 0).toISOString();
    const a = await addActivity({ title: 'Windows', lastDoneAt: seed });
    const y1 = new Date(2026, 9, 19, 16, 0, 0).toISOString();
    const y2 = new Date(2026, 9, 19, 16, 0, 0, 50).toISOString();
    const first = await logActivityOnDay(a.id, y1);
    expect(first.skipped).toBe(false);
    const second = await logActivityOnDay(a.id, y2);
    expect(second.skipped).toBe(true);
    const row = getVisibleActivities()[0];
    expect(row.history).toHaveLength(2);
    expect(row.history.filter((e) => sameLocalDay(e.at, y1))).toHaveLength(1);
  });

  it('does not offer undo when a same-day duplicate log was skipped', async () => {
    await resetRepositoryForTests();
    const last = new Date(2026, 9, 14, 8, 0, 0).toISOString();
    const a = await addActivity({ title: 'SkipUndo', lastDoneAt: last });
    const skipped = await logActivityNow(a.id, new Date(2026, 9, 14, 12, 0, 0).toISOString());
    expect(skipped.skipped).toBe(true);
    expect(undoHandlerForLog(a.id, skipped)).toBeNull();
    expect(getVisibleActivities()[0].history).toHaveLength(1);
    expect(getVisibleActivities()[0].lastDoneAt).toBe(last);
  });

  it('undo after a log removes only that stamp so later writes survive the toast', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Toast race', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    const logged = await logActivityNow(a.id, '2026-10-17T12:00:00.000Z');
    expect(logged.skipped).toBe(false);
    const undo = undoHandlerForLog(a.id, logged);
    expect(typeof undo).toBe('function');
    await backfillHistory(a.id, '2026-08-01T00:00:00.000Z');
    await undo();
    const row = getVisibleActivities()[0];
    expect(row.history.map((e) => e.at)).toEqual([
      '2026-09-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    ]);
  });

  it('clamps future timestamps to now on log, backfill, and update', async () => {
    await resetRepositoryForTests();
    const future = '2099-06-01T00:00:00.000Z';
    expect(Date.parse(clampIsoToNow(future))).toBeLessThanOrEqual(Date.now());
    expect(clampIsoToNow('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');

    const a = await addActivity({ title: 'Future log' });
    const before = Date.now();
    const logged = await logActivityAt(a.id, future);
    const after = Date.now();
    const loggedMs = Date.parse(logged.loggedAt);
    expect(loggedMs).toBeGreaterThanOrEqual(before);
    expect(loggedMs).toBeLessThanOrEqual(after);
    expect(getVisibleActivities()[0].history.some((e) => e.at === future)).toBe(false);
    expect(getVisibleActivities()[0].lastDoneAt).toBe(logged.loggedAt);

    const onDay = await logActivityOnDay(a.id, '2099-07-01T00:00:00.000Z');
    expect(onDay.skipped).toBe(true);
    expect(getVisibleActivities()[0].history).toHaveLength(1);

    await resetRepositoryForTests();
    const b = await addActivity({ title: 'Future backfill' });
    const bBefore = Date.now();
    await backfillHistory(b.id, future);
    const bRow = getVisibleActivities()[0];
    expect(bRow.history.some((e) => e.at === future)).toBe(false);
    expect(Date.parse(bRow.lastDoneAt)).toBeGreaterThanOrEqual(bBefore);
    expect(Date.parse(bRow.lastDoneAt)).toBeLessThanOrEqual(Date.now());

    await resetRepositoryForTests();
    const c = await addActivity({ title: 'Future lastDone' });
    await updateActivity(c.id, { lastDoneAt: future });
    const patched = getVisibleActivities()[0];
    expect(patched.lastDoneAt).not.toBe(future);
    expect(Date.parse(patched.lastDoneAt)).toBeLessThanOrEqual(Date.now());

    await resetRepositoryForTests();
    const d = await addActivity({ title: 'Future hist' });
    await updateActivity(d.id, { history: [{ at: '2026-01-01T00:00:00.000Z' }, { at: future }] });
    const hist = getVisibleActivities()[0].history;
    expect(hist.some((e) => e.at === future)).toBe(false);
    expect(hist.some((e) => e.at === '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(Date.parse(hist[0].at)).toBeLessThanOrEqual(Date.now());
  });

  it('clamps initial lastDoneAt on create/add and dedupes same-day after a future clamp', async () => {
    const future = '2099-06-01T00:00:00.000Z';
    const made = createActivity({ title: 'Seed future', lastDoneAt: future });
    expect(made.lastDoneAt).not.toBe(future);
    expect(Date.parse(made.lastDoneAt)).toBeLessThanOrEqual(Date.now());
    expect(made.history).toHaveLength(1);

    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Add future', lastDoneAt: future });
    expect(a.lastDoneAt).not.toBe(future);
    expect(Date.parse(a.lastDoneAt)).toBeLessThanOrEqual(Date.now());

    await resetRepositoryForTests();
    const morning = new Date();
    morning.setHours(8, 0, 0, 0);
    const b = await addActivity({ title: 'Same day clamp', lastDoneAt: morning.toISOString() });
    await updateActivity(b.id, {
      history: [{ at: morning.toISOString() }, { at: future }],
    });
    const row = getVisibleActivities()[0];
    expect(row.history).toHaveLength(1);
    expect(row.history.some((e) => e.at === future)).toBe(false);
    expect(sameLocalDay(row.lastDoneAt, new Date().toISOString())).toBe(true);
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
