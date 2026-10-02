// Phone mock for the CTA. The screen is drawn at the RPReplay size (828x1792) so a
// real recording frame can replace the mock 1:1 (CFG.appScreen).
(function (G) {
  const SW = 828, SH = 1792;

  const ITEMS = [
    { key: 'oil', name: 'Olive oil', note: '1 tbsp, in the pan', dot: '#c9a227' },
    { key: 'latte', name: 'Oat latte', note: 'medium', dot: '#a8723f' },
    { key: 'nuts', name: 'Almonds', note: '30 g', dot: '#8a5126' },
    { key: 'bites', name: 'Tasting while cooking', note: 'pasta sauce', dot: '#b5321a' },
    { key: 'breakfast', name: 'Breakfast', note: 'eggs & toast', dot: '#f3b21f' },
    { key: 'lunch', name: 'Lunch', note: 'grilled chicken', dot: '#c98a4c' },
    { key: 'dinner', name: 'Dinner', note: 'salmon & asparagus', dot: '#ee7d4f' },
  ];

  let shot = null;
  function loadScreen(src) {
    return new Promise((res) => {
      if (!src) return res();
      const im = new Image();
      im.onload = () => { shot = im; res(); };
      im.onerror = () => res();
      im.src = src;
    });
  }

  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  // state: { shown: 0..7 items revealed (fractional = row sliding in), total }
  function drawScreen(x, st) {
    const B = G.CFG.brand;
    if (shot) { x.drawImage(shot, 0, 0, SW, SH); return; }
    x.fillStyle = '#f5f6fa'; x.fillRect(0, 0, SW, SH);
    // status bar
    x.fillStyle = '#0d0f1a'; x.font = '600 34px Inter'; x.textBaseline = 'middle';
    x.fillText('9:41', 74, 62);
    x.fillRect(650, 50, 46, 24); x.fillStyle = '#f5f6fa'; x.fillRect(654, 54, 30, 16);
    x.fillStyle = '#0d0f1a';
    for (let k = 0; k < 4; k++) x.fillRect(560 + k * 14, 70 - k * 6, 9, 6 + k * 6);
    // header
    x.font = '800 66px Inter'; x.fillText('Today', 56, 180);
    x.fillStyle = '#7b8095'; x.font = '500 30px Inter'; x.fillText('Thursday, Oct 2', 58, 236);
    // brand chip
    x.fillStyle = B.color; x.beginPath(); x.roundRect(612, 150, 160, 60, 30); x.fill();
    x.fillStyle = '#fff'; x.font = '800 28px Inter'; x.textAlign = 'center'; x.fillText(B.name, 692, 181); x.textAlign = 'left';

    // calorie card
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(40, 280, 748, 470, 44); x.fill();
    const total = st.total, budget = G.CFG.budget;
    const cx = 230, cy = 515, R = 150;
    x.lineCap = 'round';
    x.strokeStyle = '#e8eaf3'; x.lineWidth = 30; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
    const p = Math.min(total / budget, 1);
    x.strokeStyle = B.color; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); x.stroke();
    if (total > budget) {
      const q = Math.min((total - budget) / budget, 1);
      x.strokeStyle = B.over; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); x.stroke();
    }
    x.lineCap = 'butt';
    x.fillStyle = '#0d0f1a'; x.textAlign = 'center'; x.font = '800 72px Inter'; x.fillText(fmt(total), cx, cy - 8);
    x.fillStyle = '#7b8095'; x.font = '500 28px Inter'; x.fillText('of ' + fmt(budget) + ' kcal', cx, cy + 50);
    x.textAlign = 'left';
    // right column
    const over = total - budget;
    x.fillStyle = '#7b8095'; x.font = '600 28px Inter'; x.fillText(over > 0 ? 'Over budget' : 'Remaining', 448, 400);
    x.fillStyle = over > 0 ? B.over : '#0d0f1a'; x.font = '800 64px Inter';
    x.fillText((over > 0 ? '+' : '') + fmt(Math.abs(over)), 448, 462);
    x.fillStyle = '#7b8095'; x.font = '500 28px Inter'; x.fillText('kcal', 450, 512);
    const macros = [['Protein', '#2E54FF', 0.72], ['Carbs', '#22b07d', 0.9], ['Fat', '#f5a524', 1]];
    macros.forEach((m, i) => {
      const y = 572 + i * 50;
      x.fillStyle = '#0d0f1a'; x.font = '600 24px Inter'; x.fillText(m[0], 448, y);
      x.fillStyle = '#e8eaf3'; x.beginPath(); x.roundRect(580, y - 9, 170, 18, 9); x.fill();
      x.fillStyle = m[1]; x.beginPath(); x.roundRect(580, y - 9, 170 * m[2] * Math.min(1, total / 2500), 18, 9); x.fill();
    });

    // scanned list
    x.fillStyle = '#0d0f1a'; x.font = '800 40px Inter'; x.fillText('Scanned', 56, 828);
    x.fillStyle = '#7b8095'; x.font = '500 28px Inter'; x.fillText(Math.floor(st.shown) + ' items', 640, 828);
    for (let i = 0; i < ITEMS.length; i++) {
      const k = Math.min(1, Math.max(0, st.shown - i));
      if (k <= 0) continue;
      const it = ITEMS[i], y = 880 + i * 112;
      const e = 1 - Math.pow(1 - k, 3);
      x.save(); x.globalAlpha = e; x.translate(0, (1 - e) * 30);
      x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(40, y, 748, 96, 28); x.fill();
      x.fillStyle = it.dot; x.beginPath(); x.arc(100, y + 48, 26, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(93, y + 40, 9, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#0d0f1a'; x.font = '700 30px Inter'; x.fillText(it.name, 146, y + 36);
      x.fillStyle = '#7b8095'; x.font = '500 24px Inter'; x.fillText(it.note, 146, y + 70);
      x.fillStyle = i < 4 ? B.over : '#0d0f1a'; x.font = '800 32px Inter'; x.textAlign = 'right';
      x.fillText(fmt(G.CFG.kcal[it.key]), 700, y + 50);
      x.fillStyle = '#7b8095'; x.font = '500 22px Inter'; x.fillText('kcal', 760, y + 50); x.textAlign = 'left';
      x.restore();
    }
    // tab bar with scan button
    x.fillStyle = '#ffffff'; x.fillRect(0, 1650, SW, 142);
    x.fillStyle = '#c3c7d6';
    [120, 280, 548, 708].forEach(px => { x.beginPath(); x.roundRect(px - 22, 1690, 44, 40, 10); x.fill(); });
    x.fillStyle = B.color; x.beginPath(); x.arc(414, 1680, 62, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 7;
    const s = 22;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      x.beginPath(); x.moveTo(414 + sx * s, 1680 + sy * (s - 10)); x.lineTo(414 + sx * s, 1680 + sy * s); x.lineTo(414 + sx * (s - 10), 1680 + sy * s); x.stroke();
    });
    x.fillStyle = '#0d0f1a'; x.beginPath(); x.roundRect(290, 1770, 248, 10, 5); x.fill();
  }

  // Draws the phone centred at (0,0), width w.
  const screenCv = G.TEX.canvas(SW, SH), sx = screenCv.getContext('2d');
  function draw(x, w, st) {
    const k = w / (SW + 60), h = (SH + 60) * k;
    drawScreen(sx, st);
    x.save();
    x.shadowColor = 'rgba(10,12,20,0.45)'; x.shadowBlur = 50 * k * 2; x.shadowOffsetX = 20 * k * 2; x.shadowOffsetY = 34 * k * 2;
    x.fillStyle = '#16171c'; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 120 * k); x.fill();
    x.restore();
    // metal edge
    x.strokeStyle = '#4a4c55'; x.lineWidth = 6 * k; x.beginPath(); x.roundRect(-w / 2 + 3 * k, -h / 2 + 3 * k, w - 6 * k, h - 6 * k, 118 * k); x.stroke();
    // screen
    x.save();
    x.beginPath(); x.roundRect(-w / 2 + 30 * k, -h / 2 + 30 * k, SW * k, SH * k, 92 * k); x.clip();
    x.drawImage(screenCv, -w / 2 + 30 * k, -h / 2 + 30 * k, SW * k, SH * k);
    // glass reflection
    const g = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.45, 'rgba(255,255,255,0.0)'); g.addColorStop(1, 'rgba(255,255,255,0.04)');
    x.fillStyle = g; x.fillRect(-w / 2, -h / 2, w, h);
    x.restore();
    // dynamic island
    x.fillStyle = '#050506'; x.beginPath(); x.roundRect(-110 * k, -h / 2 + 52 * k, 220 * k, 64 * k, 32 * k); x.fill();
  }

  G.PHONE = { draw, loadScreen, ITEMS };
})(window);
