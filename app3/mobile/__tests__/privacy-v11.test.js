const fs = require('fs');
const path = require('path');

describe('v1.1 privacy copy', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../store/privacy.html'), 'utf8');

  it('documents write-only calendar, widgets, share cards, and hide-names', () => {
    expect(html).toMatch(/只寫入/);
    expect(html).toMatch(/不會讀取/);
    expect(html).toMatch(/小工具/);
    expect(html).toMatch(/只讀這支 iPhone 上的項目清單與完整版狀態/);
    expect(html).toMatch(/不會傳到外面/);
    expect(html).toMatch(/分享卡片/);
    expect(html).toMatch(/隱藏名稱/);
    expect(html).toMatch(/桌面與鎖定畫面小工具/);
    expect(html).toMatch(/write-only/i);
  });

  it('says local notifications, not no push at all', () => {
    expect(html).toMatch(/使用本機通知，沒有遠端推播/);
    expect(html).not.toMatch(/不使用推播通知/);
  });
});
