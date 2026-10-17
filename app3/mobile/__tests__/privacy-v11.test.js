const fs = require('fs');
const path = require('path');

describe('v1.1 privacy copy', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../store/privacy.html'), 'utf8');

  it('documents write-only calendar and share cards', () => {
    expect(html).toMatch(/只寫入/);
    expect(html).toMatch(/不會讀取/);
    expect(html).not.toMatch(/小工具/);
    expect(html).not.toMatch(/Widgets read/);
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

  it('documents on-device microphone and speech', () => {
    expect(html).toMatch(/麥克風與語音辨識都在你的裝置上進行/);
    expect(html).toMatch(/不使用 Apple 的雲端辨識/);
    expect(html).toMatch(/Microphone and speech recognition run on your iPhone/);
    expect(html).toMatch(/never use Apple's speech servers/);
    expect(html).toMatch(/音声入力/);
    expect(html).toMatch(/Apple のクラウド音声認識は使いません/);
  });

  it('says AI-added items stay on device', () => {
    expect(html).toMatch(/透過 AI 輸入新增的項目與紀錄，一樣只存在你的裝置/);
    expect(html).toMatch(/Items and records you add through AI input are stored on your device as usual/);
    expect(html).toMatch(/AI入力で追加した項目と記録は、いつもどおりこの端末に保存されます/);
  });
});
