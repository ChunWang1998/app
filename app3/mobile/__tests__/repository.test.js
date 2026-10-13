import { initRepository, resetRepositoryForTests, addActivity, logActivityNow, undoLogActivity, softDeleteActivity, undoDelete, hardDeleteActivity, exportToJson, importFromJson, FREE_ACTIVITY_LIMIT } from '../src/data/repository';
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
    await undoLogActivity(a.id, logged.previousLastDoneAt);
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
