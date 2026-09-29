// Drawing toolkit shared by all scenes: math, easing, shapes, text, backgrounds,
// captions, transitions and the reusable info widgets (pills, stamps, charts).

export const W = 1080;
export const H = 1920;
export const OUT = '#221733';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, start, dur) => clamp((t - start) / dur);

export const ease = {
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inCubic: (p) => p * p * p,
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  outBack: (p) => {
    const c1 = 1.9, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
  outElastic: (p) =>
    p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -9 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outBounce: (p) => {
    const n1 = 7.5625, d1 = 2.75;
    if (p < 1 / d1) return n1 * p * p;
    if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + 0.75;
    if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + 0.9375;
    return n1 * (p -= 2.625 / d1) * p + 0.984375;
  },
};

// Deterministic randomness so every render of a frame looks identical.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour ----------

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(c1, c2, p) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], p)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function mixTheme(a, b, p) {
  return { a: mix(a.a, b.a, p), b: mix(a.b, b.b, p), wipe: p < 0.5 ? a.wipe : b.wipe };
}

// ---------- shapes ----------

export function stroke(ctx, lw = 10, color = OUT) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
export function fill(ctx, style) {
  ctx.fillStyle = style;
  ctx.fill();
}
export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}
export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
}
export function linGrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
export function radGrad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
export function groundShadow(ctx, x, y, rx, alpha = 0.28) {
  ctx.save();
  ellipse(ctx, x, y, rx, rx * 0.16);
  fill(ctx, `rgba(0,0,0,${alpha})`);
  ctx.restore();
}

// ---------- text ----------

