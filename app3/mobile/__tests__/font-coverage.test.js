const fs = require('fs');
const path = require('path');
const { findMissingGlyphs } = require('../scripts/check-font-coverage.js');

describe('font subset coverage', () => {
  it('covers all static UI strings and keyword chips', () => {
    const missing = findMissingGlyphs();
    if (missing.length) {
      throw new Error('Missing glyphs: ' + JSON.stringify(missing.slice(0, 10)));
    }
  });

  it('scans category, icon, and reminder keyword tables', () => {
    const js = fs.readFileSync(path.join(__dirname, '../scripts/check-font-coverage.js'), 'utf8');
    const py = fs.readFileSync(path.join(__dirname, '../scripts/check-font-coverage.py'), 'utf8');
    for (const name of ['categoryKeywords', 'iconKeywords', 'reminderKeywords']) {
      expect(js).toMatch(name);
      expect(py).toMatch(name);
    }
    expect(js).toMatch('languages/de.json');
    expect(js).toMatch('languages/fr.json');
    expect(py).toMatch('de.json');
    expect(py).toMatch('fr.json');
  });
});
