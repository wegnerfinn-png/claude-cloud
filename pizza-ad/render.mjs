// Renders index.html frame by frame with puppeteer and encodes an MP4 with sound.
//
//   node render.mjs                      -> out/pumpy-pizza.mp4 (1080x1920, 30 fps)
//   node render.mjs --preview            -> out/preview.mp4 (540x960, 15 fps, fast)
//   node render.mjs --from 20 --to 30    -> only that time range
//   node render.mjs --out out/x.mp4
//   node render.mjs --vo other/dir       -> voiceover clips from another folder
//   node render.mjs --audio-only         -> only regenerate the sound of an existing render
//
// Voiceover: put one WAV/MP3 per beat in vo/, named "<nn>-<beat id>.wav" in beat order
// (see vo/README.md). Beats stretch to fit each clip and the clip is mixed in.
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mixTrack, wav, SR } from './audio.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);
const preview = flag('--preview');
const fps = +opt('--fps', preview ? 15 : 30);
const out = path.resolve(here, opt('--out', preview ? 'out/preview.mp4' : 'out/pumpy-pizza.mp4'));
const chrome = opt('--chrome', process.env.CHROME_PATH || findChrome());

function findChrome() {
  const c = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return c.find((p) => fs.existsSync(p));
}

// ---- voiceover clips
const voDir = path.resolve(here, opt('--vo', 'vo'));
const voFiles = fs.existsSync(voDir) ? fs.readdirSync(voDir).filter((f) => /^\d+-[\w-]+\.(wav|mp3|m4a|flac)$/i.test(f)).sort() : [];
const voDur = {}, voPath = {};
for (const f of voFiles) {
  const id = f.replace(/^\d+-/, '').replace(/\.\w+$/, '');
  const p = path.join(voDir, f);
  voDur[id] = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).toString().trim();
  voPath[id] = p;
}
if (voFiles.length) console.log(`voiceover: ${voFiles.length} clips`);

function decode(p) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', p, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}

// ---- browser
const browser = await puppeteer.launch({ executablePath: chrome, args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.setViewport({ width: 1080, height: 1920 });
if (voFiles.length) await page.evaluateOnNewDocument((d) => { window.__voDur = d; }, voDur);
await page.goto('file://' + path.join(here, 'index.html') + '?render=1', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 300000 });
const meta = await page.evaluate(() => ({ duration: window.__duration, sfx: window.__sfx, vo: window.__vo, silence: window.__silence }));

const from = +opt('--from', 0), to = Math.min(+opt('--to', meta.duration), meta.duration);
const frames = Math.round((to - from) * fps);
console.log(`duration ${meta.duration.toFixed(2)} s, rendering ${from}–${to.toFixed(2)} s, ${frames} frames @ ${fps} fps`);

// ---- audio
fs.mkdirSync(path.dirname(out), { recursive: true });
const vo = meta.vo.map((v) => ({ t: v.t, samples: decode(voPath[v.id]) }));
const full = mixTrack(meta.sfx, meta.duration, { vo, silence: meta.silence });
const a0 = Math.round(from * SR), a1 = Math.round(to * SR);
const audioPath = out.replace(/\.mp4$/, '') + '.wav';
fs.writeFileSync(audioPath, wav(full.subarray(a0, a1)));

// --audio-only: keep the rendered picture, just swap in the new sound
if (flag('--audio-only')) {
  const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', out, '-i', audioPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, out);
  await browser.close();
  console.log(`remuxed audio into ${path.relative(process.cwd(), out)}`);
  process.exit(0);
}

// ---- video
const vf = preview ? ['-vf', 'scale=540:960'] : [];
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-i', audioPath, ...vf, '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', preview ? '24' : '17',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', out],
{ stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (c) => c ? rej(new Error('ffmpeg exit ' + c)) : res()));

const q = preview ? 0.85 : 0.95;
const started = Date.now();
for (let i = 0; i < frames; i++) {
  const t = from + i / fps;
  const data = await page.evaluate((t, q) => window.__frame(t, q), t, q);
  const b = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) {
    const el = (Date.now() - started) / 1000, eta = el / (i + 1) * (frames - i - 1);
    process.stdout.write(`\r  frame ${i}/${frames}  ${t.toFixed(1)} s  eta ${eta.toFixed(0)} s   `);
  }
}
ff.stdin.end();
await done;
await browser.close();
console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
