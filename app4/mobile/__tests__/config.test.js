const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = require('../app.json');
const eas = require('../eas.json');
const pkg = require('../package.json');

function easBlob() {
  return JSON.stringify(eas);
}

describe('EAS identifiers and Expo Go constraints', () => {
  it('uses the repo bundle-id pattern, build 1, version 1.0.0, placeholder EAS projectId', () => {
    expect(app.expo.ios.bundleIdentifier).toBe('com.decibelmeter.app');
    expect(app.expo.android.package).toBe('com.decibelmeter.app');
    expect(app.expo.ios.buildNumber).toBe('1');
    expect(app.expo.version).toBe('1.0.0');
    expect(pkg.version).toBe('1.0.0');
    expect(app.expo.extra.eas.projectId).toBe('00000000-0000-0000-0000-000000000000');
    expect(app.expo.owner).toBeUndefined();
  });

  it('has development, preview, and production profiles without secrets', () => {
    expect(eas.cli.appVersionSource).toBe('local');
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.development.distribution).toBe('internal');
    expect(eas.build.preview.distribution).toBe('internal');
    expect(eas.build.preview.ios.simulator).toBe(true);
    expect(eas.build.preview.ios.image).toBe('macos-tahoe-26.5-xcode-26.6');
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(eas.build.production.ios.image).toBe('macos-tahoe-26.5-xcode-26.6');
    expect(eas.submit).toBeUndefined();
    const text = easBlob();
    expect(text).not.toMatch(/appleTeamId|ascApiKey|ascAppId|EXPO_ASC|EXPO_APPLE_TEAM|credentialsSource|secret/i);
    expect(text).not.toMatch(/\.p8|\.p12|\.mobileprovision|authKey/i);
  });

  it('declares microphone via the expo-audio plugin and disables background capture', () => {
    const audio = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-audio');
    expect(audio[1].recordAudioAndroid).toBe(true);
    expect(audio[1].enableBackgroundRecording).toBe(false);
    expect(audio[1].enableBackgroundPlayback).toBe(false);
    const mic = audio[1].microphonePermission;
    expect(mic).toMatch(/needed to measure sound level/i);
    expect(mic.toLowerCase()).toMatch(/deleted right away/);
    expect(mic.toLowerCase()).toMatch(/nothing is saved or sent/);
    expect(app.expo.ios.infoPlist.NSMicrophoneUsageDescription).toBe(mic);
  });

  it('autolinks the local iOS measurement module', () => {
    const raw = execFileSync(
      'npx',
      ['expo-modules-autolinking', 'resolve', '--platform', 'ios', '--json'],
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' },
    );
    const resolved = JSON.parse(raw);
    const names = (resolved.modules || []).map((m) => m.packageName);
    expect(names).toContain('audio-measurement-session');
    const local = resolved.modules.find((m) => m.packageName === 'audio-measurement-session');
    expect(local.pods.map((p) => p.podName)).toEqual(['AudioMeasurementSession']);
    expect(local.modules.map((m) => m.class)).toEqual(['AudioMeasurementSessionModule']);
  });

  it('keeps Expo Go working: SDK 57, no extra store native modules', () => {
    expect(pkg.dependencies.expo).toMatch(/57/);
    expect(pkg.dependencies['expo-audio']).toBeTruthy();
    expect(pkg.dependencies['expo-file-system']).toBeTruthy();
    expect(pkg.dependencies['audio-measurement-session']).toBe('file:./modules/audio-measurement-session');
    expect(pkg.dependencies['react-native-live-audio-fft']).toBeUndefined();
    expect(pkg.dependencies['react-native-audio-api']).toBeUndefined();
    expect(pkg.dependencies['expo-av']).toBeUndefined();
    expect(pkg.dependencies['expo-iap']).toBeUndefined();
  });

  it('enables recorder metering, pauses in background, and applies measurement mode after record', () => {
    const hook = fs.readFileSync(path.join(__dirname, '../src/hooks/useMetering.js'), 'utf8');
    expect(hook).toMatch(/isMeteringEnabled:\s*true/);
    expect(hook).toMatch(/useAudioRecorderState/);
    expect(hook).toMatch(/AppState\.addEventListener/);
    expect(hook).toMatch(/recorder\.pause\(/);
    expect(hook).toMatch(/isUsableMeteringSample/);
    expect(hook).toMatch(/requestRecordingPermissionsAsync/);
    expect(hook).toMatch(/tickMeter\(meterRef\.current, sample\)/);
    expect(hook).toMatch(/sessionDisplayStats\(session, offset\)/);
    expect(hook).toMatch(/applyOffset\(smoothed, offset\)/);
    expect(hook).toMatch(/recorder\.record\(\);[\s\S]*await enableMeasurementMode\(\)/);
    expect(hook).toMatch(/try \{\s*await enableMeasurementMode\(\);/);
    expect(hook).toMatch(/setAudioModeAsync hardcodes AVAudioSession mode \.default/);
  });
});
