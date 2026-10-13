#!/usr/bin/env node
const http = require('http');
const handler = require('serve-handler');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function serve(dir, port = 5178) {
  const server = http.createServer((req, res) => handler(req, res, { public: dir }));
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function main() {
  const root = path.join(__dirname, '..');
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist/ not found. Run: npm run export:web');
    process.exit(1);
  }
  const server = await serve(dist, 5178);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });

  const shotsDir = path.join(root, 'screenshots');
  fs.mkdirSync(shotsDir, { recursive: true });

  async function pause(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function shot(name, query) {
    await page.goto(`http://localhost:5178/index.html?${query}`, { waitUntil: 'networkidle0' });
    await pause(800);
    await page.screenshot({ path: path.join(shotsDir, `${name}.png`) });
    // Dark
    await page.goto(`http://localhost:5178/index.html?${query}&scheme=dark`, { waitUntil: 'networkidle0' });
    await pause(800);
    await page.screenshot({ path: path.join(shotsDir, `${name}-dark.png`) });
  }

  await shot('01-list', 'screen=Home&demo=1');
  await shot('03-detail', 'screen=Detail&demo=1');
  await shot('04-reminder', 'screen=Reminder&demo=1');
  await shot('05-edit', 'screen=Edit&demo=1');
  await shot('07-settings', 'screen=Settings&demo=1');
  await shot('09-paywall', 'screen=Paywall&demo=1');
  await shot('10-empty', 'screen=Home'); // without demo

  await browser.close();
  server.close();
  const out = '/opt/cursor/artifacts/screenshots';
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(shotsDir)) {
    fs.copyFileSync(path.join(shotsDir, f), path.join(out, f));
  }
  console.log('Saved screenshots to', shotsDir, 'and', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
