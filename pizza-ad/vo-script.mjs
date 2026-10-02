// Prints the voiceover lines and writes vo/lines.json (file name + text per beat),
// ready for a Chatterbox batch run. Usage: node vo-script.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['src/config.js', 'src/timeline.js']) vm.runInContext(fs.readFileSync(path.join(here, f), 'utf8'), ctx);
const { BEATS, numbers, fill } = ctx.window.TIMELINE;
const N = numbers();

const lines = BEATS.map((b, i) => ({
  file: `${String(i + 1).padStart(2, '0')}-${b.id}.wav`,
  text: b.text.map((s) => fill(s, N)).join(' ').replace(/…/g, '...'),
  // spoken form for TTS: units written out
  say: b.text.map((s) => fill(s, N)).join(' ').replace(/…/g, '...').replace(/\bkcal\b/g, 'calories').replace(/(\d)%/g, '$1 percent'),
  slot: b.dur,
}));
fs.mkdirSync(path.join(here, 'vo'), { recursive: true });
fs.writeFileSync(path.join(here, 'vo/lines.json'), JSON.stringify(lines, null, 2) + '\n');
for (const l of lines) console.log(`${l.file.padEnd(18)} ${l.slot.toFixed(1)} s  ${l.say}`);
console.log('\nwrote vo/lines.json');
