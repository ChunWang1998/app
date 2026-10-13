const fs = require('fs');
const path = require('path');

describe('DetailScreen uses real history stats', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/screens/DetailScreen.js'), 'utf8');
  it('derives totals from historyStats, not placeholders', () => {
    expect(src).toMatch(/historyStats/);
    expect(src).toMatch(/總次數/);
    expect(src).not.toMatch(/14\.1/);
    expect(src).not.toMatch(/<Small>/);
  });
});
