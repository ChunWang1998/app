import fs from 'fs';
import path from 'path';
import { openAppSettings, shouldShowSettingsHint } from '../src/lib/openSettings';

describe('openAppSettings', () => {
  it('no-ops when openSettings is missing (web)', () => {
    expect(openAppSettings(undefined)).toBe(false);
    expect(openAppSettings({})).toBe(false);
    expect(openAppSettings({ openSettings: 'nope' })).toBe(false);
  });

  it('does not throw if openSettings throws', () => {
    expect(openAppSettings({
      openSettings: () => {
        throw new Error('not implemented');
      },
    })).toBe(false);
  });

  it('calls openSettings and swallows a rejected promise', () => {
    const openSettings = jest.fn(() => Promise.reject(new Error('no settings')));
    expect(openAppSettings({ openSettings })).toBe(true);
    expect(openSettings).toHaveBeenCalled();
  });
});

describe('shouldShowSettingsHint', () => {
  it('is hidden when granted', () => {
    expect(shouldShowSettingsHint({ granted: true, canAskAgain: false })).toBe(false);
  });

  it('shows when the OS will not ask again', () => {
    expect(shouldShowSettingsHint({ granted: false, canAskAgain: false })).toBe(true);
  });

  it('shows after a re-request that is still denied', () => {
    expect(shouldShowSettingsHint({ granted: false, canAskAgain: true }, { afterRequest: true })).toBe(true);
    expect(shouldShowSettingsHint({ granted: false, canAskAgain: true })).toBe(false);
  });
});

describe('MeterScreen', () => {
  it('guards Linking.openSettings through openAppSettings', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/screens/MeterScreen.js'), 'utf8');
    expect(src).not.toMatch(/Linking\.openSettings\s*\(/);
    expect(src).toMatch(/openAppSettings\(Linking\)/);
    expect(src).toMatch(/onPress=\{meter\.start\}/);
  });
});
