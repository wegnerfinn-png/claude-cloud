// Cartoon props. Every function draws at the current transform with its origin at the
// object's base (bottom centre) unless noted, so scenes can move and scale them freely.

import {
  OUT, clamp, lerp, prog, ease, rng, stroke, fill, rrect, circle, ellipse, linGrad, radGrad, face, star, text,
} from './engine.js';

// ---------- intro character ----------

export function drawBody(ctx, t, o = {}) {
  const { f = 1, mood = 'sad' } = o;
  const skin = '#f2b88f', skinDark = '#dc9a70', hair = '#4a2a1a', cloth = '#26223a';
  const wx = 80 + 58 * f, bx = 86 + 74 * f, hx = 120 + 26 * f, tx = 62 + 24 * f;
  const outerAt = (y) => lerp(hx - 4, 18 + 2 * tx, (y - 560) / 260);

  // arms (behind the torso)
  for (const s of [-1, 1]) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(s * 118, 222);
      ctx.quadraticCurveTo(s * (170 + 36 * f), 360, s * (176 + 42 * f), 540);
    };
    path();
    stroke(ctx, 64);
    path();
    stroke(ctx, 48, skin);
    circle(ctx, s * (176 + 42 * f), 548, 30);
    fill(ctx, skin);
    stroke(ctx, 8);
  }
  // thighs
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 4, 600);
    ctx.lineTo(s * (hx - 4), 560);
    ctx.lineTo(s * (18 + 2 * tx), 830);
    ctx.lineTo(s * 12, 830);
    ctx.closePath();
    fill(ctx, skin);
    stroke(ctx, 9);
  }
  // torso
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(-30, 176);
    ctx.quadraticCurveTo(-108, 180, -124, 224);
    ctx.bezierCurveTo(-120, 300, -wx - 4, 350, -wx, 400);
    ctx.bezierCurveTo(-bx, 430, -bx, 500, -hx, 540);
    ctx.lineTo(-hx + 4, 600);
    ctx.lineTo(hx - 4, 600);
    ctx.lineTo(hx, 540);
    ctx.bezierCurveTo(bx, 500, bx, 430, wx, 400);
    ctx.bezierCurveTo(wx + 4, 350, 120, 300, 124, 224);
    ctx.quadraticCurveTo(108, 180, 30, 176);
    ctx.closePath();
  };
  torso();
  fill(ctx, skin);
  ctx.save();
  torso();
  ctx.clip();
  // belly roundness
  ellipse(ctx, 0, 455, bx * 0.95, 110);
  fill(ctx, radGrad(ctx, 0, 440, 10, bx, [[0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]));
  // crop top
  ctx.fillStyle = cloth;
  ctx.fillRect(-200, 205, 400, 128);
  ellipse(ctx, 0, 196, 58, 40);
  fill(ctx, skin);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-90, 230, 40, 90);
  ctx.restore();
  torso();
  stroke(ctx, 9);
  ctx.beginPath();
  ctx.moveTo(-126, 333);
  ctx.lineTo(126, 333);
  stroke(ctx, 7);
  // belly button
  ctx.beginPath();
  ctx.arc(0, 472, 9, 0.2, Math.PI - 0.2);
  stroke(ctx, 6, skinDark);

  // fat glow + blobs
  if (f > 0.01) {
    ctx.save();
    ctx.globalAlpha = f;
    ellipse(ctx, 0, 455, bx * 1.15, 150);
    fill(ctx, radGrad(ctx, 0, 455, 20, bx * 1.15, [[0, 'rgba(255,170,20,0.65)'], [1, 'rgba(255,120,0,0)']]));
    const r = rng(3);
    const blobs = [];
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      blobs.push([Math.cos(a) * d * bx * 0.78, 455 + Math.sin(a) * d * 82, 13 + r() * 13]);
    }
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) blobs.push([s * (hx * 0.62 + (r() - 0.5) * 60), 650 + r() * 110, 11 + r() * 10]);
    }
    blobs.forEach(([x, y, rr], i) => {
      const rad = rr * (1 + 0.14 * Math.sin(t * 6 + i * 1.7)) * (0.6 + 0.4 * f);
      circle(ctx, x, y, rad);
      fill(ctx, radGrad(ctx, x - rad * 0.3, y - rad * 0.3, 1, rad * 1.2, [[0, '#fffbd0'], [0.45, '#ffd23a'], [1, '#e88a00']]));
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(160,80,0,0.6)';
      ctx.stroke();
    });
    ctx.restore();
  }
  // glowing abs
  const a = clamp(1 - f);
  if (a > 0.01) {
    ctx.save();
    ctx.globalAlpha = a;
    const pulse = 0.8 + 0.2 * Math.sin(t * 7);
    ellipse(ctx, 0, 420, 120, 140);
    fill(ctx, radGrad(ctx, 0, 420, 10, 140, [[0, `rgba(255,90,20,${0.55 * pulse})`], [1, 'rgba(255,60,0,0)']]));
    for (let row = 0; row < 3; row++) {
      for (const s of [-1, 1]) {
        rrect(ctx, s > 0 ? 6 : -60, 346 + row * 50, 54, 44, 16);
        fill(ctx, linGrad(ctx, 0, 346 + row * 50, 0, 390 + row * 50, [[0, '#ffe066'], [1, '#ff5a1f']]));
        stroke(ctx, 4, 'rgba(120,30,0,0.5)');
      }
    }
    ctx.restore();
  }
  // shorts
  const o1 = outerAt(662);
  ctx.beginPath();
  ctx.moveTo(-hx - 2, 520);
  ctx.lineTo(hx + 2, 520);
  ctx.lineTo(o1 + 8, 662);
  ctx.lineTo(10, 648);
  ctx.lineTo(0, 612);
  ctx.lineTo(-10, 648);
  ctx.lineTo(-o1 - 8, 662);
  ctx.closePath();
  fill(ctx, cloth);
  stroke(ctx, 9);
  ctx.beginPath();
  ctx.moveTo(-hx + 10, 548);
  ctx.lineTo(hx - 10, 548);
  stroke(ctx, 5, 'rgba(255,255,255,0.18)');

  // neck + head
  rrect(ctx, -24, 130, 48, 60, 12);
  fill(ctx, skinDark);
  ellipse(ctx, 0, 78, 76, 86);
  fill(ctx, hair);
  circle(ctx, 0, 0, 38);
  fill(ctx, hair);
  stroke(ctx, 8);
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 64, 100, 14, 20);
    fill(ctx, skin);
    stroke(ctx, 6);
  }
  ellipse(ctx, 0, 92, 64, 74);
  fill(ctx, skin);
  ctx.save();
  ellipse(ctx, 0, 92, 64, 74);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(-80, 90);
  ctx.lineTo(-80, 0);
  ctx.lineTo(80, 0);
  ctx.lineTo(80, 64);
  ctx.quadraticCurveTo(30, 30, -8, 52);
  ctx.quadraticCurveTo(-44, 70, -80, 90);
  ctx.closePath();
  fill(ctx, hair);
  ctx.restore();
  ellipse(ctx, 0, 92, 64, 74);
  stroke(ctx, 8);
  face(ctx, t, 0, 112, 0.46, mood, { skin });
}

