/**
 * Headless screenshots for v1.1 review (react-native-web).
 * Usage: BASE=http://localhost:8081 node scripts/capture-screens.js
 */
const { chromium } = require('/tmp/pw/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:8081';
const OUT = process.env.OUT || '/opt/cursor/artifacts';
const W = 393;
const H = 852;

async function shot(page, name, url) {
  const dest = path.join(OUT, `${name}.png`);
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: dest, type: 'png' });
  console.log('wrote', dest);
  return dest;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({
    viewport: { width: W, height: H, deviceScaleFactor: 2 },
    deviceScaleFactor: 2,
  });

  await shot(page, 'v11-list-zh', '/?demo=1&screen=Home&lang=zh-Hant&mode=light');
  await shot(page, 'v11-list-ja', '/?demo=1&screen=Home&lang=ja&mode=light');
  await shot(page, 'v11-list-en', '/?demo=1&screen=Home&lang=en&mode=light');
  await shot(page, 'v11-edit-zh', '/?demo=1&screen=Edit&lang=zh-Hant&mode=light');
  await shot(page, 'v11-detail-zh', '/?demo=1&screen=Detail&lang=zh-Hant&mode=light');
  await shot(page, 'v11-settings-zh', '/?demo=1&screen=Settings&lang=zh-Hant&mode=light');
  await shot(page, 'v11-widgets-zh', '/?demo=1&screen=WidgetPicker&lang=zh-Hant&mode=light');
  await shot(page, 'v11-paywall-zh', '/?demo=1&screen=Paywall&lang=zh-Hant&mode=light');

  await shot(page, 'v11-add-auto-icon-zh', '/?demo=1&screen=EditNew&lang=zh-Hant&mode=light');
  const keywords = require('../src/lib/iconKeywords.json');
  const autoTitle = keywords.find((r) => r.keys.includes('toothbrush')).keys.find((k) => [...k].some((ch) => ch.charCodeAt(0) > 127));
  const titleBox = page.locator('input, textarea').first();
  await titleBox.waitFor({ timeout: 15000 });
  await titleBox.fill(autoTitle);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'v11-add-auto-icon-zh.png'), type: 'png' });
  console.log('wrote', path.join(OUT, 'v11-add-auto-icon-zh.png'));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
