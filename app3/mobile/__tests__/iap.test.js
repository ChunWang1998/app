import { purchaseProUnlock, restoreProUnlock, verifyProOnLaunch } from '../src/lib/iap';
import { isProUnlocked, clearProUnlocked, setProUnlocked } from '../src/lib/entitlements';

describe('iap', () => {
  beforeEach(async () => {
    await clearProUnlocked();
  });

  it('simulates purchase in test env', async () => {
    const result = await purchaseProUnlock();
    expect(result.ok).toBe(true);
    const pro = await isProUnlocked();
    expect(pro).toBe(true);
  });

  it('simulates restore in test env', async () => {
    const result = await restoreProUnlock();
    expect(result.ok).toBe(true);
  });

  it('does not revoke Pro on launch in IAP_SIMULATE mode', async () => {
    await setProUnlocked(true);
    await verifyProOnLaunch();
    expect(await isProUnlocked()).toBe(true);
  });
});
