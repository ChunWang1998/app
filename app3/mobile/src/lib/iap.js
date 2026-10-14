import { Platform, Alert } from 'react-native';
import {
  setProUnlocked,
  isProUnlocked,
  getEmptyPurchaseStreak,
  setEmptyPurchaseStreak,
} from './entitlements';
import { t } from '../i18n';

const PRO_PRODUCT_ID =
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack';

function runningInExpoGo() {
  try {
    const Constants = require('expo-constants').default ?? require('expo-constants');
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient'
    );
  } catch {
    return false;
  }
}

function easBuildProfile() {
  return String(
    process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE || process.env.EAS_BUILD_PROFILE || '',
  );
}

/** Never true for the EAS production profile, even if the simulate flag leaks in. */
export function allowSimulate() {
  if (easBuildProfile() === 'production') return false;
  if (process.env.EXPO_PUBLIC_IAP_SIMULATE === '0') return false;
  if (typeof __DEV__ !== 'undefined' && __DEV__ === true) return true;
  if (runningInExpoGo()) return true;
  return easBuildProfile() !== ''
    && easBuildProfile() !== 'production'
    && process.env.EXPO_PUBLIC_IAP_SIMULATE === '1';
}

function purchaseMatches(p) {
  return (
    p?.productId === PRO_PRODUCT_ID ||
    p?.id === PRO_PRODUCT_ID ||
    p?.sku === PRO_PRODUCT_ID ||
    (Array.isArray(p?.ids) && p.ids.includes(PRO_PRODUCT_ID))
  );
}

let keepIapConnection = false;
let purchaseSub = null;

export function canPresentRedeemCode(os = Platform.OS) {
  return os === 'ios';
}

async function endIapIfEphemeral(iap) {
  if (keepIapConnection) return;
  try {
    await iap.endConnection?.();
  } catch {}
}

function isRevoked(purchase) {
  const d = purchase?.revocationDate ?? purchase?.revocationDateIOS;
  return d != null && d !== '';
}

/** StoreKit 2 / expo-iap transaction check. Fail closed. */
async function transactionVerified(iap, purchase) {
  if (!purchaseMatches(purchase)) return false;
  if (isRevoked(purchase)) return false;
  if (typeof iap?.isTransactionVerifiedIOS !== 'function') return false;
  try {
    const sku = purchase.productId || purchase.id || purchase.sku || PRO_PRODUCT_ID;
    const ok = await iap.isTransactionVerifiedIOS(sku);
    return ok === true;
  } catch {
    return false;
  }
}

async function hasVerifiedFullpack(iap, purchases) {
  for (const p of purchases || []) {
    if (await transactionVerified(iap, p)) return true;
  }
  return false;
}

export async function grantFullpackPurchase(purchase) {
  try {
    const iap = require('expo-iap');
    if (!(await transactionVerified(iap, purchase))) return false;
    if (typeof iap.finishTransaction === 'function') {
      try {
        await iap.finishTransaction({ purchase, isConsumable: false });
      } catch {}
    }
    await setProUnlocked(true);
    return true;
  } catch {
    return false;
  }
}

export async function startPurchaseUpdates() {
  try {
    const iap = require('expo-iap');
    if (!iap?.initConnection || typeof iap.purchaseUpdatedListener !== 'function') return;
    await iap.initConnection();
    keepIapConnection = true;
    try {
      purchaseSub?.remove?.();
    } catch {}
    purchaseSub = iap.purchaseUpdatedListener((purchase) => {
      grantFullpackPurchase(purchase).catch(() => {});
    });
  } catch {
    keepIapConnection = false;
  }
}

export async function stopPurchaseUpdates() {
  try {
    purchaseSub?.remove?.();
  } catch {}
  purchaseSub = null;
  keepIapConnection = false;
  try {
    const iap = require('expo-iap');
    await iap.endConnection?.();
  } catch {}
}

export async function presentRedeemCodeSheet() {
  if (!canPresentRedeemCode()) return { ok: false, unavailable: true };
  try {
    const iap = require('expo-iap');
    const present = (typeof iap.presentCodeRedemptionSheet === 'function' && iap.presentCodeRedemptionSheet)
      || (typeof iap.presentCodeRedemptionSheetIOS === 'function' && iap.presentCodeRedemptionSheetIOS);
    if (typeof present !== 'function') return { ok: false, unavailable: true };
    if (typeof iap.initConnection === 'function') await iap.initConnection();
    await present();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function waitForPurchaseEvent(iap, timeoutMs = 120000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try {
        subUpdate?.remove?.();
      } catch {}
      try {
        subError?.remove?.();
      } catch {}
      clearTimeout(timer);
      resolve(result);
    };

    const subUpdate = iap.purchaseUpdatedListener((purchase) => {
      if (!purchaseMatches(purchase)) return;
      finish({ ok: true, purchase });
    });
    const subError = iap.purchaseErrorListener?.((error) => {
      const msg = String(error?.message || error?.code || error || t('iap.buyFail'));
      if (/cancel|Cancel|E_USER_CANCELLED/i.test(msg)) {
        finish({ ok: false, cancelled: true });
        return;
      }
      finish({ ok: false, error: msg });
    });

    const timer = setTimeout(() => {
      finish({ ok: false, error: t('iap.timeout') });
    }, timeoutMs);
  });
}

