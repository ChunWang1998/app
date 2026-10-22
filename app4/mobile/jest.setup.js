jest.mock('expo-localization', () => ({
  locale: 'en',
  getLocales: jest.fn(() => [{ languageTag: 'en' }]),
  getCalendars: jest.fn(() => [{ uses24hourClock: true }]),
}));

jest.mock('expo-constants', () => ({
  default: {
    appOwnership: 'expo',
    executionEnvironment: 'storeClient',
  },
}));

jest.mock('expo-audio', () => ({
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(async () => {}),
    record: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(async () => {}),
    isRecording: false,
    uri: null,
  })),
  useAudioRecorderState: jest.fn(() => ({
    metering: undefined,
    isRecording: false,
    canRecord: false,
    durationMillis: 0,
  })),
  RecordingPresets: {
    LOW_QUALITY: { extension: '.m4a', sampleRate: 44100, numberOfChannels: 2, bitRate: 64000 },
    HIGH_QUALITY: { extension: '.m4a', sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 },
  },
  setAudioModeAsync: jest.fn(async () => {}),
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  getRecordingPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'undetermined' })),
}));

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
