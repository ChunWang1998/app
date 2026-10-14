// Basic jest setup for non-UI logic tests
jest.mock('expo-iap', () => {
  let purchased = false;
  const listeners = new Set();
  const sku = process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.beenages.app.fullpack';
  const emitUpdate = (purchase) => {
    purchased = true;
    for (const cb of [...listeners]) {
      try { cb(purchase); } catch {}
    }
  };
  return {
    initConnection: jest.fn(async () => {}),
    endConnection: jest.fn(async () => {}),
    fetchProducts: jest.fn(async () => [{
      id: sku,
      productId: sku,
      displayPrice: 'NT$90',
      type: 'in-app',
    }]),
    requestPurchase: jest.fn(async () => {
      setTimeout(() => {
        emitUpdate({ productId: sku });
      }, 5);
    }),
    finishTransaction: jest.fn(async () => {}),
    purchaseUpdatedListener: jest.fn((cb) => {
      listeners.add(cb);
      return { remove: () => { listeners.delete(cb); } };
    }),
    purchaseErrorListener: jest.fn(() => ({ remove: () => {} })),
    getAvailablePurchases: jest.fn(async () => (purchased ? [{ productId: sku }] : [])),
    restorePurchases: jest.fn(async () => {
      setTimeout(() => {
        emitUpdate({ productId: sku });
      }, 5);
    }),
    presentCodeRedemptionSheet: jest.fn(async () => null),
    presentCodeRedemptionSheetIOS: jest.fn(async () => null),
    isTransactionVerifiedIOS: jest.fn(async () => true),
    __emitPurchaseUpdated: emitUpdate,
    __resetIapMock: () => {
      purchased = false;
      listeners.clear();
    },
  };
});

jest.mock('expo-localization', () => ({
  locale: 'en',
  getLocales: jest.fn(() => [{ languageTag: 'en' }]),
  getCalendars: jest.fn(() => [{ uses24hourClock: true }]),
}));

jest.mock('expo-constants', () => ({
  default: {
    appOwnership: 'standalone',
    executionEnvironment: 'standalone',
  },
}));

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

jest.mock('expo-calendar', () => ({
  requestCalendarPermissions: jest.fn(async () => ({ status: 'granted', granted: true, writeOnly: true })),
  getDefaultCalendarSync: jest.fn(() => ({
    createEvent: jest.fn(async (details) => ({ id: 'evt', ...details })),
  })),
}), { virtual: true });

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  documentDirectory: '/tmp/',
  writeAsStringAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => { throw new Error('no file'); }),
  getInfoAsync: jest.fn(async () => ({ exists: false, size: 0 })),
  deleteAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  downloadAsync: jest.fn(async () => {}),
}), { virtual: true });

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///tmp/card.png'),
}), { virtual: true });

jest.mock('expo-widgets', () => {
  const mk = (name) => ({
    name,
    updateSnapshot: jest.fn(),
    updateTimeline: jest.fn(),
    reload: jest.fn(),
    getTimeline: jest.fn(async () => []),
  });
  return {
    createWidget: jest.fn((name) => mk(name)),
    addUserInteractionListener: jest.fn(() => ({ remove: jest.fn() })),
    widgetsDirectory: null,
  };
}, { virtual: true });

jest.mock('@expo/ui/swift-ui', () => ({
  Button: 'Button',
  HStack: 'HStack',
  VStack: 'VStack',
  Text: 'Text',
  Image: 'Image',
  Link: 'Link',
  Spacer: 'Spacer',
}), { virtual: true });

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  font: () => ({}),
  foregroundStyle: () => ({}),
  frame: () => ({}),
  padding: () => ({}),
}), { virtual: true });

jest.mock('expo-asset', () => ({
  Asset: { fromModule: () => ({ downloadAsync: async () => ({ localUri: null, uri: null }) }) },
}), { virtual: true });

process.env.EXPO_PUBLIC_IAP_SIMULATE = '1';

try {
  const RN = require('react-native');
  RN.Alert = RN.Alert || {};
  RN.Alert.alert = (title, message, buttons = []) => {
    const ok = buttons.find((b) => b.style !== 'cancel') || buttons[0];
    ok?.onPress?.();
  };
} catch {}

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