async function tryNativePurchase() {
  const iap = require('expo-iap');
  if (!iap?.initConnection || !iap?.requestPurchase) {
    throw new Error('IAP unavailable');
  }

  await iap.initConnection();
  try {
    if (typeof iap.fetchProducts === 'function') {
      await iap.fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'in-app' });
    }

    const pending = waitForPurchaseEvent(iap);
    await iap.requestPurchase({
      request: {
        apple: { sku: PRO_PRODUCT_ID },
        google: { skus: [PRO_PRODUCT_ID] }
      },
      type: 'in-app'
    });

    const result = await pending;
    if (!result.ok) return result;
    const granted = await grantFullpackPurchase(result.purchase);
    if (!granted) return { ok: false };
    return { ok: true };
  } finally {
    await endIapIfEphemeral(iap);
  }
}

async function tryNativeRestore() {
  const iap = require('expo-iap');
  if (!iap?.initConnection || !iap?.getAvailablePurchases) {
    throw new Error('IAP unavailable');
  }

  await iap.initConnection();
  try {
    if (typeof iap.restorePurchases === 'function') {
      try {
        await iap.restorePurchases();
      } catch {
        // continue to query
      }
    }
    const purchases = await iap.getAvailablePurchases();
    if (await hasVerifiedFullpack(iap, purchases)) {
      await setProUnlocked(true);
      return { ok: true, restored: true };
    }
    return { ok: true, restored: false };
  } finally {
    await endIapIfEphemeral(iap);
  }
}

export async function purchaseProUnlock() {
  if (await isProUnlocked()) {
    return { ok: true };
  }

  try {
    return await tryNativePurchase();
  } catch (e) {
    const msg = String(e?.message || e || '');
    if (/cancel|Cancel|E_USER_CANCELLED/i.test(msg)) {
      return { ok: false, cancelled: true };
    }
    if (!allowSimulate()) {
      return { ok: false, error: msg || t('iap.buyFail') };
    }
  }

  if (!allowSimulate()) {
    return {
      ok: false,
      error: t('iap.unavailable')
    };
  }

  const simulated = await new Promise((resolve) => {
    Alert.alert(
      t('iap.simTitle'),
      t('iap.simBody', { productId: PRO_PRODUCT_ID }),
      [
        { text: t('iap.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('iap.simBuy'), onPress: () => resolve(true) }
      ]
    );
  });

  if (!simulated) return { ok: false, cancelled: true };
  await setProUnlocked(true);
  return { ok: true, simulated: true };
}

export async function restoreProUnlock() {
  if (await isProUnlocked()) {
    return { ok: true, restored: true };
  }

  try {
    return await tryNativeRestore();
  } catch (e) {
    if (!allowSimulate()) {
      return { ok: false, restored: false, error: String(e?.message || e) };
    }
  }

  if (allowSimulate()) {
    const simulated = await new Promise((resolve) => {
      Alert.alert(t('iap.devTitle'), t('iap.devRestoreBody'), [
        { text: t('iap.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('iap.restore'), onPress: () => resolve(true) }
      ]);
    });
    if (simulated) {
      await setProUnlocked(true);
      return { ok: true, restored: true, simulated: true };
    }
    return { ok: true, restored: false, simulated: true };
  }

  return {
    ok: false,
    restored: false,
    error: Platform.OS === 'ios' ? t('iap.nothingToRestore') : t('iap.cannotRestore')
  };
}

function pickDisplayPrice(product) {
  if (!product || typeof product !== 'object') return null;
  const raw = product.displayPrice || product.localizedPrice;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

/**
 * Localized one-time price from StoreKit / Play (`displayPrice`).
 * Returns null when the store is unreachable — never a hardcoded fallback.
 */
export async function getProDisplayPrice() {
  let timer;
  try {
    const iap = require('expo-iap');
    if (!iap?.initConnection || typeof iap.fetchProducts !== 'function') return null;
    await iap.initConnection();
    try {
      const products = await Promise.race([
        iap.fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'in-app' }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), 8000);
        }),
      ]);
      const list = Array.isArray(products) ? products : [];
      const match = list.find((p) => purchaseMatches(p) || p?.id === PRO_PRODUCT_ID) || list[0];
      return pickDisplayPrice(match);
    } finally {
      if (timer) clearTimeout(timer);
      await endIapIfEphemeral(iap);
    }
  } catch {
    if (timer) clearTimeout(timer);
    return null;
  }
}

const EMPTY_LIST_REVOKE_AFTER = 3;

/**
 * On launch, re-verify entitlement via getAvailablePurchases() only
 * (not restorePurchases). Grants locally when a matching purchase exists.
 * Does not revoke in IAP_SIMULATE / preview / Expo Go. An empty list can
 * mean offline or a StoreKit cache miss, so revocation requires N consecutive
 * successful empty queries.
 */
export async function verifyProOnLaunch() {
  if (allowSimulate()) {
    return;
  }
  try {
    const iap = require('expo-iap');
    if (!iap?.initConnection || !iap?.getAvailablePurchases) return;
    await iap.initConnection();
    try {
      const purchases = await iap.getAvailablePurchases();
      if (await hasVerifiedFullpack(iap, purchases)) {
        await setProUnlocked(true);
        await setEmptyPurchaseStreak(0);
        return;
      }
      const streak = (await getEmptyPurchaseStreak()) + 1;
      await setEmptyPurchaseStreak(streak);
      if (streak >= EMPTY_LIST_REVOKE_AFTER) {
        await setProUnlocked(false);
      }
    } finally {
      await endIapIfEphemeral(iap);
    }
  } catch {
    // Network / StoreKit errors: do not increment streak or revoke.
  }
}
