const fs = require('fs');
const path = require('path');
const app = require('../app.json');
const eas = require('../eas.json');
const pkg = require('../package.json');

describe('placeholders and Expo Go constraints', () => {
  it('uses placeholder bundle ids and EAS projectId', () => {
    expect(app.expo.ios.bundleIdentifier).toBe('com.example.decibelmeter');
    expect(app.expo.android.package).toBe('com.example.decibelmeter');
    expect(app.expo.extra.eas.projectId).toBe('00000000-0000-0000-0000-000000000000');
    expect(app.expo.owner).toBeUndefined();
  });

  it('does not embed submit secrets or a real ASC app id', () => {
    expect(eas.submit).toBeUndefined();
    const text = JSON.stringify(eas);
    expect(text).not.toMatch(/appleTeamId|ascApiKey|ascAppId/i);
  });

  it('declares microphone via the expo-audio plugin and disables background capture', () => {
    const audio = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-audio');
    expect(audio[1].recordAudioAndroid).toBe(true);
    expect(audio[1].enableBackgroundRecording).toBe(false);
    expect(audio[1].enableBackgroundPlayback).toBe(false);
    expect(audio[1].microphonePermission).toMatch(/estimate sound level/i);
    expect(audio[1].microphonePermission.toLowerCase()).toMatch(/processed on-device/);
    expect(audio[1].microphonePermission.toLowerCase()).toMatch(/deleted right after/);
    expect(app.expo.ios.infoPlist.NSMicrophoneUsageDescription).toMatch(/estimate sound level/i);
  });

  it('stays on Expo SDK 57 with no extra native modules', () => {
    expect(pkg.dependencies.expo).toMatch(/57/);
    expect(pkg.dependencies['expo-audio']).toBeTruthy();
    expect(pkg.dependencies['expo-file-system']).toBeTruthy();
    expect(pkg.dependencies['react-native-live-audio-fft']).toBeUndefined();
    expect(pkg.dependencies['react-native-audio-api']).toBeUndefined();
    expect(pkg.dependencies['expo-av']).toBeUndefined();
    expect(pkg.dependencies['expo-iap']).toBeUndefined();
  });

  it('enables recorder metering and pauses when the app backgrounds', () => {
    const hook = fs.readFileSync(path.join(__dirname, '../src/hooks/useMetering.js'), 'utf8');
    expect(hook).toMatch(/isMeteringEnabled:\s*true/);
    expect(hook).toMatch(/useAudioRecorderState/);
    expect(hook).toMatch(/AppState\.addEventListener/);
    expect(hook).toMatch(/recorder\.pause\(/);
  });
});
