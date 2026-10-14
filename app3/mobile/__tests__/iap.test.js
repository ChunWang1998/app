import { purchaseProUnlock, restoreProUnlock, verifyProOnLaunch, getProDisplayPrice } from '../src/lib/iap';
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

  it('reads StoreKit displayPrice and never hardcodes a fallback', async () => {
    const price = await getProDisplayPrice();
    expect(price).toBe('NT$90');
    const paywall = require('fs').readFileSync(require('path').join(__dirname, '../src/screens/PaywallScreen.js'), 'utf8');
    expect(paywall).not.toMatch(/NT\$90/);
    expect(paywall).not.toMatch(/US\$2\.99/);
    expect(paywall).toMatch(/paywall\.once/);
    expect(paywall).toMatch(/paywall\.priceFail/);
    expect(paywall).not.toMatch(/iCloud/);
    expect(paywall).not.toMatch(/v1\.2/);
    expect(paywall).toMatch(/displayPrice|getProDisplayPrice/);
  });
});
