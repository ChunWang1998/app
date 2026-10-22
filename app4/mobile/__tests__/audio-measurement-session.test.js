import fs from 'fs';
import path from 'path';

function loadModule(os, core) {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  jest.doMock('expo-modules-core', () => core);
  return require('audio-measurement-session');
}

describe('audio-measurement-session JS wrapper', () => {
  afterEach(() => {
    jest.resetModules();
    jest.unmock('react-native');
    jest.unmock('expo-modules-core');
  });

  it('no-ops on non-iOS without throwing', async () => {
    const mod = loadModule('android', {
      requireNativeModule: () => {
        throw new Error('should not load native on android');
      },
    });
    expect(mod.isMeasurementModeAvailable()).toBe(false);
    await expect(mod.enableMeasurementMode()).resolves.toBe(false);
    await expect(mod.restoreSession()).resolves.toBe(false);
  });

  it('feature-detects a missing native module on iOS (Expo Go)', async () => {
    const mod = loadModule('ios', {
      requireOptionalNativeModule: () => null,
      requireNativeModule: () => {
        throw new Error('Cannot find native module AudioMeasurementSession');
      },
    });
    expect(mod.isMeasurementModeAvailable()).toBe(false);
    await expect(mod.enableMeasurementMode()).resolves.toBe(false);
    await expect(mod.restoreSession()).resolves.toBe(false);
  });

  it('returns false when requireNativeModule throws and optional is missing', async () => {
    const mod = loadModule('ios', {
      requireNativeModule: () => {
        throw new Error('Cannot find native module AudioMeasurementSession');
      },
    });
    expect(mod.isMeasurementModeAvailable()).toBe(false);
    await expect(mod.enableMeasurementMode()).resolves.toBe(false);
    await expect(mod.restoreSession()).resolves.toBe(false);
  });

  it('swallows native enable and restore failures', async () => {
    const mod = loadModule('ios', {
      requireOptionalNativeModule: () => ({
        enableMeasurementMode: async () => {
          throw new Error('session failed');
        },
        restoreSession: async () => {
          throw new Error('restore failed');
        },
      }),
    });
    expect(mod.isMeasurementModeAvailable()).toBe(true);
    await expect(mod.enableMeasurementMode()).resolves.toBe(false);
    await expect(mod.restoreSession()).resolves.toBe(false);
  });

  it('reports success when the native module applies and restores the mode', async () => {
    const mod = loadModule('ios', {
      requireOptionalNativeModule: () => ({
        enableMeasurementMode: async () => true,
        restoreSession: async () => true,
      }),
    });
    expect(mod.isMeasurementModeAvailable()).toBe(true);
    await expect(mod.enableMeasurementMode()).resolves.toBe(true);
    await expect(mod.restoreSession()).resolves.toBe(true);
  });
});

describe('native module source', () => {
  it('sets playAndRecord or record plus mode measurement, after expo-audio .default', () => {
    const swift = fs.readFileSync(
      path.join(__dirname, '../modules/audio-measurement-session/ios/AudioMeasurementSessionModule.swift'),
      'utf8',
    );
    expect(swift).toMatch(/mode:\s*\.measurement/);
    expect(swift).toMatch(/\.playAndRecord/);
    expect(swift).toMatch(/\.record/);
    expect(swift).toMatch(/mode: \.default/);
    expect(swift).toMatch(/after/i);
    expect(swift).toMatch(/restoreSession/);
    expect(swift).toMatch(/notifyOthersOnDeactivation/);
    expect(swift).toMatch(/setActive\(false/);
    const js = fs.readFileSync(
      path.join(__dirname, '../modules/audio-measurement-session/index.js'),
      'utf8',
    );
    expect(js).toMatch(/requireOptionalNativeModule/);
    expect(js).toMatch(/catch/);
    expect(js).toMatch(/setAudioModeAsync/);
    expect(js).toMatch(/export async function restoreSession/);
  });

  it('is iOS-only so Expo Go / Android keep the JS fallback', () => {
    const cfg = require('../modules/audio-measurement-session/expo-module.config.json');
    expect(cfg.platforms).toEqual(['ios']);
    expect(cfg.ios.modules).toEqual(['AudioMeasurementSessionModule']);
  });
});
