import { initRepository, resetRepositoryForTests, addActivity, logActivityNow, softDeleteActivity, undoDelete, exportToJson, importFromJson, FREE_ACTIVITY_LIMIT } from '../src/data/repository';
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
});