export function text(ctx, str, x, y, o = {}) {
  const {
    size = 100, font = 'Lucky', color = '#fff', outline = OUT, lw = size * 0.18,
    align = 'center', maxW = 940, shadow = true, rot = 0, scale = 1, alpha = 1,
  } = o;
  if (scale <= 0.001 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${size}px ${font}`;
  const w = ctx.measureText(str).width;
  const fit = w > maxW ? maxW / w : 1;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(fit * scale, fit * scale);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Luckiest Guy sits high in its box; nudge it down so it centres visually.
  const dy = font === 'Lucky' ? size * 0.07 : 0;
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    if (outline) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(str, 0, dy + size * 0.09);
    }
    ctx.fillText(str, 0, dy + size * 0.09);
  }
  if (outline) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.strokeText(str, 0, dy);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, 0, dy);
  ctx.restore();
}

// ---------- background ----------

export function background(ctx, t, th) {
  const cx = W / 2, cy = H * 0.44;
  ctx.fillStyle = radGrad(ctx, cx, cy, 40, H * 0.9, [[0, th.a], [1, th.b]]);
  ctx.fillRect(0, 0, W, H);

  // slowly turning sunburst
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.09);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 2300, a0, a0 + Math.PI / n);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // drifting bubbles
  const r = rng(11);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, speed = 25 + r() * 70, size = 6 + r() * 34, alpha = 0.05 + r() * 0.1, off = r() * H;
    const y = H + 80 - ((off + t * speed) % (H + 160));
    circle(ctx, x + Math.sin(t * 0.8 + i) * 18, y, size);
    fill(ctx, `rgba(255,255,255,${alpha})`);
  }

  // vignette
  ctx.fillStyle = radGrad(ctx, cx, H / 2, H * 0.3, H * 0.78, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.38)']]);
  ctx.fillRect(0, 0, W, H);
}

// ---------- camera shake ----------

export function shake(ctx, t, t0, amp = 26, dur = 0.4) {
  if (t < t0 || t > t0 + dur) return;
  const k = 1 - (t - t0) / dur;
  const a = amp * k * k;
  ctx.translate(Math.sin(t * 97) * a, Math.cos(t * 83) * a);
  ctx.rotate(Math.sin(t * 61) * 0.012 * k);
}

// ---------- captions (one word at a time, like the reference) ----------

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
export const cleanWord = (w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').toUpperCase();

export function caption(ctx, T, scenes, y = 1440) {
  let cur = null, sc = null;
  for (const s of scenes) {
    for (let i = 0; i < s.words.length; i++) {
      const w = s.words[i];
      const next = s.words[i + 1];
      const until = next ? next.t0 : w.t1 + 0.35;
      if (T >= w.t0 && T < until) { cur = w; sc = s; }
    }
  }
  if (!cur) return;
  const k = norm(cur.w);
  const good = (sc.good || []).includes(k);
  const hot = (sc.highlight || []).includes(k);
  const color = good ? '#7CFF9B' : hot ? '#FFE04A' : '#FFFFFF';
  const p = prog(T, cur.t0, 0.16);
  const s = lerp(0.55, 1, ease.outBack(p));
  text(ctx, cleanWord(cur.w), W / 2, y, {
    size: 122, color, outline: '#000', lw: 24, scale: s, maxW: 900, rot: (hot || good) ? -0.03 : 0,
  });
}

// ---------- transitions ----------

// Three slanted colour bands sweep across; the screen is fully covered at p = 0.5.
export function wipe(ctx, p, colors) {
  const skew = 520, span = 0.14;
  colors.forEach((c, i) => {
    const d = (i / (colors.length - 1)) * span;
    const q = clamp((p - d) / (1 - span));
    const R = lerp(-skew, W + skew, ease.inOutCubic(clamp(q * 2)));
    const L = lerp(-skew, W + skew, ease.inOutCubic(clamp(q * 2 - 1)));
    if (R <= L) return;
    ctx.beginPath();
    ctx.moveTo(L + skew / 2, 0);
    ctx.lineTo(R + skew / 2, 0);
    ctx.lineTo(R - skew / 2, H);
    ctx.lineTo(L - skew / 2, H);
    ctx.closePath();
    fill(ctx, c);
  });
}

// ---------- icons (drawn inside a circle of radius r at the origin) ----------

export function icon(ctx, kind, r, color = '#fff') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = r * 0.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'x') {
    const k = r * 0.4;
    ctx.moveTo(-k, -k); ctx.lineTo(k, k); ctx.moveTo(k, -k); ctx.lineTo(-k, k);
    ctx.stroke();
  } else if (kind === 'up') {
    ctx.moveTo(0, r * 0.5); ctx.lineTo(0, -r * 0.45);
    ctx.moveTo(-r * 0.38, -r * 0.08); ctx.lineTo(0, -r * 0.48); ctx.lineTo(r * 0.38, -r * 0.08);
    ctx.stroke();
  } else if (kind === 'check') {
    ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.12, r * 0.33); ctx.lineTo(r * 0.48, -r * 0.35);
    ctx.stroke();
  } else if (kind === 'bolt') {
    ctx.moveTo(r * 0.15, -r * 0.62); ctx.lineTo(-r * 0.38, r * 0.08); ctx.lineTo(-r * 0.02, r * 0.08);
    ctx.lineTo(-r * 0.15, r * 0.62); ctx.lineTo(r * 0.4, -r * 0.1); ctx.lineTo(r * 0.04, -r * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'drop') {
    ctx.moveTo(0, -r * 0.6);
    ctx.bezierCurveTo(r * 0.2, -r * 0.3, r * 0.45, 0, r * 0.45, r * 0.18);
    ctx.arc(0, r * 0.18, r * 0.45, 0, Math.PI);
    ctx.bezierCurveTo(-r * 0.45, 0, -r * 0.2, -r * 0.3, 0, -r * 0.6);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- info widgets ----------

// White label that pops in (and optionally out) with a coloured icon bubble.
export function pill(ctx, t, t0, x, y, label, o = {}) {
  const { kind = 'x', color = '#ff3b4d', size = 50, t1 = Infinity, rot = -0.03 } = o;
  if (t < t0 || t > t1 + 0.12) return;
  const pin = ease.outBack(prog(t, t0, 0.32));
  const pout = t1 < Infinity ? ease.inCubic(prog(t, t1, 0.12)) : 0;
  const s = pin * (1 - pout);
  if (s <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(t * 2.4 + x * 0.01) * 0.015);
  ctx.scale(s, s);
  ctx.font = `${size}px Fredoka`;
  const tw = ctx.measureText(label).width;
  const h = size * 1.85, ir = h * 0.34, padL = h * 0.16;
  const w = padL + ir * 2 + h * 0.22 + tw + h * 0.42;
  rrect(ctx, -w / 2 + 5, -h / 2 + 10, w, h, h / 2);
  fill(ctx, 'rgba(0,0,0,0.28)');
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  fill(ctx, '#fff');
  stroke(ctx, 7);
  const cx = -w / 2 + padL + ir;
  circle(ctx, cx, 0, ir);
  fill(ctx, color);
  stroke(ctx, 5);
  ctx.save();
  ctx.translate(cx, 0);
  icon(ctx, kind, ir);
  ctx.restore();
  ctx.fillStyle = OUT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx + ir + h * 0.22, size * 0.04);
  ctx.restore();
}

// Red "no" sign that slams down onto a food.
export function stamp(ctx, t, t0, x, y, r = 210) {
  if (t < t0) return;
  const p = prog(t, t0, 0.2);
  const s = lerp(2.6, 1, ease.inCubic(p)) * (1 + 0.06 * Math.sin(clamp((t - t0 - 0.2) * 9) * Math.PI));
  ctx.save();
  ctx.globalAlpha = clamp(p * 3);
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  ctx.scale(s, s);
  const lw = r * 0.17, k = r * 0.7;
  const path = () => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.moveTo(-k, -k);
    ctx.lineTo(k, k);
  };
  path();
  stroke(ctx, lw + 26, 'rgba(0,0,0,0.25)');
  path();
  stroke(ctx, lw + 16, '#fff');
  path();
  stroke(ctx, lw, '#ff2d48');
  // AVOID tag
  ctx.rotate(0.1);
  rrect(ctx, -150, r * 0.8, 300, 104, 22);
  fill(ctx, '#ff2d48');
  stroke(ctx, 8, '#fff');
  text(ctx, 'AVOID!', 0, r * 0.8 + 52, { size: 76, color: '#fff', outline: null, shadow: false });
  ctx.restore();
  // dust ring on impact
  burst(ctx, t, t0 + 0.2, x, y, { n: 18, speed: 900, dur: 0.5, size: 16, colors: ['#ffffff', '#ffd5dc'], seed: 5 });
}

// Radial particle burst.
export function burst(ctx, t, t0, x, y, o = {}) {
  const { n = 20, speed = 700, dur = 0.7, size = 14, colors = ['#fff'], seed = 1, gravity = 900, shape = 'circle' } = o;
  const dt = t - t0;
  if (dt < 0 || dt > dur) return;
  const r = rng(seed);
  const k = dt / dur;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, v = speed * (0.4 + r() * 0.8), sz = size * (0.5 + r()), c = colors[i % colors.length];
    const px = x + Math.cos(a) * v * dt;
    const py = y + Math.sin(a) * v * dt + 0.5 * gravity * dt * dt;
    ctx.globalAlpha = 1 - k;
    if (shape === 'star') {
      star(ctx, px, py, sz * (1 - k * 0.5), t * 4 + i);
      fill(ctx, c);
    } else {
      circle(ctx, px, py, sz * (1 - k * 0.6));
      fill(ctx, c);
    }
  }
  ctx.globalAlpha = 1;
}

export function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.35 : r;
    const a = rot + (i / 8) * Math.PI * 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// White card that slides up from below.
function card(ctx, t, t0, cx, cy, w, h, t1) {
  const pin = ease.outBack(prog(t, t0, 0.4));
  const pout = t1 < Infinity ? ease.inCubic(prog(t, t1, 0.25)) : 0;
  ctx.translate(cx, cy + (1 - pin) * 500 + pout * 600);
  ctx.rotate((1 - pin) * 0.1);
  rrect(ctx, -w / 2 + 8, -h / 2 + 14, w, h, 40);
  fill(ctx, 'rgba(0,0,0,0.25)');
  rrect(ctx, -w / 2, -h / 2, w, h, 40);
  fill(ctx, '#fff');
  stroke(ctx, 9);
}

// Line chart that spikes exactly when the voice says "spikes".
export function spikeChart(ctx, t, t0, spikeT, cx, cy, o = {}) {
  const { w = 740, h = 330, label = 'BLOOD SUGAR', color = '#ff3b4d', t1 = Infinity } = o;
  if (t < t0 || t > t1 + 0.3) return;
  ctx.save();
  card(ctx, t, t0, cx, cy, w, h, t1);
  ctx.font = '46px Fredoka';
  ctx.fillStyle = OUT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  circle(ctx, -w / 2 + 52, -h / 2 + 52, 14);
  fill(ctx, color);
  ctx.fillStyle = OUT;
  ctx.fillText(label, -w / 2 + 80, -h / 2 + 54);

  const px = -w / 2 + 44, py = -h / 2 + 100, pw = w - 88, ph = h - 140;
  ctx.strokeStyle = '#e6e1ee';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(px, py + (ph * i) / 3);
    ctx.lineTo(px + pw, py + (ph * i) / 3);
    ctx.stroke();
  }
  const peakU = 0.64;
  const f = (u) => 0.18 + 0.035 * Math.sin(u * 23) + 0.74 * Math.exp(-Math.pow((u - peakU) / 0.075, 2)) + 0.1 * clamp((u - peakU) * 3);
  const drawStart = t0 + 0.25;
  const q = clamp(((t - drawStart) / Math.max(0.3, spikeT - drawStart)) * peakU);
  const pts = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * q;
    pts.push([px + u * pw, py + ph - f(u) * ph]);
  }
  if (q > 0.001) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], py + ph);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], py + ph);
    ctx.closePath();
    ctx.fillStyle = linGrad(ctx, 0, py, 0, py + ph, [[0, color + '66'], [1, color + '00']]);
    ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    stroke(ctx, 11, color);
    const [hx, hy] = pts[pts.length - 1];
    circle(ctx, hx, hy, 15);
    fill(ctx, '#fff');
    stroke(ctx, 7, color);
  }
  // keep drawing past the peak after the spike
  if (t > spikeT) {
    const q2 = clamp(peakU + (t - spikeT) * 0.5, peakU, 1);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = peakU + ((q2 - peakU) * i) / 40;
      const x = px + u * pw, y = py + ph - f(u) * ph;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    stroke(ctx, 11, color);
    // bouncing arrow badge at the peak
    const b = ease.outBack(prog(t, spikeT, 0.3));
    const bx = px + peakU * pw + 70, by = py + ph - f(peakU) * ph + 10 + Math.sin(t * 8) * 5;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(b, b);
    circle(ctx, 0, 0, 38);
    fill(ctx, color);
    stroke(ctx, 6);
    icon(ctx, 'up', 38);
    ctx.restore();
  }
  ctx.restore();
}

// Gauge whose needle swings into the red.
export function gauge(ctx, t, t0, cx, cy, o = {}) {
  const { w = 560, h = 330, label = 'CORTISOL', t1 = Infinity } = o;
  if (t < t0 || t > t1 + 0.3) return;
  ctx.save();
  card(ctx, t, t0, cx, cy, w, h, t1);
  text(ctx, label, 0, -h / 2 + 56, { size: 50, font: 'Fredoka', color: OUT, outline: null, shadow: false });
  const R = 150, gy = h / 2 - 50;
  const segs = [['#34c77b', 0, 0.4], ['#ffc53d', 0.4, 0.7], ['#ff3b4d', 0.7, 1]];
  segs.forEach(([c, a, b]) => {
    ctx.beginPath();
    ctx.arc(0, gy, R, Math.PI + a * Math.PI + 0.02, Math.PI + b * Math.PI - 0.02);
    stroke(ctx, 44, OUT);
    ctx.beginPath();
    ctx.arc(0, gy, R, Math.PI + a * Math.PI + 0.02, Math.PI + b * Math.PI - 0.02);
    ctx.lineCap = 'butt';
    ctx.lineWidth = 32;
    ctx.strokeStyle = c;
    ctx.stroke();
  });
  const v = lerp(0.12, 0.93, ease.outElastic(prog(t, t0 + 0.35, 1.1))) + Math.sin(t * 20) * 0.01;
  const a = Math.PI + v * Math.PI;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(Math.cos(a) * (R - 10), gy + Math.sin(a) * (R - 10));
  stroke(ctx, 16, OUT);
  circle(ctx, 0, gy, 22);
  fill(ctx, OUT);
  ctx.restore();
}

// Big number that slams in, then docks into the top-left badge next to the title.
export function header(ctx, t, S, dockT) {
  const n = String(S.num);
  const pIn = prog(t, 0.02, 0.28);
  const pDock = ease.inOutCubic(prog(t, dockT, 0.38));
  const bx = 150, by = 290;
  const x = lerp(W / 2, bx, pDock), y = lerp(820, by, pDock);
  const size = lerp(560, 150, pDock);
  const s = lerp(2.6, 1, ease.outBack(pIn));
  // badge
  if (pDock > 0) {
    ctx.save();
    ctx.translate(bx, by);
    const bs = ease.outBack(prog(t, dockT + 0.2, 0.3));
    ctx.scale(bs, bs);
    circle(ctx, 4, 10, 96);
    fill(ctx, 'rgba(0,0,0,0.3)');
    circle(ctx, 0, 0, 96);
    fill(ctx, '#ffd23f');
    stroke(ctx, 10);
    ctx.restore();
  }
  if (pIn > 0) {
    text(ctx, pDock < 1 ? '#' + n : n, x, y, {
      size, color: pDock < 1 ? '#ffe04a' : '#fff', lw: size * 0.1, scale: s, rot: lerp(-0.12, 0, pDock),
      outline: OUT, alpha: clamp(pIn * 4),
    });
  }
  // title banner
  const pt = ease.outBack(prog(t, dockT + 0.1, 0.4));
  if (pt > 0) {
    ctx.save();
    ctx.translate(lerp(W + 400, 265, pt), by);
    ctx.rotate(-0.035);
    ctx.font = '96px Lucky';
    const tw = Math.min(ctx.measureText(S.title).width, 620);
    rrect(ctx, 6, -60 + 12, tw + 70, 122, 26);
    fill(ctx, 'rgba(0,0,0,0.3)');
    rrect(ctx, 0, -60, tw + 70, 122, 26);
    fill(ctx, '#fff');
    stroke(ctx, 10);
    text(ctx, S.title, 35, 4, { size: 96, color: OUT, outline: null, shadow: false, align: 'left', maxW: 620 });
    ctx.restore();
  }
}

// ---------- faces (every food gets one) ----------

export function face(ctx, t, x, y, s, mood, o = {}) {
  const { look = 0, skin = '#f5c07a', seed = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const ex = 52;
  const blink = mood !== 'ko' && mood !== 'happy' && ((t + seed) % 3.4) < 0.11;
  const eye = (side) => {
    const cx = side * ex;
    if (mood === 'ko') {
      ctx.beginPath();
      ctx.moveTo(cx - 17, -17); ctx.lineTo(cx + 17, 17);
      ctx.moveTo(cx + 17, -17); ctx.lineTo(cx - 17, 17);
      stroke(ctx, 9);
      return;
    }
    if (mood === 'happy') {
      ctx.beginPath();
      ctx.arc(cx, 8, 20, Math.PI * 1.1, Math.PI * 1.9);
      stroke(ctx, 9);
      return;
    }
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(cx - 22, 2); ctx.lineTo(cx + 22, 2);
      stroke(ctx, 8);
      return;
    }
    ellipse(ctx, cx, 0, 24, 29);
    fill(ctx, '#fff');
    stroke(ctx, 6);
    circle(ctx, cx + look * 9, 5, 12);
    fill(ctx, OUT);
    circle(ctx, cx + look * 9 + 4, 0, 4);
    fill(ctx, '#fff');
    if (mood === 'smug') {
      // heavy upper lids
      ctx.save();
      ellipse(ctx, cx, 0, 24, 29);
      ctx.clip();
      ctx.fillStyle = skin;
      ctx.fillRect(cx - 30, -34, 60, 30);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cx - 25, -4); ctx.lineTo(cx + 25, -4);
      stroke(ctx, 7);
    }
  };
  eye(-1);
  eye(1);
  // brows
  ctx.beginPath();
  if (mood === 'evil') {
    ctx.moveTo(-ex - 30, -48); ctx.lineTo(-ex + 26, -30);
    ctx.moveTo(ex + 30, -48); ctx.lineTo(ex - 26, -30);
  } else if (mood === 'smug') {
    ctx.moveTo(-ex - 26, -38); ctx.lineTo(-ex + 22, -36);
    ctx.moveTo(ex - 24, -52); ctx.quadraticCurveTo(ex, -62, ex + 26, -50);
  } else if (mood === 'sad') {
    ctx.moveTo(-ex - 26, -34); ctx.lineTo(-ex + 22, -50);
    ctx.moveTo(ex + 26, -34); ctx.lineTo(ex - 22, -50);
  }
  stroke(ctx, 10);
  // mouth
  if (mood === 'evil') {
    ctx.beginPath();
    ctx.moveTo(-58, 44);
    ctx.quadraticCurveTo(0, 60, 58, 44);
    ctx.quadraticCurveTo(0, 118, -58, 44);
    ctx.closePath();
    fill(ctx, '#6b1020');
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-60, 40, 120, 24);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-58, 44);
    ctx.quadraticCurveTo(0, 60, 58, 44);
    ctx.quadraticCurveTo(0, 118, -58, 44);
    ctx.closePath();
    stroke(ctx, 7);
  } else if (mood === 'smug') {
    ctx.beginPath();
    ctx.moveTo(-38, 52);
    ctx.quadraticCurveTo(10, 66, 44, 36);
    stroke(ctx, 8);
  } else if (mood === 'ko') {
    ctx.beginPath();
    ctx.moveTo(-40, 55);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-40 + i * 10, 55 + (i % 2 ? -8 : 8));
    stroke(ctx, 7);
  } else if (mood === 'happy') {
    ctx.beginPath();
    ctx.moveTo(-48, 40);
    ctx.quadraticCurveTo(0, 50, 48, 40);
    ctx.quadraticCurveTo(0, 115, -48, 40);
    ctx.closePath();
    fill(ctx, '#6b1020');
    ctx.save();
    ctx.clip();
    ellipse(ctx, 0, 88, 26, 18);
    fill(ctx, '#ff7a9c');
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-48, 40);
    ctx.quadraticCurveTo(0, 50, 48, 40);
    ctx.quadraticCurveTo(0, 115, -48, 40);
    ctx.closePath();
    stroke(ctx, 7);
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.moveTo(-34, 64);
    ctx.quadraticCurveTo(0, 36, 34, 64);
    stroke(ctx, 8);
  }
  if (mood === 'happy' || mood === 'sad') {
    ellipse(ctx, -ex - 22, 40, 20, 11);
    fill(ctx, 'rgba(255,90,120,0.45)');
    ellipse(ctx, ex + 22, 40, 20, 11);
    fill(ctx, 'rgba(255,90,120,0.45)');
  }
  ctx.restore();
}
