const fs = require('fs');
const path = require('path');

describe('v1.1 ships finished entry points only', () => {
  const nav = fs.readFileSync(path.join(__dirname, '../src/navigation/AppNavigator.js'), 'utf8');
  const settings = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));

  it('ships Reminder, ShareCard, RecentlyDeleted, and WidgetPicker', () => {
    expect(nav).toMatch(/ReminderScreen/);
    expect(nav).toMatch(/ShareCardScreen/);
    expect(nav).toMatch(/RecentlyDeleted/);
    expect(nav).toMatch(/WidgetPickerScreen/);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/ReminderScreen.js'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/ShareCardScreen.js'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/RecentlyDeletedScreen.js'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../src/screens/WidgetPickerScreen.js'))).toBe(true);
  });

  it('schedules reminders with expo-notifications', () => {
    const plugins = JSON.stringify(appJson.expo.plugins || []);
    expect(plugins).toMatch(/expo-notifications/);
    expect(plugins).toMatch(/with-strip-aps-environment/);
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    expect(pkg.dependencies['expo-notifications']).toBeDefined();
    expect(fs.existsSync(path.join(__dirname, '../src/notifications/reminders.js'))).toBe(true);
    const reminders = fs.readFileSync(path.join(__dirname, '../src/notifications/reminders.js'), 'utf8');
    const reminderScreen = fs.readFileSync(path.join(__dirname, '../src/screens/ReminderScreen.js'), 'utf8');
    expect(reminderScreen).toMatch(/requestNotificationPermissions/);
    expect(reminders).toMatch(/async function enforceReminderBudget/);
    expect(reminders).not.toMatch(/enforceReminderBudget[\s\S]*requestPermissionsAsync/);
  });

  it('exposes recently deleted, widgets, and privacy in Settings', () => {
    expect(settings).toMatch(/settings\.recentlyDeleted/);
    expect(settings).toMatch(/settings\.widgets/);
    expect(settings).toMatch(/settings\.display/);
    expect(settings).toMatch(/settings\.restore/);
    expect(settings).toMatch(/settings\.notifyWithName/);
    expect(settings).toMatch(/settings\.privacy/);
    expect(settings).not.toMatch(/settings\.export/);
    expect(settings).not.toMatch(/settings\.import/);
    expect(settings).not.toMatch(/settings\.contact/);
    expect(settings).not.toMatch(/settings\.support/);
    expect(settings).not.toMatch(/hideName/);
    expect(settings).toMatch('chunwang1998.github.io/app/app3/store/privacy.html');
    expect(settings).not.toMatch('chunwang1998.github.io/app/app3/store/support.html');
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

  it('does not ship import/export modules or UI', () => {
    expect(fs.existsSync(path.join(__dirname, '../src/data/csv.js'))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, '../src/data/importLimit.js'))).toBe(false);
    const repo = fs.readFileSync(path.join(__dirname, '../src/data/repository.js'), 'utf8');
    expect(repo).not.toMatch(/exportToCsv|exportToJson|importFromJson/);
  });
});