// ---------- 1: white bread ----------

function loafPath(ctx, w = 460, bodyH = 210, domeH = 125) {
  // shokupan: three soft humps with shallow valleys between them
  const hw = w / 2, dw = w / 3, dip = domeH * 0.45, c = domeH * 1.3;
  ctx.beginPath();
  ctx.moveTo(-hw + 30, 0);
  ctx.quadraticCurveTo(-hw, 0, -hw, -30);
  ctx.lineTo(-hw, -bodyH);
  for (let i = 0; i < 3; i++) {
    const x0 = -hw + i * dw, x1 = x0 + dw;
    const y1 = i === 2 ? -bodyH : -bodyH - dip;
    ctx.bezierCurveTo(x0 + (i === 0 ? -6 : 10), -bodyH - c, x1 - (i === 2 ? -6 : 10), -bodyH - c, x1, y1);
  }
  ctx.lineTo(hw, -30);
  ctx.quadraticCurveTo(hw, 0, hw - 30, 0);
  ctx.closePath();
}

function breadSlice(ctx) {
  loafPath(ctx, 360, 170, 100);
  fill(ctx, linGrad(ctx, 0, -300, 0, 0, [[0, '#f7b458'], [1, '#d88630']]));
  stroke(ctx, 9);
  ctx.save();
  ctx.translate(0, -18);
  ctx.scale(0.86, 0.86);
  loafPath(ctx, 360, 170, 100);
  ctx.restore();
  fill(ctx, '#fff6df');
  ctx.save();
  ctx.clip();
  const r = rng(21);
  for (let i = 0; i < 70; i++) {
    ellipse(ctx, -160 + r() * 320, -r() * 300, 3 + r() * 6, 2 + r() * 3, r() * 3);
    fill(ctx, 'rgba(200,150,80,0.25)');
  }
  ctx.restore();
}

