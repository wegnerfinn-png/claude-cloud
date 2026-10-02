// Lego-like pixel stickers: every pixel is a little brick with a stud, framed by
// a ring of white bricks (like the pixel-heart sticker in the reference).
(function (G) {
  const FONT = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
    '%': ['11001', '11010', '00100', '01011', '10011'],
    '?': ['111', '001', '011', '000', '010'],
    ',': ['0', '0', '0', '1', '1'],
  };

  function grid(text) {
    const cols = [];
    [...text].forEach((ch, i) => {
      const g = FONT[ch];
      if (i) cols.push([0, 0, 0, 0, 0]);
      for (let c = 0; c < g[0].length; c++) cols.push(g.map(row => +row[c]));
    });
    return cols; // cols[x][y]
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  }

  function brick(x, px, py, s, base) {
    const r = s * 0.16;
    let g = x.createLinearGradient(px, py, px + s, py + s);
    g.addColorStop(0, shade(base, 0.12)); g.addColorStop(1, shade(base, -0.14));
    x.fillStyle = g; x.beginPath(); x.roundRect(px + 0.6, py + 0.6, s - 1.2, s - 1.2, r); x.fill();
    // stud
    const cx = px + s / 2, cy = py + s / 2, sr = s * 0.27;
    x.fillStyle = shade(base, -0.16);
    x.beginPath(); x.arc(cx + s * 0.04, cy + s * 0.06, sr, 0, Math.PI * 2); x.fill();
    g = x.createLinearGradient(cx - sr, cy - sr, cx + sr, cy + sr);
    g.addColorStop(0, shade(base, 0.2)); g.addColorStop(1, shade(base, 0.02));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, sr, 0, Math.PI * 2); x.fill();
  }

  // Returns a canvas with the sticker centred.
  function make(text, color, s) {
    s = s || 17;
    const cols = grid(text);
    const gw = cols.length + 2, gh = 7;
    const cell = (x, y) => (x >= 1 && x <= cols.length && y >= 1 && y <= 5) ? cols[x - 1][y - 1] : 0;
    const c = G.TEX.canvas(gw * s + 4, gh * s + 4), x = c.getContext('2d');
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const on = cell(gx, gy);
        let border = false;
        if (!on) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (cell(gx + dx, gy + dy)) border = true;
        if (on) brick(x, 2 + gx * s, 2 + gy * s, s, color);
        else if (border) brick(x, 2 + gx * s, 2 + gy * s, s, '#f7f7f5');
      }
    }
    return c;
  }

  G.STICKER = { make };
})(window);
