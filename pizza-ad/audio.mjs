// Procedural sound design: one synthesized sound per cue type. No samples needed.
// mixTrack(events, duration, { vo }) -> Float32Array (mono, 48 kHz)
export const SR = 48000;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// RBJ biquad
function biquad(type, f, q) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; } // band-pass
  a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

const env = (t, a, d) => t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d);

function buf(sec) { return new Float32Array(Math.ceil(sec * SR)); }

const S = {
  slide(r) { // wooden board pushed over concrete
    const o = buf(0.9), bp = biquad('bp', 700, 0.8), lp = biquad('lp', 260, 0.7);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, n = r() * 2 - 1;
      const e = Math.sin(Math.PI * Math.min(1, t / 0.85)) ** 1.5 * (0.7 + 0.3 * Math.sin(t * 60));
      o[i] = (bp(n) * 0.9 + lp(n) * 1.6) * e * 0.55;
    }
    return o;
  },
  cut(r) { // knife through crust: crunchy crackle + soft tap on the board
    const o = buf(0.5), bp = biquad('bp', 2600, 1.2), hp = biquad('hp', 1800, 0.7);
    let crack = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, n = r() * 2 - 1;
      if (t < 0.28 && r() < 0.0035) crack = 1;
      crack *= 0.992;
      const body = bp(n) * env(t, 0.01, 0.12) * 0.9;
      const cr = hp(n) * crack * 1.4;
      const tap = Math.sin(2 * Math.PI * 150 * t) * env(t - 0.26, 0.002, 0.03) * 0.5;
      o[i] = (body + cr) * (t < 0.3 ? 1 : env(t - 0.3, 0, 0.04)) + tap;
    }
    return o;
  },
  glug(r) { // oil drizzle: bubbly bloops + thin trickle
    const o = buf(1.2), bp = biquad('bp', 3200, 2);
    const bl = [];
    for (let t = 0.02; t < 1.0; t += 0.07 + r() * 0.08) bl.push([t, 260 + r() * 260]);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      let v = bp(r() * 2 - 1) * 0.12 * Math.min(1, t / 0.1) * (t < 1.0 ? 1 : env(t - 1.0, 0, 0.05));
      for (const [bt, f] of bl) {
        const lt = t - bt;
        if (lt < 0 || lt > 0.08) continue;
        const ph = 2 * Math.PI * (f * lt + f * 4 * lt * lt);
        v += Math.sin(ph) * env(lt, 0.004, 0.022) * 0.45;
      }
      o[i] = v;
    }
    return o;
  },
  clink(r) { // ceramic cup set down
    const o = buf(0.8), lp = biquad('lp', 500, 0.7);
    const parts = [[2150, 0.35, 0.14], [3420, 0.22, 0.09], [5230, 0.12, 0.06], [1310, 0.18, 0.2]];
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      let v = 0;
      for (const [f, a, d] of parts) v += Math.sin(2 * Math.PI * f * t) * a * env(t, 0.001, d);
      v += lp(r() * 2 - 1) * env(t, 0.001, 0.03) * 1.2;
      o[i] = v * 0.8;
    }
    return o;
  },
  rattle(r) { // almonds landing one by one
    const o = buf(0.9);
    const hits = [];
    for (let k = 0; k < 9; k++) hits.push([k * 0.055 + r() * 0.015, 2200 + r() * 1600, 0.5 + r() * 0.5]);
    hits.forEach(([ht, f, a]) => {
      const bp = biquad('bp', f, 3);
      for (let i = 0; i < 0.06 * SR; i++) {
        const t = i / SR, j = Math.floor((ht) * SR) + i;
        if (j >= o.length) break;
        o[j] += (bp(r() * 2 - 1) * 1.6 + Math.sin(2 * Math.PI * 700 * t) * 0.3) * env(t, 0.0008, 0.012) * a;
      }
    });
    return o;
  },
  knock(r) { // wooden spoon placed
    const o = buf(0.4), lp = biquad('lp', 1200, 0.8);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      o[i] = (Math.sin(2 * Math.PI * 410 * t) * 0.55 + Math.sin(2 * Math.PI * 930 * t) * 0.25) * env(t, 0.001, 0.05)
        + lp(r() * 2 - 1) * env(t, 0.001, 0.02) * 0.9;
    }
    return o;
  },
  sizzle(r) { // fried egg
    const o = buf(1.3), hp = biquad('hp', 3500, 0.7), bp = biquad('bp', 6000, 1);
    let pop = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, n = r() * 2 - 1;
      if (r() < 0.0012) pop = 0.6 + r() * 0.4;
      pop *= 0.985;
      const e = Math.min(1, t / 0.08) * (t < 1.0 ? 1 : env(t - 1.0, 0, 0.1));
      o[i] = (hp(n) * 0.22 + bp(n) * pop * 0.8) * e;
    }
    return o;
  },
  thud(r) { // food set down on pizza
    const o = buf(0.4), lp = biquad('lp', 380, 0.7);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, f = 95 - 35 * Math.min(1, t / 0.15);
      o[i] = Math.sin(2 * Math.PI * f * t) * env(t, 0.003, 0.08) * 0.8 + lp(r() * 2 - 1) * env(t, 0.002, 0.03) * 1.3;
    }
    return o;
  },
  pop(r) { // pixel sticker slapped on
    const o = buf(0.25), hp = biquad('hp', 2500, 0.7);
    let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, f = 520 + 900 * Math.min(1, t / 0.05);
      ph += 2 * Math.PI * f / SR;
      o[i] = Math.sin(ph) * env(t, 0.002, 0.045) * 0.6 + hp(r() * 2 - 1) * env(t, 0.0005, 0.006) * 0.8;
    }
    return o;
  },
  marker(r) { // dashed line being drawn: squeaky strokes in the dash rhythm
    const o = buf(1.45), bp = biquad('bp', 2400, 4), bp2 = biquad('bp', 1200, 2);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, n = r() * 2 - 1;
      const dash = Math.max(0, Math.sin(t * 2 * Math.PI * 7.5)) ** 0.6;
      const e = Math.min(1, t / 0.05) * (t < 1.35 ? 1 : env(t - 1.35, 0, 0.03));
      o[i] = (bp(n) * 0.9 + bp2(n) * 0.4) * dash * e * 0.6;
    }
    return o;
  },
  boom(r) { // the reveal hit after the silence
    const o = buf(1.8), lp = biquad('lp', 900, 0.7);
    let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, f = 72 - 30 * Math.min(1, t / 0.6);
      ph += 2 * Math.PI * f / SR;
      o[i] = Math.sin(ph) * env(t, 0.004, 0.45) * 0.95
        + lp(r() * 2 - 1) * env(t, 0.001, 0.07) * 1.1
        + Math.sin(2 * Math.PI * 1046 * t) * env(t, 0.002, 0.25) * 0.12;
    }
    return o;
  },
  whoosh(r) {
    const o = buf(0.6);
    for (let i = 0, bp = null; i < o.length; i++) {
      const t = i / SR, p = t / 0.6;
      if (i % 64 === 0) bp = biquad('bp', 300 + 1600 * Math.sin(Math.PI * p), 1.2);
      o[i] = bp(r() * 2 - 1) * Math.sin(Math.PI * p) ** 2 * 0.7;
    }
    return o;
  },
  scanon() {
    const o = buf(0.3);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      o[i] = (Math.sin(2 * Math.PI * 880 * t) * env(t, 0.003, 0.05) + Math.sin(2 * Math.PI * 1320 * t) * env(t - 0.08, 0.003, 0.06)) * 0.3;
    }
    return o;
  },
  scan(r, dur) { // soft rising sweep under the scan ring
    const o = buf(dur + 0.3), bp = biquad('bp', 5000, 1.5);
    let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / SR, p = Math.min(1, t / dur);
      const f = 260 + 520 * p;
      ph += 2 * Math.PI * f / SR;
      const e = Math.min(1, t / 0.3) * (t < dur ? 1 : env(t - dur, 0, 0.08));
      o[i] = (Math.sin(ph) * 0.12 + Math.sin(ph * 2.01) * 0.05 + bp(r() * 2 - 1) * 0.05) * e;
    }
    return o;
  },
  tick() {
    const o = buf(0.12);
    for (let i = 0; i < o.length; i++) {
      const t = i / SR;
      o[i] = (Math.sin(2 * Math.PI * 1760 * t) * 0.5 + Math.sin(2 * Math.PI * 2640 * t) * 0.2) * env(t, 0.001, 0.025) * 0.55;
    }
    return o;
  },
  chime() {
    const o = buf(1.8);
    [[1046.5, 0], [1318.5, 0.09], [1568, 0.18], [2093, 0.27]].forEach(([f, d]) => {
      for (let i = 0; i < o.length; i++) {
        const t = i / SR - d;
        if (t < 0) continue;
        o[i] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * env(t, 0.004, 0.45) * 0.18;
      }
    });
    return o;
  },
};