export function drawLoaf(ctx, t, o = {}) {
  const { slice = 0, mood = 'smug' } = o;
  // back slice peeking out, then leaning against the right side
  loafPath(ctx);
  fill(ctx, linGrad(ctx, 0, -340, 0, 0, [[0, '#ffc868'], [0.55, '#eb9a3e'], [1, '#c9772a']]));
  ctx.save();
  loafPath(ctx);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, -230 + (i + 0.45) * (460 / 3), -300, 44, 24, -0.25);
    fill(ctx, 'rgba(255,255,255,0.35)');
  }
  const r = rng(33);
  for (let i = 0; i < 40; i++) {
    ellipse(ctx, -220 + r() * 440, -20 - r() * 300, 3 + r() * 4, 2, r() * 3);
    fill(ctx, 'rgba(150,80,20,0.22)');
  }
  ctx.fillStyle = 'rgba(120,60,10,0.18)';
  ctx.fillRect(-240, -40, 480, 40);
  ctx.restore();
  loafPath(ctx);
  stroke(ctx, 10);
  for (const x of [-460 / 6, 460 / 6]) {
    ctx.beginPath();
    ctx.moveTo(x, -262);
    ctx.lineTo(x, -215);
    stroke(ctx, 6, 'rgba(120,60,10,0.35)');
  }
  face(ctx, t, 0, -128, 0.95, mood, { skin: '#eb9a3e' });
  if (slice > 0) {
    const p = ease.outBack(slice);
    ctx.save();
    ctx.translate(lerp(0, 290, p), lerp(-40, 8, p));
    ctx.rotate(lerp(-0.2, 0.16, p));
    ctx.scale(lerp(0.6, 1, p), lerp(0.6, 1, p));
    breadSlice(ctx);
    ctx.restore();
  }
}

// ---------- 2: beer ----------

export function drawMug(ctx, t, o = {}) {
  const { level = 0.85, foam = 1, drip = 1, mood = 'evil', pour = 0, pourTop = -1100 } = o;
  const top = -430, inner = { x: -144, y: -414, w: 288, h: 398 };
  // handle
  const handle = () => {
    ctx.beginPath();
    ctx.moveTo(150, -360);
    ctx.bezierCurveTo(300, -370, 300, -100, 150, -110);
  };
  handle();
  stroke(ctx, 66);
  handle();
  stroke(ctx, 48, '#cfeaf2');
  handle();
  stroke(ctx, 14, 'rgba(255,255,255,0.8)');
  // glass back
  rrect(ctx, -160, top, 320, 430, [12, 12, 44, 44]);
  fill(ctx, 'rgba(210,240,255,0.35)');
  // liquid
  const surf = inner.y + inner.h - inner.h * level;
  if (level > 0.001) {
    ctx.save();
    rrect(ctx, inner.x, inner.y, inner.w, inner.h, [6, 6, 32, 32]);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(inner.x, 20);
    for (let x = inner.x; x <= inner.x + inner.w; x += 12) {
      ctx.lineTo(x, surf + Math.sin(x * 0.04 + t * 7) * 6 * (1 - foam * 0.6));
    }
    ctx.lineTo(inner.x + inner.w, 20);
    ctx.closePath();
    fill(ctx, linGrad(ctx, 0, inner.y, 0, 0, [[0, '#ffd75a'], [1, '#e98a0c']]));
    const r = rng(9);
    for (let i = 0; i < 26; i++) {
      const x = inner.x + 12 + r() * (inner.w - 24), sp = 90 + r() * 160, sz = 4 + r() * 8, off = r() * 400;
      const depth = inner.y + inner.h - surf;
      const y = inner.y + inner.h - ((off + t * sp) % Math.max(1, depth));
      circle(ctx, x + Math.sin(t * 3 + i) * 4, y, sz);
      fill(ctx, 'rgba(255,255,230,0.7)');
    }
    ctx.restore();
  }
  // pouring stream from the tap
  if (pour > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp(pour * 3);
    rrect(ctx, -18 + Math.sin(t * 30) * 2, pourTop, 36, Math.max(0, surf - pourTop), 18);
    fill(ctx, linGrad(ctx, -18, 0, 18, 0, [[0, '#f0a020'], [0.5, '#ffd75a'], [1, '#f0a020']]));
    ctx.restore();
  }
  // foam
  if (foam > 0.01) {
    const fy = Math.min(surf, top + 20);
    const cloud = () => {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const x = -170 + i * 42.5;
        const r = (34 + (i % 3) * 8) * foam;
        ctx.moveTo(x + r, fy - 10 * foam);
        ctx.arc(x, fy - 10 * foam - (i % 2) * 14 * foam + Math.sin(t * 3 + i) * 3, r, 0, Math.PI * 2);
      }
      ctx.rect(-170, fy - 10 * foam, 340, 40 * foam);
    };
    // drips over the rim
    if (drip > 0) {
      for (const [dx, len] of [[-96, 150], [70, 100]]) {
        const L = 20 + len * drip;
        rrect(ctx, dx - 17, fy, 34, L, 17);
        stroke(ctx, 18);
        rrect(ctx, dx - 17, fy, 34, L, 17);
        fill(ctx, '#fffaf0');
      }
    }
    cloud();
    stroke(ctx, 18);
    cloud();
    fill(ctx, '#fffaf0');
    for (let i = 0; i < 4; i++) {
      circle(ctx, -120 + i * 80, fy - 26 * foam, 8 * foam);
      fill(ctx, 'rgba(230,220,200,0.9)');
    }
  }
  // glass front
  rrect(ctx, -160, top, 320, 430, [12, 12, 44, 44]);
  stroke(ctx, 11);
  rrect(ctx, -132, top + 40, 26, 300, 13);
  fill(ctx, 'rgba(255,255,255,0.5)');
  rrect(ctx, -160, -44, 320, 44, [0, 0, 44, 44]);
  fill(ctx, 'rgba(255,255,255,0.3)');
  face(ctx, t, 0, -205, 0.95, mood, { skin: '#f6b632' });
}

