// Renders web/index.html frame by frame in headless Chromium and encodes the frames
// with ffmpeg. Writes build/video.mp4 (silent) and build/cues.json (sound effects).
//
//   node render.mjs                 full video
//   node render.mjs --stills 1,4.5  PNG stills to build/stills/ for quick checks

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(ROOT, 'build');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.wav': 'audio/wav' };

function serve() {
  const server = createServer(async (req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function openPage(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log(`  [page] ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`  [page error] ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
  return page;
}

const grab = (page, t, type = 'image/jpeg') =>
  page.evaluate(([t, type]) => {
    window.renderFrame(t);
    return document.getElementById('stage').toDataURL(type, 0.94);
  }, [t, type]).then((url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));

function encoder(out) {
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited ${c}`)))));
  const write = (buf) => new Promise((resolve) => (ff.stdin.write(buf) ? resolve() : ff.stdin.once('drain', resolve)));
  return { write, end: () => { ff.stdin.end(); return done; } };
}

async function main() {
  const args = process.argv.slice(2);
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/web/index.html?render`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'],
  });
  try {
    if (args[0] === '--stills') {
      const dir = path.join(BUILD, 'stills');
      await mkdir(dir, { recursive: true });
      const page = await openPage(browser, url);
      for (const t of args[1].split(',').map(Number)) {
        const file = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
        await writeFile(file, await grab(page, t, 'image/png'));
        console.log(file);
      }
      return;
    }

    const probe = await openPage(browser, url);
    const { duration } = await probe.evaluate(() => window.timeline);
    await writeFile(path.join(BUILD, 'cues.json'), JSON.stringify(await probe.evaluate(() => window.getCues()), null, 1));
    await probe.context().close();

    const total = Math.ceil(duration * FPS);
    const workers = Math.max(1, Math.min(cpus().length, 4));
    const per = Math.ceil(total / workers);
    const segDir = path.join(BUILD, 'segments');
    await rm(segDir, { recursive: true, force: true });
    await mkdir(segDir, { recursive: true });
    console.log(`Rendering ${total} frames (${duration.toFixed(1)}s) with ${workers} workers ...`);
    const started = Date.now();
    let doneFrames = 0;
    const segs = [];
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const from = w * per, to = Math.min(total, from + per);
      if (from >= to) return;
      const seg = path.join(segDir, `seg${w}.mp4`);
      segs[w] = seg;
      const page = await openPage(browser, url);
      const enc = encoder(seg);
      for (let f = from; f < to; f++) {
        await enc.write(await grab(page, f / FPS));
        if (++doneFrames % 150 === 0) {
          const s = (Date.now() - started) / 1000;
          console.log(`  ${doneFrames}/${total} frames, ${(doneFrames / s).toFixed(1)} fps`);
        }
      }
      await enc.end();
      await page.context().close();
    }));
    const list = path.join(segDir, 'list.txt');
    await writeFile(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
    await new Promise((resolve, reject) => {
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(BUILD, 'video.mp4')], { stdio: 'inherit' });
      ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error('concat failed'))));
    });
    console.log(`build/video.mp4 done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