const GAIN = { slide: 0.55, cut: 0.5, glug: 0.8, clink: 0.65, rattle: 0.7, knock: 0.7, sizzle: 0.6, thud: 0.85, pop: 0.55,
  marker: 0.45, boom: 1.0, whoosh: 0.5, scanon: 0.6, scan: 0.7, tick: 0.5, chime: 0.6 };

export function mixTrack(events, duration, opts = {}) {
  const out = new Float32Array(Math.ceil((duration + 0.5) * SR));
  const sfxGain = opts.vo && opts.vo.length ? 0.6 : 1;
  events.forEach((ev, k) => {
    const fn = S[ev.type];
    if (!fn) return;
    const s = fn(rng(1000 + k * 7919), ev.dur || 1);
    const g = (GAIN[ev.type] || 0.6) * sfxGain;
    const o = Math.round(ev.t * SR);
    for (let i = 0; i < s.length && o + i < out.length; i++) if (o + i >= 0) out[o + i] += s[i] * g;
  });
  // quiet room tone so the gaps between cues never drop to digital silence,
  // except for the deliberate pause before the reveal
  if (opts.roomTone !== false) {
    const r = rng(77), lp = biquad('lp', 320, 0.6), lp2 = biquad('lp', 2500, 0.5);
    const [s0, s1] = opts.silence || [-1, -1];
    for (let i = 0; i < out.length; i++) {
      const t = i / SR, n = r() * 2 - 1;
      const duck = t < s0 - 0.15 || t > s1 + 0.1 ? 1 : t < s0 ? (s0 - t) / 0.15 : t > s1 ? (t - s1) / 0.1 : 0;
      const fade = Math.min(1, t / 0.4) * Math.min(1, (out.length / SR - t) / 0.6);
      out[i] += (lp(n) * 0.05 + lp2(n) * 0.006) * duck * fade;
    }
  }
  (opts.vo || []).forEach(({ t, samples }) => {
    const o = Math.round(t * SR);
    for (let i = 0; i < samples.length && o + i < out.length; i++) out[o + i] += samples[i];
  });
  // soft clip + normalize to -1 dBFS
  let peak = 0;
  for (let i = 0; i < out.length; i++) { out[i] = Math.tanh(out[i] * 0.9) / 0.9; peak = Math.max(peak, Math.abs(out[i])); }
  const norm = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] *= norm;
  return out;
}

export function wav(samples) {
  const n = samples.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i])) * 32767 | 0;
    b.writeInt16LE(v, 44 + i * 4); b.writeInt16LE(v, 46 + i * 4);
  }
  return b;
}