export function drawTap(ctx) {
  // silver faucet hanging from the top edge
  rrect(ctx, -30, -300, 60, 240, 14);
  fill(ctx, linGrad(ctx, -30, 0, 30, 0, [[0, '#9aa6b2'], [0.5, '#eef2f6'], [1, '#8a96a2']]));
  stroke(ctx, 9);
  rrect(ctx, -54, -80, 108, 60, 20);
  fill(ctx, linGrad(ctx, -54, 0, 54, 0, [[0, '#9aa6b2'], [0.5, '#eef2f6'], [1, '#8a96a2']]));
  stroke(ctx, 9);
  rrect(ctx, -22, -28, 44, 36, 10);
  fill(ctx, '#7d8995');
  stroke(ctx, 8);
}

// ---------- 3: sugary drinks ----------

function cupPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-180, -580);
  ctx.lineTo(180, -580);
  ctx.lineTo(136, -24);
  ctx.quadraticCurveTo(134, 0, 110, 0);
  ctx.lineTo(-110, 0);
  ctx.quadraticCurveTo(-134, 0, -136, -24);
  ctx.closePath();
}
const cupHalfWidth = (y) => lerp(136, 180, -y / 580);

export function pearlSpots() {
  const spots = [];
  const rows = [-38, -80, -122];
  rows.forEach((y, ri) => {
    const hw = cupHalfWidth(y) - 34;
    const n = ri === 1 ? 5 : 6;
    for (let i = 0; i < n; i++) spots.push([lerp(-hw, hw, n === 1 ? 0.5 : i / (n - 1)) + (ri === 1 ? 0 : 0), y]);
  });
  return spots;
}

