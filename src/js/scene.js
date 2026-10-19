// Animated illustrated backgrounds. Each shop background is a small scene with a day and a night look.
// Everything is drawn procedurally, so the game still ships as one file.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};
  const TAU = Math.PI * 2;

  // ---------- palettes ----------
  const PAL = {
    home: {
      day: { sky: ['#FF6EC4', '#B653FF', '#5B3DF5'], hills: ['#FFFFFF'], deco: '#FFFFFF' },
      night: { sky: ['#6A1F9E', '#36157A', '#140A3D'], hills: ['#FFFFFF'], deco: '#FFFFFF' },
    },
    cloud: {
      day: { sky: ['#FFE1F1', '#EADCFF', '#D6EBFF'], hills: ['#FFC4E1', '#D6C0FF', '#BDEBD9'], deco: '#FFFFFF' },
      night: { sky: ['#2B1752', '#1C1239', '#120C26'], hills: ['#4B2C7C', '#3A2467', '#2A1A4E'], deco: '#FFFFFF' },
    },
    sky: {
      day: { sky: ['#6FCBFF', '#B9E8FF', '#FFF2DC'], hills: ['#A8E36F', '#7CCF63', '#56B85A'], deco: '#FFFFFF' },
      night: { sky: ['#0D1D44', '#1A2C5C', '#2C3D72'], hills: ['#1F4140', '#17332F', '#102624'], deco: '#C9D6FF' },
    },
    ocean: {
      day: { sky: ['#8BE7F2', '#3DB4E0', '#1C76C0'], hills: ['#F6D9A2', '#EBC27F'], deco: '#FFFFFF' },
      night: { sky: ['#0C3B5C', '#062A46', '#031529'], hills: ['#2C3346', '#20273A'], deco: '#9FE6FF' },
    },
    mint: {
      day: { sky: ['#E8FFF5', '#CFF6E5', '#FFF6DF'], hills: ['#9DE5BF', '#6FD3A2', '#45BE86'], deco: '#FFFFFF' },
      night: { sky: ['#0F2F2B', '#0B2421', '#071715'], hills: ['#174238', '#11342D', '#0B2822'], deco: '#E9FF8A' },
    },
    sunset: {
      day: { sky: ['#8E6BFF', '#FF7EA6', '#FFB46A'], hills: ['#5B3B8C', '#3E2766'], deco: '#FFFFFF' },
      night: { sky: ['#1B0F33', '#4A1D4F', '#7A2E52'], hills: ['#1A0F2B', '#120A1F'], deco: '#FFD1E3' },
    },
    desert: {
      day: { sky: ['#FFC98A', '#FFE3BE', '#FFF4E2'], hills: ['#F2C27E', '#E5A95E', '#D4913F'], deco: '#FFFFFF' },
      night: { sky: ['#191335', '#2A1D47', '#3F2B52'], hills: ['#4A3550', '#3A2944', '#2B1F36'], deco: '#FFFFFF' },
    },
    space: {
      day: { sky: ['#D9D0FF', '#C6D5FF', '#EBDCFF'], hills: ['#B9A8FF', '#A3B8FF'], deco: '#FFFFFF' },
      night: { sky: ['#160B38', '#0B0722', '#04020D'], hills: ['#2A1B5C', '#1A1240'], deco: '#FFFFFF' },
    },
  };
  const CANDY = ['#FF6FAE', '#FFC93D', '#5BD6F5', '#9B7BFF', '#5FE0A0', '#FF9A4D'];

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Particles and shapes for one scene at one size; rebuilt only when the scene or size changes.
  function build(id, w, h, night) {
    const r = rng(id.length * 977 + Math.round(w) * 3 + Math.round(h) + (night ? 7 : 0));
    const many = (n, f) => Array.from({ length: n }, (_, i) => f(i));
    const area = Math.max(0.6, Math.min(1.6, (w * h) / (400 * 800)));
    const s = {
      stars: night || id === 'space' ? many(Math.round(70 * area), () => ({ x: r() * w, y: r() * h * (id === 'space' ? 1 : 0.65), s: 0.6 + r() * 1.6, p: r() * TAU })) : [],
      clouds: many(id === 'space' || id === 'ocean' ? 0 : 5, i => ({ x: r() * w, y: h * (0.06 + r() * 0.3), s: 0.6 + r() * 0.8, v: 6 + r() * 10, seed: r() })),
      bubbles: many(Math.round((id === 'ocean' ? 22 : id === 'cloud' ? 14 : 0) * area), () => ({ x: r() * w, y: r() * h, r: 3 + r() * 12, v: 10 + r() * 25, p: r() * TAU, c: CANDY[Math.floor(r() * CANDY.length)] })),
      sparkles: many(Math.round(16 * area), () => ({ x: r() * w, y: r() * h * 0.8, s: 3 + r() * 6, p: r() * TAU, c: CANDY[Math.floor(r() * CANDY.length)] })),
      birds: id === 'sky' || id === 'sunset' ? many(4, () => ({ x: r() * w, y: h * (0.1 + r() * 0.25), s: 0.7 + r() * 0.6, v: 18 + r() * 14, p: r() * TAU })) : [],
      fish: id === 'ocean' ? many(6, () => ({ x: r() * w, y: h * (0.25 + r() * 0.55), s: 10 + r() * 14, v: (r() < 0.5 ? -1 : 1) * (14 + r() * 18), c: CANDY[Math.floor(r() * CANDY.length)], p: r() * TAU })) : [],
      weeds: id === 'ocean' ? many(9, () => ({ x: r() * w, hgt: h * (0.08 + r() * 0.12), p: r() * TAU, c: r() < 0.5 ? '#3BC48A' : '#24A07A' })) : [],
      leaves: id === 'mint' ? many(Math.round(14 * area), () => ({ x: r() * w, y: r() * h, s: 6 + r() * 7, v: 14 + r() * 18, p: r() * TAU, c: night ? '#E9FF8A' : (r() < 0.5 ? '#5FD69A' : '#FFB3CF') })) : [],
      planets: id === 'space' ? [
        { x: w * 0.82, y: h * 0.16, r: Math.min(w, h) * 0.09, c: ['#FF9DC8', '#B06BFF'], ring: true },
        { x: w * 0.14, y: h * 0.72, r: Math.min(w, h) * 0.06, c: ['#7FE3FF', '#3B6EF5'], ring: false },
        { x: w * 0.7, y: h * 0.86, r: Math.min(w, h) * 0.035, c: ['#FFE07A', '#FF8C32'], ring: false },
      ] : [],
      orbs: id === 'home' ? many(6, i => ({ x: r() * w, y: r() * h, r: Math.min(w, h) * (0.18 + r() * 0.2), p: r() * TAU, c: ['#FFD3F0', '#9FE8FF', '#FFE79A', '#C8B6FF'][i % 4] })) : [],
      candy: id === 'home' ? many(Math.round(16 * area), i => ({ x: r() * w, y: r() * h, s: 6 + r() * 8, v: 8 + r() * 14, p: r() * TAU, k: i % 3, c: CANDY[i % CANDY.length] })) : [],
      palms: id === 'sunset' || id === 'desert' ? [{ x: w * (id === 'desert' ? 0.1 : 0.12), s: 1 }, { x: w * (id === 'desert' ? 0.9 : 0.88), s: 0.8 }] : [],
    };
    return s;
  }

  // ---------- drawing helpers ----------

  function skyGrad(ctx, w, h, c) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c[0]); g.addColorStop(0.55, c[1]); g.addColorStop(1, c[2] || c[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function hill(ctx, w, h, baseY, amp, freq, phase, color) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, baseY + Math.sin(x / w * freq * TAU + phase) * amp + Math.sin(x / w * freq * 2.3 * TAU + phase * 1.7) * amp * 0.35);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function cloud(ctx, x, y, s, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    [[0, 0, 28], [26, -10, 22], [50, 2, 24], [-24, 6, 18], [24, 10, 22]].forEach(([dx, dy, rr]) => {
      ctx.moveTo(x + dx * s + rr * s, y + dy * s);
      ctx.arc(x + dx * s, y + dy * s, rr * s, 0, TAU);
    });
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function sun(ctx, x, y, r, t, colors, rays) {
    if (rays) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.05);
      ctx.fillStyle = colors[2];
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(r * 1.15, -r * 0.12); ctx.lineTo(r * 1.9, 0); ctx.lineTo(r * 1.15, r * 0.12); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
    glow.addColorStop(0, colors[2]); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.5; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function moon(ctx, x, y, r, skyColor) {
    const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
    glow.addColorStop(0, 'rgba(255,248,220,0.35)'); glow.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF6D6'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = skyColor; ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.25, r * 0.85, 0, TAU); ctx.fill();
  }

  function sparkle(ctx, x, y, s, color, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function bubble(ctx, x, y, r, color, a) {
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function bird(ctx, x, y, s, flap, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
    const f = Math.sin(flap) * 5 * s;
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y - f); ctx.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y); ctx.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 10 * s, y - f); ctx.stroke();
  }

  function fish(ctx, f, t) {
    const dir = f.v > 0 ? 1 : -1, s = f.s, y = f.y + Math.sin(t * 1.5 + f.p) * 6;
    ctx.save(); ctx.translate(f.x, y); ctx.scale(dir, 1);
    ctx.fillStyle = f.c;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU); ctx.fill();
    const wag = Math.sin(t * 8 + f.p) * s * 0.15;
    ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(-s * 1.55, -s * 0.5 + wag); ctx.lineTo(-s * 1.55, s * 0.5 + wag); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.18, s * 0.5, s * 0.16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.1, s * 0.16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#23153F'; ctx.beginPath(); ctx.arc(s * 0.54, -s * 0.1, s * 0.08, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function palm(ctx, x, baseY, s, color, t) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
    ctx.lineWidth = 7 * s;
    const topX = x + 18 * s, topY = baseY - 120 * s;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + 4 * s, baseY - 60 * s, topX, topY); ctx.stroke();
    const sway = Math.sin(t * 0.8) * 0.06;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sway;
      ctx.beginPath(); ctx.moveTo(topX, topY);
      const ex = topX + Math.cos(a) * 52 * s, ey = topY + Math.sin(a) * 30 * s + 22 * s;
      ctx.quadraticCurveTo(topX + Math.cos(a) * 30 * s, topY + Math.sin(a) * 40 * s - 6 * s, ex, ey);
      ctx.lineWidth = 6 * s; ctx.stroke();
    }
  }

  function pyramid(ctx, x, baseY, size, light, dark) {
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.moveTo(x - size, baseY); ctx.lineTo(x, baseY - size * 0.95); ctx.lineTo(x + size * 0.15, baseY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(x + size * 0.15, baseY); ctx.lineTo(x, baseY - size * 0.95); ctx.lineTo(x + size, baseY); ctx.closePath(); ctx.fill();
  }

  function camel(ctx, x, y, s, color, t) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = 3.2 * s;
    const step = Math.sin(t * 4) * 5 * s;
    [[-14, step], [-6, -step], [10, step], [18, -step]].forEach(([dx, st]) => { ctx.beginPath(); ctx.moveTo(x + dx * s, y - 14 * s); ctx.lineTo(x + dx * s + st * 0.4, y + 6 * s); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 18 * s, 22 * s, 9 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 27 * s, 9 * s, 8 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 20 * s, y - 20 * s); ctx.quadraticCurveTo(x + 30 * s, y - 26 * s, x + 31 * s, y - 38 * s); ctx.lineWidth = 6 * s; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 35 * s, y - 39 * s, 7 * s, 4.5 * s, 0.2, 0, TAU); ctx.fill();
  }

  function planet(ctx, p, t) {
    const g = ctx.createLinearGradient(p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r);
    g.addColorStop(0, p.c[0]); g.addColorStop(1, p.c[1]);
    if (p.ring) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.35);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = p.r * 0.14;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.75, p.r * 0.45, 0, Math.PI, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y + Math.sin(t * 0.4 + p.r) * 3, p.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.35, 0, TAU); ctx.fill();
    if (p.ring) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.35);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = p.r * 0.14;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.75, p.r * 0.45, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- one frame ----------

  function draw(ctx, w, h, id, night, t, s, dt) {
    const P = (PAL[id] || PAL.cloud)[night ? 'night' : 'day'];
    if (id === 'home') { drawHome(ctx, w, h, night, t, s); return; }
    skyGrad(ctx, w, h, P.sky);
    const wrap = (v, max, pad) => ((v % (max + pad * 2)) + max + pad * 2) % (max + pad * 2) - pad;

    // stars
    for (const st of s.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.2 + st.p));
      ctx.globalAlpha = night ? a : a * 0.6;
      ctx.fillStyle = night ? '#FFFFFF' : '#FFFFFF';
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;
    if (id === 'space' && night) {
      const neb = ctx.createRadialGradient(w * 0.3, h * 0.35, 0, w * 0.3, h * 0.35, w * 0.7);
      neb.addColorStop(0, 'rgba(176,92,255,0.28)'); neb.addColorStop(1, 'rgba(176,92,255,0)');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
      const neb2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 0, w * 0.8, h * 0.7, w * 0.6);
      neb2.addColorStop(0, 'rgba(255,95,162,0.2)'); neb2.addColorStop(1, 'rgba(255,95,162,0)');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, w, h);
      const shoot = (t * 0.25) % 1;
      if (shoot < 0.25) {
        const k = shoot / 0.25, x = w * (0.1 + k * 0.7), y = h * (0.08 + k * 0.25);
        const g = ctx.createLinearGradient(x, y, x - 80, y - 30);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 80, y - 30); ctx.stroke();
      }
    }

    // sun / moon
    const m = Math.min(w, h);
    if (id === 'sky' || id === 'cloud' || id === 'desert' || id === 'mint') {
      if (night) moon(ctx, w * 0.8, h * 0.11, m * 0.06, P.sky[0]);
      else if (id !== 'cloud' && id !== 'mint') sun(ctx, w * 0.8, h * 0.11, m * 0.075, t, ['#FFF7B0', '#FFC93D', 'rgba(255,214,90,0.9)'], true);
    }
    if (id === 'sunset') {
      const sy = h * 0.6;
      sun(ctx, w * 0.5, sy, m * 0.17, t, night ? ['#FFC2D8', '#FF6F9E', 'rgba(255,111,158,0.6)'] : ['#FFF2B0', '#FF8A3D', 'rgba(255,170,90,0.9)'], false);
      ctx.fillStyle = night ? '#2A1240' : '#7B4FD6';
      ctx.globalAlpha = 0.85; ctx.fillRect(0, sy, w, h - sy); ctx.globalAlpha = 1;
      for (let i = 0; i < 7; i++) {
        const yy = sy + 8 + i * 9, ww = m * 0.32 * (1 - i * 0.11) * (0.85 + 0.15 * Math.sin(t * 2 + i));
        ctx.fillStyle = night ? 'rgba(255,140,190,0.45)' : 'rgba(255,214,140,0.75)';
        ctx.fillRect(w * 0.5 - ww / 2, yy, ww, 3.5);
      }
    }
    for (const p of s.planets) planet(ctx, p, t);

    // clouds
    for (const c of s.clouds) {
      const x = wrap(c.x + t * c.v, w, 90);
      cloud(ctx, x, c.y, c.s, P.deco, night ? 0.06 : 0.85);
    }

    // birds
    for (const b of s.birds) bird(ctx, wrap(b.x + t * b.v, w, 30), b.y + Math.sin(t + b.p) * 6, b.s, t * 7 + b.p, night ? 'rgba(255,255,255,0.5)' : 'rgba(60,40,90,0.55)');

    // ground layers
    if (id === 'ocean') {
      for (let i = 0; i < 5; i++) {
        const x = w * (0.1 + i * 0.22) + Math.sin(t * 0.3 + i) * 20;
        const g = ctx.createLinearGradient(x, 0, x + 60, h * 0.7);
        g.addColorStop(0, night ? 'rgba(160,230,255,0.10)' : 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 140, h * 0.75); ctx.lineTo(x + 60, h * 0.75); ctx.closePath(); ctx.fill();
      }
      for (const f of s.fish) { fish(ctx, { ...f, x: wrap(f.x + t * f.v, w, 40) }, t); }
      hill(ctx, w, h, h * 0.9, 10, 1.2, 0.5, P.hills[0]);
      for (const wd of s.weeds) {
        ctx.strokeStyle = wd.c; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(wd.x, h * 0.93);
        for (let k = 1; k <= 6; k++) ctx.lineTo(wd.x + Math.sin(t * 1.6 + wd.p + k * 0.7) * k * 2.2, h * 0.93 - (wd.hgt * k) / 6);
        ctx.stroke();
      }
      hill(ctx, w, h, h * 0.95, 6, 2, 2, P.hills[1]);
    } else if (id === 'desert') {
      const by = h * 0.74;
      pyramid(ctx, w * 0.3, by + 6, m * 0.22, night ? '#5B4468' : '#F4C278', night ? '#3E2D4C' : '#D9984C');
      pyramid(ctx, w * 0.55, by + 10, m * 0.15, night ? '#5B4468' : '#F4C278', night ? '#3E2D4C' : '#D9984C');
      hill(ctx, w, h, by + 8, 14, 0.8, 0.4, P.hills[0]);
      const cx = wrap(t * 9, w, 60);
      camel(ctx, cx, by + 18, m / 420, night ? '#2B1F36' : '#B5763A', t);
      for (const p of s.palms) palm(ctx, p.x, h * 0.86, p.s * m / 420, night ? '#1E1529' : '#7A5A2E', t);
      hill(ctx, w, h, h * 0.84, 12, 1.1, 2.2, P.hills[1]);
      hill(ctx, w, h, h * 0.93, 9, 1.6, 4, P.hills[2]);
    } else if (id === 'sunset') {
      for (const p of s.palms) palm(ctx, p.x, h * 0.98, p.s * m / 380, night ? '#0E0818' : '#3A1F5A', t);
      hill(ctx, w, h, h * 0.95, 6, 1.4, 1, P.hills[1]);
    } else if (id === 'space') {
      // nothing on the ground in space
    } else {
      hill(ctx, w, h, h * 0.8, 18, 0.9, 0.3, P.hills[0]);
      hill(ctx, w, h, h * 0.87, 14, 1.3, 2.1, P.hills[1]);
      hill(ctx, w, h, h * 0.94, 10, 1.8, 4.2, P.hills[2] || P.hills[1]);
      if (id === 'cloud' && !night) {
        // lollipop trees on the hills
        [[0.12, 0.83, '#FF6FAE'], [0.86, 0.85, '#5BD6F5'], [0.68, 0.9, '#FFC93D']].forEach(([fx, fy, c]) => {
          const x = w * fx, y = h * fy, r2 = m * 0.035;
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r2 * 2.6); ctx.stroke();
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - r2 * 2.6, r2, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - r2 * 2.6, r2 * 0.55, 0.5, 4.5); ctx.stroke();
        });
      }
    }

    // floating things
    for (const b of s.bubbles) {
      const y = wrap(b.y - t * b.v, h, 30), x = b.x + Math.sin(t * 0.9 + b.p) * 12;
      bubble(ctx, x, y, b.r, id === 'ocean' ? 'rgba(255,255,255,0.18)' : b.c + '55', night ? 0.45 : 0.75);
    }
    for (const l of s.leaves) {
      const y = wrap(l.y + t * l.v, h, 20), x = l.x + Math.sin(t * 0.8 + l.p) * 26;
      if (night) {
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + l.p));
        const g = ctx.createRadialGradient(x, y, 0, x, y, l.s * 1.6);
        g.addColorStop(0, 'rgba(233,255,138,' + a + ')'); g.addColorStop(1, 'rgba(233,255,138,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, l.s * 1.6, 0, TAU); ctx.fill();
      } else {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t + l.p); ctx.fillStyle = l.c;
        ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    if (id !== 'ocean') for (const sp of s.sparkles) sparkle(ctx, sp.x, sp.y, sp.s, night ? '#FFFFFF' : (id === 'cloud' ? sp.c : '#FFFFFF'), (0.2 + 0.8 * Math.abs(Math.sin(t * 1.4 + sp.p))) * (night ? 0.7 : 0.85));
  }

  // Start screen: rich gradient, slowly turning light rays behind the title, glowing orbs and floating candy.
  function drawHome(ctx, w, h, night, t, s) {
    const P = PAL.home[night ? 'night' : 'day'];
    const cx = w / 2, cy = Math.min(h * 0.27, 260);
    const R = Math.hypot(w, h);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
    bg.addColorStop(0, P.sky[0]); bg.addColorStop(0.45, P.sky[1]); bg.addColorStop(1, P.sky[2]);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // light rays
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.06);
    const rays = 18;
    for (let i = 0; i < rays; i++) {
      ctx.rotate(TAU / rays);
      const g = ctx.createLinearGradient(0, 0, R, 0);
      g.addColorStop(0, night ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.26)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * 0.09); ctx.lineTo(R, R * 0.09); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // central glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55);
    glow.addColorStop(0, night ? 'rgba(255,190,240,0.45)' : 'rgba(255,240,250,0.7)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    // big soft orbs drifting
    for (const b of s.orbs) {
      const x = b.x + Math.sin(t * 0.2 + b.p) * 30, y = b.y + Math.cos(t * 0.17 + b.p) * 24;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      g.addColorStop(0, b.c); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = night ? 0.35 : 0.5; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // floating candy: drops, stars and hearts rising slowly
    const wrap = (v, max, pad) => ((v % (max + pad * 2)) + max + pad * 2) % (max + pad * 2) - pad;
    for (const c of s.candy) {
      const y = wrap(c.y - t * c.v, h, 40), x = c.x + Math.sin(t * 0.7 + c.p) * 18;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.8 + c.p) * 0.5);
      ctx.globalAlpha = 0.85; ctx.fillStyle = c.c;
      const z = c.s;
      if (c.k === 0) { ctx.beginPath(); ctx.moveTo(0, -z * 1.3); ctx.bezierCurveTo(z, -z * 0.2, z * 0.9, z, 0, z); ctx.bezierCurveTo(-z * 0.9, z, -z, -z * 0.2, 0, -z * 1.3); ctx.fill(); }
      else if (c.k === 1) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? z * 0.45 : z, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(0, z * 0.35); ctx.bezierCurveTo(-z * 1.1, -z * 0.35, -z * 0.45, -z * 1.05, 0, -z * 0.45); ctx.bezierCurveTo(z * 0.45, -z * 1.05, z * 1.1, -z * 0.35, 0, z * 0.35); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-z * 0.3, -z * 0.3, z * 0.18, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const sp of s.sparkles) sparkle(ctx, sp.x, sp.y, sp.s * 1.2, '#FFFFFF', 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + sp.p)));
    // soft floor light
    const fl = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(1, night ? 'rgba(120,60,255,0.35)' : 'rgba(255,200,240,0.45)');
    ctx.fillStyle = fl; ctx.fillRect(0, h * 0.7, w, h * 0.3);
  }

  // ---------- live background ----------

  let canvas = null, ctx = null, w = 0, h = 0, dpr = 1;
  let id = 'cloud', night = false, state = null, last = 0, start = performance.now();
  const still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    if (!canvas) return;
    dpr = Math.min(root.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    state = build(id, w, h, night);
    paint(performance.now());
  }

  function paint(now) {
    if (!ctx || !w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, w, h, id, night, still ? 0 : (now - start) / 1000, state);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || still) return;
    if (now - last < 33) return; // about 30 frames a second is plenty for scenery
    last = now;
    paint(now);
  }

  function init(c) {
    canvas = c;
    ctx = c.getContext('2d');
    if (root.ResizeObserver) new ResizeObserver(resize).observe(c);
    resize();
    requestAnimationFrame(loop);
  }

  function set(sceneId, isNight) {
    if (sceneId === id && isNight === night && state) return;
    id = PAL[sceneId] ? sceneId : 'cloud';
    night = !!isNight;
    resize();
  }

  // Static picture of a scene for shop previews.
  function thumb(c, sceneId, isNight) {
    const tw = c.clientWidth, th = c.clientHeight;
    if (!tw) return;
    const d = Math.min(root.devicePixelRatio || 1, 2);
    c.width = Math.round(tw * d); c.height = Math.round(th * d);
    const x = c.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    draw(x, tw, th, sceneId, isNight, 3.2, build(sceneId, tw, th, isNight));
  }

  CP.Scene = { init, set, thumb, IDS: Object.keys(PAL) };
})(this);
