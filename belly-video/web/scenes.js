// Choreography. Every scene gets S (its words with scene-local times) and B (named beats
// derived from S.wt('word')), so each animation lands exactly on the spoken word.
// cues() lists the sound effects; mix.py lays them under the voice.

import * as E from './engine.js';
import * as F from './foods.js';

const { clamp, lerp, prog, ease, rng, OUT } = E;

export const THEMES = {
  intro: { a: '#9a6bff', b: '#2a0f6b' },
  bread: { a: '#ffbe55', b: '#cf4317' },
  beer: { a: '#33cdb9', b: '#0a4757' },
  boba: { a: '#ff93c9', b: '#9a2263' },
  icecream: { a: '#62cdff', b: '#1d47b5' },
  chips: { a: '#ff6f5e', b: '#8a0f27' },
  good: { a: '#6ee89c', b: '#0e6b40' },
  rice: { a: '#ff8f7a', b: '#6a1a58' },
  outro: { a: '#9a6bff', b: '#2a0f6b' },
};

// Falls in from above, then squashes on landing (origin = object base).
function dropIn(t, t0, dist = 1300, dur = 0.36) {
  const p = prog(t, t0, dur);
  const land = t - (t0 + dur);
  let sx = 1, sy = 1;
  if (land > 0 && land < 0.6) {
    const k = Math.exp(-land * 8) * Math.cos(land * 26);
    sy = 1 - 0.2 * k;
    sx = 1 + 0.16 * k;
  } else if (p < 1) {
    sy = 1.1;
    sx = 0.93;
  }
  return { dy: -dist * (1 - p * p), sx, sy, visible: t >= t0 };
}

const popIn = (t, t0, dur = 0.38) => ease.outBack(prog(t, t0, dur));

