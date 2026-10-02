// The ad as a list of beats. Each beat is one voiceover line; "text" is split into the
// caption chunks shown one after another (like the reference). Animation cues in
// scene.js are relative to the start of their beat, so when real voiceover clips are
// dropped into vo/, the beats stretch to fit them and everything stays in sync.
(function (G) {
  const BEATS = [
    { id: 'hook', dur: 3.4, text: ["Let's say this pizza", 'is everything you eat in a day.'] },
    { id: 'oil', dur: 3.3, text: ['A thin slice', 'is the oil in your pan.'] },
    { id: 'latte', dur: 2.1, text: ['Then your latte,'] },
    { id: 'nuts', dur: 2.0, text: ['a handful of nuts,'] },
    { id: 'bites', dur: 2.4, text: ['and the bites', 'while cooking.'] },
    { id: 'breakfast', dur: 1.9, text: ['Then breakfast,'] },
    { id: 'lunch', dur: 1.6, text: ['lunch,'] },
    { id: 'dinner', dur: 1.8, text: ['and dinner.'] },
    { id: 'log', dur: 2.6, text: ['You log all three meals.'] },
    { id: 'sum', dur: 3.0, text: ['{tracked} kcal.', 'Under your {budget} budget.'] },
    { id: 'why', dur: 2.4, text: ["So why isn't", 'the scale moving?'] },
    { id: 'tiny', dur: 2.3, text: ['Because these tiny slices'] },
    { id: 'mystery', dur: 2.8, text: ['add up to…'] },
    { id: 'reveal', dur: 2.6, text: ['{hidden} kcal.', 'Every single day.'] },
    { id: 'kcal', dur: 2.6, text: ['{pct}% of what you eat,', 'never tracked.'] },
    { id: 'deficit', dur: 2.8, text: ["And that's the part", 'eating your deficit.'] },
    { id: 'stop', dur: 2.4, text: ["You don't have to", 'stop eating them.'] },
    { id: 'see', dur: 2.0, text: ['You just have to', 'see them.'] },
    { id: 'built', dur: 2.4, text: ["That's why we built Pumpy."] },
    { id: 'scan', dur: 3.6, text: ['Snap your plate,', 'it counts every slice.'] },
    { id: 'cta', dur: 2.9, text: ['Download Pumpy AI.'] },
  ];

  // Numbers in captions come from CFG.kcal so captions, stickers and pie always agree.
  function numbers() {
    const K = G.CFG.kcal, f = (n) => n.toLocaleString('en-US');
    const tracked = K.breakfast + K.lunch + K.dinner, hidden = K.oil + K.latte + K.nuts + K.bites;
    const total = tracked + hidden;
    return { tracked: f(tracked), hidden: f(hidden), total: f(total), budget: f(G.CFG.budget), pct: Math.round(hidden / total * 100) };
  }
  const fill = (s, n) => s.replace(/\{(\w+)\}/g, (_, k) => n[k]);

  // voDur: optional { beatId: seconds } measured from vo/<nn>-<id>.wav
  function build(voDur) {
    voDur = voDur || {};
    const N = numbers();
    const B = {}, D = {}, captions = [], vo = [];
    let t = 0;
    BEATS.forEach((b, i) => {
      const v = voDur[b.id];
      const dur = v ? Math.max(b.dur, v + 0.45) : b.dur;
      B[b.id] = t; D[b.id] = dur;
      // caption chunks share the spoken part of the beat by word count
      const spoken = v ? v + 0.15 : dur - 0.25;
      const text = b.text.map((s) => fill(s, N));
      const words = text.map(s => s.split(/\s+/).length + 0.6);
      const sum = words.reduce((a, c) => a + c, 0);
      let ct = t;
      text.forEach((s, k) => {
        const len = k === text.length - 1 ? (t + dur) - ct : spoken * words[k] / sum;
        captions.push({ t0: ct, t1: ct + len, text: s });
        ct += len;
      });
      if (v) vo.push({ id: b.id, index: i, t: t + 0.1 });
      t += dur;
    });
    return { B, D, captions, vo, duration: t + 0.4 };
  }

  G.TIMELINE = { BEATS, build, numbers, fill };
})(window);
