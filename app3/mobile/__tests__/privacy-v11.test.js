const fs = require('fs');
const path = require('path');

describe('v1.1 privacy copy', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../store/privacy.html'), 'utf8');

  it('documents write-only calendar, widgets, and share cards', () => {
    expect(html).toMatch(/只寫入/);
    expect(html).toMatch(/不會讀取/);
    expect(html).toMatch(/小工具/);
    expect(html).toMatch(/小工具讀取項目清單與完整版狀態/);
    expect(html).toMatch(/只會記在這支 iPhone 上，不會傳到外面/);
    expect(html).toMatch(/Widgets read your item list and Pro status/);
    expect(html).toMatch(/分享卡片/);
    expect(html).toMatch(/write-only/i);
    expect(html).toMatch(/最近刪除/);
  });

  it('does not mention import, export, or hide-names', () => {
    expect(html).not.toMatch(/匯出/);
    expect(html).not.toMatch(/匯入/);
    expect(html).not.toMatch(/隱藏名稱/);
    expect(html).not.toMatch(/hide-names/i);
    expect(html).not.toMatch(/JSON 或 CSV/);
  });

  it('says local notifications, not no push at all', () => {
    expect(html).toMatch(/使用本機通知，沒有遠端推播/);
    expect(html).not.toMatch(/不使用推播通知/);
  });
});
