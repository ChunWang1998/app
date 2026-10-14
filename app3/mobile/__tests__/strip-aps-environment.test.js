const fs = require('fs');
const path = require('path');

const pluginPath = path.join(__dirname, '../plugins/with-strip-aps-environment.js');
const appJsonPath = path.join(__dirname, '../app.json');

describe('strip aps-environment plugin', () => {
  it('is registered last after expo-notifications', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const plugins = appJson.expo.plugins;
    expect(plugins).toContain('expo-notifications');
    expect(plugins[plugins.length - 1]).toBe('./plugins/with-strip-aps-environment');
  });

  it('uses withEntitlementsPlist to delete aps-environment', () => {
    const src = fs.readFileSync(pluginPath, 'utf8');
    expect(src).toMatch(/withEntitlementsPlist/);
    expect(src).toMatch(/delete\s+\w+\.modResults\['aps-environment'\]/);
  });

  it('deletes aps-environment from the entitlements plist', () => {
    let captured;
    jest.isolateModules(() => {
      jest.doMock('expo/config-plugins', () => ({
        withEntitlementsPlist: (cfg, fn) => {
          captured = fn({
            ...cfg,
            modResults: { 'aps-environment': 'production', 'com.apple.developer.applesignin': [] },
          });
          return captured;
        },
      }));
      const plugin = require(pluginPath);
      expect(typeof plugin).toBe('function');
      plugin({ name: 'Been Ages' });
    });
    expect(captured.modResults['aps-environment']).toBeUndefined();
    expect(captured.modResults['com.apple.developer.applesignin']).toEqual([]);
  });
});
