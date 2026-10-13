const { findMissingGlyphs } = require('../scripts/check-font-coverage.js');

describe('font subset coverage', () => {
  it('covers all static UI strings', () => {
    const missing = findMissingGlyphs();
    if (missing.length) {
      throw new Error('Missing glyphs: ' + JSON.stringify(missing.slice(0, 10)));
    }
  });
});
