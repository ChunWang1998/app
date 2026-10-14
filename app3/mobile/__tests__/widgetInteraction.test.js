import {
  addActivity,
  getVisibleActivities,
  resetRepositoryForTests,
  softDeleteActivity,
} from '../src/data/repository';
import * as ent from '../src/lib/entitlements';
import { handleWidgetInteraction, setAppGroupStoreForTests, teardownWidgetsForTests } from '../src/widgets/sync';
import { MemoryAppGroupStore } from '../src/data/appGroupStore';
import { HOME_WIDGET_NAME } from '../src/data/appGroup';

describe('handleWidgetInteraction', () => {
  beforeEach(async () => {
    await resetRepositoryForTests();
    setAppGroupStoreForTests(new MemoryAppGroupStore());
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(true);
  });

  afterEach(() => {
    teardownWidgetsForTests();
    jest.restoreAllMocks();
  });

  it('refuses a check when not Pro', async () => {
    jest.spyOn(ent, 'isProUnlocked').mockResolvedValue(false);
    const a = await addActivity({ title: '牙刷', reminderDays: 7 });
    const r = await handleWidgetInteraction({ target: `check:${a.id}`, source: HOME_WIDGET_NAME });
    expect(r).toEqual({ skipped: 'NOT_PRO' });
    expect(getVisibleActivities().find((x) => x.id === a.id).lastDoneAt).toBeNull();
  });

  it('refuses a check on a soft-deleted item', async () => {
    const a = await addActivity({ title: '濾心', reminderDays: 7 });
    await softDeleteActivity(a.id);
    const r = await handleWidgetInteraction({ target: `check:${a.id}`, source: HOME_WIDGET_NAME });
    expect(r).toEqual({ skipped: 'UNKNOWN_ITEM' });
  });

  it('clamps a far-future widget timestamp to now+5min', async () => {
    const a = await addActivity({ title: '換牙刷', reminderDays: 90 });
    const now = Date.now();
    const r = await handleWidgetInteraction(
      { target: `check:${a.id}`, source: HOME_WIDGET_NAME, pending: { at: '2030-01-01T00:00:00.000Z' } },
      { now },
    );
    expect(r.skipped).toBeUndefined();
    expect(r.loggedAt).toBe(new Date(now + 5 * 60 * 1000).toISOString());
  });

  it('clamps a pre-createdAt widget timestamp up to createdAt', async () => {
    const a = await addActivity({ title: '換牙刷', reminderDays: 90 });
    const now = Date.now();
    const r = await handleWidgetInteraction(
      { target: `check:${a.id}`, source: HOME_WIDGET_NAME, pending: { at: '2010-01-01T00:00:00.000Z' } },
      { now },
    );
    expect(r.loggedAt).toBe(a.createdAt);
  });
});
