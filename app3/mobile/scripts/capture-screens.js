/**
 * Headless screenshots for v1.0 review (react-native-web).
 * Usage: BASE=http://localhost:8081 node scripts/capture-screens.js
 */
const { chromium } = require('/tmp/pw/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:8081';
const OUT = process.env.OUT || '/opt/cursor/artifacts';
const W = 393;
const H = 852;

const shots = [
  { name: '01-list', url: '/?demo=1&screen=Home' },
  { name: '02-list-logged', url: '/?demo=logged&screen=Home' },
  { name: '03-detail', url: '/?demo=1&screen=Detail' },
  { name: '05-add', url: '/?demo=1&screen=EditNew' },
  { name: '06-edit', url: '/?demo=1&screen=Edit' },
  { name: '07-settings', url: '/?demo=1&screen=Settings' },
  { name: '09-paywall', url: '/?demo=1&screen=Paywall' },
  { name: '10-empty', url: '/?screen=Empty' },
];

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
  for (const s of shots) {
    const dest = path.join(OUT, `v1-${s.name}.png`);
    await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: dest, type: 'png' });
    console.log('wrote', dest);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
