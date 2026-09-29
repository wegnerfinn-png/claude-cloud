// Timeline + frame renderer. Used both by the live preview (index.html) and by
// render.mjs, which calls window.renderFrame(t) for every frame.

import * as E from './engine.js';
import { SCENES, THEMES } from './scenes.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let TL = null;
let scenes = [];

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

function makeScene(sc) {
  const def = SCENES[sc.id];
  if (!def) throw new Error(`No animation for scene "${sc.id}" in scenes.js`);
  const words = sc.words.map((w) => ({ ...w, t0: w.t0 - sc.start, t1: w.t1 - sc.start, k: norm(w.w) }));
  const S = {
    ...sc,
    def,
    dur: sc.end - sc.start,
    words,
    wt(k, n = 0) {
      const hits = words.filter((w) => w.k === k);
      if (!hits[n]) {
        console.warn(`scene ${sc.id}: word "${k}" not in narration, falling back to 1s`);
        return 1;
      }
      return hits[n].t0;
    },
  };
  S.B = def.beats ? def.beats(S) : {};
  return S;
}

const themeOf = (S, t) => (typeof S.def.theme === 'function' ? S.def.theme(t, S, S.B) : S.def.theme);

export function renderFrame(T) {
  let idx = scenes.findIndex((s) => T >= s.start && T < s.end);
  if (idx < 0) idx = T < 0 ? 0 : scenes.length - 1;
  const S = scenes[idx];
  const t = T - S.start;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  E.background(ctx, T, themeOf(S, t));

  ctx.save();
  const punch = 1 + 0.06 * (1 - E.ease.outCubic(E.prog(t, 0.05, 0.55)));
  const drift = 1 + 0.02 * (t / S.dur);
  ctx.translate(E.W / 2, E.H * 0.47);
  ctx.scale(punch * drift, punch * drift);
  ctx.translate(-E.W / 2, -E.H * 0.47);
  S.def.draw(ctx, t, S, S.B);
  ctx.restore();

  if (S.num) E.header(ctx, t, S, S.B.name - 0.12);
  E.caption(ctx, T, TL.scenes);

  for (let k = 1; k < scenes.length; k++) {
    const b = scenes[k].start;
    if (Math.abs(T - b) < 0.3) {
      const th = themeOf(scenes[k], 0);
      E.wipe(ctx, (T - (b - 0.3)) / 0.6, [th.b, '#ffe04a', th.a]);
    }
  }
}

// Sound-effect cue list in absolute seconds, consumed by mix.py.
export function getCues() {
  const cues = [];
  scenes.forEach((S, k) => {
    if (k > 0) cues.push({ t: S.start - 0.28, s: 'whoosh' });
    if (S.num) cues.push({ t: S.start + 0.04, s: 'slam' });
    if (S.num) cues.push({ t: S.start + S.B.name + 0.05, s: 'pop' });
    for (const [s, t] of S.def.cues ? S.def.cues(S, S.B) : []) cues.push({ t: +(S.start + t).toFixed(3), s });
  });
  return cues.sort((a, b) => a.t - b.t);
}

export async function init(timelineUrl = '../build/timeline.json') {
  TL = await (await fetch(timelineUrl, { cache: 'no-store' })).json();
  await Promise.all([document.fonts.load('100px Lucky'), document.fonts.load('100px Fredoka')]);
  scenes = TL.scenes.map(makeScene);
  return TL;
}

export { THEMES };
