// Basic jest setup for non-UI logic tests
jest.mock('expo-iap', () => {
  let purchased = false;
  let onUpdate = null;
  return {
    initConnection: jest.fn(async () => {}),
    endConnection: jest.fn(async () => {}),
    fetchProducts: jest.fn(async () => [{
      id: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack',
      productId: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack',
      displayPrice: 'NT$90',
      type: 'in-app',
    }]),
    requestPurchase: jest.fn(async () => {
      purchased = true;
      setTimeout(() => {
        onUpdate?.({ productId: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack' });
      }, 5);
    }),
    finishTransaction: jest.fn(async () => {}),
    purchaseUpdatedListener: (cb) => {
      onUpdate = cb;
      return { remove: () => { onUpdate = null; } };
    },
    purchaseErrorListener: (cb) => {
      return { remove: () => {} };
    },
    getAvailablePurchases: jest.fn(async () => (purchased ? [{ productId: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack' }] : [])),
    restorePurchases: jest.fn(async () => {
      // trigger update too
      setTimeout(() => {
        onUpdate?.({ productId: process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack' });
      }, 5);
    }),
  };
});

jest.mock('expo-constants', () => ({
  default: {
    appOwnership: 'standalone',
    executionEnvironment: 'standalone',
  },
}));

// Fonts are optional during tests
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async () => {}),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success' },
}));

// Force simulate IAP in tests
process.env.EXPO_PUBLIC_IAP_SIMULATE = '1';

// Stub Alert to auto-confirm the positive button
try {
  const RN = require('react-native');
  RN.Alert = RN.Alert || {};
  RN.Alert.alert = (title, message, buttons = []) => {
    const ok = buttons.find((b) => b.style !== 'cancel') || buttons[0];
    ok?.onPress?.();
  };
} catch {}

// In-memory AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItem: jest.fn(async (k, v) => {
      store.set(k, String(v));
    }),
    removeItem: jest.fn(async (k) => {
      store.delete(k);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
  };
});
