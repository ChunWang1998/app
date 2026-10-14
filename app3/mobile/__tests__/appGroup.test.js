import {
  APP_GROUP_ID,
  WIDGET_BUNDLE_ID,
  WIDGET_UNDO_MS,
  appendQueueLog,
  applyWidgetCheck,
  applyWidgetUndo,
  buildSnapshot,
  capActivities,
  clampWidgetCompletionTime,
  emptyQueue,
  pendingShouldCommit,
  planQueueMerge,
  queueFromPending,
  WIDGET_FUTURE_SLACK_MS,
} from '../src/data/appGroup';
import { MemoryAppGroupStore, readSnapshot, writeSnapshot, writeQueue, readQueue, clearQueue } from '../src/data/appGroupStore';

const ts = '2026-10-13T00:00:00.000Z';

function act(id, extra = {}) {
  return {
    id,
    title: id,
    icon: 'brush',
    lastDoneAt: null,
    reminderDays: 7,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
    ...extra,
  };
}

describe('App Group contract', () => {
  it('uses the approved identifiers', () => {
    expect(APP_GROUP_ID).toBe('group.com.beenages.app');
    expect(WIDGET_BUNDLE_ID).toBe('com.beenages.app.widget');
    expect(WIDGET_UNDO_MS).toBe(5000);
  });

  it('caps free users at 3 and never includes deleted rows', () => {
    const activities = [
      act('a1'), act('a2'), act('a3'), act('a4'),
      act('gone', { deletedAt: ts }),
    ];
    expect(capActivities(activities, false, 3).map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    expect(capActivities(activities, true, 3).map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('builds a snapshot the widget / Siri can read', () => {
    const snap = buildSnapshot({
      activities: [act('a1'), act('a2')],
      proUnlocked: true,
      selectedIds: { small: 'a2', medium: ['a1'] },
      freeLimit: 3,
      now: Date.parse(ts),
    });
    expect(snap.proUnlocked).toBe(true);
    expect(snap.activities).toHaveLength(2);
    expect(snap.selectedIds).toEqual({
      small: 'a2',
      medium: ['a1'],
      hideLockNames: false,
      hideHomeNames: false,
    });
    expect(snap.activities[0].deletedAt).toBeUndefined();
  });

  it('drops widget logs when not Pro so the gate is not bypassable', () => {
    const { applied, skipped } = planQueueMerge({
      logs: [{ itemId: 'a1', timestamp: ts, source: 'widget' }],
      activities: [act('a1')],
      proUnlocked: false,
    });
    expect(applied).toEqual([]);
    expect(skipped[0].reason).toBe('NOT_PRO');
  });

  it('refuses to create unknown items from the queue', () => {
    const { applied, skipped } = planQueueMerge({
      logs: [{ itemId: 'ghost', timestamp: ts, source: 'widget' }],
      activities: [act('a1')],
      proUnlocked: true,
    });
    expect(applied).toEqual([]);
    expect(skipped[0].reason).toBe('UNKNOWN_ITEM');
  });

  it('drops logs for soft-deleted items', () => {
    const { applied, skipped } = planQueueMerge({
      logs: [{ itemId: 'gone', timestamp: ts, source: 'widget' }],
      activities: [act('gone', { deletedAt: ts })],
      proUnlocked: true,
    });
    expect(applied).toEqual([]);
    expect(skipped[0].reason).toBe('UNKNOWN_ITEM');
  });

  it('clamps widget completion time to createdAt .. now+5min', () => {
    const created = Date.parse('2026-10-01T00:00:00.000Z');
    const now = Date.parse('2026-10-13T12:00:00.000Z');
    expect(clampWidgetCompletionTime('2010-01-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', now)).toBe(created);
    expect(clampWidgetCompletionTime(now + 60 * 60 * 1000, '2026-10-01T00:00:00.000Z', now)).toBe(now + WIDGET_FUTURE_SLACK_MS);
    expect(clampWidgetCompletionTime(now - 1000, '2026-10-01T00:00:00.000Z', now)).toBe(now - 1000);
  });

  it('clamps queued timestamps before applying', () => {
    const now = Date.parse('2026-10-13T12:00:00.000Z');
    const { applied } = planQueueMerge({
      logs: [{ itemId: 'a1', timestamp: '2010-01-01T00:00:00.000Z', source: 'widget' }],
      activities: [act('a1')],
      proUnlocked: true,
      now,
    });
    expect(applied[0].timestamp).toBe(ts);
  });

  it('applies logs only for existing visible items', () => {
    const { applied } = planQueueMerge({
      logs: [{ itemId: 'a1', timestamp: ts, source: 'widget' }],
      activities: [act('a1')],
      proUnlocked: true,
    });
    expect(applied).toHaveLength(1);
  });

  it('dedupes queue appends', () => {
    const q1 = appendQueueLog(emptyQueue(), { itemId: 'a1', timestamp: ts });
    const q2 = appendQueueLog(q1, { itemId: 'a1', timestamp: ts });
    expect(q2.logs).toHaveLength(1);
  });

  it('5s undo: check then undo restores props; commit after 5s', () => {
    const props = {
      isPro: true,
      items: [{ id: 'a1', title: '牙刷', lastDoneAt: null, daysNum: null, daysUnit: '天', dueClass: '' }],
      pending: null,
    };
    const t0 = 1_000_000;
    const after = applyWidgetCheck(props, 'a1', t0);
    expect(after.pending.itemId).toBe('a1');
    expect(pendingShouldCommit(after.pending, t0 + 4999)).toBe(false);
    expect(pendingShouldCommit(after.pending, t0 + 5000)).toBe(true);
    const undone = applyWidgetUndo(after);
    expect(undone.pending).toBeNull();
    expect(undone.items[0].lastDoneAt).toBeNull();
    const q = queueFromPending(after.pending);
    expect(q.logs[0].itemId).toBe('a1');
  });

  it('MemoryAppGroupStore round-trips snapshot and queue', async () => {
    const store = new MemoryAppGroupStore();
    const snap = buildSnapshot({
      activities: [act('a1'), act('a2'), act('a3'), act('a4')],
      proUnlocked: false,
      freeLimit: 3,
      now: Date.parse(ts),
    });
    await writeSnapshot(store, snap);
    const loaded = await readSnapshot(store);
    expect(loaded.activities).toHaveLength(3);
    expect(loaded.proUnlocked).toBe(false);
    await writeQueue(store, appendQueueLog(emptyQueue(), { itemId: 'a1', timestamp: ts }));
    expect((await readQueue(store)).logs).toHaveLength(1);
    await clearQueue(store);
    expect((await readQueue(store)).logs).toEqual([]);
  });
});
