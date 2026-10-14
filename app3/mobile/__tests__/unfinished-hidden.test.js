const fs = require('fs');
const path = require('path');

describe('v1.0 hides unfinished entry points', () => {
  const nav = fs.readFileSync(path.join(__dirname, '../src/navigation/AppNavigator.js'), 'utf8');
  const settings = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.js'), 'utf8');
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));

  it('does not ship Reminder or RecentlyDeleted screens', () => {
    expect(nav).not.toMatch(/ReminderScreen/);
    expect(nav).not.toMatch(/RecentlyDeleted/);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/ReminderScreen.js'))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/RecentlyDeletedScreen.js'))).toBe(false);
  });

  it('does not depend on expo-notifications', () => {
    const plugins = JSON.stringify(appJson.expo.plugins || []);
    expect(plugins).not.toMatch(/expo-notifications/);
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    expect(pkg.dependencies['expo-notifications']).toBeUndefined();
    expect(fs.existsSync(path.join(__dirname, '../src/notifications'))).toBe(false);
  });

  it('does not expose import/export in Settings', () => {
    expect(settings).not.toMatch(/匯出/);
    expect(settings).not.toMatch(/匯入/);
    expect(settings).toMatch(/恢復購買/);
    expect(settings).toMatch(/小工具/);
    expect(settings).toMatch('chunwang1998.github.io/app/app3/store/privacy.html');
    expect(settings).toMatch('chunwang1998.github.io/app/app3/store/support.html');
  });

  it('list header has settings and add, not a persistent 刪 button', () => {
    expect(home).toMatch(/GearIcon/);
    expect(home).toMatch(/PlusIcon/);
    expect(home).toMatch(/Swipeable/);
    expect(home).not.toMatch(/styles\.del/);
  });

  it('locks UI to light', () => {
    expect(appJson.expo.userInterfaceStyle).toBe('light');
  });

  it('gates demo and screen query params behind __DEV__', () => {
    const app = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
    expect(app).toMatch(/__DEV__/);
    expect(app).toMatch(/searchParams\.get\('demo'\)/);
    expect(app).toMatch(/searchParams\.get\('screen'\)/);
  });
});
