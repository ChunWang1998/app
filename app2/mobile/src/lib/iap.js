import { Platform, Alert } from 'react-native';
import { setProUnlocked, isProUnlocked } from './entitlements';

const PRO_PRODUCT_ID =
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.toiletgo.app.pro';

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

function allowSimulate() {
  if (process.env.EXPO_PUBLIC_IAP_SIMULATE === '1') return true;
  if (runningInExpoGo()) return true;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return false;
}

function purchaseMatches(p) {
  return (
    p?.productId === PRO_PRODUCT_ID ||
    p?.id === PRO_PRODUCT_ID ||
    p?.sku === PRO_PRODUCT_ID ||
    (Array.isArray(p?.ids) && p.ids.includes(PRO_PRODUCT_ID))
  );
}

/**
 * Wait for StoreKit / Play Billing result via listeners (expo-iap is event-based).
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
        google: { skus: [PRO_PRODUCT_ID] },
      },
      type: 'in-app',
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
        // ignore finish errors; entitlement still granted locally
      }
    }
    await setProUnlocked(true);
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
      await setProUnlocked(true);
      return { ok: true, restored: true };
    }
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
      '開發模式模擬買斷',
      `尚未連上 App Store（或於 Expo Go）。\n模擬購買「完整資料包」？\n（正式版商品：${PRO_PRODUCT_ID}）`,
      [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '模擬購買', onPress: () => resolve(true) },
      ],
    );
  });

  if (!simulated) return { ok: false, cancelled: true };
  await setProUnlocked(true);
  return { ok: true, simulated: true };
}

/**
 * @returns {Promise<{ ok: boolean, restored: boolean, simulated?: boolean, error?: string }>}
 */
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
      Alert.alert('開發模式', '模擬「恢復購買」並解鎖？', [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '恢復', onPress: () => resolve(true) },
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
    error: Platform.OS === 'ios' ? '找不到可恢復的購買' : '無法恢復購買',
  };
}
