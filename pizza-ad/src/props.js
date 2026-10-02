// Top-down food props, painted once into sprites. Anchor (ax, ay) is the point that
// gets placed on the slice; the sprite's "up" is the slice's outward direction.
(function (G) {
  const { makeSimplex, fbm, mulberry32 } = G.N;
  const mk = (w, h) => { const c = G.TEX.canvas(w, h); return [c, c.getContext('2d')]; };

  function blobPath(ctx, cx, cy, rx, ry, seed, amp, lobes) {
    const n = makeSimplex(seed);
    ctx.beginPath();
    for (let k = 0; k <= 120; k++) {
      const a = k / 120 * Math.PI * 2;
      const w = 1 + amp * (n(Math.cos(a) * lobes, Math.sin(a) * lobes) * 0.7 + n(Math.cos(a) * lobes * 3, Math.sin(a) * lobes * 3) * 0.3);
      const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  // ------------------------------------------------------------ olive oil bottle
  // Seen from above while tilted towards the slice: neck points up in the sprite.
  function oilBottle() {
    const [c, x] = mk(150, 430);
    const cx = 75;
    // body
    const body = new Path2D();
    body.roundRect(cx - 56, 150, 112, 268, 30);
    let g = x.createLinearGradient(cx - 56, 0, cx + 56, 0);
    g.addColorStop(0, '#1d2e10'); g.addColorStop(0.18, '#55702a'); g.addColorStop(0.32, '#8ea24c');
    g.addColorStop(0.5, '#3e5a1c'); g.addColorStop(0.85, '#22350f'); g.addColorStop(1, '#122008');
    x.fillStyle = g; x.fill(body);
    // shoulder + neck
    x.beginPath();
    x.moveTo(cx - 56, 180); x.bezierCurveTo(cx - 56, 120, cx - 18, 118, cx - 16, 70);
    x.lineTo(cx + 16, 70); x.bezierCurveTo(cx + 18, 118, cx + 56, 120, cx + 56, 180); x.closePath();
    x.fillStyle = g; x.fill();
    x.fillStyle = g; x.fillRect(cx - 16, 34, 32, 40);
    // oil glow inside the glass
    g = x.createLinearGradient(0, 200, 0, 410);
    g.addColorStop(0, 'rgba(214,180,40,0.0)'); g.addColorStop(0.2, 'rgba(214,180,40,0.35)'); g.addColorStop(1, 'rgba(160,130,20,0.45)');
    x.fillStyle = g; x.beginPath(); x.roundRect(cx - 46, 200, 92, 208, 22); x.fill();
    // label
    g = x.createLinearGradient(cx - 56, 0, cx + 56, 0);
    g.addColorStop(0, '#b9ae92'); g.addColorStop(0.3, '#f4ecd8'); g.addColorStop(0.7, '#efe5cd'); g.addColorStop(1, '#9e9478');
    x.fillStyle = g; x.fillRect(cx - 56, 250, 112, 112);
    x.fillStyle = '#3b4a1e'; x.fillRect(cx - 56, 258, 112, 6); x.fillRect(cx - 56, 348, 112, 6);
    x.save(); x.translate(cx, 306); x.rotate(-Math.PI / 2);
    x.fillStyle = '#2e3b16'; x.font = '800 30px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('OLIO', 0, 0); x.restore();
    // pourer cap
    g = x.createLinearGradient(cx - 18, 0, cx + 18, 0);
    g.addColorStop(0, '#6d6d6d'); g.addColorStop(0.35, '#f2f2f2'); g.addColorStop(0.6, '#b8b8b8'); g.addColorStop(1, '#4e4e4e');
    x.fillStyle = g; x.beginPath(); x.roundRect(cx - 19, 20, 38, 26, 5); x.fill();
    x.fillStyle = '#d9d9d9'; x.beginPath(); x.moveTo(cx - 6, 22); x.lineTo(cx - 4, 2); x.lineTo(cx + 4, 2); x.lineTo(cx + 6, 22); x.fill();
    // glass highlights
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.roundRect(cx - 40, 172, 9, 230, 5); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.roundRect(cx + 28, 190, 5, 200, 3); x.fill();
    return { cv: c, ax: cx, ay: 2, w: 150, h: 430 };
  }

  // ------------------------------------------------------------ latte, top view
  function latteCup() {
    const [c, x] = mk(200, 160);
    const cx = 80, cy = 80, R = 66;
    // handle
    let g = x.createLinearGradient(0, cy - 12, 0, cy + 12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#dcdcdc'); g.addColorStop(1, '#a9a9a9');
    x.fillStyle = g; x.beginPath(); x.roundRect(cx + R - 10, cy - 13, 54, 26, 13); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.beginPath(); x.roundRect(cx + R + 14, cy - 5, 22, 10, 5); x.fill();
    // cup rim
    g = x.createRadialGradient(cx - 18, cy - 20, 10, cx, cy, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#f3f3f1'); g.addColorStop(0.93, '#d8d8d4'); g.addColorStop(1, '#b4b4ae');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
    // inner wall
    g = x.createRadialGradient(cx + 6, cy + 8, R * 0.6, cx, cy, R * 0.86);
    g.addColorStop(0, '#d6d4cf'); g.addColorStop(1, '#fbfbf9');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.86, 0, Math.PI * 2); x.fill();
    // coffee with crema
    const r2 = R * 0.76;
    g = x.createRadialGradient(cx - 6, cy - 6, 4, cx, cy, r2);
    g.addColorStop(0, '#d7a46f'); g.addColorStop(0.55, '#b27a45'); g.addColorStop(0.9, '#7c4a23'); g.addColorStop(1, '#5c3418');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r2, 0, Math.PI * 2); x.fill();
    // latte art heart
    x.save(); x.beginPath(); x.arc(cx, cy, r2 - 1, 0, Math.PI * 2); x.clip();
    x.filter = 'blur(1.2px)';
    x.fillStyle = 'rgba(250,240,222,0.95)';
    x.beginPath();
    const hx = cx + 2, hy = cy + 2, s = 1.05;
    x.moveTo(hx, hy + 26 * s);
    x.bezierCurveTo(hx - 40 * s, hy - 2 * s, hx - 26 * s, hy - 34 * s, hx, hy - 16 * s);
    x.bezierCurveTo(hx + 26 * s, hy - 34 * s, hx + 40 * s, hy - 2 * s, hx, hy + 26 * s);
    x.fill();
    x.fillStyle = 'rgba(180,120,70,0.9)';
    x.beginPath(); x.ellipse(hx, hy - 6, 9, 6, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(245,232,210,0.85)'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(hx, hy - 30); x.lineTo(hx, hy + 30); x.stroke();
    x.filter = 'none';
    x.restore();
    // foam ring
    x.strokeStyle = 'rgba(240,222,196,0.55)'; x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy, r2 - 2, 0, Math.PI * 2); x.stroke();
    // rim highlight
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, R * 0.93, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
    return { cv: c, ax: cx, ay: cy, w: 200, h: 160 };
  }

  // ------------------------------------------------------------ almond
  function almond(seed) {
    const [c, x] = mk(60, 40);
    const rnd = mulberry32(seed);
    const cx = 30, cy = 20, L = 23 + rnd() * 3, W = 12 + rnd() * 2;
    const path = new Path2D();
    path.moveTo(cx - L, cy);
    path.bezierCurveTo(cx - L * 0.6, cy - W * 1.15, cx + L * 0.5, cy - W * 1.05, cx + L, cy - 1);
    path.bezierCurveTo(cx + L * 0.5, cy + W * 1.05, cx - L * 0.6, cy + W * 1.15, cx - L, cy);
    let g = x.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, L);
    g.addColorStop(0, '#d9a066'); g.addColorStop(0.6, '#b0703a'); g.addColorStop(1, '#6e3c18');
    x.fillStyle = g; x.fill(path);
    x.save(); x.clip(path);
    x.strokeStyle = 'rgba(70,32,10,0.45)'; x.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
      const yy = cy - W + (k + 0.5) * (2 * W / 9) + (rnd() - 0.5) * 2;
      x.beginPath(); x.moveTo(cx - L, cy); x.quadraticCurveTo(cx, yy + (yy - cy) * 0.4, cx + L, cy - 1); x.stroke();
    }
    x.fillStyle = 'rgba(255,225,180,0.28)';
    x.beginPath(); x.ellipse(cx - 3, cy - 4, L * 0.55, W * 0.35, -0.05, 0, Math.PI * 2); x.fill();
    x.restore();
    return { cv: c, ax: cx, ay: cy, w: 60, h: 40 };
  }

  // ------------------------------------------------------------ wooden spoon with tomato sauce
  function spoon() {
    const [c, x] = mk(110, 420);
    const cx = 55;
    const wood = (x0, x1) => {
      const g = x.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#9c7040'); g.addColorStop(0.3, '#e0bb85'); g.addColorStop(0.55, '#d3a86f'); g.addColorStop(1, '#8f6234');
      return g;
    };
    // handle (points outward = up in the sprite)
    x.fillStyle = wood(cx - 12, cx + 12);
    x.beginPath(); x.moveTo(cx - 9, 6); x.quadraticCurveTo(cx, 0, cx + 9, 6); x.lineTo(cx + 12, 300); x.lineTo(cx - 12, 300); x.closePath(); x.fill();
    // bowl
    x.fillStyle = wood(cx - 46, cx + 46);
    x.beginPath(); x.ellipse(cx, 352, 44, 60, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = wood(cx - 14, cx + 14); x.fillRect(cx - 12, 280, 24, 30);
    // grain
    const rnd = mulberry32(5);
    x.strokeStyle = 'rgba(110,70,30,0.25)'; x.lineWidth = 1;
    for (let k = 0; k < 7; k++) { const o = (rnd() - 0.5) * 16; x.beginPath(); x.moveTo(cx + o, 10); x.lineTo(cx + o * 1.2, 300); x.stroke(); }
    // sauce
    let g = x.createRadialGradient(cx - 10, 340, 4, cx, 356, 48);
    g.addColorStop(0, '#d8492a'); g.addColorStop(0.6, '#a92c15'); g.addColorStop(1, '#6d170a');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, 356, 34, 47, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(70,90,30,0.8)';
    for (let k = 0; k < 9; k++) { x.beginPath(); x.ellipse(cx + (rnd() - 0.5) * 40, 356 + (rnd() - 0.5) * 60, 2.2, 1.3, rnd() * 3, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.55)';
    x.beginPath(); x.ellipse(cx - 13, 334, 7, 13, 0.3, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.beginPath(); x.ellipse(cx + 12, 372, 4, 9, 0.2, 0, Math.PI * 2); x.fill();
    return { cv: c, ax: cx, ay: 352, w: 110, h: 420 };
  }

  // ------------------------------------------------------------ fried egg
  function egg() {
    const [c, x] = mk(230, 230);
    const cx = 115, cy = 115;
    // crispy lace edge
    blobPath(x, cx, cy, 96, 88, 71, 0.16, 1.4);
    x.fillStyle = 'rgba(190,130,60,0.85)'; x.filter = 'blur(1.5px)'; x.fill(); x.filter = 'none';
    blobPath(x, cx, cy, 92, 84, 71, 0.16, 1.4);
    let g = x.createRadialGradient(cx + 6, cy + 4, 20, cx, cy, 96);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#fbfaf6'); g.addColorStop(0.9, '#e9e6de'); g.addColorStop(1, '#d6cfc0');
    x.fillStyle = g; x.fill();
    // browned bubbles near the edge
    const rnd = mulberry32(9);
    for (let k = 0; k < 40; k++) {
      const a = rnd() * Math.PI * 2, r = 62 + rnd() * 24;
      x.fillStyle = `rgba(200,150,90,${0.15 + rnd() * 0.25})`;
      x.beginPath(); x.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, 3 + rnd() * 5, 2 + rnd() * 3, a, 0, Math.PI * 2); x.fill();
    }
    // yolk
    const yx = cx + 8, yy = cy + 4;
    x.fillStyle = 'rgba(160,110,30,0.35)'; x.filter = 'blur(4px)';
    x.beginPath(); x.arc(yx + 4, yy + 6, 36, 0, Math.PI * 2); x.fill(); x.filter = 'none';
    g = x.createRadialGradient(yx - 10, yy - 12, 4, yx, yy, 36);
    g.addColorStop(0, '#ffd75a'); g.addColorStop(0.55, '#fbb321'); g.addColorStop(0.92, '#ec8f0c'); g.addColorStop(1, '#d97a08');
    x.fillStyle = g; x.beginPath(); x.arc(yx, yy, 35, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,240,0.85)';
    x.beginPath(); x.ellipse(yx - 12, yy - 14, 9, 6, -0.6, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,240,0.35)';
    x.beginPath(); x.ellipse(yx + 14, yy + 15, 5, 3, -0.6, 0, Math.PI * 2); x.fill();
    // pepper
    x.fillStyle = 'rgba(40,30,25,0.8)';
    for (let k = 0; k < 14; k++) { x.beginPath(); x.arc(cx + (rnd() - 0.5) * 120, cy + (rnd() - 0.5) * 110, 0.9 + rnd() * 1.2, 0, Math.PI * 2); x.fill(); }
    return { cv: c, ax: cx, ay: cy, w: 230, h: 230 };
  }

  // ------------------------------------------------------------ grilled chicken breast
  function chicken() {
    const [c, x] = mk(250, 170);
    const cx = 125, cy = 85;
    const shape = () => {
      x.beginPath();
      x.moveTo(cx - 108, cy + 6);
      x.bezierCurveTo(cx - 100, cy - 52, cx + 30, cy - 70, cx + 104, cy - 22);
      x.bezierCurveTo(cx + 122, cy - 4, cx + 110, cy + 38, cx + 70, cy + 52);
      x.bezierCurveTo(cx + 10, cy + 74, cx - 104, cy + 60, cx - 108, cy + 6);
      x.closePath();
    };
    shape();
    let g = x.createRadialGradient(cx - 10, cy - 10, 10, cx, cy, 120);
    g.addColorStop(0, '#e8ae68'); g.addColorStop(0.55, '#cf8a42'); g.addColorStop(1, '#94531f');
    x.fillStyle = g; x.fill();
    x.save(); shape(); x.clip();
    const n = makeSimplex(33);
    for (let k = 0; k < 260; k++) {
      const px = cx - 110 + (k * 37 % 220), py = cy - 70 + ((k * 53) % 140);
      const v = n(px / 18, py / 18);
      x.fillStyle = v > 0 ? `rgba(250,215,160,${v * 0.25})` : `rgba(140,80,30,${-v * 0.25})`;
      x.beginPath(); x.arc(px, py, 6, 0, Math.PI * 2); x.fill();
    }
    // grill marks
    x.filter = 'blur(2px)';
    for (let k = 0; k < 6; k++) {
      const ox = cx - 120 + k * 46;
      x.strokeStyle = 'rgba(58,24,6,0.85)'; x.lineWidth = 12;
      x.beginPath(); x.moveTo(ox, cy + 80); x.lineTo(ox + 70, cy - 80); x.stroke();
    }
    x.filter = 'none';
    // juicy highlights
    x.fillStyle = 'rgba(255,240,210,0.35)';
    x.beginPath(); x.ellipse(cx - 30, cy - 26, 40, 9, -0.25, 0, Math.PI * 2); x.fill();
    x.restore();
    // herbs
    const rnd = mulberry32(12);
    x.fillStyle = 'rgba(40,80,25,0.85)';
    for (let k = 0; k < 16; k++) { x.beginPath(); x.ellipse(cx + (rnd() - 0.5) * 170, cy + (rnd() - 0.5) * 80, 3 + rnd() * 2, 1.5, rnd() * 3, 0, Math.PI * 2); x.fill(); }
    return { cv: c, ax: cx, ay: cy, w: 250, h: 170 };
  }

  // ------------------------------------------------------------ salmon fillet + asparagus
  function salmon() {
    const [c, x] = mk(280, 230);
    const cx = 140, cy = 100;
    // asparagus spears under the fillet
    for (let k = 0; k < 3; k++) {
      const oy = cy + 72 + k * 17, ox = cx - 110 + k * 8;
      const g = x.createLinearGradient(0, oy - 7, 0, oy + 7);
      g.addColorStop(0, '#9cc25a'); g.addColorStop(0.5, '#6f9a35'); g.addColorStop(1, '#3f6420');
      x.fillStyle = g; x.beginPath(); x.roundRect(ox, oy - 7, 200, 14, 7); x.fill();
      x.fillStyle = '#5a8a2a';
      x.beginPath(); x.ellipse(ox + 205, oy, 16, 9, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(40,70,20,0.7)';
      for (let j = 0; j < 4; j++) { x.beginPath(); x.ellipse(ox + 40 + j * 40, oy, 4, 6, 0.6, 0, Math.PI * 2); x.fill(); }
    }
    // fillet
    const shape = () => {
      x.beginPath();
      x.moveTo(cx - 100, cy - 40);
      x.bezierCurveTo(cx - 40, cy - 64, cx + 60, cy - 62, cx + 104, cy - 34);
      x.bezierCurveTo(cx + 118, cy - 6, cx + 108, cy + 40, cx + 80, cy + 52);
      x.bezierCurveTo(cx + 20, cy + 64, cx - 70, cy + 60, cx - 104, cy + 38);
      x.bezierCurveTo(cx - 118, cy + 10, cx - 116, cy - 26, cx - 100, cy - 40);
      x.closePath();
    };
    shape();
    let g = x.createLinearGradient(cx, cy - 60, cx, cy + 60);
    g.addColorStop(0, '#f39a6c'); g.addColorStop(0.5, '#ee7d4f'); g.addColorStop(1, '#d9623a');
    x.fillStyle = g; x.fill();
    x.save(); shape(); x.clip();
    // white fat lines
    x.strokeStyle = 'rgba(255,226,206,0.75)'; x.lineWidth = 4;
    for (let k = -7; k < 8; k++) {
      const ox = cx + k * 16;
      x.beginPath(); x.moveTo(ox - 20, cy - 70); x.quadraticCurveTo(ox + 18, cy, ox - 20, cy + 70); x.stroke();
    }
    // seared top
    g = x.createRadialGradient(cx - 10, cy - 10, 20, cx, cy, 120);
    g.addColorStop(0, 'rgba(200,90,40,0)'); g.addColorStop(0.75, 'rgba(170,70,30,0.15)'); g.addColorStop(1, 'rgba(120,40,15,0.6)');
    x.fillStyle = g; x.fillRect(0, 0, 280, 230);
    x.fillStyle = 'rgba(255,240,225,0.35)';
    x.beginPath(); x.ellipse(cx - 20, cy - 30, 50, 8, -0.1, 0, Math.PI * 2); x.fill();
    x.restore();
    // lemon wedge
    x.save(); x.translate(cx + 96, cy - 50); x.rotate(0.5);
    g = x.createRadialGradient(0, 0, 4, 0, 0, 34);
    g.addColorStop(0, '#fff7c2'); g.addColorStop(0.8, '#f6dc4a'); g.addColorStop(1, '#e2b81c');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 34, 0, Math.PI); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,230,0.9)'; x.lineWidth = 2;
    for (let k = 1; k < 5; k++) { const a = k / 5 * Math.PI; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); x.stroke(); }
    x.restore();
    return { cv: c, ax: cx, ay: cy + 20, w: 280, h: 230 };
  }

  G.PROPS = { oilBottle, latteCup, almond, spoon, egg, chicken, salmon };
})(window);
