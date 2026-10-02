// Procedural, photo-like textures: concrete table, round wooden board, pizza.
// Each one is rendered pixel by pixel once at load and cached as a canvas.
(function (G) {
  const { makeSimplex, fbm, clamp, lerp, smooth, hex, mix3 } = G.N;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // Light comes from the top left, slightly from above (like the window light in the reference).
  const LIGHT = (() => { const l = [-0.55, -0.62, 0.56]; const m = Math.hypot(...l); return l.map(v => v / m); })();

  // ---------------------------------------------------------------- concrete
  function concrete(W, H, seed) {
    const c = canvas(W, H), ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H), d = img.data;
    const n1 = makeSimplex(seed + 1), n2 = makeSimplex(seed + 2), n3 = makeSimplex(seed + 3),
      n4 = makeSimplex(seed + 4), n5 = makeSimplex(seed + 5), n6 = makeSimplex(seed + 6), n7 = makeSimplex(seed + 7);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const big = fbm(n1, x / 600, y / 600, 3);
        const cloud = fbm(n2, x / 120, y / 120, 5, 2.0, 0.6);
        const patch = smooth(0.18, 0.6, cloud + big * 0.3);
        const mott = fbm(n7, x / 28, y / 28, 3);
        let L = 0.67 + big * 0.03 + patch * 0.065 + mott * 0.025;
        L += n3(x / 1.5, y / 1.5) * 0.02 + n4(x / 4, y / 4) * 0.014;
        const pore = n5(x / 2.0, y / 2.0);
        if (pore < -0.8) L -= (-0.8 - pore) * 0.8;
        const speck = n6(x / 1.8, y / 1.8);
        if (speck > 0.8) L += (speck - 0.8) * 0.7 * (0.4 + patch);
        // soft window light from top left, falling off to bottom right
        const gx = x / W, gy = y / H;
        L *= 1.06 - 0.1 * (gx * 0.5 + gy * 0.8) - 0.05 * Math.pow(Math.hypot(gx - 0.5, gy - 0.5) * 1.4, 2);
        const i = (y * W + x) * 4;
        d[i] = clamp(L * 250, 0, 255);
        d[i + 1] = clamp(L * 258, 0, 255);
        d[i + 2] = clamp(L * 266, 0, 255);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- wooden board
  // Returns { cv, R, pad } — a round serving board with a raised rim.
  function board(R, seed) {
    const pad = 4, S = Math.ceil(R * 2 + pad * 2);
    const c = canvas(S, S), ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S), d = img.data;
    const n1 = makeSimplex(seed + 11), n2 = makeSimplex(seed + 12), n3 = makeSimplex(seed + 13), n4 = makeSimplex(seed + 14),
      n5 = makeSimplex(seed + 15);
    const cx = S / 2, cy = S / 2;
    const ga = 0.32, ca = Math.cos(ga), sa = Math.sin(ga);
    const rimW = R * 0.12, rimTop = R - rimW * 0.38;
    const dark = hex('#56321a'), mid = hex('#83502a'), light = hex('#a86f3e'), hi = hex('#c08552');
    const a0 = (dx, dy) => Math.atan2(dy, dx);
    function height(r) {
      // floor at 0, rim rises to 1 at rimTop, rounds down to 0.55 at the outer edge
      if (r < R - rimW) return 0;
      if (r < rimTop) { const t = (r - (R - rimW)) / (rimTop - (R - rimW)); return t * t * (3 - 2 * t); }
      const t = (r - rimTop) / (R - rimTop); return 1 - 0.45 * t * t;
    }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        const i = (y * S + x) * 4;
        if (r > R + 1) { d[i + 3] = 0; continue; }
        // grain coordinates (u along the grain, v across)
        const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        const warp = fbm(n1, u / 380, v / 90, 4) * 7 + fbm(n2, u / 120, v / 30, 2) * 1.4;
        const ring = Math.sin(v * 0.11 + warp);
        const ring2 = Math.sin(v * 0.37 + warp * 1.7);
        const fiber = n3(u / 70, v / 1.3) * 0.5 + n4(u / 25, v / 0.8) * 0.5;
        let w = 0.5 + 0.22 * ring + 0.1 * ring2 + 0.08 * fiber + fbm(n5, x / 160, y / 160, 3) * 0.12;
        let col = w < 0.5 ? mix3(dark, mid, clamp(w / 0.5, 0, 1)) : mix3(mid, light, clamp((w - 0.5) / 0.5, 0, 1));
        // the rim is end-grain-ish and a bit lighter / oilier
        const h = height(r);
        const eps = 0.6;
        const dh = (height(r + eps) - height(r - eps)) / (2 * eps) * rimW * 0.9;
        const nx = r > 0 ? -dh * dx / r : 0, ny = r > 0 ? -dh * dy / r : 0, nz = 1;
        const nm = Math.hypot(nx, ny, nz);
        const ndl = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nm;
        let shade = 0.38 + 0.78 * ndl;
        col = mix3(col, hi, h * 0.3);
        // lathe rings on the turned rim
        if (h > 0) { const lr = Math.sin(r * 1.9 + n2(r / 5, a0(dx, dy) * 3) * 2) * 0.5 + 0.5; col = mix3(col, dark, lr * 0.12 * h); }
        // ambient occlusion on the floor next to the rim, plus a darker worn centre
        const ao = r < R - rimW ? smooth(R - rimW - R * 0.07, R - rimW, r) * 0.25 : 0;
        shade *= 1 - ao;
        shade *= 0.92 + 0.08 * smooth(0, R * 0.8, r);
        // satin sheen on the rim top
        const sheen = Math.pow(Math.max(0, ndl), 18) * 0.35 * h;
        let rr = col[0] * shade + 255 * sheen, gg = col[1] * shade + 235 * sheen, bb = col[2] * shade + 200 * sheen;
        d[i] = clamp(rr, 0, 255); d[i + 1] = clamp(gg, 0, 255); d[i + 2] = clamp(bb, 0, 255);
        d[i + 3] = clamp((R + 1 - r) * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    // crumbs and a faint grease ring that only show once slices are pulled apart
    const rnd = G.N.mulberry32(seed + 99);
    for (let k = 0; k < 260; k++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * 0.78;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const s = 0.8 + rnd() * 2.6;
      ctx.fillStyle = rnd() < 0.5 ? `rgba(226,180,110,${0.55 + rnd() * 0.4})` : `rgba(150,70,30,${0.35 + rnd() * 0.4})`;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.6 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 0.86);
    g.addColorStop(0, 'rgba(60,25,8,0)'); g.addColorStop(0.75, 'rgba(60,25,8,0.18)'); g.addColorStop(1, 'rgba(60,25,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.fill();
    return { cv: c, R, pad, S };
  }

  // ---------------------------------------------------------------- pizza
  // Margherita-style, cheese baked orange with browned blisters, raised crust.
  function pizza(R, seed) {
    const pad = 10, S = Math.ceil(R * 2 + pad * 2);
    const c = canvas(S, S), ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S), d = img.data;
    const nE = makeSimplex(seed + 21), nW = makeSimplex(seed + 22), nC = makeSimplex(seed + 23), nB = makeSimplex(seed + 24),
      nB2 = makeSimplex(seed + 25), nF = makeSimplex(seed + 26), nH = makeSimplex(seed + 27), nS = makeSimplex(seed + 28),
      nK = makeSimplex(seed + 29), nT = makeSimplex(seed + 30);
    const cx = S / 2, cy = S / 2;
    const sauce = hex('#ad3714'), orange = hex('#c85321'), cheeseA = hex('#e4953f'), cheeseB = hex('#f1bb63');
    const brown = hex('#8e3313'), burnt = hex('#561a07');
    const crustLo = hex('#9c5222'), crustMid = hex('#d48a42'), crustHi = hex('#ebb46c'), toast = hex('#80401a');
    const nY = makeSimplex(seed + 31), nL = makeSimplex(seed + 32);

    const edgeR = (a) => R - 3 + 3.5 * nE(Math.cos(a) * 1.6, Math.sin(a) * 1.6) + 1.4 * nE(Math.cos(a) * 6 + 9, Math.sin(a) * 6);
    const innerR = (a, er) => er - (R * 0.058 + 3.5 * nW(Math.cos(a) * 2.2 + 4, Math.sin(a) * 2.2) + 2 * nW(Math.cos(a) * 9, Math.sin(a) * 9 + 3));

    function browning(x, y, wx, wy, large) {
      return fbm(nB, (x + wx) / 20, (y + wy) / 20, 4) * 0.75 + fbm(nB2, x / 55, y / 55, 3) * 0.5 - large * 0.35;
    }
    function cheeseColor(x, y) {
      const wx = fbm(nW, x / 50, y / 50, 3) * 14, wy = fbm(nW, x / 50 + 31, y / 50 + 17, 3) * 14;
      const rc = Math.hypot(x - cx, y - cy) / R;
      const large = fbm(nC, x / 140, y / 140, 3) + 0.35 - rc * 0.55;
      let col = mix3(sauce, orange, smooth(-0.6, 0.6, fbm(nF, x / 26 + 9, y / 26, 3) + large * 0.3));
      const pool = smooth(-0.05, 0.55, fbm(nY, (x + wx) / 26, (y + wy) / 26, 4) + large * 0.45);
      col = mix3(col, cheeseA, pool * 0.6);
      col = mix3(col, cheeseB, smooth(0.45, 0.9, fbm(nY, (x + wx) / 12 + 40, (y + wy) / 12, 3) + large * 0.3) * pool * 0.5);
      const b = browning(x, y, wx, wy, large);
      col = mix3(col, brown, smooth(0.12, 0.4, b) * 0.82);
      col = mix3(col, burnt, smooth(0.42, 0.8, b) * 0.55);
      const g = nF(x / 1.5, y / 1.5) * 0.035 + nF(x / 3.5, y / 3.5 + 50) * 0.03;
      return [col[0] * (1 + g), col[1] * (1 + g), col[2] * (1 + g)];
    }

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const i = (y * S + x) * 4;
        const er = edgeR(a);
        if (r > er + 1.5) { d[i + 3] = 0; continue; }
        const ir = innerR(a, er);
        let col;
        if (r < ir + 2) {
          col = cheeseColor(x, y);
          const e = smooth(ir - 22, ir, r);
          col = mix3(col, brown, e * 0.4);
        } else {
          // low, golden crust lip
          const t = (r - ir) / (er - ir);
          const h = Math.sin(Math.PI * clamp(t * 0.85 + 0.12, 0, 1));
          const dh = Math.cos(Math.PI * clamp(t * 0.85 + 0.12, 0, 1)) * Math.PI / (er - ir) * 9;
          const nx = -dh * dx / r, ny = -dh * dy / r, nz = 1, nm = Math.hypot(nx, ny, nz);
          const ndl = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nm;
          let base = mix3(crustLo, crustMid, h);
          base = mix3(base, crustHi, Math.pow(h, 2) * 0.55);
          const tt = fbm(nT, x / 7, y / 7, 3) + 0.5 * fbm(nT, x / 35, y / 35, 2);
          base = mix3(base, toast, smooth(0.2, 0.7, tt) * 0.55);
          const flour = nF(x / 1.3 + 77, y / 1.3);
          if (flour > 0.8) base = mix3(base, [246, 228, 196], (flour - 0.8) * 2);
          const sh = 0.72 + 0.42 * ndl;
          col = [base[0] * sh, base[1] * sh, base[2] * sh];
        }
        d[i] = clamp(col[0], 0, 255);
        d[i + 1] = clamp(col[1], 0, 255);
        d[i + 2] = clamp(col[2], 0, 255);
        d[i + 3] = clamp((er + 1.5 - r) / 1.5 * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);

    // --- painted layer: grated cheese melted into strands, browned blisters, oregano
    const rnd = G.N.mulberry32(seed + 77);
    const cheesePath = new Path2D();
    for (let k = 0; k <= 360; k++) {
      const a = k / 360 * Math.PI * 2, rr = innerR(a, edgeR(a)) + 3;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      k ? cheesePath.lineTo(px, py) : cheesePath.moveTo(px, py);
    }
    ctx.save();
    ctx.clip(cheesePath);
    const flowA = makeSimplex(seed + 41);
    const RR = R * 0.97;
    function rpt() { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * RR; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, r]; }

    // darker sauce showing through in places
    for (let k = 0; k < 160; k++) {
      const [x, y] = rpt(), s = 8 + rnd() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, `rgba(160,48,18,${0.18 + rnd() * 0.2})`); g.addColorStop(1, 'rgba(160,48,18,0)');
      ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    // cheese strands (two passes: wide soft melt, then thin strands), each pass drawn
    // into its own layer and blurred once
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      const layer = canvas(S, S), lx = layer.getContext('2d');
      lx.lineCap = 'round';
      const count = pass ? 2000 : 1800;
      for (let k = 0; k < count; k++) {
        const [x, y, r] = rpt();
        const len = (pass ? 7 : 12) + rnd() * (pass ? 18 : 26);
        const ang = flowA(x / 90, y / 90) * 3 + rnd() * 1.2;
        const bend = (rnd() - 0.5) * len * 0.8;
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        const mx = (x + ex) / 2 - Math.sin(ang) * bend, my = (y + ey) / 2 + Math.cos(ang) * bend;
        const edge = smooth(RR * 0.6, RR, r);
        const tone = rnd();
        const col = tone < 0.6 ? [228, 136, 52] : tone < 0.9 ? [238, 164, 78] : [246, 196, 118];
        const al = (pass ? 0.16 + rnd() * 0.3 : 0.1 + rnd() * 0.14) * (1 - edge * 0.6);
        lx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${al})`;
        lx.lineWidth = pass ? 1.6 + rnd() * 2.6 : 5 + rnd() * 7;
        lx.beginPath(); lx.moveTo(x, y); lx.quadraticCurveTo(mx, my, ex, ey); lx.stroke();
      }
      ctx.filter = pass ? 'blur(0.6px)' : 'blur(1.8px)';
      ctx.drawImage(layer, 0, 0);
      ctx.filter = 'none';
    }
    // baked browning painted back over the cheese strands
    {
      const bl = ctx.createImageData(S, S), bd = bl.data;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const rc = Math.hypot(x - cx, y - cy) / R;
        if (rc > 1) continue;
        const wx = fbm(nW, x / 50, y / 50, 3) * 14, wy = fbm(nW, x / 50 + 31, y / 50 + 17, 3) * 14;
        const large = fbm(nC, x / 140, y / 140, 3) + 0.35 - rc * 0.55;
        const b = browning(x, y, wx, wy, large);
        const a1 = smooth(0.1, 0.42, b), a2 = smooth(0.42, 0.8, b);
        const i = (y * S + x) * 4;
        bd[i] = 140 - a2 * 60; bd[i + 1] = 48 - a2 * 22; bd[i + 2] = 16 - a2 * 8;
        bd[i + 3] = clamp((a1 * 0.62 + a2 * 0.3) * 255, 0, 255);
      }
      const lc = canvas(S, S); lc.getContext('2d').putImageData(bl, 0, 0);
      ctx.drawImage(lc, 0, 0);
    }
    // larger baked patches towards the rim
    for (let k = 0; k < 120; k++) {
      const a = rnd() * Math.PI * 2, rr = RR * (0.62 + rnd() * 0.38);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, s = 10 + rnd() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, `rgba(140,48,16,${0.22 + rnd() * 0.2})`); g.addColorStop(1, 'rgba(140,48,16,0)');
      ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    // browned blisters: more of them towards the rim, like an oven-baked frozen pizza
    for (let k = 0; k < 520; k++) {
      let [x, y, r] = rpt();
      if (rnd() < 0.45) { const a = rnd() * Math.PI * 2, rr = RR * (0.72 + rnd() * 0.28); x = cx + Math.cos(a) * rr; y = cy + Math.sin(a) * rr; r = rr; }
      const s = 2.5 + rnd() * (r > RR * 0.7 ? 10 : 6.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const dk = rnd() < 0.3;
      g.addColorStop(0, dk ? `rgba(92,30,10,${0.5 + rnd() * 0.3})` : `rgba(150,60,22,${0.35 + rnd() * 0.3})`);
      g.addColorStop(0.6, dk ? 'rgba(110,40,14,0.25)' : 'rgba(160,70,25,0.15)');
      g.addColorStop(1, 'rgba(150,60,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.6 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // oregano flecks
    for (let k = 0; k < 140; k++) {
      const [x, y] = rpt(), s = 0.8 + rnd() * 1.6;
      ctx.fillStyle = `rgba(${50 + rnd() * 20},${52 + rnd() * 20},${22},${0.55 + rnd() * 0.35})`;
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // oily highlights
    for (let k = 0; k < 220; k++) {
      const [x, y] = rpt(), s = 1 + rnd() * 2.5;
      ctx.fillStyle = `rgba(255,240,205,${0.18 + rnd() * 0.25})`;
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.5, s, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // light falloff across the whole pie (keeps alpha)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const lg = ctx.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0, 'rgba(255,240,220,0.08)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(40,10,0,0.14)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, S, S);
    ctx.restore();
    return { cv: c, R, pad, S, edgeR };
  }

  G.TEX = { canvas, concrete, board, pizza, LIGHT };
})(window);
