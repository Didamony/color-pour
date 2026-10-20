// Color Journey: the level map. A winding glass pipe climbs through themed worlds; each level is a flask
// on it, and coloured liquid fills the pipe up to the player's current level.
(function (root) {
  'use strict';
  const CP = root.CP;
  const t = (k, v) => CP.I18n.t(k, v);
  const TAU = Math.PI * 2;

  const ZONE_LEN = 20;
  const ZONES = [
    { id: 'candy', top: '#FFC2E2', bot: '#F3D9FF', deco: 'candy', accent: '#FF5FA2' },
    { id: 'sea', top: '#56C8F0', bot: '#9BE6FF', deco: 'sea', accent: '#2F8BF0' },
    { id: 'desert', top: '#FFC27A', bot: '#FFE4B3', deco: 'desert', accent: '#E58A1F' },
    { id: 'forest', top: '#7FD99A', bot: '#C6F2C9', deco: 'forest', accent: '#2DB55D' },
    { id: 'ice', top: '#A9DDFF', bot: '#E8F7FF', deco: 'ice', accent: '#4FA8E8' },
    { id: 'space', top: '#2A1A6B', bot: '#5B3DB8', deco: 'space', accent: '#A35CFF' },
  ];
  const REWARDS = [{ kind: 'coins', n: 50 }, { kind: 'hint', n: 1 }, { kind: 'coins', n: 100 }, { kind: 'tube', n: 1 }];

  const SP = 128;          // vertical distance between levels
  const TOP_PAD = 320, BOTTOM_PAD = 260;

  let ctx = null;          // callbacks from the UI
  let el = {}, g2d = null, dpr = 1, W = 0, H = 0;
  let last = 40, total = 0, running = false, fillT = 1, fillFrom = 1, fillAnim = null;
  let particles = [], tapFx = [];

  const zoneOf = n => Math.floor((n - 1) / ZONE_LEN);
  const zoneInfo = z => ZONES[((z % ZONES.length) + ZONES.length) % ZONES.length];

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- geometry (content coordinates, y grows downward) ----------
  const amp = () => Math.min(W * 0.26, 120);
  // Extra room opens smoothly around each world portal, so the banner never crowds a flask.
  const GAP = 130;
  const stretch = tt => {
    let u = tt;
    for (let k = 1; k * ZONE_LEN < tt; k++) u += (GAP / SP) * Math.min(1, Math.max(0, (tt - k * ZONE_LEN - 0.15) / 0.7));
    return u;
  };
  const levelY = n => total - BOTTOM_PAD - (stretch(n) - 1) * SP;
  function visible(top, bottom) {
    let n0 = last + 1, n1 = 0;
    for (let n = 1; n <= last; n++) { const y = levelY(n); if (y > top - 160 && y < bottom + 160) { n0 = Math.min(n0, n); n1 = Math.max(n1, n); } }
    return n1 ? [n0, n1] : [1, 0];
  }
  const pathX = tt => W / 2 + amp() * Math.sin(tt * 0.8 + 0.4);
  // reward bubbles sit on the roomier side of the pipe
  const rewardPos = n => {
    const px = pathX(n), off = Math.min(W * 0.3, 118);
    return { x: px > W / 2 ? px - off : px + off, y: levelY(n) + 10 };
  };

  function layout() {
    const cur = CP.Store.data.level;
    last = (zoneOf(cur) + 2) * ZONE_LEN;
    total = TOP_PAD + BOTTOM_PAD + (stretch(last) - 1) * SP;
    el.spacer.style.height = total + 'px';
  }

  // ---------- drawing helpers ----------
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function flaskPath(c, s) {
    c.beginPath();
    c.moveTo(-0.24 * s, -1.25 * s);
    c.lineTo(-0.24 * s, -0.55 * s);
    c.lineTo(-0.92 * s, 0.6 * s);
    c.quadraticCurveTo(-1.02 * s, 0.82 * s, -0.78 * s, 0.82 * s);
    c.lineTo(0.78 * s, 0.82 * s);
    c.quadraticCurveTo(1.02 * s, 0.82 * s, 0.92 * s, 0.6 * s);
    c.lineTo(0.24 * s, -0.55 * s);
    c.lineTo(0.24 * s, -1.25 * s);
    c.closePath();
  }

  function face(c, s, mood, now) {
    const ink = '#24123F', ey = 0.38 * s, ex = 0.26 * s;
    const blink = ((now / 1000) % 3.4) < 0.12;
    for (const sx of [-1, 1]) {
      if (blink) { c.strokeStyle = ink; c.lineWidth = 0.08 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx * ex - 0.09 * s, ey); c.lineTo(sx * ex + 0.09 * s, ey); c.stroke(); continue; }
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(sx * ex, ey, 0.15 * s, 0.17 * s, 0, 0, TAU); c.fill();
      c.fillStyle = ink; c.beginPath(); c.ellipse(sx * ex, ey + 0.02 * s, 0.11 * s, 0.13 * s, 0, 0, TAU); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(sx * ex + 0.045 * s, ey - 0.05 * s, 0.045 * s, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(255,110,160,0.6)';
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 0.48 * s, ey + 0.2 * s, 0.1 * s, 0.06 * s, 0, 0, TAU); c.fill(); }
    c.fillStyle = ink;
    c.beginPath(); c.moveTo(-0.14 * s, ey + 0.2 * s); c.quadraticCurveTo(0, ey + (mood === 'big' ? 0.48 : 0.36) * s, 0.14 * s, ey + 0.2 * s); c.closePath(); c.fill();
  }

  function star(c, x, y, r, on) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
    c.fillStyle = on ? '#FFC93D' : 'rgba(255,255,255,0.45)';
    c.fill();
    c.lineWidth = 1.5; c.strokeStyle = on ? '#C47A00' : 'rgba(80,60,120,0.35)'; c.stroke();
  }

  function liquidColor(n) {
    const pal = CP.Render.LIQUIDS.classic;
    return pal[[0, 1, 2, 3, 5, 6, 7, 8][n % 8]];
  }

  function drawNode(c, n, cur, now) {
    const x = pathX(n), y = levelY(n);
    const done = n < cur, isCur = n === cur, boss = n % 10 === 0;
    let s = boss ? 30 : 24;
    if (isCur) s = 36;
    const bob = isCur ? Math.sin(now / 260) * 4 - Math.abs(Math.sin(now / 520)) * 6 : 0;
    c.save();
    c.translate(x, y + bob);
    // glow
    if (isCur || boss) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, s * 2.2);
      gr.addColorStop(0, isCur ? 'rgba(255,230,120,0.75)' : 'rgba(255,200,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, s * 2.2, 0, TAU); c.fill();
    }
    // shadow
    c.fillStyle = 'rgba(40,20,80,0.25)';
    c.beginPath(); c.ellipse(0, 0.9 * s - bob, 0.95 * s, 0.2 * s, 0, 0, TAU); c.fill();
    // glass + liquid
    flaskPath(c, s);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    if (done || isCur) {
      c.save(); flaskPath(c, s); c.clip();
      const col = liquidColor(n);
      const lvl = isCur ? 0.55 : 0.82;
      const top = 0.82 * s - lvl * 1.75 * s;
      c.fillStyle = col;
      c.beginPath(); c.moveTo(-s * 1.2, top);
      for (let xx = -1.2; xx <= 1.21; xx += 0.2) c.lineTo(xx * s, top + Math.sin(now / 300 + xx * 3 + n) * 0.05 * s);
      c.lineTo(s * 1.2, s * 1.2); c.lineTo(-s * 1.2, s * 1.2); c.closePath(); c.fill();
      const sh = c.createLinearGradient(-s, 0, s, 0);
      sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(0.35, 'rgba(255,255,255,0.18)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
      c.fillStyle = sh; c.fillRect(-s * 1.2, top, s * 2.4, s * 2);
      c.restore();
    }
    flaskPath(c, s);
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, s * 0.13); c.strokeStyle = done || isCur ? '#FFFFFF' : 'rgba(255,255,255,0.75)'; c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(60,30,110,0.55)'; c.stroke();
    // glint
    c.fillStyle = 'rgba(255,255,255,0.65)';
    roundRect(c, -0.55 * s, 0.05 * s, 0.12 * s, 0.5 * s, 0.06 * s); c.fill();
    // rim / cork
    c.fillStyle = done ? '#D59C68' : '#FFFFFF';
    roundRect(c, -0.36 * s, -1.42 * s, 0.72 * s, 0.24 * s, 0.1 * s); c.fill();
    if (isCur) face(c, s, 'big', now);
    else if (done && s > 20) face(c, s * 0.8, 'small', now + n * 700);
    // lock for future levels
    if (!done && !isCur) {
      c.fillStyle = '#8A7BB8';
      roundRect(c, -0.32 * s, 0.05 * s, 0.64 * s, 0.5 * s, 0.1 * s); c.fill();
      c.strokeStyle = '#8A7BB8'; c.lineWidth = 0.1 * s;
      c.beginPath(); c.arc(0, 0.05 * s, 0.2 * s, Math.PI, 0); c.stroke();
    }
    if (boss) {
      c.font = Math.round(s * 0.9) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('👑', 0, -1.85 * s);
    }
    c.restore();

    // number plaque and stars
    const py = y + s * 1.25;
    const label = String(n);
    c.font = '800 ' + (isCur ? 18 : 15) + 'px "Baloo Bhaijaan 2", system-ui, sans-serif';
    const tw = Math.max(30, c.measureText(label).width + 18);
    c.fillStyle = isCur ? '#FFC93D' : done ? '#FFF4DC' : 'rgba(40,24,90,0.75)';
    roundRect(c, x - tw / 2, py - 11, tw, 22, 11); c.fill();
    c.lineWidth = 2; c.strokeStyle = isCur ? '#B86E00' : done ? '#E9C98A' : 'rgba(255,255,255,0.4)'; c.stroke();
    c.fillStyle = isCur ? '#5A2E00' : done ? '#5A3A12' : '#E8DFFF';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, x, py + 1);
    if (done) {
      const st = CP.Store.data.stars[n] || 0;
      for (let i = 0; i < 3; i++) star(c, x + (i - 1) * 15, py + 21, 7, i < st);
    }
    if (isCur) {
      // speech tag above the current level
      const ty = y - s * 2.6 + bob;
      const txt = t('play');
      c.font = '800 16px "Baloo Bhaijaan 2", system-ui, sans-serif';
      const w2 = c.measureText(txt).width + 26;
      c.fillStyle = '#FFFFFF';
      roundRect(c, x - w2 / 2, ty - 15, w2, 30, 15); c.fill();
      c.beginPath(); c.moveTo(x - 7, ty + 14); c.lineTo(x, ty + 22); c.lineTo(x + 7, ty + 14); c.fill();
      c.fillStyle = '#5B22C9'; c.fillText(txt, x, ty + 1);
    }
  }

  function drawReward(c, n, cur, now) {
    const p = rewardPos(n);
    const rw = REWARDS[((n - 5) / 10) % REWARDS.length | 0];
    const got = !!CP.Store.data.mapRewards[n];
    const ready = n < cur && !got;
    const r = 22 + (ready ? Math.sin(now / 200) * 2 : 0);
    const y = p.y + (ready ? Math.sin(now / 400 + n) * 5 : 0);
    c.save();
    c.globalAlpha = got ? 0.45 : n < cur ? 1 : 0.8;
    const gr = c.createRadialGradient(p.x - r * 0.35, y - r * 0.4, r * 0.1, p.x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.4, ready ? 'rgba(255,220,120,0.6)' : 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)');
    c.fillStyle = gr; c.beginPath(); c.arc(p.x, y, r, 0, TAU); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = ready ? '#FFD45C' : 'rgba(255,255,255,0.8)'; c.stroke();
    c.font = '20px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(got ? '✔️' : rw.kind === 'coins' ? '💰' : rw.kind === 'hint' ? '💡' : '🧪', p.x, y + 1);
    if (!got) {
      c.font = '800 11px "Baloo Bhaijaan 2", system-ui, sans-serif';
      c.fillStyle = '#3A128F';
      c.fillText(rw.kind === 'coins' ? '+' + rw.n : '+1', p.x, y + r + 9);
    }
    c.restore();
  }

  // ---------- backgrounds per world ----------
  function drawDeco(c, kind, x, y, s, now, r) {
    c.save(); c.translate(x, y);
    const k = r();
    if (kind === 'candy') {
      if (k < 0.5) { c.strokeStyle = '#FFFFFF'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 46 * s); c.stroke(); c.fillStyle = ['#FF5FA2', '#5BD6F5', '#FFC93D'][Math.floor(r() * 3)]; c.beginPath(); c.arc(0, 0, 16 * s, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3 * s; c.beginPath(); c.arc(0, 0, 9 * s, 0.4, 4.6); c.stroke(); }
      else { c.globalAlpha = 0.85; c.fillStyle = '#FFFFFF'; [[0, 0, 20], [22, -6, 16], [-20, 4, 14]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(dx * s + Math.sin(now / 2000) * 6, dy * s, rr * s, 0, TAU); c.fill(); }); }
    } else if (kind === 'sea') {
      if (k < 0.5) { const dir = r() < 0.5 ? 1 : -1, dx = Math.sin(now / 1500 + x) * 14; c.translate(dx, 0); c.scale(dir * s, s); c.fillStyle = ['#FF8C32', '#FF5FA2', '#FFD23F'][Math.floor(r() * 3)]; c.beginPath(); c.ellipse(0, 0, 18, 10, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-15, 0); c.lineTo(-27, -9); c.lineTo(-27, 9); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(8, -2, 3.5, 0, TAU); c.fill(); c.fillStyle = '#24123F'; c.beginPath(); c.arc(9, -2, 1.8, 0, TAU); c.fill(); }
      else { c.strokeStyle = '#2DB58A'; c.lineWidth = 6 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 40 * s); for (let i = 1; i <= 5; i++) c.lineTo(Math.sin(now / 700 + i + x) * 6 * s, 40 * s - i * 14 * s); c.stroke(); }
    } else if (kind === 'desert') {
      if (k < 0.45) { c.fillStyle = '#F4C278'; c.beginPath(); c.moveTo(-36 * s, 30 * s); c.lineTo(0, -12 * s); c.lineTo(6 * s, 30 * s); c.fill(); c.fillStyle = '#D9984C'; c.beginPath(); c.moveTo(6 * s, 30 * s); c.lineTo(0, -12 * s); c.lineTo(36 * s, 30 * s); c.fill(); }
      else { c.fillStyle = '#3DBE6A'; roundRect(c, -7 * s, -26 * s, 14 * s, 56 * s, 7 * s); c.fill(); roundRect(c, -22 * s, -8 * s, 10 * s, 26 * s, 5 * s); c.fill(); roundRect(c, 12 * s, -16 * s, 10 * s, 22 * s, 5 * s); c.fill(); c.fillRect(-15 * s, 10 * s, 10 * s, 6 * s); c.fillRect(5 * s, 0, 10 * s, 6 * s); c.fillStyle = '#FF5FA2'; c.beginPath(); c.arc(0, -28 * s, 4 * s, 0, TAU); c.fill(); }
    } else if (kind === 'forest') {
      if (k < 0.55) { c.fillStyle = '#FFF4DC'; roundRect(c, -6 * s, 0, 12 * s, 22 * s, 5 * s); c.fill(); c.fillStyle = r() < 0.5 ? '#F2445C' : '#A35CFF'; c.beginPath(); c.ellipse(0, 2 * s, 22 * s, 15 * s, 0, Math.PI, 0); c.fill(); c.fillStyle = '#FFFFFF'; [[-9, -5], [6, -9], [10, -2]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx * s, dy * s, 3 * s, 0, TAU); c.fill(); }); }
      else { c.fillStyle = '#2DB55D'; c.rotate(Math.sin(now / 1200 + x) * 0.15); c.beginPath(); c.ellipse(0, 0, 10 * s, 24 * s, 0.6, 0, TAU); c.fill(); c.fillStyle = '#4FDB6E'; c.beginPath(); c.ellipse(14 * s, 6 * s, 8 * s, 20 * s, -0.5, 0, TAU); c.fill(); }
    } else if (kind === 'ice') {
      if (k < 0.5) { c.fillStyle = 'rgba(255,255,255,0.85)'; c.strokeStyle = '#7CC3F0'; c.lineWidth = 2; [[0, 0, 30], [-14, 10, 20], [14, 12, 22]].forEach(([dx, dy, hh]) => { c.beginPath(); c.moveTo((dx - 7) * s, (dy + 14) * s); c.lineTo(dx * s, (dy + 14 - hh) * s); c.lineTo((dx + 7) * s, (dy + 14) * s); c.closePath(); c.fill(); c.stroke(); }); }
      else { c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.5 * s; c.rotate(now / 4000); for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -14 * s); c.moveTo(0, -8 * s); c.lineTo(-4 * s, -11 * s); c.moveTo(0, -8 * s); c.lineTo(4 * s, -11 * s); c.stroke(); } }
    } else if (kind === 'space') {
      if (k < 0.5) { const gp = c.createLinearGradient(-20 * s, -20 * s, 20 * s, 20 * s); gp.addColorStop(0, ['#FF9DC8', '#7FE3FF', '#FFE07A'][Math.floor(r() * 3)]); gp.addColorStop(1, '#6B3DF0'); c.fillStyle = gp; c.beginPath(); c.arc(0, 0, 20 * s, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3 * s; c.beginPath(); c.ellipse(0, 0, 32 * s, 8 * s, -0.3, 0, TAU); c.stroke(); }
      else { c.fillStyle = '#FFFFFF'; for (let i = 0; i < 6; i++) { const a = 0.4 + 0.6 * Math.abs(Math.sin(now / 600 + i * 2 + x)); c.globalAlpha = a; c.fillRect((r() - 0.5) * 60 * s, (r() - 0.5) * 60 * s, 2.5, 2.5); } }
    }
    c.restore();
  }

  function drawWorlds(c, top, bottom, cur, now) {
    // Each world is a band from its first level down to its last; colours fade into each other at the seams.
    const firstZ = Math.max(0, zoneOf(Math.max(1, visible(top, bottom)[0])) - 1);
    const lastZ = zoneOf(last);
    for (let z = firstZ; z <= lastZ; z++) {
      const info = zoneInfo(z);
      const yStart = z === 0 ? total : levelY(z * ZONE_LEN + 0.5);
      const yEnd = z === lastZ ? 0 : levelY((z + 1) * ZONE_LEN + 0.5);
      if (yStart < top || yEnd > bottom) { if (!(yEnd < bottom && yStart > top)) continue; }
      const gr = c.createLinearGradient(0, yEnd, 0, yStart);
      gr.addColorStop(0, info.top); gr.addColorStop(1, info.bot);
      c.fillStyle = gr;
      c.fillRect(0, yEnd, W, yStart - yEnd + 1);
      // decorations along the sides, kept away from the pipe
      const r = rng(z * 7919 + 13);
      for (let n = z * ZONE_LEN + 1; n <= (z + 1) * ZONE_LEN; n += 1) {
        const count = 1 + (r() < 0.4 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const y = levelY(n) - r() * SP;
          if (y < top - 80 || y > bottom + 80) { r(); r(); r(); continue; }
          const px = pathX(n), side = px > W / 2 ? -1 : 1;
          const x = side < 0 ? 16 + r() * Math.max(10, px - 140) : px + 110 + r() * Math.max(10, W - px - 140);
          drawDeco(c, info.deco, Math.min(W - 20, Math.max(20, x)), y, 0.8 + r() * 0.5, now, r);
        }
      }
    }
    // soft seams
    for (let z = firstZ + 1; z <= lastZ; z++) {
      const y = levelY(z * ZONE_LEN + 0.5);
      if (y < top - 120 || y > bottom + 120) continue;
      const a = zoneInfo(z - 1), b = zoneInfo(z);
      const gr = c.createLinearGradient(0, y - 90, 0, y + 90);
      gr.addColorStop(0, b.bot); gr.addColorStop(1, a.top);
      c.globalAlpha = 0.85; c.fillStyle = gr; c.fillRect(0, y - 90, W, 180); c.globalAlpha = 1;
    }
  }

  function drawPortal(c, z, cur, now) {
    const n0 = z * ZONE_LEN;
    const tt = n0 + 0.5, x = pathX(tt), y = levelY(tt);
    const info = zoneInfo(z);
    const open = cur > n0;
    c.save();
    c.translate(x, y + 22);
    // ring around the pipe
    c.rotate(Math.sin(now / 1500) * 0.05);
    const ring = c.createLinearGradient(-60, 0, 60, 0);
    ring.addColorStop(0, info.accent); ring.addColorStop(0.5, '#FFFFFF'); ring.addColorStop(1, info.accent);
    c.lineWidth = 10; c.strokeStyle = open ? ring : 'rgba(120,110,150,0.8)';
    c.shadowColor = open ? info.accent : 'transparent'; c.shadowBlur = open ? 18 : 0;
    c.beginPath(); c.ellipse(0, 0, 54, 22, 0, 0, TAU); c.stroke();
    c.restore();
    // banner with the world name
    const label = t('world', { n: z + 1 }) + ' · ' + t('zone_' + info.id);
    c.font = '800 16px "Baloo Bhaijaan 2", system-ui, sans-serif';
    const bw = c.measureText(label).width + 44;
    const bx = Math.min(W - bw / 2 - 10, Math.max(bw / 2 + 10, W / 2)), by = y - 30;
    c.fillStyle = open ? info.accent : '#7A6F98';
    roundRect(c, bx - bw / 2, by - 17, bw, 34, 12); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#FFD45C'; c.stroke();
    c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText((open ? '' : '🔒 ') + label, bx, by + 1);
  }

  function pipePts(t0, t1) {
    const pts = [];
    for (let tt = t0; tt <= t1 + 1e-6; tt += 0.08) pts.push([pathX(tt), levelY(tt)]);
    return pts;
  }
  function strokePts(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }

  function drawPipe(c, top, bottom, cur, now) {
    const [v0, v1] = visible(top, bottom);
    const tTop = Math.min(last + 0.6, v1 + 1.2);
    const tBot = Math.max(0.4, v0 - 1.2);
    if (tTop <= tBot) return;
    const pts = pipePts(tBot, tTop);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = 34; c.strokeStyle = 'rgba(60,30,110,0.35)'; strokePts(c, pts);
    c.lineWidth = 28; c.strokeStyle = 'rgba(255,255,255,0.55)'; strokePts(c, pts);
    // liquid up to the fill point, one colour per stretch so it looks like a rainbow flowing up
    const fillTo = Math.min(fillT, tTop);
    for (let n = Math.max(1, Math.floor(tBot)); n < fillTo; n++) {
      const a = Math.max(n, tBot), b = Math.min(n + 1, fillTo);
      if (b <= a) continue;
      c.lineWidth = 18; c.strokeStyle = liquidColor(n); strokePts(c, pipePts(a, b));
    }
    if (fillTo > tBot) {
      const lp = pipePts(Math.max(tBot, 1), fillTo);
      c.save();
      c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.setLineDash([10, 22]); c.lineDashOffset = -now / 25;
      strokePts(c, lp);
      c.restore();
    }
    // glass highlight
    c.save(); c.translate(-6, -2); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,0.7)'; strokePts(c, pts); c.restore();
    // bubbles travelling up the filled part
    for (let i = 0; i < 12; i++) {
      const span = fillTo - 1;
      if (span <= 0) break;
      const tt = 1 + ((now / 4000 + i / 12) % 1) * span;
      if (tt < tBot || tt > tTop) continue;
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath(); c.arc(pathX(tt) + Math.sin(i * 3 + now / 300) * 4, levelY(tt), 3 + (i % 3), 0, TAU); c.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (fillAnim) {
      const k = Math.min(1, (now - fillAnim.t0) / fillAnim.ms);
      fillT = fillAnim.from + (fillAnim.to - fillAnim.from) * (1 - Math.pow(1 - k, 3));
      if (k >= 1) { fillAnim = null; CP.Audio.complete(); }
    }
    const c = g2d, cur = CP.Store.data.level;
    const scroll = el.scroll.scrollTop;
    c.setTransform(dpr, 0, 0, dpr, 0, -scroll * dpr);
    const top = scroll, bottom = scroll + H;
    c.clearRect(0, top, W, H);
    drawWorlds(c, top, bottom, cur, now);
    drawPipe(c, top, bottom, cur, now);
    const [nBot, nTop] = visible(top, bottom);
    for (let z = zoneOf(Math.max(1, nBot)) + 1; z * ZONE_LEN <= nTop + 1; z++) drawPortal(c, z, cur, now);
    for (let n = nBot; n <= nTop; n++) if (n % 5 === 0 && n % 10 !== 0) drawReward(c, n, cur, now);
    for (let n = nBot; n <= nTop; n++) drawNode(c, n, cur, now);
    // fog above the last shown world
    if (top < TOP_PAD + 40) {
      const fy = levelY(last) - 60;
      const gr = c.createLinearGradient(0, fy - 260, 0, fy);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W, fy);
      c.fillStyle = '#5B22C9'; c.font = '800 18px "Baloo Bhaijaan 2", system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText(t('mapMore'), W / 2, fy - 150);
    }
    // tap sparkles
    tapFx = tapFx.filter(p => now - p.t0 < 700);
    for (const p of tapFx) {
      const k = (now - p.t0) / 700;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU, d = 10 + k * 50;
        c.globalAlpha = 1 - k; c.fillStyle = i % 2 ? '#FFD23F' : '#FFFFFF';
        c.beginPath(); c.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 4 * (1 - k) + 1, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  function resize() {
    dpr = Math.min(root.devicePixelRatio || 1, 2);
    W = el.scroll.clientWidth; H = el.scroll.clientHeight;
    el.canvas.width = Math.round(W * dpr); el.canvas.height = Math.round(H * dpr);
    el.canvas.style.width = W + 'px'; el.canvas.style.height = H + 'px';
  }

  // ---------- input ----------
  function onTap(e) {
    const rect = el.scroll.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top + el.scroll.scrollTop;
    const cur = CP.Store.data.level;
    const [n0, n1] = visible(y - 10, y + 10);
    for (let n = n0; n <= n1; n++) {
      if (n % 5 === 0 && n % 10 !== 0) {
        const p = rewardPos(n);
        if (Math.hypot(p.x - x, p.y - y) < 32) { claimReward(n, p); return; }
      }
    }
    for (let n = n0; n <= n1; n++) {
      if (Math.hypot(pathX(n) - x, levelY(n) - y) < 44) {
        if (n > cur) { ctx.toast(t('mapLocked', { n: cur })); CP.Audio.deny(); return; }
        CP.Audio.tap();
        close(true);
        ctx.startLevel(n);
        return;
      }
    }
  }

  function claimReward(n, p) {
    const cur = CP.Store.data.level;
    const d = CP.Store.data;
    if (d.mapRewards[n]) return;
    if (n >= cur) { ctx.toast(t('mapRewardLocked', { n })); CP.Audio.deny(); return; }
    const rw = REWARDS[((n - 5) / 10) % REWARDS.length | 0];
    d.mapRewards[n] = 1;
    if (rw.kind === 'coins') d.coins += rw.n; else d.inv[rw.kind] += rw.n;
    CP.Store.save();
    tapFx.push({ x: p.x, y: p.y, t0: performance.now() });
    CP.Audio.coin();
    ctx.haptic(25);
    ctx.toast(t('youWon', { x: rw.kind === 'coins' ? t('prize_coins', { n: rw.n }) : t('prize_' + rw.kind) }));
    ctx.refresh();
  }

  // ---------- open / close ----------
  function open() {
    const d = CP.Store.data;
    el.screen.hidden = false;
    el.playLabel.textContent = t('level', { n: d.level });
    el.title.textContent = t('mapTitle');
    el.stars.textContent = Object.values(d.stars).reduce((a, b) => a + b, 0);
    resize();
    layout();
    const seen = Math.min(d.mapSeen || 1, d.level);
    fillT = seen;
    const target = levelY(d.level) - H * 0.55;
    el.scroll.scrollTop = Math.max(0, Math.min(total - H, target));
    if (seen < d.level) {
      fillAnim = { from: seen, to: d.level, t0: performance.now() + 450, ms: 900 + 250 * Math.min(4, d.level - seen) };
      d.mapSeen = d.level;
      CP.Store.save();
    } else fillT = d.level;
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function close(instant) {
    running = false;
    el.screen.hidden = true;
    if (!instant) ctx.home();
  }

  function init(context) {
    ctx = context;
    el = {
      screen: document.getElementById('map'),
      scroll: document.getElementById('map-scroll'),
      spacer: document.getElementById('map-spacer'),
      canvas: document.getElementById('map-canvas'),
      playBtn: document.getElementById('map-play'),
      playLabel: document.getElementById('map-play-label'),
      title: document.getElementById('map-title'),
      stars: document.getElementById('map-stars'),
    };
    g2d = el.canvas.getContext('2d');
    el.scroll.addEventListener('click', onTap);
    el.playBtn.addEventListener('click', () => { CP.Audio.tap(); close(true); ctx.startLevel(CP.Store.data.level); });
    document.getElementById('map-back').addEventListener('click', () => { CP.Audio.tap(); close(false); });
    root.addEventListener('resize', () => { if (running) { resize(); layout(); } });
  }

  CP.Map = {
    init, open, close, isOpen: () => running,
    // screen position of a level flask or reward bubble (used by tests)
    where(n, reward) { const p = reward ? rewardPos(n) : { x: pathX(n), y: levelY(n) }; return { x: p.x, y: p.y - el.scroll.scrollTop + el.scroll.getBoundingClientRect().top }; },
    scrollTo(n) { el.scroll.scrollTop = Math.max(0, levelY(n) - H * 0.5); },
  };
})(this);
