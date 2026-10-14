const fs = require('fs');
const path = require('path');

describe('v1.1 privacy copy', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../store/privacy.html'), 'utf8');

  it('documents calendar write-only, widgets, and share cards', () => {
    expect(html).toMatch(/只寫入/);
    expect(html).toMatch(/不會讀取/);
    expect(html).toMatch(/小工具/);
    expect(html).toMatch(/鎖定畫面/);
    expect(html).toMatch(/App Group/);
    expect(html).toMatch(/分享卡片/);
    expect(html).toMatch(/write-only/i);
    expect(html).toMatch(/Lock Screen widgets/i);
  });
});