export const SCENES = {
  intro: {
    theme: THEMES.intro,
    beats: (S) => ({ six: S.wt('six'), avoid: S.wt('avoid'), lose: S.wt('lose'), belly: S.wt('belly') }),
    cues: (S, B) => [['slam', B.six], ['pop', B.avoid], ['sparkle', B.lose + 0.1]],
    draw(ctx, t, S, B) {
      const cx = 540, cy = 965, R = 395;
      const f = 1 - ease.inOutCubic(prog(t, B.lose, 0.6));
      const pin = ease.outBack(prog(t, 0, 0.5));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pin, pin);
      ctx.translate(-cx, -cy);
      const pulse = 0.5 + 0.5 * Math.sin(t * 10);
      E.circle(ctx, cx, cy, R + 26 + pulse * 16);
      E.fill(ctx, `rgba(255,50,80,${0.45 * f})`);
      E.circle(ctx, cx, cy, R + 26 + pulse * 10);
      E.fill(ctx, `rgba(255,214,70,${0.45 * (1 - f)})`);
      E.circle(ctx, cx, cy, R);
      E.fill(ctx, E.radGrad(ctx, cx, cy - 120, 40, R * 1.1, [[0, '#d9c8ff'], [1, '#7a52d9']]));
      ctx.save();
      E.circle(ctx, cx, cy, R);
      ctx.clip();
      ctx.translate(cx, 598 + Math.sin(t * 2.2) * 5);
      F.drawBody(ctx, t, { f, mood: f > 0.5 ? 'sad' : 'happy' });
      ctx.restore();
      E.circle(ctx, cx, cy, R);
      E.stroke(ctx, 26, OUT);
      E.circle(ctx, cx, cy, R);
      E.stroke(ctx, 14, '#fff');
      ctx.restore();
      E.burst(ctx, t, B.lose + 0.15, 540, 1050, {
        n: 24, speed: 760, dur: 1, size: 24, colors: ['#fff6a0', '#ffffff', '#ffd23f'], shape: 'star', gravity: 150, seed: 4,
      });
      E.text(ctx, '6 FOODS', 540, 300, { size: 210, color: '#ffe04a', scale: popIn(t, B.six - 0.05, 0.35), rot: -0.04, lw: 30 });
      const pa = popIn(t, B.avoid - 0.05, 0.3);
      if (pa > 0) {
        ctx.save();
        ctx.translate(540, 478);
        ctx.rotate(0.03);
        ctx.scale(pa, pa);
        E.rrect(ctx, -290, -58 + 10, 580, 116, 24);
        E.fill(ctx, 'rgba(0,0,0,0.3)');
        E.rrect(ctx, -290, -58, 580, 116, 24);
        E.fill(ctx, '#ff2d48');
        E.stroke(ctx, 10);
        E.text(ctx, 'TO AVOID', 0, 2, { size: 96, color: '#fff', lw: 14, shadow: false });
        ctx.restore();
      }
    },
  },

  bread: {
    theme: THEMES.bread,
    beats: (S) => ({
      name: S.wt('white'), flour: S.wt('refined'), fiber: S.wt('fiber'), nutr: S.wt('nutrients'),
      gly: S.wt('glycemic'), spike: S.wt('spikes'), fat: S.wt('fat'), stamp: S.wt('storage') + 0.05,
    }),
    cues: (S, B) => [
      ['drop', B.name + 0.36], ['puff', B.flour], ['pop', B.flour + 0.1], ['pop', B.fiber], ['pop', B.nutr],
      ['card', B.gly], ['rise', B.spike - 0.15], ['pop', B.fat], ['stamp', B.stamp + 0.2],
    ],
    draw(ctx, t, S, B) {
      ctx.save();
      E.shake(ctx, t, B.stamp + 0.2);
      const up = ease.inOutCubic(prog(t, B.gly, 0.45));
      const x = lerp(450, 430, up), y = lerp(1150, 935, up), sc = lerp(1, 0.74, up);
      const d = dropIn(t, B.name);
      if (d.visible) {
        E.groundShadow(ctx, x + 90 * sc * prog(t, B.flour, 0.5), y + 6, 320 * sc, 0.25 * clamp(1 + d.dy / 600));
        ctx.save();
        ctx.translate(x, y + d.dy);
        ctx.scale(sc * d.sx, sc * d.sy);
        F.drawLoaf(ctx, t, { slice: prog(t, B.flour, 0.5), mood: t > B.stamp + 0.2 ? 'ko' : 'smug' });
        ctx.restore();
      }
      E.burst(ctx, t, B.flour, x, y - 330 * sc, {
        n: 30, speed: 560, dur: 1, size: 22, colors: ['#ffffff', '#fff1d6'], gravity: -250, seed: 2,
      });
      E.pill(ctx, t, B.flour + 0.1, 540, 548, 'REFINED FLOUR', { t1: B.gly });
      E.pill(ctx, t, B.fiber, 290, 1262, 'NO FIBER', { t1: B.gly, rot: -0.06 });
      E.pill(ctx, t, B.nutr, 720, 1292, 'NO NUTRIENTS', { t1: B.gly, rot: 0.04 });
      E.spikeChart(ctx, t, B.gly, B.spike, 540, 1170, { label: 'BLOOD SUGAR' });
      E.pill(ctx, t, B.fat, 560, 548, 'FAT STORAGE', { kind: 'up' });
      E.stamp(ctx, t, B.stamp, 520, 790, 190);
      ctx.restore();
    },
  },

  beer: {
    theme: THEMES.beer,
    beats: (S) => ({
      name: S.wt('beer'), empty: S.wt('empty'), cort: S.wt('cortisol'), belly: S.wt('belly'), stamp: S.wt('belly') + 0.25,
    }),
    cues: (S, B) => [
      ['tap', B.name + 0.2], ['pop', B.name], ['pour', B.name + 0.2], ['pop', B.empty], ['card', B.cort],
      ['rise', B.cort + 0.35], ['pop', B.belly], ['stamp', B.stamp + 0.2],
    ],
    draw(ctx, t, S, B) {
      ctx.save();
      E.shake(ctx, t, B.stamp + 0.2);
      const up = ease.inOutCubic(prog(t, B.cort, 0.45));
      const x = 520, y = lerp(1215, 960, up), sc = lerp(1, 0.72, up);
      const pourT0 = B.name + 0.2, pourT1 = B.name + 1.5;
      const level = 0.86 * ease.outCubic(prog(t, pourT0, pourT1 - pourT0));
      const foam = ease.outBack(prog(t, B.name + 0.85, 0.6));
      const drip = ease.outCubic(prog(t, pourT1, 1.4));
      const pour = t > pourT0 && t < pourT1 + 0.15 ? 1 - prog(t, pourT1, 0.15) : 0;
      const tapY = lerp(-320, 640, ease.outBack(prog(t, B.name - 0.05, 0.3))) - 1000 * ease.inCubic(prog(t, pourT1 + 0.1, 0.45));
      const pin = popIn(t, B.name - 0.05, 0.4);
      if (pin > 0) {
        E.groundShadow(ctx, x, y + 6, 230 * sc);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc * pin, sc * pin);
        F.drawMug(ctx, t, {
          level, foam, drip, pour, pourTop: (tapY + 10 - y) / sc,
          mood: t > B.stamp + 0.2 ? 'ko' : 'evil',
        });
        ctx.restore();
      }
      if (tapY > -310) {
        ctx.save();
        ctx.translate(x, tapY);
        F.drawTap(ctx);
        ctx.restore();
      }
      E.pill(ctx, t, B.empty, 540, 1300, 'EMPTY CALORIES', { t1: B.cort });
      E.gauge(ctx, t, B.cort, 540, 1170, { label: 'CORTISOL' });
      E.pill(ctx, t, B.belly, 540, 540, 'BELLY FAT', { kind: 'up' });
      E.stamp(ctx, t, B.stamp, 520, 790, 190);
      ctx.restore();
    },
  },

  boba: {
    theme: THEMES.boba,
    beats: (S) => ({
      name: S.wt('sugary'), bubble: S.wt('bubble'), soda: S.wt('soda'), sugar: S.wt('sugar'),
      empty: S.wt('empty'), weight: S.wt('weight'), stamp: S.wt('fat') + 0.1,
    }),
    cues: (S, B) => [
      ['pop', B.name - 0.05], ['plop', B.name + 0.55], ['plop', B.name + 0.75], ['plop', B.name + 0.95],
      ['straw', B.bubble], ['pop', B.soda], ['rain', B.sugar], ['pop', B.sugar + 0.1], ['pop', B.empty], ['pop', B.weight],
      ['stamp', B.stamp + 0.2],
    ],
    draw(ctx, t, S, B) {
      ctx.save();
      E.shake(ctx, t, B.stamp + 0.2);
      const x = 470, y = 1215, sc = 0.92;
      const pin = popIn(t, B.name - 0.05, 0.4);
      if (pin > 0) {
        E.groundShadow(ctx, x, y + 6, 200);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc * pin, sc * pin);
        F.drawBoba(ctx, t, {
          pearlT: B.name + 0.25, straw: prog(t, B.bubble - 0.1, 0.35), stripes: prog(t, B.name + 0.3, 2.5),
          mood: t > B.stamp + 0.2 ? 'ko' : 'evil',
        });
        ctx.restore();
      }
      const ps = popIn(t, B.soda, 0.4);
      if (ps > 0) {
        E.groundShadow(ctx, 830, y + 6, 90);
        ctx.save();
        ctx.translate(830, y);
        ctx.rotate(0.08);
        ctx.scale(0.9 * ps, 0.9 * ps);
        F.drawSodaCan(ctx, t, { mood: t > B.stamp + 0.2 ? 'ko' : 'smug' });
        ctx.restore();
      }
      // sugar cubes rain into the cup
      const r = rng(17);
      const cupTop = y - 590 * sc;
      for (let i = 0; i < 10; i++) {
        const t0 = B.sugar - 0.15 + i * 0.06, cx = x + (r() - 0.5) * 230, spin = (r() - 0.5) * 8, s = 0.8 + r() * 0.4;
        const p = prog(t, t0, 0.5);
        if (p <= 0) continue;
        if (p < 1) F.drawSugarCube(ctx, cx, lerp(-120, cupTop, ease.inCubic(p)), s, spin * p);
        E.burst(ctx, t, t0 + 0.5, cx, cupTop, { n: 7, speed: 380, dur: 0.45, size: 10, colors: ['#e9c79c', '#ffffff'], gravity: 1600, seed: i + 40 });
      }
      E.pill(ctx, t, B.sugar + 0.1, 540, 1300, 'SUGAR BOMB', { t1: B.empty });
      E.pill(ctx, t, B.empty, 540, 1300, 'EMPTY CALORIES', { t1: B.weight });
      E.pill(ctx, t, B.weight, 540, 1300, 'WEIGHT GAIN', { kind: 'up' });
      E.stamp(ctx, t, B.stamp, 500, 880, 200);
      ctx.restore();
    },
  },

  icecream: {
    theme: THEMES.icecream,
    beats: (S) => ({
      name: S.wt('ice'), sugar: S.wt('sugar'), fats: S.wt('unhealthy'), sneaky: S.wt('sneaky'),
      contrib: S.wt('contributor'), stamp: S.wt('fat') + 0.05,
    }),
    cues: (S, B) => [
      ['drop', B.name + 0.36], ['pop', B.name + 0.3], ['plop', B.name + 0.5], ['plop', B.name + 0.7], ['plop', B.name + 0.9],
      ['pop', B.sugar], ['crunch', B.fats], ['pop', B.fats + 0.05], ['sneak', B.sneaky], ['pop', B.contrib],
      ['stamp', B.stamp + 0.2],
    ],
    draw(ctx, t, S, B) {
      ctx.save();
      E.shake(ctx, t, B.stamp + 0.2);
      const y = 1245;
      const d = dropIn(t, B.name);
      if (d.visible) {
        E.groundShadow(ctx, 420, y + 6, 150);
        ctx.save();
        ctx.translate(420, y + d.dy);
        ctx.rotate(Math.sin(t * 2) * 0.03);
        ctx.scale(0.95 * d.sx, 0.95 * d.sy);
        const look = t > B.sneaky ? Math.sin((t - B.sneaky) * 9) : 0;
        F.drawPopsicle(ctx, t, {
          bite: ease.outBack(prog(t, B.fats, 0.22)), drip: prog(t, B.name + 0.6, 3.2), look,
          mood: t > B.stamp + 0.2 ? 'ko' : 'smug',
        });
        ctx.restore();
      }
      const pc = popIn(t, B.name + 0.25, 0.4);
      if (pc > 0) {
        E.groundShadow(ctx, 790, y + 6, 70);
        ctx.save();
        ctx.translate(790, y);
        ctx.scale(0.82 * pc, 0.82 * pc);
        F.drawCone(ctx, t, { layers: prog(t, B.name + 0.35, 1.3) });
        ctx.restore();
      }
      E.burst(ctx, t, B.fats + 0.05, 530, 650, { n: 16, speed: 520, dur: 0.6, size: 14, colors: ['#4a2412', '#ff9cc0'], gravity: 1400, seed: 9 });
      E.pill(ctx, t, B.sugar, 540, 1310, 'SUGAR', { t1: B.fats });
      E.pill(ctx, t, B.fats + 0.05, 540, 1310, 'UNHEALTHY FATS', { kind: 'drop', color: '#ff9f1a', t1: B.contrib });
      E.pill(ctx, t, B.contrib, 540, 1310, 'BELLY FAT', { kind: 'up' });
      E.stamp(ctx, t, B.stamp, 580, 890, 220);
      ctx.restore();
    },
  },

  chips: {
    theme: (t, S, B) => E.mixTheme(THEMES.chips, THEMES.good, ease.inOutCubic(prog(t, B.better, 0.5))),
    beats: (S) => {
      const B = {
        name: S.wt('potato'), proc: S.wt('processed'), fats: S.wt('unhealthy'), salt: S.wt('salt'),
        better: S.wt('better'), baked: S.wt('baked'), whole: S.wt('whole'),
      };
      B.burst = B.name + 0.8;
      B.stamp = B.salt + 0.25;
      return B;
    },
    cues: (S, B) => [
      ['drop', B.name + 0.36], ['inflate', B.name + 0.35], ['burst', B.burst], ['pop', B.proc], ['pop', B.fats],
      ['rain', B.salt], ['pop', B.salt + 0.02], ['stamp', B.stamp + 0.2], ['whoosh', B.better - 0.1], ['ding', B.better + 0.3],
      ['ding', B.baked], ['pop', B.whole],
    ],
    draw(ctx, t, S, B) {
      ctx.save();
      E.shake(ctx, t, B.stamp + 0.2);
      E.shake(ctx, t, B.burst, 18, 0.3);
      const out = ease.inCubic(prog(t, B.better - 0.1, 0.45));
      const bx = 540 - out * 1000, by = 890;
      const d = dropIn(t, B.name);
      const torn = t >= B.burst;
      const inflate = torn ? 0 : prog(t, B.name + 0.35, B.burst - B.name - 0.35);
      if (d.visible && out < 1) {
        E.groundShadow(ctx, bx, by + 300, 210);
        ctx.save();
        ctx.translate(bx, by + 290 + d.dy);
        ctx.rotate(-out * 0.6 + (inflate > 0 ? Math.sin(t * 40) * 0.02 * inflate : 0));
        ctx.scale(d.sx * (1 + 0.1 * inflate), d.sy * (1 + 0.1 * inflate));
        ctx.translate(0, -290);
        F.drawChipBag(ctx, t, { inflate, torn, mood: t > B.stamp + 0.2 ? 'ko' : 'evil' });
        ctx.restore();
        E.stamp(ctx, t, B.stamp, bx, 880, 200);
      }
      // chips explode out of the bag
      if (torn) {
        const r = rng(30);
        const dt = t - B.burst;
        for (let i = 0; i < 28; i++) {
          const vx = (r() - 0.5) * 1500, vy = -1500 - r() * 1000, rot = r() * 6, vr = (r() - 0.5) * 12, s = 36 + r() * 32;
          const cx = bx + vx * dt, cy = by - 250 + vy * dt + 0.5 * 3000 * dt * dt;
          if (cy < 2100) F.drawChip(ctx, cx, cy, s, rot + vr * dt, i + 50);
        }
        E.burst(ctx, t, B.burst, bx, by - 250, { n: 20, speed: 900, dur: 0.5, size: 18, colors: ['#ffffff', '#ffd23f'], gravity: 500, seed: 31 });
      }
      // salt shower
      if (t > B.salt && t < B.salt + 1.4) {
        const r = rng(44);
        for (let i = 0; i < 60; i++) {
          const x = 220 + r() * 640, sp = 900 + r() * 700, delay = r() * 0.4;
          const yy = -40 + (t - B.salt - delay) * sp;
          if (yy < -40 || yy > 1250) continue;
          ctx.save();
          ctx.translate(x, yy);
          ctx.rotate(i);
          E.rrect(ctx, -7, -7, 14, 14, 3);
          E.fill(ctx, '#ffffff');
          E.stroke(ctx, 3, 'rgba(34,23,51,0.5)');
          ctx.restore();
        }
      }
      E.pill(ctx, t, B.proc, 540, 1300, 'HIGHLY PROCESSED', { t1: B.fats });
      E.pill(ctx, t, B.fats, 540, 1300, 'UNHEALTHY FATS', { kind: 'drop', color: '#ff9f1a', t1: B.salt });
      E.pill(ctx, t, B.salt + 0.02, 540, 1300, 'TOO MUCH SALT', { t1: B.better - 0.1 });

      // the better alternative
      const pin = ease.outBack(prog(t, B.better + 0.05, 0.55));
      if (pin > 0) {
        const cx = lerp(1600, 540, pin), cy = 870;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((1 - pin) * 0.2 - 0.015);
        E.rrect(ctx, -390 + 8, -330 + 14, 780, 660, 44);
        E.fill(ctx, 'rgba(0,0,0,0.25)');
        E.rrect(ctx, -390, -330, 780, 660, 44);
        E.fill(ctx, '#ffffff');
        E.stroke(ctx, 12, OUT);
        E.rrect(ctx, -390, -330, 780, 140, [44, 44, 0, 0]);
        E.fill(ctx, '#1fb866');
        E.stroke(ctx, 12, OUT);
        E.text(ctx, 'BETTER CHOICE', 0, -258, { size: 84, color: '#fff', lw: 14, maxW: 700 });
        ctx.save();
        ctx.translate(-200, 170);
        ctx.scale(0.95, 0.95);
        F.drawPotato(ctx, t, { mood: 'happy' });
        ctx.restore();
        // arrow
        ctx.save();
        ctx.translate(0, 70 + Math.sin(t * 6) * 4);
        ctx.beginPath();
        ctx.moveTo(-50, -18); ctx.lineTo(10, -18); ctx.lineTo(10, -46); ctx.lineTo(60, 0);
        ctx.lineTo(10, 46); ctx.lineTo(10, 18); ctx.lineTo(-50, 18);
        ctx.closePath();
        E.fill(ctx, '#ffd23f');
        E.stroke(ctx, 8);
        ctx.restore();
        ctx.save();
        ctx.translate(200, 200);
        ctx.scale(0.95, 0.95);
        F.drawBakedChips(ctx, t);
        ctx.restore();
        const pc = popIn(t, B.baked, 0.35);
        if (pc > 0) {
          ctx.save();
          ctx.translate(345, -320);
          ctx.scale(pc, pc);
          ctx.rotate(0.15);
          E.circle(ctx, 0, 0, 80);
          E.fill(ctx, '#1fb866');
          E.stroke(ctx, 10);
          E.icon(ctx, 'check', 80);
          ctx.restore();
        }
        ctx.restore();
        E.burst(ctx, t, B.baked, 885, 550, { n: 18, speed: 600, dur: 0.8, size: 20, colors: ['#ffffff', '#b9ffcf', '#ffd23f'], shape: 'star', gravity: 300, seed: 12 });
      }
      E.pill(ctx, t, B.baked, 540, 1300, 'BAKED, NOT FRIED', { kind: 'check', color: '#1fb866', t1: B.whole });
      E.pill(ctx, t, B.whole, 540, 1300, 'WHOLE POTATOES', { kind: 'check', color: '#1fb866' });
      ctx.restore();
    },
  },

  rice: {
    theme: THEMES.rice,
    beats: (S) => ({
      name: S.wt('refined'), cakes: S.wt('cakes'), dig: S.wt('digested'), fast: S.wt('fast'),
      insulin: S.wt('insulin'), spike: S.wt('spikes'), fat: S.wt('fat'), stamp: S.wt('storage') + 0.05,
    }),
    cues: (S, B) => [
      ['drop', B.name + 0.36], ['plop', B.cakes - 0.1 + 0.36], ['plop', B.cakes + 0.02 + 0.36], ['plop', B.cakes + 0.14 + 0.36],
      ['zoom', B.dig], ['pop', B.dig + 0.05], ['card', B.insulin - 0.1], ['rise', B.spike - 0.15], ['pop', B.fat],
      ['stamp', B.stamp + 0.2],
    ],
    draw(ctx, t, S, B) {
      ctx.save();
      E.shake(ctx, t, B.stamp + 0.2);
      const up = ease.inOutCubic(prog(t, B.insulin - 0.1, 0.45));
      ctx.save();
      ctx.translate(540, lerp(1000, 760, up));
      ctx.scale(lerp(1, 0.74, up), lerp(1, 0.74, up));
      ctx.translate(-540, -1000);
      // speed lines while it is "digested super fast"
      if (t > B.dig && t < B.fast + 0.9) {
        const r = rng(71);
        for (let i = 0; i < 14; i++) {
          const yy = 780 + r() * 480, len = 120 + r() * 220, sp = 2600 + r() * 1400;
          const xx = 1200 - ((t - B.dig) * sp + r() * 1400) % 1700;
          ctx.globalAlpha = 0.7;
          E.rrect(ctx, xx, yy, len, 12, 6);
          E.fill(ctx, '#ffffff');
        }
        ctx.globalAlpha = 1;
      }
      const d = dropIn(t, B.name);
      if (d.visible) {
        E.groundShadow(ctx, 620, 1245, 200);
        ctx.save();
        ctx.translate(620, 990 + d.dy);
        const wob = t > B.dig && t < B.fast + 0.8 ? Math.sin(t * 50) * 6 : 0;
        ctx.translate(wob, 0);
        ctx.scale(0.9 * d.sx, 0.9 * d.sy);
        F.drawRiceBowl(ctx, t, { mood: t > B.stamp + 0.2 ? 'ko' : 'smug' });
        ctx.restore();
      }
      for (let i = 0; i < 3; i++) {
        const dc = dropIn(t, B.cakes - 0.1 + i * 0.12, 1100);
        if (!dc.visible) continue;
        ctx.save();
        ctx.translate(210, 1240 - i * 44 + dc.dy);
        ctx.scale(0.88 * dc.sx, 0.88 * dc.sy);
        F.drawRiceCake(ctx, 0, 0, 1);
        ctx.restore();
      }
      ctx.restore();
      E.pill(ctx, t, B.dig + 0.05, 540, 1305, 'DIGESTED FAST', { kind: 'bolt', color: '#ff9f1a', t1: B.insulin - 0.1 });
      E.spikeChart(ctx, t, B.insulin - 0.1, B.spike, 540, 1175, { label: 'INSULIN', color: '#ff3b4d' });
      E.pill(ctx, t, B.fat, 560, 455, 'FAT STORAGE', { kind: 'up' });
      E.stamp(ctx, t, B.stamp, 575, 740, 190);
      ctx.restore();
    },
  },

  outro: {
    theme: THEMES.outro,
    beats: (S) => ({ save: S.wt('save'), follow: S.wt('follow'), tips: S.wt('tips') }),
    cues: (S, B) => [
      ...F.thumbs.map((_, i) => ['plop', 0.12 + i * 0.09]), ['stamp-soft', 0.75], ['pop', B.save],
      ['ding', B.follow], ['click', B.follow + 0.55],
    ],
    draw(ctx, t, S, B) {
      E.text(ctx, 'AVOID THESE 6', 540, 330, { size: 118, color: '#ffe04a', scale: popIn(t, 0.05, 0.4), rot: -0.03, lw: 20 });
      F.thumbs.forEach((thumb, i) => {
        const cx = 250 + (i % 3) * 290, cy = 700 + Math.floor(i / 3) * 355;
        const p = popIn(t, 0.1 + i * 0.09, 0.4);
        if (p <= 0) return;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i % 2 ? 1 : -1) * 0.035 + Math.sin(t * 2 + i) * 0.01);
        ctx.scale(p, p);
        E.rrect(ctx, -130 + 6, -160 + 12, 260, 320, 34);
        E.fill(ctx, 'rgba(0,0,0,0.28)');
        E.rrect(ctx, -130, -160, 260, 320, 34);
        E.fill(ctx, 'rgba(255,255,255,0.92)');
        E.stroke(ctx, 9);
        ctx.save();
        E.rrect(ctx, -130, -160, 260, 320, 34);
        ctx.clip();
        thumb(ctx, t);
        ctx.restore();
        const px = popIn(t, 0.7 + i * 0.05, 0.3);
        if (px > 0) {
          ctx.translate(100, -130);
          ctx.scale(px, px);
          E.circle(ctx, 0, 0, 40);
          E.fill(ctx, '#ff2d48');
          E.stroke(ctx, 7);
          E.icon(ctx, 'x', 40);
        }
        ctx.restore();
      });
      E.pill(ctx, t, B.save, 540, 1300, 'SAVE FOR LATER', { kind: 'check', color: '#ffb000', t1: B.follow - 0.05 });
      // follow button with a tap and floating hearts
      const pf = popIn(t, B.follow, 0.4);
      if (pf > 0) {
        const tap = t > B.follow + 0.55 ? 1 - 0.1 * Math.exp(-(t - B.follow - 0.55) * 12) : 1;
        ctx.save();
        ctx.translate(540, 1300);
        ctx.scale(pf * tap * (1 + 0.03 * Math.sin(t * 7)), pf * tap * (1 + 0.03 * Math.sin(t * 7)));
        E.rrect(ctx, -250 + 6, -70 + 12, 500, 140, 70);
        E.fill(ctx, 'rgba(0,0,0,0.3)');
        E.rrect(ctx, -250, -70, 500, 140, 70);
        E.fill(ctx, '#ff2d6f');
        E.stroke(ctx, 10);
        ctx.save();
        ctx.translate(-150, 0);
        E.circle(ctx, 0, 0, 44);
        E.fill(ctx, '#fff');
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#ff2d6f';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.moveTo(0, -20); ctx.lineTo(0, 20);
        ctx.stroke();
        ctx.restore();
        E.text(ctx, 'FOLLOW', 50, 4, { size: 84, color: '#fff', lw: 12, shadow: false });
        ctx.restore();
        const dt = t - B.follow - 0.55;
        if (dt > 0 && dt < 0.6) {
          E.circle(ctx, 660, 1310, 30 + dt * 300);
          E.stroke(ctx, 10 * (1 - dt / 0.6), '#ffffff');
        }
        const r = rng(99);
        for (let i = 0; i < 12; i++) {
          const t0 = B.follow + 0.6 + i * 0.12, x0 = 480 + r() * 200, sz = 22 + r() * 18;
          const k = (t - t0) / 1.6;
          if (k < 0 || k > 1) continue;
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.translate(x0 + Math.sin(k * 8 + i) * 50, 1220 - k * 650);
          ctx.scale(sz / 30, sz / 30);
          heart(ctx);
          E.fill(ctx, i % 2 ? '#ff2d6f' : '#ff7aa8');
          E.stroke(ctx, 5);
          ctx.restore();
        }
      }
    },
  },
};

function heart(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.bezierCurveTo(-40, -2, -30, -36, 0, -18);
  ctx.bezierCurveTo(30, -36, 40, -2, 0, 26);
  ctx.closePath();
}
