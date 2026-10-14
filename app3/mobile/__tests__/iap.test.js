import { Platform } from 'react-native';
import {
  purchaseProUnlock,
  restoreProUnlock,
  verifyProOnLaunch,
  getProDisplayPrice,
  startPurchaseUpdates,
  stopPurchaseUpdates,
  grantFullpackPurchase,
  canPresentRedeemCode,
  presentRedeemCodeSheet,
  allowSimulate,
} from '../src/lib/iap';
import { isProUnlocked, clearProUnlocked, setProUnlocked, subscribePro, getEmptyPurchaseStreak } from '../src/lib/entitlements';

const FULLPACK = process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack';

describe('iap', () => {
  beforeEach(async () => {
    await stopPurchaseUpdates();
    process.env.EXPO_PUBLIC_IAP_SIMULATE = '1';
    delete process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
    delete process.env.EAS_BUILD_PROFILE;
    const iap = require('expo-iap');
    iap.__resetIapMock?.();
    iap.finishTransaction.mockClear();
    iap.purchaseUpdatedListener.mockClear();
    iap.presentCodeRedemptionSheet.mockClear();
    iap.presentCodeRedemptionSheetIOS.mockClear();
    iap.isTransactionVerifiedIOS.mockReset();
    iap.isTransactionVerifiedIOS.mockResolvedValue(true);
    await clearProUnlocked();
  });

  afterEach(async () => {
    await stopPurchaseUpdates();
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

  it('registers a persistent purchase listener at app start', async () => {
    const iap = require('expo-iap');
    const app = require('fs').readFileSync(require('path').join(__dirname, '../src/App.js'), 'utf8');
    expect(app).toMatch(/startPurchaseUpdates/);
    await startPurchaseUpdates();
    expect(iap.initConnection).toHaveBeenCalled();
    expect(iap.purchaseUpdatedListener).toHaveBeenCalled();
  });

  it('unlocks Pro from a fullpack purchase-updated event and finishes the transaction', async () => {
    const iap = require('expo-iap');
    await startPurchaseUpdates();
    expect(await isProUnlocked()).toBe(false);
    const unlocked = new Promise((resolve) => {
      const unsub = subscribePro((v) => {
        if (v) {
          unsub();
          resolve();
        }
      });
    });
    iap.__emitPurchaseUpdated({ productId: FULLPACK });
    await unlocked;
    expect(await isProUnlocked()).toBe(true);
    expect(iap.finishTransaction).toHaveBeenCalledWith({
      purchase: { productId: FULLPACK },
      isConsumable: false,
    });
    expect(iap.isTransactionVerifiedIOS).toHaveBeenCalledWith(FULLPACK);
  });

  it('ignores purchase-updated events for other products', async () => {
    const iap = require('expo-iap');
    await startPurchaseUpdates();
    expect(await grantFullpackPurchase({ productId: 'com.other.app.sku' })).toBe(false);
    iap.__emitPurchaseUpdated({ productId: 'com.other.app.sku' });
    await new Promise((r) => setImmediate(r));
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('does not unlock when the transaction check fails', async () => {
    const iap = require('expo-iap');
    iap.isTransactionVerifiedIOS.mockResolvedValue(false);
    await startPurchaseUpdates();
    expect(await grantFullpackPurchase({ productId: FULLPACK })).toBe(false);
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('fails closed when isTransactionVerifiedIOS throws', async () => {
    const iap = require('expo-iap');
    iap.isTransactionVerifiedIOS.mockRejectedValue(new Error('storekit'));
    expect(await grantFullpackPurchase({ productId: FULLPACK })).toBe(false);
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('fails closed when isTransactionVerifiedIOS returns undefined or null', async () => {
    const iap = require('expo-iap');
    iap.isTransactionVerifiedIOS.mockResolvedValue(undefined);
    expect(await grantFullpackPurchase({ productId: FULLPACK })).toBe(false);
    iap.isTransactionVerifiedIOS.mockResolvedValue(null);
    expect(await grantFullpackPurchase({ productId: FULLPACK })).toBe(false);
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('fails closed when isTransactionVerifiedIOS is missing', async () => {
    const iap = require('expo-iap');
    const orig = iap.isTransactionVerifiedIOS;
    iap.isTransactionVerifiedIOS = undefined;
    try {
      expect(await grantFullpackPurchase({ productId: FULLPACK })).toBe(false);
      expect(await isProUnlocked()).toBe(false);
      expect(iap.finishTransaction).not.toHaveBeenCalled();
    } finally {
      iap.isTransactionVerifiedIOS = orig;
    }
  });

  it('rejects a transaction with revocationDate and does not finish it', async () => {
    const iap = require('expo-iap');
    expect(await grantFullpackPurchase({
      productId: FULLPACK,
      revocationDate: '2026-10-01T00:00:00.000Z',
    })).toBe(false);
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
    expect(iap.isTransactionVerifiedIOS).not.toHaveBeenCalled();
  });

  it('does not report purchase success unless grantFullpackPurchase unlocks Pro', async () => {
    const iap = require('expo-iap');
    iap.isTransactionVerifiedIOS.mockResolvedValue(false);
    const result = await purchaseProUnlock();
    expect(result.ok).toBe(false);
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('shows Redeem Code next to Restore on iOS only', () => {
    const paywall = require('fs').readFileSync(require('path').join(__dirname, '../src/screens/PaywallScreen.js'), 'utf8');
    const settings = require('fs').readFileSync(require('path').join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
    expect(paywall).toMatch(/settings\.redeem/);
    expect(paywall).toMatch(/canPresentRedeemCode/);
    expect(paywall).toMatch(/presentRedeemCodeSheet/);
    expect(settings).toMatch(/settings\.redeem/);
    expect(settings).toMatch(/canPresentRedeemCode/);
    expect(settings).toMatch(/presentRedeemCodeSheet/);
    expect(canPresentRedeemCode('ios')).toBe(true);
    expect(canPresentRedeemCode('android')).toBe(false);
    expect(canPresentRedeemCode('web')).toBe(false);
  });

  it('presents the App Store code redemption sheet on iOS', async () => {
    const iap = require('expo-iap');
    expect(Platform.OS).toBe('ios');
    const r = await presentRedeemCodeSheet();
    expect(r.ok).toBe(true);
    expect(iap.presentCodeRedemptionSheet).toHaveBeenCalled();
  });

  it('restore unlocks only when a matching purchase verifies', async () => {
    const iap = require('expo-iap');
    iap.getAvailablePurchases.mockResolvedValueOnce([
      { productId: 'com.other.app.sku' },
      { productId: FULLPACK },
    ]);
    const r = await restoreProUnlock();
    expect(r).toEqual({ ok: true, restored: true });
    expect(await isProUnlocked()).toBe(true);
    expect(iap.isTransactionVerifiedIOS).toHaveBeenCalledWith(FULLPACK);
  });

  it('restore skips revoked and unverified matches', async () => {
    const iap = require('expo-iap');
    iap.getAvailablePurchases.mockResolvedValueOnce([
      { productId: FULLPACK, revocationDate: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(await restoreProUnlock()).toEqual({ ok: true, restored: false });
    expect(await isProUnlocked()).toBe(false);

    iap.getAvailablePurchases.mockResolvedValueOnce([{ productId: FULLPACK }]);
    iap.isTransactionVerifiedIOS.mockResolvedValueOnce(false);
    expect(await restoreProUnlock()).toEqual({ ok: true, restored: false });
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('verifyProOnLaunch grants a verified match and treats unverified as empty', async () => {
    const iap = require('expo-iap');
    process.env.EXPO_PUBLIC_IAP_SIMULATE = '0';

    iap.getAvailablePurchases.mockResolvedValueOnce([{ productId: FULLPACK }]);
    await verifyProOnLaunch();
    expect(await isProUnlocked()).toBe(true);
    expect(await getEmptyPurchaseStreak()).toBe(0);

    await setProUnlocked(true);
    iap.getAvailablePurchases.mockResolvedValue([
      { productId: FULLPACK, revocationDate: '2026-01-01T00:00:00.000Z' },
    ]);
    await verifyProOnLaunch();
    expect(await getEmptyPurchaseStreak()).toBe(1);
    expect(await isProUnlocked()).toBe(true);
    await verifyProOnLaunch();
    expect(await getEmptyPurchaseStreak()).toBe(2);
    expect(await isProUnlocked()).toBe(true);
    await verifyProOnLaunch();
    expect(await getEmptyPurchaseStreak()).toBe(3);
    expect(await isProUnlocked()).toBe(false);
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('never enables IAP simulation on the production profile', () => {
    const eas = require('../eas.json');
    expect(eas.build.production.env.EXPO_PUBLIC_IAP_SIMULATE).toBeUndefined();
    expect(JSON.stringify(eas.build.production)).not.toMatch(/IAP_SIMULATE/);
    expect(eas.build.production.env.EXPO_PUBLIC_EAS_BUILD_PROFILE).toBe('production');
    expect(eas.build.preview.env.EXPO_PUBLIC_IAP_SIMULATE).toBe('1');

    process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE = 'production';
    process.env.EXPO_PUBLIC_IAP_SIMULATE = '1';
    expect(allowSimulate()).toBe(false);

    const src = require('fs').readFileSync(require('path').join(__dirname, '../src/lib/iap.js'), 'utf8');
    expect(src).toMatch(/easBuildProfile\(\) === 'production'/);
    expect(src).toMatch(/__DEV__/);
  });
});
