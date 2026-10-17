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

describe('auto icon on create', () => {
  it('suggests until the picker is tapped and never overwrites a stored icon', () => {
    const edit = fs.readFileSync(path.join(__dirname, '../src/screens/EditScreen.js'), 'utf8');
    expect(edit).toMatch(/suggestIcon/);
    expect(edit).toMatch(/iconManual/);
    expect(edit).toMatch(/setIconManual\(true\)/);
    expect(edit).toMatch(/isNew \? 'mono'/);
    expect(edit).toMatch(/if \(!iconManual\) setIcon\(suggestIcon\(text\)\)/);
  });
});
