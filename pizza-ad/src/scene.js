// Scene: renders frame t (seconds) deterministically. Used both for the live preview
// and by render.mjs, which steps through every frame.
(function (G) {
  const CFG = G.CFG, { clamp, lerp, mulberry32, makeSimplex } = G.N;
  const W = CFG.W, H = CFG.H, BR = CFG.brand;
  const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
  const C = { x: 540, y: 985 };
  const RB = 408, RP = 338;
  const BG = { x0: -140, y0: -140, w: 1360, h: 2200 };

  // ------------------------------------------------------------ helpers
  const P = (t, a, d) => clamp((t - a) / d, 0, 1);
  const E = {
    out3: (t) => 1 - Math.pow(1 - t, 3),
    in2: (t) => t * t,
    inOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    back: (t, s = 1.5) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  };
  const RAD = Math.PI / 180;
  const dir = (deg) => [Math.sin(deg * RAD), -Math.cos(deg * RAD)];
  const canv = (deg) => (deg - 90) * RAD;

  // ------------------------------------------------------------ pie layout from kcal
  const ORDER = ['oil', 'latte', 'nuts', 'bites', 'breakfast', 'lunch', 'dinner'];
  const HIDDEN = ['oil', 'latte', 'nuts', 'bites'];
  const total = ORDER.reduce((s, k) => s + CFG.kcal[k], 0);
  const SL = {};
  {
    let a = 0;
    ORDER.forEach((k) => { const w = CFG.kcal[k] / total * 360; SL[k] = { key: k, a0: a, a1: a + w, mid: a + w / 2, w }; a += w; });
  }
  const hiddenEnd = SL.bites.a1, hiddenMid = hiddenEnd / 2;
  const hiddenKcal = HIDDEN.reduce((s, k) => s + CFG.kcal[k], 0);

  // ------------------------------------------------------------ assets
  let A = null, TL = null, SFX = [];

  const edgeNoise = makeSimplex(404);
  function edgePts(deg, rMax) {
    const pts = [], [dx, dy] = dir(deg), px = -dy, py = dx;
    for (let r = 0; r <= rMax; r += 5) {
      const o = r < 6 ? 0 : 1.7 * edgeNoise(r / 15, deg * 0.37) + 0.7 * edgeNoise(r / 4, deg * 0.37 + 9);
      pts.push([dx * r + px * o, dy * r + py * o]);
    }
    return pts;
  }

  const wedgeCache = new Map();
  function wedge(a0, a1) {
    const key = a0.toFixed(3) + ':' + a1.toFixed(3);
    if (wedgeCache.has(key)) return wedgeCache.get(key);
    const pz = A.pizza, S = pz.S, o = S / 2, rMax = RP + 18;
    const c = G.TEX.canvas(S, S), x = c.getContext('2d');
    const whole = a0 === 0 && a1 >= 360;
    if (whole) { x.drawImage(pz.cv, 0, 0); wedgeCache.set(key, c); return c; }
    const e0 = edgePts(a0, rMax), e1 = edgePts(a1, rMax);
    const path = new Path2D();
    path.moveTo(o, o);
    e0.forEach(([px, py]) => path.lineTo(o + px, o + py));
    path.arc(o, o, rMax, canv(a0), canv(a1));
    for (let i = e1.length - 1; i >= 0; i--) path.lineTo(o + e1[i][0], o + e1[i][1]);
    path.closePath();
    x.save(); x.clip(path); x.drawImage(pz.cv, 0, 0);
    // cut faces: a darker sauce line with a pale cheese lip right next to it
    x.globalCompositeOperation = 'source-atop';
    [e0, e1].forEach((e) => {
      x.strokeStyle = 'rgba(95,30,8,0.55)'; x.lineWidth = 6;
      x.beginPath(); e.forEach(([px, py], i) => i ? x.lineTo(o + px, o + py) : x.moveTo(o + px, o + py)); x.stroke();
      x.strokeStyle = 'rgba(255,214,150,0.35)'; x.lineWidth = 1.5;
      x.beginPath(); e.forEach(([px, py], i) => i ? x.lineTo(o + px, o + py) : x.moveTo(o + px, o + py)); x.stroke();
    });
    x.restore();
    wedgeCache.set(key, c);
    return c;
  }

  function knifeSprite() {
    const c = G.TEX.canvas(600, 70), x = c.getContext('2d');
    // blade, tip at (6, 30)
    x.beginPath(); x.moveTo(6, 31); x.lineTo(410, 20); x.lineTo(410, 50); x.quadraticCurveTo(190, 54, 6, 31); x.closePath();
    let g = x.createLinearGradient(0, 20, 0, 52);
    g.addColorStop(0, '#7c838b'); g.addColorStop(0.25, '#dfe4e9'); g.addColorStop(0.6, '#aab2ba'); g.addColorStop(0.92, '#eef2f5'); g.addColorStop(1, '#ffffff');
    x.fillStyle = g; x.fill();
    x.save(); x.clip();
    x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1;
    for (let k = 0; k < 14; k++) { x.beginPath(); x.moveTo(0, 22 + k * 2); x.lineTo(420, 21 + k * 2.1); x.stroke(); }
    x.restore();
    // bolster
    g = x.createLinearGradient(0, 16, 0, 54);
    g.addColorStop(0, '#8d949b'); g.addColorStop(0.4, '#f1f4f6'); g.addColorStop(1, '#7a8188');
    x.fillStyle = g; x.beginPath(); x.roundRect(406, 16, 24, 38, 6); x.fill();
    // handle
    g = x.createLinearGradient(0, 18, 0, 52);
    g.addColorStop(0, '#3a3a3c'); g.addColorStop(0.3, '#5a5a5e'); g.addColorStop(0.55, '#202022'); g.addColorStop(1, '#0c0c0d');
    x.fillStyle = g; x.beginPath(); x.roundRect(426, 18, 168, 34, 16); x.fill();
    [470, 520, 566].forEach((rx) => {
      const rg = x.createRadialGradient(rx - 2, 33, 1, rx, 35, 6);
      rg.addColorStop(0, '#ffffff'); rg.addColorStop(1, '#8b9298');
      x.fillStyle = rg; x.beginPath(); x.arc(rx, 35, 5.5, 0, Math.PI * 2); x.fill();
    });
    return c;
  }

  function logoSprite() {
    const c = G.TEX.canvas(520, 130), x = c.getContext('2d');
    x.fillStyle = BR.color; x.beginPath(); x.roundRect(4, 4, 512, 122, 61); x.fill();
    // app icon: white rounded square with a dumbbell
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(22, 22, 86, 86, 24); x.fill();
    x.fillStyle = BR.color;
    x.beginPath(); x.roundRect(38, 50, 12, 30, 4); x.fill(); x.beginPath(); x.roundRect(80, 50, 12, 30, 4); x.fill();
    x.beginPath(); x.roundRect(30, 56, 10, 18, 3); x.fill(); x.beginPath(); x.roundRect(90, 56, 10, 18, 3); x.fill();
    x.fillRect(48, 61, 34, 8);
    x.fillStyle = '#ffffff'; x.font = '900 64px Inter'; x.textBaseline = 'middle';
    x.fillText(BR.name, 130, 68);
    const nw = x.measureText(BR.name).width;
    x.font = '800 40px Inter'; x.globalAlpha = 0.8; x.fillText('AI', 146 + nw, 70);
    return c;
  }

  // ------------------------------------------------------------ prop placements
  // r / da: polar position on the slice (da = degrees off the slice bisector)
  function props(TLB) {
    const B = TLB.B, rnd = mulberry32(2024);
    const list = [];
    const hb = (k) => SL[k].w / 2;
    list.push({ slice: 'latte', sprite: A.latte, r: 258, da: 0, rot: 78, scale: 1.18, t: B.latte + 0.85, dur: 0.55, from: [520, 60], sfx: 'clink' });
    // almonds dropped onto the slice
    for (let i = 0; i < 9; i++) {
      const r = 105 + i * 24 + rnd() * 10;
      const spread = hb('nuts') * 0.62 * (r < 150 ? 0.5 : 1);
      list.push({ slice: 'nuts', sprite: A.almonds[i % 3], r, da: (rnd() * 2 - 1) * spread, rot: rnd() * 360, scale: 1.3 + rnd() * 0.2, t: B.nuts + 0.82 + i * 0.055, dur: 0.32, drop: true });
    }
    list.push({ slice: 'bites', sprite: A.spoon, r: 200, da: 0, rot: 4, scale: 0.9, t: B.bites + 0.85, dur: 0.55, from: [700, 25], sfx: 'knock' });
    list.push({ slice: 'breakfast', sprite: A.egg, r: 196, da: 2, rot: 30, scale: 0.98, t: B.breakfast + 0.7, dur: 0.5, from: [700, 30] });
    list.push({ slice: 'lunch', sprite: A.chicken, r: 186, da: 0, rot: 96, scale: 0.98, t: B.lunch + 0.62, dur: 0.48, from: [700, -25] });
    list.push({ slice: 'dinner', sprite: A.salmon, r: 182, da: -2, rot: 88, scale: 0.95, t: B.dinner + 0.3, dur: 0.5, from: [700, 30] });
    return list;
  }

  // ------------------------------------------------------------ cue sheet (cuts, slices, sfx)
  function cues(TLB) {
    const B = TLB.B;
    const cuts = [
      { angle: 0, t: B.hook + 1.45 },
      { angle: SL.oil.a1, t: B.oil + 0.0, slice: 'oil' },
      { angle: SL.latte.a1, t: B.latte + 0.0, slice: 'latte' },
      { angle: SL.nuts.a1, t: B.nuts + 0.0, slice: 'nuts' },
      { angle: SL.bites.a1, t: B.bites + 0.0, slice: 'bites' },
      { angle: SL.breakfast.a1, t: B.breakfast + 0.0, slice: 'breakfast' },
      { angle: SL.lunch.a1, t: B.lunch + 0.0, slice: 'lunch' },
    ];
    const sep = {};
    cuts.forEach((c) => { if (c.slice) sep[c.slice] = c.t + 0.66; });
    sep.dinner = B.dinner + 0.05;
    return { cuts, sep };
  }

  function buildSfx(TLB, CU, PR) {
    const B = TLB.B, D = TLB.D, ev = [];
    ev.push({ t: 0.02, type: 'slide' });
    CU.cuts.forEach((c) => ev.push({ t: c.t + 0.3, type: 'cut' }));
    ev.push({ t: B.oil + 1.05, type: 'glug' });
    PR.forEach((p) => { if (p.sfx) ev.push({ t: p.t + p.dur * 0.7, type: p.sfx }); });
    ev.push({ t: B.nuts + 0.95, type: 'rattle' });
    ev.push({ t: B.breakfast + 1.0, type: 'sizzle' });
    ev.push({ t: B.lunch + 0.98, type: 'thud' });
    ev.push({ t: B.dinner + 0.68, type: 'thud' });
    ev.push({ t: B.log + 0.3, type: 'pop' }, { t: B.log + 0.72, type: 'pop' }, { t: B.log + 1.14, type: 'pop' });
    ev.push({ t: B.sum + 0.1, type: 'scanon' }, { t: B.why + 0.05, type: 'tick' }, { t: B.kcal + 0.1, type: 'scanon' });
    ev.push({ t: B.tiny + 0.2, type: 'marker' });
    ev.push({ t: B.mystery + 0.2, type: 'pop' });
    ev.push({ t: B.mystery + D.mystery - 0.38, type: 'boom' });
    ev.push({ t: B.deficit + 0.25, type: 'whoosh' });
    ev.push({ t: B.built + 0.25, type: 'scanon' });
    ev.push({ t: B.built + 0.95, type: 'scan', dur: 2.9 });
    const sweep = sweepFn(TLB);
    ORDER.forEach((k) => ev.push({ t: sweep.at(SL[k].mid), type: 'tick' }));
    ev.push({ t: B.scan + 2.05, type: 'whoosh' });
    ev.push({ t: B.cta + 0.15, type: 'chime' });
    return ev.sort((a, b) => a.t - b.t);
  }

  function sweepFn(TLB) {
    const t0 = TLB.B.built + 0.95, dur = 2.9;
    return {
      t0, dur,
      angle: (t) => E.inOut(P(t, t0, dur)) * 380 - 10,
      at: (deg) => { // invert the eased sweep numerically
        let lo = 0, hi = 1;
        for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; (E.inOut(m) * 380 - 10 < deg) ? lo = m : hi = m; }
        return t0 + lo * dur;
      },
    };
  }

  // ------------------------------------------------------------ init
  async function init() {
    await document.fonts.load('500 58px Inter');
    await document.fonts.load('800 58px Inter');
    await document.fonts.load('900 58px Inter');
    const t0 = performance.now();
    A = {
      bg: G.TEX.concrete(BG.w, BG.h, 7),
      board: G.TEX.board(RB, 3),
      pizza: G.TEX.pizza(RP, 5),
      knife: knifeSprite(),
      bottle: G.PROPS.oilBottle(),
      latte: G.PROPS.latteCup(),
      almonds: [G.PROPS.almond(1), G.PROPS.almond(2), G.PROPS.almond(3)],
      spoon: G.PROPS.spoon(),
      egg: G.PROPS.egg(),
      chicken: G.PROPS.chicken(),
      salmon: G.PROPS.salmon(),
      logo: logoSprite(),
      st: {
        breakfast: G.STICKER.make(String(CFG.kcal.breakfast), BR.color, 17),
        lunch: G.STICKER.make(String(CFG.kcal.lunch), BR.color, 17),
        dinner: G.STICKER.make(String(CFG.kcal.dinner), BR.color, 17),
        q: G.STICKER.make('?', BR.color, 20),
        hid: G.STICKER.make(String(hiddenKcal), BR.color, 20),
      },
    };
    await G.PHONE.loadScreen(CFG.appScreen);
    setTiming(G.__voDur || null);
    G.__initMs = performance.now() - t0;
  }

  let CU = null, PR = null, SW = null;
  function setTiming(voDur) {
    TL = G.TIMELINE.build(voDur);
    CU = cues(TL); PR = props(TL); SW = sweepFn(TL);
    SFX = buildSfx(TL, CU, PR);
    G.__duration = TL.duration;
    G.__sfx = SFX;
    G.__vo = TL.vo;
    G.__captions = TL.captions;
    G.__silence = [TL.B.mystery + 0.5, TL.B.mystery + TL.D.mystery - 0.38];
  }

  // ------------------------------------------------------------ transforms
  // camera: screen = S0 + s * (world - F)
  function camera(t) {
    const B = TL.B;
    let s = 1, F = [540, 960], S0 = [540, 960];
    const zin = E.inOut(P(t, B.sum, B.mystery + 1.0 - B.sum)) * (1 - E.inOut(P(t, B.stop, 1.3)));
    s = lerp(1, 1.08, zin);
    F = [lerp(540, 592, zin), lerp(960, 930, zin)];
    // subtle hand-held drift
    const dx = Math.sin(t * 0.61) * 2.2 + Math.sin(t * 1.37) * 1.1, dy = Math.cos(t * 0.53) * 2.4 + Math.sin(t * 1.11) * 0.9;
    return { s, F, S0: [S0[0] + dx, S0[1] + dy] };
  }

  // board group (slides in at the start)
  function group(t) {
    const k = E.out3(P(t, 0, 1.05));
    return { x: lerp(640, 0, k), y: lerp(820, 0, k), r: lerp(-24, 0, k) };
  }

  function sliceOffset(t, key) {
    const s = SL[key], B = TL.B;
    let d = 0, rot = 0;
    const ts = CU.sep[key];
    if (ts !== undefined) {
      const k = E.back(P(t, ts, 0.42), 1.2);
      const amt = key === 'dinner' ? 12 : HIDDEN.includes(key) ? 30 : 22;
      d = amt * k; rot = (key === 'dinner' ? 0 : 1.2) * k;
    }
    let ox = dir(s.mid)[0] * d, oy = dir(s.mid)[1] * d;
    if (HIDDEN.includes(key)) {
      const g = E.back(P(t, B.deficit + 0.2, 0.6), 1.3) * 40;
      ox += dir(hiddenMid)[0] * g; oy += dir(hiddenMid)[1] * g;
    }
    return { ox, oy, rot };
  }
  function hiddenShift(t) {
    const g = E.back(P(t, TL.B.deficit + 0.2, 0.6), 1.3) * 40;
    return [dir(hiddenMid)[0] * g, dir(hiddenMid)[1] * g];
  }

  function applySlice(x, t, key) {
    const s = SL[key], o = sliceOffset(t, key);
    x.translate(o.ox, o.oy);
    const [cx, cy] = dir(s.mid);
    const px = C.x + cx * RP * 0.5, py = C.y + cy * RP * 0.5;
    x.translate(px, py); x.rotate(o.rot * RAD); x.translate(-px, -py);
  }

  function isSeparated(t, key) { return CU.sep[key] !== undefined && t >= CU.sep[key]; }

  // ------------------------------------------------------------ drawing
  function shadow(x, lift, k) {
    k = k || 1;
    x.shadowColor = `rgba(25,12,4,${0.5 - lift * 0.18})`;
    x.shadowBlur = (6 + lift * 26) * k;
    x.shadowOffsetX = (3 + lift * 22) * k;
    x.shadowOffsetY = (5 + lift * 30) * k;
  }
  function noShadow(x) { x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = 0; x.shadowOffsetY = 0; }

  function drawPieces(x, t) {
    // remainder = the slices not separated yet
    let a0 = 0;
    for (const k of ORDER) { if (k !== 'dinner' && isSeparated(t, k)) a0 = SL[k].a1; }
    const remainderIsDinner = isSeparated(t, 'lunch');
    const S = A.pizza.S;
    const draw = (cvs, key) => {
      x.save();
      if (key) applySlice(x, t, key);
      shadow(x, key && isSeparated(t, key) ? 0.12 : 0, 0.8);
      x.drawImage(cvs, C.x - S / 2, C.y - S / 2);
      x.restore();
    };
    draw(wedge(a0, 360), remainderIsDinner ? 'dinner' : null);
    for (const k of ORDER) if (k !== 'dinner' && isSeparated(t, k)) draw(wedge(SL[k].a0, SL[k].a1), k);
  }

  function drawCutLines(x, t) {
    for (const c of CU.cuts) {
      const p = E.inOut(P(t, c.t + 0.3, 0.34));
      if (p <= 0) continue;
      if (c.slice && isSeparated(t, c.slice)) continue;
      if (c.angle === 0 && isSeparated(t, 'oil')) continue;
      const pts = edgePts(c.angle, RP + 4);
      const n = Math.max(2, Math.round(pts.length * p));
      const seg = pts.slice(pts.length - n);
      x.save();
      x.strokeStyle = 'rgba(80,24,6,0.8)'; x.lineWidth = 3.2; x.lineCap = 'round';
      x.beginPath(); seg.forEach(([px, py], i) => i ? x.lineTo(C.x + px, C.y + py) : x.moveTo(C.x + px, C.y + py)); x.stroke();
      x.strokeStyle = 'rgba(255,215,160,0.4)'; x.lineWidth = 1.2;
      x.beginPath(); seg.forEach(([px, py], i) => i ? x.lineTo(C.x + px + 2, C.y + py + 1) : x.moveTo(C.x + px + 2, C.y + py + 1)); x.stroke();
      x.restore();
    }
  }

  function drawKnife(x, t) {
    for (const c of CU.cuts) {
      const lt = t - c.t;
      if (lt < 0 || lt > 1.0) continue;
      let s, lift, side = 0;
      if (lt < 0.3) { const k = E.out3(lt / 0.3); s = lerp(760, 0, k); lift = 1 - k * 0.6; }
      else if (lt < 0.64) { const k = (lt - 0.3) / 0.34; s = Math.sin(k * Math.PI * 2) * 12; lift = 0.4 * (1 - E.out3(Math.min(1, k * 4))); }
      else { const k = E.in2((lt - 0.64) / 0.36); s = lerp(0, 820, k); lift = k; side = k * 120; }
      const [dx, dy] = dir(c.angle), px = -dy, py = dx;
      const tipR = -26 + s;
      x.save();
      x.translate(C.x + dx * tipR + px * side, C.y + dy * tipR + py * side);
      x.rotate(canv(c.angle) + side * 0.0012);
      const sc = 1 + lift * 0.06; x.scale(sc, sc);
      shadow(x, lift * 0.8 + 0.15, 0.9);
      x.drawImage(A.knife, -6, -31);
      x.restore();
    }
  }

  function placeOnSlice(x, t, key, r, da, rot) {
    const s = SL[key], a = s.mid + da, [dx, dy] = dir(a);
    applySlice(x, t, key);
    x.translate(C.x + dx * r, C.y + dy * r);
    x.rotate((s.mid + rot) * RAD);
  }

  function drawProps(x, t) {
    for (const p of PR) {
      const lt = (t - p.t) / p.dur;
      if (lt < 0) continue;
      const k = clamp(lt, 0, 1);
      x.save();
      if (p.drop) {
        placeOnSlice(x, t, p.slice, p.r, p.da, p.rot);
        const e = E.in2(k);
        const sc = p.scale * lerp(2.1, 1, e);
        x.globalAlpha = clamp(k * 3, 0, 1);
        x.scale(sc, sc);
        shadow(x, (1 - e) * 1.2, 0.6);
        x.drawImage(p.sprite.cv, -p.sprite.ax, -p.sprite.ay);
      } else {
        const e = E.back(k, 1.1);
        // start offscreen along a world direction, glide in, settle
        const s = SL[p.slice], fromDeg = s.mid + p.from[1];
        const fx = dir(fromDeg)[0] * p.from[0] * (1 - e), fy = dir(fromDeg)[1] * p.from[0] * (1 - e);
        x.translate(fx, fy);
        placeOnSlice(x, t, p.slice, p.r, p.da, p.rot + (1 - e) * 25);
        const lift = 1 - E.out3(k);
        const sc = p.scale * (1 + lift * 0.1);
        x.scale(sc, sc);
        shadow(x, lift * 0.9, 0.9);
        x.drawImage(p.sprite.cv, -p.sprite.ax, -p.sprite.ay);
      }
      x.restore();
    }
  }

  // olive oil: bottle glides in, drizzles along the slice, glides out
  function drizzlePts() {
    const s = SL.oil, pts = [];
    const half = s.w / 2;
    for (let r = RP - 30; r >= 70; r -= 3) {
      const amp = half * 0.5 * Math.min(1, r / 140);
      const a = s.mid + Math.sin((RP - 30 - r) / 34) * amp;
      const [dx, dy] = dir(a);
      pts.push([C.x + dx * r, C.y + dy * r]);
    }
    return pts;
  }
  let DRZ = null;
  function drawOil(x, t) {
    const B = TL.B;
    DRZ = DRZ || drizzlePts();
    const pour = P(t, B.oil + 1.25, 1.05);
    if (pour > 0) {
      const n = Math.max(2, Math.round(DRZ.length * pour));
      const seg = DRZ.slice(0, n);
      x.save(); applySlice(x, t, 'oil');
      x.lineCap = 'round'; x.lineJoin = 'round';
      const line = (w, col, ox, oy) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); seg.forEach(([px, py], i) => i ? x.lineTo(px + ox, py + oy) : x.moveTo(px + ox, py + oy)); x.stroke(); };
      line(15, 'rgba(150,70,10,0.22)', 1, 2);
      line(8, 'rgba(222,178,40,0.9)', 0, 0);
      line(3.5, 'rgba(250,224,120,0.95)', -1, -1);
      line(1.6, 'rgba(255,255,235,0.9)', -1.8, -1.8);
      x.restore();
    }
    // bottle
    const tin = B.oil + 0.8, tout = B.oil + 2.35;
    if (t < tin || t > tout + 0.6) return;
    const kIn = E.out3(P(t, tin, 0.45)), kOut = E.in2(P(t, tout, 0.55));
    const head = DRZ[Math.min(DRZ.length - 1, Math.round(DRZ.length * pour))];
    const so = sliceOffset(t, 'oil');
    const hx = head[0] + so.ox, hy = head[1] + so.oy;
    const bodyDir = [0.62, -0.78];
    const off = (1 - kIn) * 900 + kOut * 950;
    const nx = hx + 30 * bodyDir[0] + off * bodyDir[0], ny = hy + 30 * bodyDir[1] + off * bodyDir[1];
    x.save();
    if (pour > 0 && pour < 1) {
      x.strokeStyle = 'rgba(232,190,50,0.95)'; x.lineWidth = 5; x.lineCap = 'round';
      x.beginPath(); x.moveTo(nx, ny); x.lineTo(hx, hy); x.stroke();
      x.strokeStyle = 'rgba(255,245,190,0.9)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(nx - 1, ny - 1); x.lineTo(hx - 1, hy - 1); x.stroke();
    }
    x.translate(nx, ny);
    x.rotate(Math.atan2(-bodyDir[0], bodyDir[1]));
    shadow(x, 1.6, 1);
    x.drawImage(A.bottle.cv, -A.bottle.ax, -A.bottle.ay);
    x.restore();
  }

  function drawSticker(x, cvs, cxw, cyw, k, rot, flip) {
    if (k <= 0) return;
    const e = k >= 1 ? 1 : E.back(k, 2.2);
    const sc = lerp(1.7, 1, E.out3(k)) * (k < 1 ? clamp(k * 4, 0, 1) : 1);
    x.save();
    x.translate(cxw, cyw); x.rotate(rot * RAD);
    x.scale(sc * (flip === undefined ? 1 : flip), sc);
    x.globalAlpha = clamp(k * 5, 0, 1);
    shadow(x, (1 - e) * 0.8 + 0.05, 0.7);
    x.drawImage(cvs, -cvs.width / 2, -cvs.height / 2);
    x.restore();
  }

  function drawStickers(x, t) {
    const B = TL.B, D = TL.D;
    const fade = 1 - P(t, B.built + 0.1, 0.3);
    if (fade <= 0) return;
    x.save(); x.globalAlpha = fade;
    const meal = [['breakfast', B.log + 0.3, 282, 8, -6], ['lunch', B.log + 0.72, 296, 0, 5], ['dinner', B.log + 1.14, 284, -8, -4]];
    meal.forEach(([key, ts, r, da, rot]) => {
      const k = P(t, ts, 0.28);
      if (k <= 0) return;
      const o = sliceOffset(t, key), [dx, dy] = dir(SL[key].mid + da);
      drawSticker(x, A.st[key], C.x + o.ox + dx * r, C.y + o.oy + dy * r, k, rot);
    });
    // mystery sticker on the hidden slices: "?" -> silence -> "26%"
    const kq = P(t, B.mystery + 0.2, 0.28);
    if (kq > 0) {
      const [hx, hy] = hiddenShift(t);
      const [dx, dy] = dir(hiddenMid);
      const flipT = B.mystery + D.mystery - 0.38;
      const f = P(t, flipT - 0.09, 0.18);
      const flip = Math.abs(Math.cos(f * Math.PI));
      const cvs = f < 0.5 ? A.st.q : A.st.hid;
      let wob = 0;
      if (t < flipT - 0.1) wob = Math.sin((t - B.mystery) * 7) * 3 * (1 - P(t, B.mystery + 0.5, 1.2));
      const bump = 1 + 0.12 * Math.sin(P(t, flipT, 0.3) * Math.PI);
      x.save();
      const px = C.x + hx + dx * 196, py = C.y + hy + dy * 196;
      x.translate(px, py); x.scale(bump, bump); x.translate(-px, -py);
      drawSticker(x, cvs, px, py, kq, -5 + wob, flip);
      x.restore();
    }
    x.restore();
  }

  function dashedPath(t) {
    const [hx, hy] = hiddenShift(t);
    const pts = [], R = RP + 56, a0 = -3.5, a1 = hiddenEnd + 3.5;
    const cx = C.x + hx + dir(hiddenMid)[0] * 14, cy = C.y + hy + dir(hiddenMid)[1] * 14;
    for (let r = 0; r <= R; r += 4) { const [dx, dy] = dir(a0); pts.push([cx + dx * r, cy + dy * r]); }
    for (let a = a0; a <= a1; a += 0.5) { const [dx, dy] = dir(a); pts.push([cx + dx * R, cy + dy * R]); }
    for (let r = R; r >= 0; r -= 4) { const [dx, dy] = dir(a1); pts.push([cx + dx * r, cy + dy * r]); }
    return pts;
  }
  function drawDashed(x, t) {
    const B = TL.B;
    const k = E.inOut(P(t, B.tiny + 0.2, 1.4));
    const out = 1 - P(t, B.built + 0.1, 0.35);
    if (k <= 0 || out <= 0) return;
    const pts = dashedPath(t);
    let L = 0; const acc = [0];
    for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(L); }
    const lim = L * k;
    x.save();
    x.globalAlpha = out;
    x.setLineDash([16, 15]); x.lineCap = 'round'; x.lineWidth = 8;
    x.shadowColor = 'rgba(0,0,0,0.28)'; x.shadowBlur = 6; x.shadowOffsetX = 2; x.shadowOffsetY = 3;
    x.strokeStyle = '#ffffff';
    x.beginPath();
    for (let i = 0; i < pts.length && acc[i] <= lim; i++) i ? x.lineTo(pts[i][0], pts[i][1]) : x.moveTo(pts[i][0], pts[i][1]);
    x.stroke();
    x.restore();
  }

  // scan ring + kcal labels
  function drawScan(x, t) {
    const B = TL.B;
    const on = E.out3(P(t, B.built + 0.25, 0.5)) * (1 - P(t, B.cta, 0.4));
    if (on <= 0) return;
    const R = RP + 58, cx = C.x, cy = C.y;
    x.save();
    // brackets
    const bs = RB + 26, L = 70;
    x.strokeStyle = `rgba(255,255,255,${0.95 * on})`; x.lineWidth = 9; x.lineCap = 'round';
    x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
    const b = bs * lerp(1.15, 1, on);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      x.beginPath(); x.moveTo(cx + sx * b, cy + sy * (b - L)); x.lineTo(cx + sx * b, cy + sy * b); x.lineTo(cx + sx * (b - L), cy + sy * b); x.stroke();
    });
    noShadow(x);
    // ring
    x.strokeStyle = hexA(BR.color, 0.35 * on); x.lineWidth = 8;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
    const sw = SW.angle(t), active = t > SW.t0 && t < SW.t0 + SW.dur + 0.3;
    if (active) {
      const fadeOut = 1 - P(t, SW.t0 + SW.dur, 0.3);
      // trailing beam
      const g = x.createConicGradient(canv(sw - 70), cx, cy);
      g.addColorStop(0, hexA(BR.color, 0));
      g.addColorStop(70 / 360, hexA(BR.color, 0.32 * fadeOut));
      g.addColorStop(70 / 360 + 0.001, hexA(BR.color, 0));
      g.addColorStop(1, hexA(BR.color, 0));
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
      // bright head
      x.strokeStyle = hexA('#ffffff', 0.95 * fadeOut); x.lineWidth = 12;
      x.shadowColor = BR.color; x.shadowBlur = 24;
      x.beginPath(); x.arc(cx, cy, R, canv(sw - 26), canv(sw)); x.stroke();
      x.strokeStyle = hexA(BR.color, fadeOut); x.lineWidth = 8;
      x.beginPath(); x.arc(cx, cy, R, canv(sw - 60), canv(sw)); x.stroke();
      noShadow(x);
    }
    x.restore();
    // labels
    for (const k of ORDER) {
      const ta = SW.at(SL[k].mid);
      const p = P(t, ta, 0.3);
      if (p <= 0) continue;
      x.save(); x.globalAlpha = on;
      drawLabel(x, t, k, p);
      x.restore();
    }
  }

  const LABEL_POS = {
    oil: [432, 2], latte: [448, 0], nuts: [462, 0], bites: [450, -2],
    breakfast: [205, 0], lunch: [215, 0], dinner: [220, 0],
  };
  function drawLabel(x, t, key, p) {
    const hid = HIDDEN.includes(key);
    const o = sliceOffset(t, key);
    const [r, da] = LABEL_POS[key];
    const [dx, dy] = dir(SL[key].mid + da);
    let lx = C.x + o.ox + dx * r, ly = C.y + o.oy + dy * r;
    const text = CFG.kcal[key] + ' kcal';
    x.save();
    x.font = '800 36px Inter';
    const tw = x.measureText(text).width, w = tw + 64, h = 64;
    lx = clamp(lx, w / 2 + 18, W - w / 2 - 18);
    // anchor dot on the slice
    const ax = C.x + o.ox + dx * (hid ? 250 : 120), ay = C.y + o.oy + dy * (hid ? 250 : 120);
    const e = E.back(p, 2);
    if (hid) {
      x.strokeStyle = `rgba(255,255,255,${0.9 * clamp(p * 3, 0, 1)})`; x.lineWidth = 3;
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(lerp(ax, lx, clamp(p * 2, 0, 1)), lerp(ay, ly, clamp(p * 2, 0, 1))); x.stroke();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ax, ay, 7 * clamp(p * 3, 0, 1), 0, Math.PI * 2); x.fill();
    }
    x.translate(lx, ly); x.scale(e, e);
    x.shadowColor = 'rgba(10,12,30,0.35)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, h / 2); x.fill();
    noShadow(x);
    x.fillStyle = hid ? BR.over : BR.color;
    x.beginPath(); x.arc(-w / 2 + 26, 0, 8, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#10121c'; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillText(text, -w / 2 + 44, 2);
    x.restore();
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function drawCaption(x, t) {
    const cap = TL.captions.find((c) => t >= c.t0 && t < c.t1);
    if (!cap) return;
    const k = CFG.caption;
    x.save();
    x.font = `500 ${k.size}px Inter`;
    x.textBaseline = 'middle'; x.textAlign = 'center';
    const tw = x.measureText(cap.text).width;
    const w = tw + k.padX * 2, h = k.size * 1.18 + k.padY * 2 - 8;
    x.fillStyle = BR.color;
    x.beginPath(); x.roundRect(W / 2 - w / 2, k.y - h / 2, w, h, k.radius); x.fill();
    x.fillStyle = '#ffffff';
    x.fillText(cap.text, W / 2, k.y + 3);
    x.restore();
  }


  // tracker card under the pizza that carries the numbers story
  function toastStates() {
    const B = TL.B, K = CFG.kcal, fmt = (n) => n.toLocaleString('en-US');
    const tracked = K.breakfast + K.lunch + K.dinner;
    return [
      { t0: B.sum + 0.05, t1: B.why, icon: 'check', col: '#1fae74', title: 'Logged today', value: `${fmt(tracked)} / ${fmt(CFG.budget)} kcal` },
      { t0: B.why, t1: B.tiny + 0.1, icon: 'scale', col: '#8a90a6', title: 'Weight this week', value: '±0.0 kg' },
      { t0: B.kcal + 0.05, t1: B.stop + 0.1, icon: 'alert', col: BR.over, title: 'Actually eaten', value: `${fmt(total)} / ${fmt(CFG.budget)} kcal`, red: true },
    ];
  }
  function drawToast(x, t) {
    for (const st of toastStates()) {
      const kin = P(t, st.t0, 0.32), kout = P(t, st.t1 - 0.18, 0.18);
      if (kin <= 0 || kout >= 1) continue;
      const a = clamp(kin * 3, 0, 1) * (1 - kout);
      const e = E.back(kin, 1.6);
      x.save();
      x.globalAlpha = a;
      x.translate(W / 2, 1560 + (1 - e) * 46 + kout * 20);
      const w = 640, h = 122;
      x.shadowColor = 'rgba(10,12,30,0.3)'; x.shadowBlur = 30; x.shadowOffsetY = 10;
      x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 36); x.fill();
      noShadow(x);
      const ix = -w / 2 + 66;
      x.fillStyle = st.col; x.beginPath(); x.arc(ix, 0, 34, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
      if (st.icon === 'check') { x.beginPath(); x.moveTo(ix - 14, 1); x.lineTo(ix - 4, 11); x.lineTo(ix + 15, -10); x.stroke(); }
      else if (st.icon === 'alert') { x.beginPath(); x.moveTo(ix, -15); x.lineTo(ix, 4); x.stroke(); x.beginPath(); x.arc(ix, 15, 4, 0, Math.PI * 2); x.fill(); }
      else { x.lineWidth = 5; x.beginPath(); x.roundRect(ix - 18, -16, 36, 32, 8); x.stroke(); x.beginPath(); x.moveTo(ix, -6); x.lineTo(ix + 7, -11); x.stroke(); }
      x.textBaseline = 'middle'; x.textAlign = 'left';
      x.fillStyle = '#7b8095'; x.font = '600 28px Inter'; x.fillText(st.title, ix + 60, -22);
      x.fillStyle = st.red ? BR.over : '#10121c'; x.font = '800 44px Inter'; x.fillText(st.value, ix + 60, 20);
      x.restore();
    }
  }

  function drawPhoneLayer(x, t) {
    const B = TL.B;
    const k = P(t, B.scan + 2.0, 0.75);
    if (k <= 0) return;
    const e = E.back(k, 1.1);
    const y = lerp(2600, 1415, e), rot = lerp(9, -3, E.out3(k));
    const shown = clamp((t - (B.scan + 2.25)) / 0.2, 0, 7);
    let tot = 0;
    G.PHONE.ITEMS.forEach((it, i) => { tot += CFG.kcal[it.key] * clamp(shown - i, 0, 1); });
    x.save();
    x.translate(560, y); x.rotate(rot * RAD);
    G.PHONE.draw(x, 470, { shown, total: tot });
    x.restore();
  }

  function drawLogo(x, t) {
    const B = TL.B;
    const k = P(t, B.cta + 0.05, 0.4);
    if (k <= 0) return;
    const e = E.back(k, 2);
    x.save();
    x.translate(W / 2, 250); x.scale(e * 0.92, e * 0.92);
    x.shadowColor = 'rgba(10,12,30,0.35)'; x.shadowBlur = 24; x.shadowOffsetY = 8;
    x.drawImage(A.logo, -A.logo.width / 2, -A.logo.height / 2);
    x.restore();
  }

  function render(t) {
    const x = ctx;
    noShadow(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#9da3a9'; x.fillRect(0, 0, W, H);
    const cam = camera(t);
    x.save();
    x.translate(cam.S0[0], cam.S0[1]); x.scale(cam.s, cam.s); x.translate(-cam.F[0], -cam.F[1]);
    x.drawImage(A.bg, BG.x0, BG.y0);
    const g = group(t);
    x.save();
    x.translate(g.x, g.y);
    x.translate(C.x, C.y); x.rotate(g.r * RAD); x.translate(-C.x, -C.y);
    // board with a soft contact shadow + wider ambient shadow
    x.save();
    x.shadowColor = 'rgba(30,34,40,0.42)'; x.shadowBlur = 70; x.shadowOffsetX = 26; x.shadowOffsetY = 34;
    x.drawImage(A.board.cv, C.x - A.board.S / 2, C.y - A.board.S / 2);
    x.restore();
    x.save();
    x.shadowColor = 'rgba(20,22,26,0.5)'; x.shadowBlur = 10; x.shadowOffsetX = 4; x.shadowOffsetY = 6;
    x.drawImage(A.board.cv, C.x - A.board.S / 2, C.y - A.board.S / 2);
    x.restore();
    drawPieces(x, t);
    drawCutLines(x, t);
    drawOil(x, t);
    drawProps(x, t);
    drawDashed(x, t);
    drawStickers(x, t);
    drawScan(x, t);
    drawKnife(x, t);
    x.restore();
    x.restore();
    // focus dim for the end card
    const dim = P(t, TL.B.scan + 2.0, 0.6) * 0.2 + P(t, TL.B.cta, 0.4) * 0.12;
    if (dim > 0) { x.fillStyle = `rgba(12,14,22,${dim})`; x.fillRect(0, 0, W, H); }
    drawToast(x, t);
    drawPhoneLayer(x, t);
    drawLogo(x, t);
    drawCaption(x, t);
  }

  // ------------------------------------------------------------ public API
  G.__ready = false;
  G.__render = render;
  G.__setTiming = setTiming;
  G.__frame = (t, q) => { render(t); return cv.toDataURL('image/jpeg', q || 0.93); };

  const isRender = new URLSearchParams(location.search).has('render');
  if (isRender) document.body.classList.add('render');

  init().then(() => {
    G.__ready = true;
    render(0);
    if (isRender) return;
    // preview player
    const btn = document.getElementById('play'), scrub = document.getElementById('scrub'), lab = document.getElementById('time');
    let playing = false, t0 = 0, base = 0, cur = 0;
    const show = (t) => { cur = t; render(t); lab.textContent = t.toFixed(2) + ' s'; scrub.value = Math.round(t / TL.duration * 1000); };
    const loop = (now) => {
      if (!playing) return;
      const t = base + (now - t0) / 1000;
      if (t >= TL.duration) { playing = false; btn.textContent = 'Play'; show(TL.duration); return; }
      show(t); requestAnimationFrame(loop);
    };
    btn.onclick = () => {
      playing = !playing; btn.textContent = playing ? 'Pause' : 'Play';
      if (playing) { base = cur >= TL.duration ? 0 : cur; t0 = performance.now(); requestAnimationFrame(loop); }
    };
    scrub.oninput = () => { playing = false; btn.textContent = 'Play'; show(scrub.value / 1000 * TL.duration); };
  });
})(window);