export function drawBoba(ctx, t, o = {}) {
  const { pearls = 1, pearlT = -10, straw = 1, stripes = 1, mood = 'evil' } = o;
  cupPath(ctx);
  fill(ctx, 'rgba(255,255,255,0.25)');
  // tea
  ctx.save();
  cupPath(ctx);
  ctx.clip();
  ctx.fillStyle = linGrad(ctx, 0, -560, 0, 0, [[0, '#f7e0c0'], [1, '#dcab7a']]);
  ctx.fillRect(-200, -548, 400, 560);
  // brown-sugar "tiger" streaks
  const r = rng(4);
  for (let i = 0; i < 7; i++) {
    const x0 = -150 + i * 50 + r() * 20, len = (200 + r() * 200) * stripes, w = 18 + r() * 18;
    ctx.beginPath();
    ctx.moveTo(x0, -548);
    ctx.bezierCurveTo(x0 + 30, -548 + len * 0.33, x0 - 30, -548 + len * 0.66, x0 + 10, -548 + len);
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(128,64,20,0.55)';
    ctx.stroke();
  }
  ctx.restore();
  // tapioca pearls fall in one by one
  const spots = pearlSpots();
  spots.forEach(([x, y], i) => {
    if (i >= spots.length * pearls) return;
    const t0 = pearlT + i * 0.045;
    const p = pearlT < -5 ? 1 : prog(t, t0, 0.45);
    if (p <= 0) return;
    const py = lerp(-1150, y, ease.outBounce(p));
    circle(ctx, x, py, 25);
    fill(ctx, radGrad(ctx, x - 8, py - 8, 2, 30, [[0, '#7a4a2c'], [1, '#2b140a']]));
    stroke(ctx, 5);
    circle(ctx, x - 8, py - 9, 6);
    fill(ctx, 'rgba(255,255,255,0.55)');
  });
  // straw plunges through the lid
  if (straw > 0) {
    ctx.save();
    ctx.translate(112, lerp(-900, 0, ease.outCubic(straw)));
    ctx.rotate(0.1);
    rrect(ctx, -26, -800, 52, 760, 20);
    fill(ctx, linGrad(ctx, -26, 0, 26, 0, [[0, '#ff5d98'], [0.5, '#ff9dc2'], [1, '#e8457f']]));
    stroke(ctx, 9);
    ctx.restore();
  }
  // lid
  rrect(ctx, -196, -606, 392, 40, 16);
  fill(ctx, 'rgba(255,255,255,0.75)');
  stroke(ctx, 9);
  cupPath(ctx);
  stroke(ctx, 11);
  ctx.beginPath();
  ctx.moveTo(-150, -520);
  ctx.lineTo(-120, -150);
  stroke(ctx, 16, 'rgba(255,255,255,0.55)');
  face(ctx, t, 0, -330, 0.95, mood, { skin: '#eccaa0' });
}

export function drawSodaCan(ctx, t, o = {}) {
  const { mood = 'smug' } = o;
  rrect(ctx, -80, -290, 160, 290, 26);
  fill(ctx, linGrad(ctx, -80, 0, 80, 0, [[0, '#c8102e'], [0.45, '#ff4a5e'], [1, '#b00c26']]));
  stroke(ctx, 9);
  rrect(ctx, -70, -306, 140, 34, 12);
  fill(ctx, linGrad(ctx, -70, 0, 70, 0, [[0, '#a7b2bd'], [0.5, '#f2f5f8'], [1, '#98a4b0']]));
  stroke(ctx, 8);
  ctx.save();
  ctx.translate(0, -60);
  ctx.rotate(-0.08);
  ctx.beginPath();
  ctx.moveTo(-80, 0);
  ctx.bezierCurveTo(-30, -30, 30, 30, 80, 0);
  stroke(ctx, 16, '#fff');
  ctx.restore();
  text(ctx, 'SODA', 0, -105, { size: 46, color: '#fff', lw: 8, maxW: 130 });
  face(ctx, t, 0, -200, 0.55, mood, { skin: '#e8283f' });
}

export function drawSugarCube(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  rrect(ctx, -38, -38, 76, 76, 14);
  fill(ctx, '#ffffff');
  stroke(ctx, 7);
  rrect(ctx, -26, -26, 30, 16, 8);
  fill(ctx, '#eef3ff');
  const r = rng(Math.round(x * 3 + y));
  for (let i = 0; i < 6; i++) {
    circle(ctx, -24 + r() * 48, -24 + r() * 48, 2.5);
    fill(ctx, '#d5ddf0');
  }
  ctx.restore();
}

// ---------- 4: ice cream ----------

let popCanvas = null;

