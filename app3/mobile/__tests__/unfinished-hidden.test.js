const fs = require('fs');
const path = require('path');

describe('v1.1 hides unfinished entry points', () => {
  const nav = fs.readFileSync(path.join(__dirname, '../src/navigation/AppNavigator.js'), 'utf8');
  const settings = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));

  it('ships Reminder but not RecentlyDeleted or widgets', () => {
    expect(nav).toMatch(/ReminderScreen/);
    expect(nav).not.toMatch(/RecentlyDeleted/);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/ReminderScreen.js'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/RecentlyDeletedScreen.js'))).toBe(false);
  });

  it('does not depend on expo-notifications yet', () => {
    const plugins = JSON.stringify(appJson.expo.plugins || []);
    expect(plugins).not.toMatch(/expo-notifications/);
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    expect(pkg.dependencies['expo-notifications']).toBeUndefined();
    expect(fs.existsSync(path.join(__dirname, '../src/notifications'))).toBe(false);
  });

  it('does not expose import/export or recently deleted in Settings', () => {
    expect(settings).not.toMatch(/匯出/);
    expect(settings).not.toMatch(/匯入/);
    expect(settings).not.toMatch(/最近刪除/);
    expect(settings).toMatch(/恢復購買/);
    expect(settings).toMatch(/顯示/);
    expect(settings).toMatch('chunwang1998.github.io/app/app3/store/privacy.html');
    expect(settings).toMatch('chunwang1998.github.io/app/app3/store/support.html');
  });

  it('list header has settings, sort and add, not a persistent 刪 button', () => {
    expect(home).toMatch(/GearIcon/);
    expect(home).toMatch(/PlusIcon/);
    expect(home).toMatch(/SortIcon/);
    expect(home).toMatch(/Swipeable/);
    expect(home).not.toMatch(/styles\.del/);
  });

  it('follows system appearance', () => {
    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
  });

  it('gates demo and screen query params behind __DEV__', () => {
    expect(app).toMatch(/__DEV__/);
    expect(app).toMatch(/searchParams\.get\('demo'\)/);
    expect(app).toMatch(/searchParams\.get\('screen'\)/);
  });
});
