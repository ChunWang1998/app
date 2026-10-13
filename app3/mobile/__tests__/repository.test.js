import { initRepository, resetRepositoryForTests, addActivity, logActivityNow, softDeleteActivity, undoDelete, exportToJson, importFromJson, FREE_ACTIVITY_LIMIT, getRecentlyDeleted } from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import React from 'react';
import TestRenderer from 'react-test-renderer';

describe('repository', () => {
  it('initializes and adds, logs, deletes, undoes', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Test A', reminderDays: 3 });
    expect(a.id).toBeTruthy();

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

  it('purges items soft-deleted over 30 days', async () => {
    await resetRepositoryForTests();
    const a = await addActivity({ title: 'Old' });
    await softDeleteActivity(a.id);
    // Manually set deletedAt to 31 days ago
    const now = Date.now();
    const thirtyOne = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();
    // Re-import state to simulate persisted data
    const blob = await exportToJson();
    const hacked = { ...blob, activities: blob.activities.map(x => x.id === a.id ? { ...x, deletedAt: thirtyOne } : x) };
    await importFromJson(hacked);
    const after = await exportToJson();
    expect(after.activities.find(x => x.id === a.id)).toBeUndefined();
  });
});
