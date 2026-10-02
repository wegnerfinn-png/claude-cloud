// Renders scene.html frame by frame into an MP4 (1080x1920, 30 fps) with brick-click audio.
// Usage: node render.mjs [out.mp4]
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(DIR, "pumpy-lego-test.mp4"));
const FPS = 30;
const TYPES = { ".html": "text/html", ".woff2": "font/woff2", ".js": "text/javascript" };

// Static server so the @font-face loads (file:// blocks it).
const server = createServer(async (req, res) => {
  try {
    const p = path.join(DIR, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(DIR)) throw new Error("outside");
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const tmp = await mkdtemp(path.join(tmpdir(), "pumpy-"));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:${port}/scene.html`);
const { duration, landTimes } = await page.evaluate(() => window.ready);

// ---- video ----
const silent = path.join(tmp, "video.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", silent], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(duration * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 95, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
  if (i % 30 === 0) process.stdout.write(`\rframe ${i}/${frames}`);
}
ff.stdin.end();
await new Promise((ok, bad) => ff.on("close", c => (c ? bad(new Error("ffmpeg " + c)) : ok())));
await browser.close();
server.close();
console.log(`\rframes done (${frames})`);

// ---- audio: one plastic "click" per landing brick ----
const SR = 44100, N = Math.ceil(duration * SR), mix = new Float32Array(N);
let seed = 99; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
for (const t of landTimes) {
  const start = Math.floor(t * SR), f1 = 1800 + rnd() * 900, f2 = 3900 + rnd() * 1200, amp = 0.35 + rnd() * 0.2;
  for (let i = 0; i < SR * 0.06 && start + i < N; i++) {
    const s = i / SR, env = Math.exp(-s * 110);
    mix[start + i] += amp * env * (0.55 * Math.sin(2 * Math.PI * f1 * s) + 0.25 * Math.sin(2 * Math.PI * f2 * s) + 0.35 * (rnd() * 2 - 1) * Math.exp(-s * 400));
  }
}
const wav = Buffer.alloc(44 + N * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) wav.writeInt16LE(Math.max(-1, Math.min(1, mix[i] * 0.8)) * 32767 | 0, 44 + i * 2);
const wavPath = path.join(tmp, "clicks.wav");
await writeFile(wavPath, wav);

await new Promise((ok, bad) => spawn("ffmpeg", ["-y", "-v", "error", "-i", silent, "-i", wavPath,
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT], { stdio: "inherit" })
  .on("close", c => (c ? bad(new Error("mux " + c)) : ok())));
await rm(tmp, { recursive: true, force: true });
console.log("wrote", OUT);
