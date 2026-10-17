const fs = require('fs');
const path = require('path');

describe('settings rows', () => {
  const row = fs.readFileSync(path.join(__dirname, '../src/components/SettingsRow.js'), 'utf8');

  it('vertically centers native Switch rows at 46pt', () => {
    expect(row).toMatch(/alignItems:\s*'center'/);
    expect(row).toMatch(/minHeight:\s*46/);
    expect(row).toMatch(/<Switch/);
    expect(row).not.toMatch(/from 'react-native-switch'/);
  });

  it('is used for every switch surface', () => {
    for (const rel of [
      '../src/screens/SettingsScreen.js',
      '../src/screens/ReminderScreen.js',
    ]) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      expect(src).toMatch(/SettingsRow/);
      expect(src).not.toMatch(/hideName/);
    }
    const settings = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
    const reminder = fs.readFileSync(path.join(__dirname, '../src/screens/ReminderScreen.js'), 'utf8');
    expect(settings).toMatch(/SettingsSwitch/);
    expect(reminder).toMatch(/SettingsSwitch/);
  });
});

describe('item icon from category', () => {
  it('add/edit have no item icon picker; category editor still does', () => {
    const edit = fs.readFileSync(path.join(__dirname, '../src/screens/EditScreen.js'), 'utf8');
    expect(edit).not.toMatch(/iconManual/);
    expect(edit).not.toMatch(/suggestIcon\(/);
    expect(edit).not.toMatch(/const PICKER/);
    expect(edit).toMatch(/iconForItem/);
    const cat = fs.readFileSync(path.join(__dirname, '../src/screens/CategoryEditScreen.js'), 'utf8');
    expect(cat).toMatch(/CATEGORY_ICONS/);
    expect(cat).toMatch(/setIconManual\(true\)/);
    const card = fs.readFileSync(path.join(__dirname, '../src/components/AiIntentCard.js'), 'utf8');
    const sheet = fs.readFileSync(path.join(__dirname, '../src/components/AiEditSheet.js'), 'utf8');
    expect(sheet).not.toMatch(/ItemGlyph/);
    expect(card).toMatch(/CategoryGlyph/);
    expect(card).not.toMatch(/styles\.gl, \{ backgroundColor: tone\.ac \}/);
  });
});

describe('settings version line', () => {
  it('reads the Expo app version instead of a hardcoded 1.1', () => {
    const settings = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.js'), 'utf8');
    expect(settings).toMatch(/expo-constants/);
    expect(settings).toMatch(/expoConfig\?\.version/);
    expect(settings).not.toMatch(/Been Ages 1\.1[^\d.]/);
    const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
    expect(app.expo.version).toBe('1.1.1');
  });
});
