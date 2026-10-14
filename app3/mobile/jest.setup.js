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

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async () => {}),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success' },
}));

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

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(async () => { throw new Error('no file'); }),
  writeAsStringAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  copyAsync: jest.fn(async () => {}),
  downloadAsync: jest.fn(async () => {}),
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
