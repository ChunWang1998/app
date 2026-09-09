import { Platform, Alert } from 'react-native';
import { isIapPaid, setIapPaid } from './entitlements';

const PRODUCT_ID =
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.linwang.app.premium';

export function iapProductId() {
  return PRODUCT_ID;
}

function runningInExpoGo() {
  try {
    const Constants =
      require('expo-constants').default ?? require('expo-constants');
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient'
    );
  } catch {
    return false;
  }
}

function allowSimulate() {
  if (process.env.EXPO_PUBLIC_IAP_SIMULATE === '1') return true;
  if (runningInExpoGo()) return true;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return false;
}

function purchaseMatches(p) {
  return (
    p?.productId === PRODUCT_ID ||
    p?.id === PRODUCT_ID ||
    p?.sku === PRODUCT_ID ||
    (Array.isArray(p?.ids) && p.ids.includes(PRODUCT_ID))
  );
}

/**
 * @param {typeof import('expo-iap')} iap
 * @param {number} timeoutMs
 */
function waitForPurchaseEvent(iap, timeoutMs = 120000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try {
        subUpdate?.remove?.();
      } catch {
        // ignore
      }
      try {
        subError?.remove?.();
      } catch {
        // ignore
      }
      clearTimeout(timer);
      resolve(result);
    };

    const subUpdate = iap.purchaseUpdatedListener((purchase) => {
      if (!purchaseMatches(purchase)) return;
      finish({ ok: true, purchase });
    });
    const subError = iap.purchaseErrorListener?.((error) => {
      const msg = String(error?.message || error?.code || error || '購買失敗');
      if (/cancel|Cancel|E_USER_CANCELLED/i.test(msg)) {
        finish({ ok: false, cancelled: true });
        return;
      }
      finish({ ok: false, error: msg });
    });

    const timer = setTimeout(() => {
      finish({ ok: false, error: '購買逾時，請稍後再試' });
    }, timeoutMs);
  });
}

async function tryNativePurchase() {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: '目前僅支援 iOS App Store 訂閱' };
  }
  const iap = require('expo-iap');
  if (!iap?.initConnection || !iap?.requestPurchase) {
    throw new Error('IAP unavailable');
  }

  await iap.initConnection();
  try {
    if (typeof iap.fetchProducts === 'function') {
      await iap.fetchProducts({ skus: [PRODUCT_ID], type: 'subs' });
    }

    const pending = waitForPurchaseEvent(iap);
    await iap.requestPurchase({
      request: {
        apple: { sku: PRODUCT_ID },
      },
      type: 'subs',
    });

    const result = await pending;
    if (!result.ok) return result;

    if (result.purchase && typeof iap.finishTransaction === 'function') {
      try {
        await iap.finishTransaction({
          purchase: result.purchase,
          isConsumable: false,
        });
      } catch {
        // entitlement still granted locally
      }
    }
    await setIapPaid(true);
    return { ok: true };
  } finally {
    try {
      await iap.endConnection?.();
    } catch {
      // ignore
    }
  }
}

async function tryNativeRestore() {
  if (Platform.OS !== 'ios') {
    return { ok: false, restored: false, error: '目前僅支援 iOS' };
  }
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
    const mine = (purchases || []).some(purchaseMatches);
    if (mine) {
      await setIapPaid(true);
      return { ok: true, restored: true };
    }
    await setIapPaid(false);
    return { ok: true, restored: false };
  } finally {
    try {
      await iap.endConnection?.();
    } catch {
      // ignore
    }
  }
}

/**
 * @returns {Promise<{ ok: boolean, simulated?: boolean, error?: string, cancelled?: boolean }>}
 */
export async function purchaseSubscription() {
  if (await isIapPaid()) {
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
      return { ok: false, error: msg || '購買失敗' };
    }
  }

  if (!allowSimulate()) {
    return {
      ok: false,
      error: '此環境無法使用內購，請使用 TestFlight 或正式版。',
    };
  }

  const simulated = await new Promise((resolve) => {
    Alert.alert(
      '開發模式模擬訂閱',
      `尚未連上 App Store（或於 Expo Go）。\n模擬訂閱「鄰汪 Premium」？\n（正式版商品：${PRODUCT_ID}）`,
      [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '模擬訂閱', onPress: () => resolve(true) },
      ],
    );
  });

  if (!simulated) return { ok: false, cancelled: true };
  await setIapPaid(true);
  return { ok: true, simulated: true };
}

/**
 * @returns {Promise<{ ok: boolean, restored: boolean, simulated?: boolean, error?: string }>}
 */
export async function restoreSubscription() {
  try {
    return await tryNativeRestore();
  } catch (e) {
    if (!allowSimulate()) {
      return { ok: false, restored: false, error: String(e?.message || e) };
    }
  }

  if (allowSimulate()) {
    const simulated = await new Promise((resolve) => {
      Alert.alert('開發模式', '模擬「恢復購買」並解鎖？', [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '恢復', onPress: () => resolve(true) },
      ]);
    });
    if (simulated) {
      await setIapPaid(true);
      return { ok: true, restored: true, simulated: true };
    }
    return { ok: true, restored: false, simulated: true };
  }

  return {
    ok: false,
    restored: false,
    error: '找不到可恢復的訂閱',
  };
}

/**
 * Present Apple's offer-code redemption sheet, then refresh entitlement.
 * @returns {Promise<{ ok: boolean, restored?: boolean, cancelled?: boolean, error?: string }>}
 */
export async function redeemOfferCode() {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: '優惠碼兌換僅支援 iOS' };
  }

  if (allowSimulate() && runningInExpoGo()) {
    const simulated = await new Promise((resolve) => {
      Alert.alert('開發模式', '模擬兌換優惠碼並解鎖一個月？', [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '模擬兌換', onPress: () => resolve(true) },
      ]);
    });
    if (!simulated) return { ok: false, cancelled: true };
    await setIapPaid(true);
    return { ok: true, restored: true };
  }

  try {
    const iap = require('expo-iap');
    if (!iap?.initConnection || !iap?.presentCodeRedemptionSheetIOS) {
      throw new Error('IAP unavailable');
    }
    await iap.initConnection();
    try {
      await iap.presentCodeRedemptionSheetIOS();
    } finally {
      try {
        await iap.endConnection?.();
      } catch {
        // ignore
      }
    }
    return restoreSubscription();
  } catch (e) {
    return { ok: false, error: String(e?.message || e || '無法開啟兌換') };
  }
}