export function drawPopsicle(ctx, t, o = {}) {
  const { bite = 0, drip = 1, mood = 'smug', look = 0 } = o;
  if (!popCanvas) {
    popCanvas = document.createElement('canvas');
    popCanvas.width = 460;
    popCanvas.height = 760;
  }
  const c = popCanvas.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, 460, 760);
  c.translate(230, 740);
  // stick
  rrect(c, -28, -230, 56, 226, 28);
  fill(c, linGrad(c, -28, 0, 28, 0, [[0, '#e0a868'], [0.5, '#f5cf9a'], [1, '#d99e5c']]));
  stroke(c, 9);
  const body = () => rrect(c, -150, -660, 300, 470, [150, 150, 48, 48]);
  // melting drips
  for (const [dx, len] of [[-108, 110], [58, 70], [108, 150]]) {
    const L = 14 + len * drip;
    rrect(c, dx - 16, -230, 32, L + 20, 16);
    fill(c, '#4a2412');
    stroke(c, 8);
  }
  body();
  fill(c, linGrad(c, -150, 0, 150, 0, [[0, '#6b381f'], [0.4, '#5a2d17'], [1, '#3c1b0b']]));
  c.save();
  body();
  c.clip();
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    const y0 = -600 + i * 90;
    c.moveTo(-170, y0);
    for (let k = 0; k <= 8; k++) c.lineTo(-170 + k * 42, y0 - 50 + (k % 2 ? 30 : 0) + k * 6);
    stroke(c, 12, '#8a4c2c');
  }
  rrect(c, -118, -610, 26, 300, 13);
  fill(c, 'rgba(255,255,255,0.22)');
  c.restore();
  body();
  stroke(c, 10);
  face(c, t, 0, -420, 0.95, mood, { skin: '#5a2d17', look });
  // bite: cut the chocolate away and reveal pink ice cream inside
  if (bite > 0) {
    const bites = [[118, -610, 62], [150, -540, 54], [72, -664, 50]];
    c.globalCompositeOperation = 'destination-out';
    bites.forEach(([x, y, r]) => { circle(c, x, y, r * bite); c.fill(); });
    c.globalCompositeOperation = 'source-atop';
    bites.forEach(([x, y, r]) => { circle(c, x, y, r * bite + 22); fill(c, '#ff9cc0'); });
    bites.forEach(([x, y, r]) => { circle(c, x, y, r * bite + 22); stroke(c, 5, '#c85a86'); });
    bites.forEach(([x, y, r]) => { circle(c, x, y, r * bite); stroke(c, 18); });
    c.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(popCanvas, -230, -740);
}

export function drawCone(ctx, t, o = {}) {
  const { layers = 1 } = o;
  // cone
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-100, -270);
  ctx.lineTo(100, -270);
  ctx.closePath();
  fill(ctx, linGrad(ctx, -100, 0, 100, 0, [[0, '#e7a14e'], [1, '#c97c2c']]));
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,60,10,0.45)';
  ctx.lineWidth = 6;
  for (let i = -6; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 40 - 200, -300);
    ctx.lineTo(i * 40 + 100, 0);
    ctx.moveTo(i * 40 + 200, -300);
    ctx.lineTo(i * 40 - 100, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-100, -270);
  ctx.lineTo(100, -270);
  ctx.closePath();
  stroke(ctx, 9);
  // soft-serve swirl, layer by layer
  const cols = ['#fff1a8', '#ffb3d1', '#a8e6ff', '#b8ffb0', '#d7b8ff', '#ffd1a8'];
  const widths = [128, 118, 104, 88, 68, 44];
  let y = -262;
  for (let i = 0; i < cols.length; i++) {
    const p = prog(layers * cols.length, i, 1);
    if (p <= 0) break;
    const drop = (1 - ease.outBounce(p)) * -400;
    const w = widths[i], h = 44;
    ctx.save();
    ctx.translate(Math.sin(i * 1.3) * 6, y + drop);
    rrect(ctx, -w, -h, w * 2, h + 10, h * 0.6);
    fill(ctx, cols[i]);
    stroke(ctx, 8);
    ctx.beginPath();
    ctx.moveTo(-w * 0.6, -h * 0.55);
    ctx.quadraticCurveTo(0, -h * 0.9, w * 0.6, -h * 0.55);
    stroke(ctx, 7, 'rgba(255,255,255,0.7)');
    ctx.restore();
    y -= 40;
  }
}

// ---------- 5: potato chips ----------

export function drawChip(ctx, x, y, r, rot, seed = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const rr = rng(seed);
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const k = r * (0.85 + rr() * 0.25);
    pts.push([Math.cos(a) * k, Math.sin(a) * k * 0.78]);
  }
  ctx.beginPath();
  for (let i = 0; i <= 9; i++) {
    const [ax, ay] = pts[i % 9], [bx, by] = pts[(i + 1) % 9];
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    i ? ctx.quadraticCurveTo(ax, ay, mx, my) : ctx.moveTo(mx, my);
  }
  ctx.closePath();
  fill(ctx, radGrad(ctx, -r * 0.3, -r * 0.3, 2, r * 1.2, [[0, '#ffe58a'], [1, '#f0a232']]));
  stroke(ctx, Math.max(4, r * 0.1));
  for (let i = 0; i < 4; i++) {
    circle(ctx, (rr() - 0.5) * r, (rr() - 0.5) * r * 0.7, r * 0.07);
    fill(ctx, 'rgba(190,90,20,0.6)');
  }
  ctx.beginPath();
  ctx.arc(-r * 0.1, -r * 0.05, r * 0.5, Math.PI * 1.1, Math.PI * 1.6);
  stroke(ctx, r * 0.1, 'rgba(255,255,255,0.6)');
  ctx.restore();
}

