const fs = require('fs');
const path = require('path');

describe('DetailScreen has no hardcoded stats', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/screens/DetailScreen.js'), 'utf8');
  it('does not render placeholder totals', () => {
    expect(src).not.toMatch(/總次數/);
    expect(src).not.toMatch(/14\.1/);
    expect(src).not.toMatch(/<Small>/);
  });
});
