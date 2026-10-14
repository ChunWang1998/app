const fs = require('fs');
const path = require('path');

describe('expo-widgets config', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
  const plugin = (appJson.expo.plugins || []).find((p) => Array.isArray(p) && p[0] === 'expo-widgets');

  it('registers the approved App Group and widget bundle id', () => {
    expect(plugin).toBeTruthy();
    expect(plugin[1].bundleIdentifier).toBe('com.beenages.app.widget');
    expect(plugin[1].groupIdentifier).toBe('group.com.beenages.app');
    expect(appJson.expo.ios.entitlements['com.apple.security.application-groups']).toEqual([
      'group.com.beenages.app',
    ]);
    expect(appJson.expo.scheme).toBe('beenages');
  });

  it('ships small, medium, and lock-screen families', () => {
    const names = plugin[1].widgets.map((w) => w.name);
    expect(names).toEqual(['BeenAgesHome', 'BeenAgesLock']);
    const home = plugin[1].widgets[0];
    const lock = plugin[1].widgets[1];
    expect(home.ios.supportedFamilies).toEqual(['systemSmall', 'systemMedium']);
    expect(lock.ios.supportedFamilies).toEqual(['accessoryCircular', 'accessoryRectangular']);
    expect(home.ios.configuration.parameters.hideNames).toBeUndefined();
    expect(lock.ios.configuration.parameters.hideNames).toBeUndefined();
    const homeSrc = fs.readFileSync(path.join(__dirname, '../src/widgets/BeenAgesHome.js'), 'utf8');
    const lockSrc = fs.readFileSync(path.join(__dirname, '../src/widgets/BeenAgesLock.js'), 'utf8');
    expect(homeSrc).not.toMatch(/hideNames/);
    expect(lockSrc).not.toMatch(/hideNames/);
    expect(homeSrc).toMatch(/item\.title/);
    expect(lockSrc).toMatch(/item\.title/);
  });

  it('does not depend on Meta / IG Stories in this slice', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    expect(pkg.dependencies['react-native-share']).toBeUndefined();
  });
});
