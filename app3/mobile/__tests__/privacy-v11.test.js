const fs = require('fs');
const path = require('path');

describe('v1.1 privacy copy', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../store/privacy.html'), 'utf8');

  it('documents write-only calendar and share cards on top of main', () => {
    expect(html).toMatch(/只寫入/);
    expect(html).toMatch(/不會讀取/);
    expect(html).toMatch(/分享卡片/);
    expect(html).toMatch(/write-only/i);
  });

  it('says local notifications, not no push at all', () => {
    expect(html).toMatch(/使用本機通知，沒有遠端推播/);
    expect(html).not.toMatch(/不使用推播通知/);
  });
});