function bagPath(ctx, inflate, torn) {
  const bulge = 26 * inflate;
  ctx.beginPath();
  if (torn) {
    const r = rng(8);
    ctx.moveTo(-190, -236);
    for (let i = 1; i <= 12; i++) ctx.lineTo(-190 + (380 * i) / 12, -236 - (i % 2 ? 26 + r() * 16 : r() * 8));
  } else {
    ctx.moveTo(-200, -280);
    for (let i = 1; i <= 16; i++) ctx.lineTo(-200 + (400 * i) / 16, -280 + (i % 2 ? 14 : 0));
  }
  ctx.bezierCurveTo(200 + bulge, -120, 200 + bulge, 120, 200, 270);
  for (let i = 1; i <= 16; i++) ctx.lineTo(200 - (400 * i) / 16, 270 + (i % 2 ? 14 : 0));
  ctx.bezierCurveTo(-200 - bulge, 120, -200 - bulge, -120, torn ? -190 : -200, torn ? -236 : -280);
  ctx.closePath();
}

// Origin: bag centre.
export function drawChipBag(ctx, t, o = {}) {
  const { inflate = 0, torn = false, mood = 'evil' } = o;
  if (torn) {
    drawChip(ctx, -70, -250, 60, -0.5, 3);
    drawChip(ctx, 60, -262, 66, 0.4, 4);
    drawChip(ctx, 0, -236, 58, 0.1, 5);
  }
  bagPath(ctx, inflate, torn);
  fill(ctx, linGrad(ctx, -200, 0, 200, 0, [[0, '#c4122a'], [0.45, '#ff3b3b'], [1, '#b30f25']]));
  ctx.save();
  bagPath(ctx, inflate, torn);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-150, -300, 36, 600);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-100, -300, 16, 600);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-220, 206, 440, 80);
  ctx.restore();
  bagPath(ctx, inflate, torn);
  stroke(ctx, 10);
  if (torn) {
    ellipse(ctx, 0, -236, 180, 24);
    fill(ctx, '#5a0b14');
    stroke(ctx, 8);
  }
  // label burst
  ctx.save();
  ctx.translate(0, 95);
  ctx.rotate(t * 0.3);
  star(ctx, 0, 0, 132, 0);
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const rr = i % 2 ? 108 : 132;
    const a = (i / 32) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  fill(ctx, '#ffd23f');
  stroke(ctx, 8);
  ctx.restore();
  drawChip(ctx, 0, 70, 58, 0.2, 7);
  text(ctx, 'CHIPS', 0, 150, { size: 64, color: '#ff3b3b', lw: 12, maxW: 220, outline: '#fff', shadow: false });
  face(ctx, t, 0, -110, 0.9, mood, { skin: '#ff3b3b' });
}

export function drawPotato(ctx, t, o = {}) {
  const { mood = 'happy' } = o;
  ctx.beginPath();
  ctx.moveTo(0, -150);
  ctx.bezierCurveTo(120, -160, 150, -40, 130, 30);
  ctx.bezierCurveTo(110, 110, -100, 120, -130, 40);
  ctx.bezierCurveTo(-160, -50, -110, -140, 0, -150);
  ctx.closePath();
  fill(ctx, radGrad(ctx, -30, -60, 10, 170, [[0, '#e3ad6c'], [1, '#b87934']]));
  stroke(ctx, 9);
  const r = rng(2);
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, -90 + r() * 180, -110 + r() * 180, 7, 5, r() * 3);
    fill(ctx, 'rgba(110,60,20,0.45)');
  }
  face(ctx, t, 0, -30, 0.62, mood, { skin: '#d49a58' });
}

export function drawBakedChips(ctx, t) {
  rrect(ctx, -170, -20, 340, 44, 14);
  fill(ctx, linGrad(ctx, 0, -20, 0, 24, [[0, '#c9d2dc'], [1, '#8d98a4']]));
  stroke(ctx, 8);
  const pos = [[-100, -52, -0.3], [-30, -70, 0.2], [45, -58, -0.1], [110, -44, 0.4], [-60, -96, 0.5], [30, -110, -0.4], [95, -92, 0.1]];
  pos.forEach(([x, y, a], i) => drawChip(ctx, x, y, 54, a, 20 + i));
  const r = rng(12);
  for (let i = 0; i < 14; i++) {
    circle(ctx, -140 + r() * 280, -140 + r() * 110, 4);
    fill(ctx, '#2e9e4f');
  }
}

// ---------- 6: refined carbs ----------

