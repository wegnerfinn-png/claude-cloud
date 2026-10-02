// Render a few stills: node dev/stills.mjs outdir t1 t2 ...
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [,, out, ...ts] = process.argv;
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[err]', e.message));
await page.setViewport({ width: 1080, height: 1920 });
await page.goto('file://' + path.resolve('index.html') + '?render=1', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 180000 });
console.log('init ms', await page.evaluate('window.__initMs'), 'duration', await page.evaluate('window.__duration'));
for (const t of ts) {
  const t0 = Date.now();
  const data = await page.evaluate((t) => window.__frame(+t, 0.9), t);
  fs.writeFileSync(path.join(out, `t_${String(t).padStart(5, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  console.log('t', t, Date.now() - t0, 'ms');
}
await browser.close();
