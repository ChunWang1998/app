import { initRepository, resetRepositoryForTests, addActivity, logActivityNow, undoLogActivity, softDeleteActivity, undoDelete, hardDeleteActivity, exportToJson, exportToCsv, importFromJson, backfillHistory, getRecentlyDeleted, FREE_ACTIVITY_LIMIT } from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import React from 'react';
import TestRenderer from 'react-test-renderer';

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

    const exported = await exportToJson();
    expect(exported.schema).toBe('been-ages/export');
    const json = JSON.parse(JSON.stringify(exported));
    await importFromJson(json);
  });

  it('enforces free tier limit', async () => {
    await resetRepositoryForTests();
    // Add up to limit
    for (let i = 0; i < FREE_ACTIVITY_LIMIT; i++) {
      await addActivity({ title: `A${i}` });
    }
    await expect(addActivity({ title: 'one more' })).rejects.toHaveProperty('code', 'FREE_LIMIT');
  });

  it('pro unlock removes activity limit', async () => {
    await resetRepositoryForTests();
    // Mock pro
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(true);
    for (let i = 0; i < FREE_ACTIVITY_LIMIT + 3; i++) {
      await addActivity({ title: `P${i}` });
    }
  });

  it('export/import works for free users', async () => {
    await resetRepositoryForTests();
    for (let i = 0; i < FREE_ACTIVITY_LIMIT; i++) {
      await addActivity({ title: `F${i}` });
    }
    const blob = await exportToJson();
    expect(blob.activities.length).toBeGreaterThan(0);
    await importFromJson(JSON.parse(JSON.stringify(blob)));
  });

  it('truncates import for free users and reports truncated', async () => {
    await resetRepositoryForTests();
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const ts = new Date().toISOString();
    const activities = Array.from({ length: 6 }, (_, i) => ({
      id: `imp_${i}`,
      title: `Imported ${i}`,
      lastDoneAt: null,
      reminderDays: 7,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    }));
    const result = await importFromJson({
      schema: 'been-ages/export',
      version: 1,
      exportedAt: ts,
      activities,
    });
    expect(result.truncated).toBe(true);
    const blob = await exportToJson();
    expect(blob.activities.length).toBe(FREE_ACTIVITY_LIMIT);
  });

  it('keeps swipe-deletes in recently deleted', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Trash me' });
    await softDeleteActivity(a.id);
    const trash = getRecentlyDeleted();
    expect(trash.map((x) => x.id)).toContain(a.id);
    const csv = await exportToCsv();
    expect(csv).toMatch(/title/);
    expect(csv).not.toMatch(/Trash me/);
  });

  it('hard-deletes after the undo window', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Old' });
    await softDeleteActivity(a.id);
    await hardDeleteActivity(a.id);
    const after = await exportToJson();
    expect(after.activities.find(x => x.id === a.id)).toBeUndefined();
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
    const blob = await exportToJson();
    expect(blob.activities.find((x) => x.id === kept[0].id)).toBeUndefined();
    expect(blob.activities.length).toBe(FREE_ACTIVITY_LIMIT);
  });

  it('logs into history and can backfill / undo', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Hist', lastDoneAt: '2026-09-01T00:00:00.000Z' });
    expect(a.history[0].at).toBe('2026-09-01T00:00:00.000Z');
    const logged = await logActivityNow(a.id);
    const afterLog = await exportToJson();
    const row = afterLog.activities[0];
    expect(row.history.length).toBe(2);
    expect(row.lastDoneAt).toBe(logged.loggedAt);
    await undoLogActivity(a.id, logged.previousLastDoneAt, logged.previousHistory);
    const undone = await exportToJson();
    expect(undone.activities[0].history.length).toBe(1);
    await backfillHistory(a.id, '2026-08-01T00:00:00.000Z');
    const filled = await exportToJson();
    expect(filled.activities[0].history.some((e) => e.at === '2026-08-01T00:00:00.000Z')).toBe(true);
    expect(filled.activities[0].notes).toBe('');
  });

  it('persists icon and migrates rows without one', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: '濾心', icon: 'drop' });
    expect(a.icon).toBe('drop');
    const blob = await exportToJson();
    expect(blob.activities[0].icon).toBe('drop');
    const ts = new Date().toISOString();
    await importFromJson({
      schema: 'been-ages/export',
      version: 1,
      exportedAt: ts,
      activities: [{
        id: 'legacy_1',
        title: '舊項目',
        lastDoneAt: null,
        reminderDays: null,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      }],
    });
    const after = await exportToJson();
    const legacy = after.activities.find((x) => x.id === 'legacy_1');
    expect(legacy.icon).toBe('brush');
  });
});
