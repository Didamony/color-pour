// Canvas drawing for tubes and liquid. The liquid surface stays level while a tube tilts:
// each layer boundary is found by searching for the horizontal line that encloses the layer's volume.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};

  const LIQUIDS = {
    classic: ['#F2445C', '#FF8C32', '#FFD23F', '#A6E33B', '#2DB55D', '#2ECBE9', '#3B6EF5', '#8E4FE8', '#FF7EB9', '#9C5B3A', '#8A94A6', '#9FF0D0'],
    pastel:  ['#FF8FA0', '#FFB77D', '#FFE57F', '#C9EE85', '#7FD9A0', '#87E2F2', '#8FAEFF', '#BE9BFF', '#FFB3D6', '#C99A80', '#B7BECB', '#C7F7E4'],
    neon:    ['#FF1F4B', '#FF7A00', '#FFE600', '#9DFF00', '#00E676', '#00E5FF', '#2979FF', '#B026FF', '#FF3DCB', '#C66A2E', '#A0AEC0', '#64FFDA'],
  };
  const SYMBOLS = ['●', '▲', '■', '◆', '★', '♥', '✚', '⬟', '☾', '✿', '▼', '⬢'];

  // Tube outline shapes in unit width; mouth centre at (0,0), body going down (+y).
  function arc(pts, cx, cy, r, a0, a1, steps) {
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * (s / steps);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  function roundedBottom(r) {
    return function (H) {
      const p = [[-0.5, 0]];
      arc(p, -0.5 + r, H - r, r, Math.PI, Math.PI / 2, 6);
      arc(p, 0.5 - r, H - r, r, Math.PI / 2, 0, 6);
      p.push([0.5, 0]);
      return p;
    };
  }
  const SHAPES = {
    classic: roundedBottom(0.5),
    golden: roundedBottom(0.5),
    glass: roundedBottom(0.16),
    vial: roundedBottom(0.3),
    cup(H) {
      const b = 0.36, r = 0.12, p = [[-0.5, 0]];
      arc(p, -b + r, H - r, r, Math.PI * 0.94, Math.PI / 2, 5);
      arc(p, b - r, H - r, r, Math.PI / 2, Math.PI * 0.06, 5);
      p.push([0.5, 0]);
      return p;
    },
    crystal(H) {
      return [[-0.5, 0], [-0.5, H - 0.62], [-0.22, H - 0.12], [0, H], [0.22, H - 0.12], [0.5, H - 0.62], [0.5, 0]];
    },
  };

  const UNIT = 0.92;      // liquid area per layer, in unit-width squared
  const HEADROOM = 0.42;  // empty area above a full tube

  function area(p) {
    let s = 0;
    for (let i = 0, n = p.length; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  }
  // Part of polygon below the horizontal line y = h (canvas y grows downwards).
  function clipBelow(p, h) {
    const out = [];
    for (let i = 0, n = p.length; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      const ain = a[1] >= h, bin = b[1] >= h;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = (h - a[1]) / (b[1] - a[1]);
        out.push([a[0] + t * (b[0] - a[0]), h]);
      }
    }
    return out;
  }
  function bounds(p) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of p) {
      if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
      if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
    }
    return { x0, x1, y0, y1 };
  }
  function levelFor(p, b, V) {
    if (V <= 1e-6) return b.y1;
    let lo = b.y0, hi = b.y1;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      if (area(clipBelow(p, mid)) > V) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  const geoCache = {};
  // Unit-width geometry for a skin and capacity. Height is chosen so a full tube keeps the same headroom.
  function geometry(skin, cap) {
    const key = skin + ':' + cap;
    if (geoCache[key]) return geoCache[key];
    const make = SHAPES[skin] || SHAPES.classic;
    const target = cap * UNIT + HEADROOM;
    let lo = 0.5, hi = cap * 2 + 3;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (area(make(mid)) < target) lo = mid; else hi = mid;
    }
    const H = (lo + hi) / 2;
    const g = { skin, cap, H, poly: make(H), tiltCache: new Map() };
    geoCache[key] = g;
    return g;
  }

  function transform(poly, W, x, y, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return poly.map(q => [x + (q[0] * c - q[1] * s) * W, y + (q[0] * s + q[1] * c) * W]);
  }

  // Smallest tilt at which liquid of the given volume (in layers) reaches the lip.
  function tiltFor(g, layers) {
    const q = Math.round(layers * 20);
    if (g.tiltCache.has(q)) return g.tiltCache.get(q);
    const V = (q / 20) * UNIT;
    let lo = 0, hi = 2.7;
    for (let k = 0; k < 26; k++) {
      const mid = (lo + hi) / 2;
      const p = transform(g.poly, 1, 0, 0, mid);
      const h = levelFor(p, bounds(p), V);
      const lipY = 0.5 * Math.sin(mid);
      if (h <= lipY) hi = mid; else lo = mid;
    }
    const a = (lo + hi) / 2;
    g.tiltCache.set(q, a);
    return a;
  }

  function pathFrom(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function mix(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
    const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
    const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  function liquidColor(style, c) {
    const pal = LIQUIDS[style.liquid] || LIQUIDS.classic;
    return pal[c] || '#888888';
  }

  // tv: { x, y, angle, W, layers:[{c, amt, hidden, reveal}], selected, complete, corkT, scale }
  // style: { skin, liquid, theme:{glass, stroke, mystery, accent, cork, rim}, symbols, time }
  function drawTube(ctx, tv, g, style) {
    const W = tv.W * (tv.scale || 1);
    const a = tv.angle || 0;
    const poly = transform(g.poly, W, tv.x, tv.y, a);
    const b = bounds(poly);
    const th = style.theme;
    const golden = style.skin === 'golden';

    const upright = Math.abs(a) < 0.02;
    const local = () => { ctx.save(); ctx.translate(tv.x, tv.y); ctx.rotate(a); };

    // soft shadow on the shelf
    if (Math.abs(a) < 0.25 && tv.shadow !== false) {
      ctx.fillStyle = th.shadow || 'rgba(40,20,80,0.18)';
      ctx.beginPath();
      ctx.ellipse(tv.x, b.y1 + W * 0.06, W * 0.62, W * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // glass body
    pathFrom(ctx, poly);
    ctx.fillStyle = th.glass;
    ctx.fill();

    ctx.save();
    pathFrom(ctx, poly);
    ctx.clip();

    // liquid bands, each cut by a level line so the surface stays flat while tilting
    const unitA = UNIT * W * W;
    let cum = 0, lowY = b.y1 + 2;
    const bands = [];
    for (const L of tv.layers) {
      if (L.amt <= 0.001) continue;
      cum += L.amt * unitA;
      const h = levelFor(poly, b, cum);
      bands.push({ L, top: h, bot: lowY });
      lowY = h;
    }
    const colorOf = L => {
      let col = L.hidden ? th.mystery : liquidColor(style, L.c);
      if (!L.hidden && L.reveal != null && L.reveal < 1) col = mix(th.mystery, col, L.reveal);
      return col;
    };
    for (const band of bands) {
      ctx.fillStyle = colorOf(band.L);
      ctx.fillRect(b.x0 - 4, band.top - 0.5, b.x1 - b.x0 + 8, band.bot - band.top + 1);
      if (style.liquid === 'glossy' || style.liquid === 'neon') {
        ctx.fillStyle = style.liquid === 'neon' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)';
        ctx.fillRect(b.x0 - 4, band.top, b.x1 - b.x0 + 8, Math.max(1.5, W * 0.05));
      }
    }
    if (bands.length) {
      const top = bands[bands.length - 1].top;
      // round, lit shading across the liquid
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x0 - 6, top, b.x1 - b.x0 + 12, b.y1 - top + 6);
      ctx.clip();
      local();
      const sh = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
      sh.addColorStop(0, 'rgba(0,0,0,0.24)');
      sh.addColorStop(0.22, 'rgba(255,255,255,0.10)');
      sh.addColorStop(0.42, 'rgba(255,255,255,0.20)');
      sh.addColorStop(0.7, 'rgba(0,0,0,0.02)');
      sh.addColorStop(1, 'rgba(0,0,0,0.26)');
      ctx.fillStyle = sh;
      ctx.fillRect(-W, -W, W * 2, g.H * W + W * 2);
      ctx.restore();
      ctx.restore();
      // the surface: a lit ellipse when standing, a bright line when tilted
      const topCol = colorOf(bands[bands.length - 1].L);
      if (upright) {
        ctx.fillStyle = mix(topCol.length === 7 ? topCol : '#888888', '#FFFFFF', 0.38);
        ctx.beginPath();
        ctx.ellipse(tv.x, top, W * 0.47, W * 0.085, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.fillRect(b.x0 - 4, top, b.x1 - b.x0 + 8, Math.max(1.5, W * 0.045));
      }
      if (style.liquid === 'bubbles' || style.liquid === 'glitter') drawSparkles(ctx, tv, b, top, W, style);
    }

    // curved glass: brighter edges, clear middle, plus two glints
    local();
    const gl = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
    gl.addColorStop(0, 'rgba(255,255,255,0.42)');
    gl.addColorStop(0.16, 'rgba(255,255,255,0.06)');
    gl.addColorStop(0.82, 'rgba(255,255,255,0)');
    gl.addColorStop(1, 'rgba(255,255,255,0.3)');
    ctx.fillStyle = gl;
    ctx.fillRect(-W, -W, W * 2, g.H * W + W * 2);
    const glare = ctx.createLinearGradient(0, W * 0.25, 0, g.H * W * 0.85);
    glare.addColorStop(0, 'rgba(255,255,255,0.7)');
    glare.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = glare;
    roundRect(ctx, -W * 0.34, W * 0.25, W * 0.11, g.H * W * 0.6, W * 0.055);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    roundRect(ctx, W * 0.2, W * 0.32, W * 0.07, W * 0.55, W * 0.035);
    ctx.fill();
    ctx.restore();

    // symbols / question marks, only when standing still
    if (upright && (style.symbols || bands.some(x => x.L.hidden))) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const band of bands) {
        const hgt = band.bot - band.top;
        if (hgt < W * 0.45) continue;
        const cy = (band.top + Math.min(band.bot, b.y1)) / 2;
        if (band.L.hidden) {
          ctx.font = '800 ' + Math.round(W * 0.48) + 'px "Baloo Bhaijaan 2", system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillText('?', tv.x, cy + W * 0.04);
        } else if (style.symbols) {
          ctx.font = '700 ' + Math.round(W * 0.34) + 'px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.42)';
          ctx.fillText(SYMBOLS[band.L.c] || '', tv.x, cy);
        }
      }
    }
    ctx.restore();

    // outline: a coloured edge with a thin bright inner line
    pathFrom(ctx, poly);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, W * 0.065);
    ctx.strokeStyle = golden ? '#E2A92B' : th.stroke;
    ctx.stroke();
    ctx.lineWidth = Math.max(1, W * 0.022);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
    if (tv.selected) {
      ctx.save();
      pathFrom(ctx, poly);
      ctx.shadowColor = th.accent;
      ctx.shadowBlur = W * 0.45;
      ctx.lineWidth = Math.max(2.5, W * 0.075);
      ctx.strokeStyle = th.accent;
      ctx.stroke();
      ctx.restore();
    }

    // rim and cork in tube space
    local();
    const rim = ctx.createLinearGradient(0, -W * 0.1, 0, W * 0.12);
    rim.addColorStop(0, '#FFFFFF');
    rim.addColorStop(0.45, golden ? '#F7D368' : th.rim);
    rim.addColorStop(1, golden ? '#C98F1C' : th.stroke);
    ctx.fillStyle = rim;
    roundRect(ctx, -W * 0.62, -W * 0.09, W * 1.24, W * 0.19, W * 0.09);
    ctx.fill();
    if (tv.complete) {
      const t = tv.corkT == null ? 1 : tv.corkT;
      const drop = (1 - easeOutBack(t)) * -W * 0.9;
      ctx.globalAlpha = Math.min(1, t * 3);
      const ck = ctx.createLinearGradient(-W * 0.34, 0, W * 0.34, 0);
      ck.addColorStop(0, mix(th.cork, '#000000', 0.15));
      ck.addColorStop(0.4, mix(th.cork, '#FFFFFF', 0.2));
      ck.addColorStop(1, mix(th.cork, '#000000', 0.25));
      ctx.fillStyle = ck;
      roundRect(ctx, -W * 0.34, -W * 0.4 + drop, W * 0.68, W * 0.42, W * 0.12);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      [[-0.15, -0.26], [0.1, -0.18], [-0.02, -0.08], [0.18, -0.3]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(dx * W, dy * W + drop, W * 0.03, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      roundRect(ctx, -W * 0.26, -W * 0.36 + drop, W * 0.22, W * 0.07, W * 0.035);
      ctx.fill();
    }
    ctx.restore();
    return { poly, bounds: b, topY: bands.length ? bands[bands.length - 1].top : b.y1 };
  }

  function drawSparkles(ctx, tv, b, topY, W, style) {
    const t = style.time / 1000;
    const n = 7;
    for (let k = 0; k < n; k++) {
      const seed = (tv.id * 31 + k * 17) % 97;
      const fx = ((seed * 37) % 100) / 100 - 0.5;
      if (style.liquid === 'bubbles') {
        const span = b.y1 - topY;
        if (span < 4) return;
        const prog = ((t * (0.25 + (seed % 5) * 0.06) + seed / 97) % 1);
        const y = b.y1 - prog * span;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(tv.x + fx * W * 0.6, y, W * (0.04 + (seed % 3) * 0.015), 0, Math.PI * 2);
        ctx.fill();
      } else {
        const y = topY + (((seed * 53) % 100) / 100) * (b.y1 - topY);
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + seed);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + tw * 0.65).toFixed(2) + ')';
        const s = W * (0.03 + tw * 0.03);
        ctx.fillRect(tv.x + fx * W * 0.7 - s / 2, y - s / 2, s, s);
      }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  CP.Render = { LIQUIDS, SYMBOLS, SHAPES, UNIT, geometry, tiltFor, drawTube, roundRect, transform, bounds, levelFor, mix, liquidColor, easeOutBack };
})(this);