export function drawRiceBowl(ctx, t, o = {}) {
  const { mood = 'smug', steam = 1 } = o;
  // steam
  if (steam > 0) {
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.55 + k / 3) % 1;
      ctx.save();
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.7 * steam;
      ctx.beginPath();
      const x0 = -90 + k * 90;
      for (let i = 0; i <= 20; i++) {
        const y = -230 - ph * 120 - i * 11;
        ctx.lineTo(x0 + Math.sin(i * 0.5 + t * 3 + k) * 20, y);
      }
      stroke(ctx, 16, '#ffffff');
      ctx.restore();
    }
  }
  // rice dome
  const dome = () => {
    ctx.beginPath();
    ctx.ellipse(0, 10, 250, 215, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
  };
  dome();
  fill(ctx, linGrad(ctx, 0, -210, 0, 10, [[0, '#ffffff'], [1, '#e9e5da']]));
  ctx.save();
  dome();
  ctx.clip();
  const r = rng(6);
  for (let i = 0; i < 170; i++) {
    const x = -240 + r() * 480, y = 10 - r() * 220;
    ellipse(ctx, x, y, 17, 7.5, r() * Math.PI);
    fill(ctx, '#ffffff');
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d6d1c4';
    ctx.stroke();
  }
  ctx.restore();
  dome();
  stroke(ctx, 10);
  face(ctx, t, 0, -95, 0.85, mood, { skin: '#f3f0e7' });
  // bowl
  const bowl = () => {
    ctx.beginPath();
    ctx.moveTo(-285, 0);
    ctx.bezierCurveTo(-285, 190, -150, 250, 0, 250);
    ctx.bezierCurveTo(150, 250, 285, 190, 285, 0);
    ctx.closePath();
  };
  rrect(ctx, -110, 232, 220, 40, 14);
  fill(ctx, '#2a58b8');
  stroke(ctx, 9);
  bowl();
  fill(ctx, linGrad(ctx, -285, 0, 285, 0, [[0, '#2f67d2'], [0.4, '#4f92f2'], [1, '#2556b8']]));
  ctx.save();
  bowl();
  ctx.clip();
  ctx.beginPath();
  for (let x = -300; x <= 300; x += 10) ctx.lineTo(x, 95 + Math.sin(x * 0.045) * 16);
  stroke(ctx, 12, 'rgba(255,255,255,0.85)');
  for (let i = 0; i < 7; i++) {
    circle(ctx, -210 + i * 70, 160, 9);
    fill(ctx, 'rgba(255,255,255,0.8)');
  }
  ctx.restore();
  bowl();
  stroke(ctx, 10);
  ctx.beginPath();
  ctx.ellipse(0, 0, 285, 22, 0, 0, Math.PI);
  stroke(ctx, 10);
}

export function drawRiceCake(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0, 110, 38, 0, 0, Math.PI);
  ctx.lineTo(-110, -34);
  ctx.ellipse(0, -34, 110, 38, 0, Math.PI, 0, true);
  ctx.closePath();
  fill(ctx, '#e2bd78');
  stroke(ctx, 8);
  ellipse(ctx, 0, -34, 110, 38);
  fill(ctx, '#f6e2ae');
  stroke(ctx, 8);
  const r = rng(Math.round(x + y));
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    circle(ctx, Math.cos(a) * d * 90, -34 + Math.sin(a) * d * 28, 5 + r() * 5);
    fill(ctx, 'rgba(255,255,255,0.65)');
  }
  ctx.restore();
}

// ---------- outro recap thumbnails ----------

export const thumbs = [
  (ctx, t) => { ctx.scale(0.5, 0.5); ctx.translate(0, 190); drawLoaf(ctx, t, { mood: 'ko' }); },
  (ctx, t) => { ctx.scale(0.5, 0.5); ctx.translate(-20, 230); drawMug(ctx, t, { mood: 'ko' }); },
  (ctx, t) => { ctx.scale(0.4, 0.4); ctx.translate(0, 330); drawBoba(ctx, t, { mood: 'ko' }); },
  (ctx, t) => { ctx.scale(0.36, 0.36); ctx.translate(0, 360); drawPopsicle(ctx, t, { mood: 'ko', bite: 1 }); },
  (ctx, t) => { ctx.scale(0.42, 0.42); ctx.translate(0, 0); drawChipBag(ctx, t, { mood: 'ko' }); },
  (ctx, t) => { ctx.scale(0.46, 0.46); ctx.translate(0, 90); drawRiceBowl(ctx, t, { mood: 'ko', steam: 0 }); },
];
