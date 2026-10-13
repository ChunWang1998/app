import { KeyValueStorage, loadState, STATE_KEY, CORRUPT_KEY } from '../src/data/storage';

describe('loadState', () => {
  it('backs up unreadable JSON before returning empty', async () => {
    const storage = new KeyValueStorage({ namespace: 'beenages-corrupt-test' });
    const garbage = '{"activities":[NOT JSON';
    await storage.setItem(STATE_KEY, garbage);
    const loaded = await loadState(storage);
    expect(loaded.activities).toEqual([]);
    const bak = await storage.getItem(CORRUPT_KEY);
    expect(bak).toBe(garbage);
  });

  it('does not write a backup when there is no stored state', async () => {
    const storage = new KeyValueStorage({ namespace: 'beenages-empty-test' });
    const loaded = await loadState(storage);
    expect(loaded.activities).toEqual([]);
    expect(await storage.getItem(CORRUPT_KEY)).toBeNull();
  });
});
