// Board controller: logic state, input, layout, pour animations and particles on one canvas.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};
  const E = CP.Engine, R = CP.Render;

  const MOVE_MS = 220, BACK_MS = 230, STREAM_LAG = 60, MIN_TILT = 1.0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clone2(a) { return a.map(x => x.slice()); }

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks || {};
    this.insets = { top: 80, bottom: 100 };
    this.style = { skin: 'classic', liquid: 'classic', symbols: false, fx: 'confetti' };
    this.theme = {};
    this.vis = [];
    this.anims = [];
    this.particles = [];
    this.reveals = new Map();
    this.selected = -1;
    this.hintMove = null;
    this.tutorial = false;
    this.cssW = 0; this.cssH = 0;
    this.won = false;
    this.lastT = performance.now();
    this.readTheme();
    canvas.addEventListener('pointerdown', e => this.onPointer(e));
    const loop = t => { this.frame(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  Game.prototype.readTheme = function () {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    this.theme = {
      glass: v('--glass') || 'rgba(255,255,255,0.5)',
      stroke: v('--glass-stroke') || '#9C8BC9',
      rim: v('--glass-rim') || '#C9BEE8',
      mystery: v('--mystery') || '#6B5E8C',
      accent: v('--accent') || '#FF5FA2',
      cork: v('--cork') || '#C98B5A',
    };
  };

  // ---------- level lifecycle ----------

  Game.prototype.load = function (level, saved) {
    this.level = level;
    this.cap = level.cap;
    this.initial = { tubes: clone2(level.tubes), hidden: clone2(level.hidden) };
    if (saved && saved.tubes) {
      this.tubes = clone2(saved.tubes);
      this.hidden = clone2(saved.hidden);
      this.history = (saved.history || []).map(h => ({ tubes: clone2(h.tubes), hidden: clone2(h.hidden) }));
      this.extraUsed = !!saved.extraUsed;
    } else {
      this.tubes = clone2(level.tubes);
      this.hidden = clone2(level.hidden);
      this.history = [];
      this.extraUsed = false;
    }
    this.resetVisuals();
    this.won = false;
    this.notifyMove();
  };

  Game.prototype.resetVisuals = function () {
    this.anims = [];
    this.reveals.clear();
    this.selected = -1;
    this.hintMove = null;
    this.vis = this.tubes.map((t, i) => ({
      id: i, x: 0, y: 0, angle: 0, W: 40, lift: 0, scale: 1, busy: false,
      complete: E.isComplete(t, this.cap), corkT: 1, shake: -1, pop: 1,
    }));
    this.layout();
  };

  Game.prototype.snapshot = function () {
    return {
      tubes: clone2(this.tubes), hidden: clone2(this.hidden), extraUsed: this.extraUsed,
      history: this.history.map(h => ({ tubes: clone2(h.tubes), hidden: clone2(h.hidden) })),
    };
  };

  Game.prototype.moves = function () { return this.history.length; };

  Game.prototype.notifyMove = function () {
    if (this.hooks.onChange) this.hooks.onChange(this);
  };

  Game.prototype.finishAnims = function () {
    for (const a of this.anims) this.endPour(a, true);
    this.anims = [];
  };

  Game.prototype.undo = function () {
    if (!this.history.length || this.won) return false;
    this.finishAnims();
    const h = this.history.pop();
    this.tubes = h.tubes;
    this.hidden = h.hidden;
    while (this.vis.length > this.tubes.length) this.vis.pop();
    this.vis.forEach((v, i) => { v.complete = E.isComplete(this.tubes[i], this.cap); v.corkT = 1; v.busy = false; v.angle = 0; });
    this.selected = -1;
    this.hintMove = null;
    this.layout();
    this.notifyMove();
    return true;
  };

  Game.prototype.restart = function () {
    this.finishAnims();
    this.tubes = clone2(this.initial.tubes);
    this.hidden = clone2(this.initial.hidden);
    this.history = [];
    this.extraUsed = false;
    this.won = false;
    this.resetVisuals();
    this.notifyMove();
  };

  Game.prototype.addTube = function () {
    if (this.extraUsed || this.won) return false;
    this.finishAnims();
    this.history.push({ tubes: clone2(this.tubes), hidden: clone2(this.hidden) });
    this.tubes.push([]);
    this.hidden.push([]);
    this.extraUsed = true;
    this.vis.push({ id: this.vis.length, x: 0, y: 0, angle: 0, W: 40, lift: 0, scale: 1, busy: false, complete: false, corkT: 1, shake: -1, pop: 0 });
    this.layout();
    this.notifyMove();
    return true;
  };

  Game.prototype.findHint = function () {
    if (this.won) return null;
    const res = E.solve(this.tubes, this.cap, 250000);
    if (!res.path || !res.path.length) return null;
    return res.path[0];
  };

  Game.prototype.showHint = function (move) {
    this.hintMove = move ? { src: move[0], dst: move[1], t0: performance.now() } : null;
    if (this.selected >= 0 && move && this.selected !== move[0]) this.selected = -1;
  };

  // ---------- layout ----------

  Game.prototype.setInsets = function (top, bottom) {
    this.insets = { top, bottom };
    this.layout();
  };

  Game.prototype.resize = function () {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.cssW = r.width; this.cssH = r.height; this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.layout();
  };

  Game.prototype.layout = function () {
    if (!this.tubes || !this.cssW) return;
    const n = this.tubes.length;
    const g = R.geometry(this.style.skin, this.cap);
    this.geo = g;
    const side = 14;
    const availW = Math.min(this.cssW, 640) - side * 2;
    const availH = this.cssH - this.insets.top - this.insets.bottom;
    let best = null;
    for (let r = 1; r <= 4; r++) {
      const per = Math.ceil(n / r);
      const wx = availW / per / 1.6;
      const wy = availH / (r * (g.H + 1.25));
      const W = Math.min(wx, wy, 60);
      if (!best || W > best.W + 1.5) best = { r, per, W };
    }
    const { r, W } = best;
    const rowH = W * (g.H + 1.25);
    const counts = [];
    for (let i = 0; i < r; i++) counts.push(Math.floor(n / r) + (i < n % r ? 1 : 0));
    const total = rowH * r;
    let y0 = this.insets.top + Math.max(0, (availH - total) / 2) + W * 0.85;
    const cx = this.cssW / 2;
    let idx = 0;
    this.cellW = 0;
    for (let row = 0; row < r; row++) {
      const cnt = counts[row];
      const cell = Math.min(W * 2.1, availW / cnt);
      this.cellW = Math.max(this.cellW, cell);
      for (let k = 0; k < cnt; k++, idx++) {
        const v = this.vis[idx];
        v.homeX = cx + (k - (cnt - 1) / 2) * cell;
        v.homeY = y0 + row * rowH;
        v.W = W;
        v.cell = cell;
        if (!v.busy) { v.x = v.homeX; v.y = v.homeY; }
      }
    }
    this.W = W;
  };

  // ---------- input ----------

  Game.prototype.hitTest = function (px, py) {
    const g = this.geo;
    for (let i = 0; i < this.vis.length; i++) {
      const v = this.vis[i];
      const half = v.cell / 2;
      if (px >= v.homeX - half && px <= v.homeX + half && py >= v.homeY - v.W * 1.3 && py <= v.homeY + g.H * v.W + v.W * 0.4) return i;
    }
    return -1;
  };

  Game.prototype.onPointer = function (e) {
    if (!this.tubes || this.won || this.locked) return;
    const r = this.canvas.getBoundingClientRect();
    const i = this.hitTest(e.clientX - r.left, e.clientY - r.top);
    if (this.hooks.onFirstInput) this.hooks.onFirstInput();
    if (i < 0) { this.selected = -1; return; }
    this.tap(i);
  };

  Game.prototype.tap = function (i) {
    const v = this.vis[i];
    if (v.busy) {
      // A tube gliding back after pouring can be grabbed again right away.
      const back = this.anims.find(a => a.s === i && a.phase === 'back');
      if (!back) return;
      this.endPour(back, false);
      this.anims = this.anims.filter(a => a !== back);
    }
    const sfx = this.hooks.sfx || {};
    if (this.selected < 0) {
      if (!this.tubes[i].length || E.isComplete(this.tubes[i], this.cap)) { this.shake(i); return; }
      this.selected = i;
      sfx.pick && sfx.pick();
      this.notifySelect();
      return;
    }
    if (this.selected === i) { this.selected = -1; sfx.drop && sfx.drop(); this.notifySelect(); return; }
    const s = this.selected;
    if (E.canPour(this.tubes, this.cap, s, i)) {
      this.selected = -1;
      this.pour(s, i);
      this.notifySelect();
    } else if (this.tubes[i].length && !E.isComplete(this.tubes[i], this.cap)) {
      this.selected = i;
      sfx.pick && sfx.pick();
      this.notifySelect();
    } else {
      this.shake(i);
    }
  };

  Game.prototype.notifySelect = function () {
    if (this.hooks.onSelect) this.hooks.onSelect(this.selected);
  };

  Game.prototype.shake = function (i) {
    this.vis[i].shake = performance.now();
    const sfx = this.hooks.sfx || {};
    sfx.deny && sfx.deny();
  };

  // ---------- pouring ----------

  function segs(tube, hid) { return tube.map((c, k) => ({ c, hidden: !!hid[k] })); }

  Game.prototype.pour = function (s, d) {
    this.history.push({ tubes: clone2(this.tubes), hidden: clone2(this.hidden) });
    const amount = E.pourAmount(this.tubes, this.cap, s, d);
    const srcBefore = segs(this.tubes[s], this.hidden[s]);
    const dstBefore = segs(this.tubes[d], this.hidden[d]);
    const color = this.tubes[s][this.tubes[s].length - 1];
    for (let k = 0; k < amount; k++) {
      this.tubes[d].push(this.tubes[s].pop());
      this.hidden[s].pop();
      this.hidden[d].push(false);
    }
    let revealIdx = -1;
    const top = this.tubes[s].length - 1;
    if (top >= 0 && this.hidden[s][top]) { this.hidden[s][top] = false; revealIdx = top; }
    this.hintMove = null;

    const vs = this.vis[s], vd = this.vis[d];
    vs.busy = vd.busy = true;
    const dir = vs.homeX <= vd.homeX ? 1 : -1;
    const g = this.geo;
    const startLayers = srcBefore.length;
    const endLayers = startLayers - amount;
    const a = {
      s, d, color, amount, srcBefore, dstBefore, dir, revealIdx,
      t: 0, phase: 'move', pourMs: 160 + 130 * amount,
      fromX: vs.x, fromY: vs.y, fromA: vs.angle,
      th0: Math.max(MIN_TILT, R.tiltFor(g, startLayers) + 0.04),
      th1: Math.max(MIN_TILT + 0.15, R.tiltFor(g, endLayers) + 0.1),
      p: 0, q: 0,
    };
    vs.lift = 0;
    this.anims.push(a);
    const sfx = this.hooks.sfx || {};
    sfx.pour && sfx.pour(amount, dstBefore.length / this.cap, a.pourMs);
    if (this.hooks.haptic) this.hooks.haptic(8);
    this.notifyMove();
  };

  Game.prototype.poseFor = function (a, th) {
    const vs = this.vis[a.s], vd = this.vis[a.d];
    const W = vs.W;
    const Lx = vd.homeX - a.dir * W * 0.16;
    const Ly = vd.homeY - W * 0.55;
    return {
      x: Lx - a.dir * (W / 2) * Math.cos(th),
      y: Ly - (W / 2) * Math.sin(th),
      angle: a.dir * th, Lx, Ly,
    };
  };

  Game.prototype.stepAnim = function (a, dt) {
    const vs = this.vis[a.s];
    a.t += dt;
    if (a.phase === 'move') {
      const k = ease(clamp(a.t / MOVE_MS, 0, 1));
      const pose = this.poseFor(a, a.th0);
      vs.x = lerp(a.fromX, pose.x, k);
      vs.y = lerp(a.fromY, pose.y, k);
      vs.angle = lerp(a.fromA, pose.angle, k);
      if (a.t >= MOVE_MS) { a.phase = 'pour'; a.t = 0; }
    } else if (a.phase === 'pour') {
      a.p = clamp(a.t / a.pourMs, 0, 1);
      a.q = clamp((a.t - STREAM_LAG) / a.pourMs, 0, 1);
      const th = lerp(a.th0, a.th1, ease(a.p));
      const pose = this.poseFor(a, th);
      vs.x = pose.x; vs.y = pose.y; vs.angle = pose.angle;
      a.lip = { x: pose.Lx, y: pose.Ly };
      if (Math.random() < 0.35 && a.q > 0 && a.q < 1) this.splash(a);
      if (a.t >= a.pourMs + STREAM_LAG) {
        a.phase = 'back'; a.t = 0;
        a.fromX = vs.x; a.fromY = vs.y; a.fromA = vs.angle;
        this.landed(a);
      }
    } else if (a.phase === 'back') {
      const k = ease(clamp(a.t / BACK_MS, 0, 1));
      vs.x = lerp(a.fromX, vs.homeX, k);
      vs.y = lerp(a.fromY, vs.homeY, k);
      vs.angle = lerp(a.fromA, 0, k);
      if (a.t >= BACK_MS) { a.phase = 'done'; this.endPour(a, false); }
    }
  };

  // Target received the liquid: release it, check completion.
  Game.prototype.landed = function (a) {
    const vd = this.vis[a.d];
    vd.busy = false;
    a.dstReleased = true;
    if (E.isComplete(this.tubes[a.d], this.cap) && !vd.complete) {
      vd.complete = true;
      vd.corkT = 0;
      this.sparkle(a.d);
      const sfx = this.hooks.sfx || {};
      sfx.complete && sfx.complete();
      if (this.hooks.haptic) this.hooks.haptic(25);
    }
  };

  Game.prototype.endPour = function (a, instant) {
    const vs = this.vis[a.s], vd = this.vis[a.d];
    if (!vs || !vd) return;
    if (!a.dstReleased) {
      vd.busy = false;
      if (E.isComplete(this.tubes[a.d], this.cap)) { vd.complete = true; vd.corkT = 1; }
    }
    vs.busy = false;
    vs.x = vs.homeX; vs.y = vs.homeY; vs.angle = 0;
    if (a.revealIdx >= 0 && !instant) this.reveals.set(a.s + ':' + a.revealIdx, performance.now());
    a.phase = 'done';
    if (!instant) this.afterSettle();
  };

  Game.prototype.afterSettle = function () {
    if (this.anims.some(x => x.phase !== 'done')) return;
    if (this.hooks.onSettle) this.hooks.onSettle(this);
    if (E.isWon(this.tubes, this.cap)) {
      if (!this.won) {
        this.won = true;
        setTimeout(() => { this.celebrate(); if (this.hooks.onWin) this.hooks.onWin(this); }, 350);
      }
    } else if (!E.hasMoves(this.tubes, this.cap)) {
      if (this.hooks.onStuck) this.hooks.onStuck(this);
    }
  };

  // ---------- visual layers ----------

  function groupSegs(list, now, reveals, idx) {
    const out = [];
    list.forEach((sg, k) => {
      let reveal = null;
      const rk = reveals.get(idx + ':' + k);
      if (rk != null) reveal = clamp((now - rk) / 380, 0, 1);
      const last = out[out.length - 1];
      if (last && !sg.hidden && !last.hidden && last.c === sg.c && reveal == null && last.reveal == null) last.amt += 1;
      else out.push({ c: sg.c, amt: 1, hidden: sg.hidden, reveal });
    });
    return out;
  }

  Game.prototype.layersFor = function (i, now) {
    for (const a of this.anims) {
      if (a.phase === 'done') continue;
      if (a.s === i) {
        const base = a.srcBefore.slice(0, a.srcBefore.length - a.amount);
        const L = groupSegs(base, now, this.reveals, i);
        const left = a.amount * (1 - a.p);
        if (left > 0.001) L.push({ c: a.color, amt: left, hidden: false });
        return L;
      }
      if (a.d === i && !a.dstReleased) {
        const L = groupSegs(a.dstBefore, now, this.reveals, i);
        const add = a.amount * a.q;
        if (add > 0.001) {
          const last = L[L.length - 1];
          if (last && !last.hidden && last.c === a.color) last.amt += add;
          else L.push({ c: a.color, amt: add, hidden: false });
        }
        return L;
      }
    }
    return groupSegs(segs(this.tubes[i], this.hidden[i]), now, this.reveals, i);
  };

  // ---------- particles ----------

  Game.prototype.palette = function () { return R.LIQUIDS[this.style.liquid] || R.LIQUIDS.classic; };

  Game.prototype.splash = function (a) {
    const vd = this.vis[a.d];
    const col = R.liquidColor(this.style, a.color);
    const y = a.dstTop != null ? a.dstTop : vd.homeY + this.geo.H * vd.W;
    for (let k = 0; k < 2; k++) {
      this.particles.push({ type: 'drop', x: a.lip.x + (Math.random() - 0.5) * vd.W * 0.2, y, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 90, g: 600, life: 0, max: 380, size: vd.W * (0.04 + Math.random() * 0.04), color: col, clipY: y });
    }
  };

  Game.prototype.sparkle = function (i) {
    const v = this.vis[i];
    const col = R.liquidColor(this.style, this.tubes[i][0]);
    for (let k = 0; k < 18; k++) {
      const ang = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140;
      this.particles.push({ type: 'star', x: v.homeX, y: v.homeY + v.W * 0.2, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, g: 120, life: 0, max: 700 + Math.random() * 300, size: v.W * (0.1 + Math.random() * 0.08), color: k % 3 ? col : '#FFFFFF', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8 });
    }
  };

  Game.prototype.celebrate = function () {
    const fx = this.style.fx;
    const pal = this.palette();
    const W = this.cssW, H = this.cssH;
    const pick = () => pal[Math.floor(Math.random() * pal.length)];
    if (fx === 'hearts') {
      for (let k = 0; k < 46; k++) this.particles.push({ type: 'heart', x: Math.random() * W, y: H + 20 + Math.random() * 120, vx: (Math.random() - 0.5) * 40, vy: -160 - Math.random() * 180, g: 0, life: 0, max: 2600, size: 10 + Math.random() * 14, color: k % 2 ? '#FF5F8F' : pick(), rot: 0, vr: 0, wob: Math.random() * 6 });
    } else if (fx === 'stars') {
      for (let k = 0; k < 70; k++) {
        const ang = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 360;
        this.particles.push({ type: 'star', x: W / 2, y: H * 0.42, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 260, life: 0, max: 1700, size: 7 + Math.random() * 9, color: k % 3 ? '#FFD23F' : pick(), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6 });
      }
    } else if (fx === 'fireworks') {
      for (let r = 0; r < 5; r++) {
        setTimeout(() => {
          const cx = W * (0.2 + Math.random() * 0.6), cy = H * (0.18 + Math.random() * 0.3), col = pick();
          for (let k = 0; k < 44; k++) {
            const ang = (k / 44) * Math.PI * 2, sp = 140 + Math.random() * 90;
            this.particles.push({ type: 'drop', x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 140, life: 0, max: 1300, size: 2.6 + Math.random() * 1.6, color: col, trail: true });
          }
          const sfx = this.hooks.sfx || {};
          sfx.boom && sfx.boom();
        }, r * 320);
      }
    } else {
      for (let k = 0; k < 140; k++) this.particles.push({ type: 'confetti', x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 160, g: 40, life: 0, max: 3200, size: 6 + Math.random() * 6, color: pick(), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, wob: Math.random() * 6 });
    }
  };

  function drawStar(ctx, r) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function drawHeart(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    ctx.closePath();
  }

  Game.prototype.drawParticles = function (ctx, dt) {
    const keep = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life > p.max) continue;
      const s = dt / 1000;
      p.vy += p.g * s;
      p.x += p.vx * s + (p.wob ? Math.sin(p.life / 300 + p.wob) * 0.6 : 0);
      p.y += p.vy * s;
      if (p.rot != null) p.rot += (p.vr || 0) * s;
      const fade = 1 - Math.pow(p.life / p.max, 3);
      ctx.globalAlpha = clamp(fade, 0, 1);
      ctx.fillStyle = p.color;
      if (p.type === 'drop') {
        if (p.clipY != null && p.y > p.clipY + 2 && p.vy > 0) continue;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        if (p.type === 'confetti') { ctx.scale(1, Math.abs(Math.sin(p.life / 160 + p.wob))); ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6); }
        else if (p.type === 'star') { drawStar(ctx, p.size); ctx.fill(); }
        else if (p.type === 'heart') { drawHeart(ctx, p.size); ctx.fill(); }
        ctx.restore();
      }
      keep.push(p);
    }
    ctx.globalAlpha = 1;
    this.particles = keep;
  };

  // ---------- frame ----------

  Game.prototype.frame = function (t) {
    const dt = Math.min(48, t - this.lastT);
    this.lastT = t;
    const ctx = this.ctx;
    if (!this.cssW) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    if (!this.tubes) { this.drawParticles(ctx, dt); return; }

    for (const a of this.anims) if (a.phase !== 'done') this.stepAnim(a, dt);
    this.anims = this.anims.filter(a => a.phase !== 'done');

    const g = this.geo;
    const style = { skin: this.style.skin, liquid: this.style.liquid, symbols: this.style.symbols, theme: this.theme, time: t };
    const moving = new Set(this.anims.map(a => a.s));
    const tops = {};
    const hintPulse = this.hintMove ? 0.5 + 0.5 * Math.sin((t - this.hintMove.t0) / 160) : 0;

    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) this.drawStreams(ctx, tops);
      for (let i = 0; i < this.vis.length; i++) {
        if ((pass === 1) !== moving.has(i)) continue;
        const v = this.vis[i];
        if (!v.busy) {
          const target = this.selected === i ? 1 : 0;
          v.lift += (target - v.lift) * Math.min(1, dt / 70);
          v.x = v.homeX; v.y = v.homeY - v.lift * v.W * 0.55;
          v.angle = 0;
        }
        if (v.pop < 1) v.pop = Math.min(1, v.pop + dt / 300);
        if (v.complete && v.corkT < 1) v.corkT = Math.min(1, v.corkT + dt / 420);
        let dx = 0;
        if (v.shake >= 0) {
          const e = t - v.shake;
          if (e > 360) v.shake = -1; else dx = Math.sin(e / 22) * v.W * 0.12 * (1 - e / 360);
        }
        const tv = {
          id: i, x: v.x + dx, y: v.y, angle: v.angle, W: v.W, scale: R.easeOutBack(v.pop) || 0.01,
          layers: this.layersFor(i, t), selected: this.selected === i, complete: v.complete, corkT: v.corkT,
        };
        const info = R.drawTube(ctx, tv, g, style);
        tops[i] = info.topY;
        if (this.hintMove && (this.hintMove.src === i || this.hintMove.dst === i)) this.drawHintMark(ctx, v, i === this.hintMove.dst, hintPulse);
      }
    }
    this.drawParticles(ctx, dt);
  };

  Game.prototype.drawStreams = function (ctx, tops) {
    for (const a of this.anims) {
      if (a.phase !== 'pour' || !a.lip) continue;
      a.dstTop = tops[a.d];
      const W = this.vis[a.s].W;
      const endY = tops[a.d] != null ? tops[a.d] : a.lip.y + W * 3;
      let y0 = a.lip.y, y1 = endY;
      const head = clamp(a.t / STREAM_LAG, 0, 1);
      y1 = lerp(y0, endY, head);
      if (a.p >= 1) y0 = lerp(a.lip.y, endY, clamp((a.t - a.pourMs) / STREAM_LAG, 0, 1));
      const w = W * (0.13 + 0.05 * Math.min(1, a.amount / 2));
      ctx.fillStyle = R.liquidColor(this.style, a.color);
      R.roundRect(ctx, a.lip.x - w / 2, y0, w, Math.max(0, y1 - y0), w / 2);
      ctx.fill();
    }
  };

  Game.prototype.drawHintMark = function (ctx, v, isDst, pulse) {
    const W = v.W, g = this.geo;
    ctx.save();
    ctx.strokeStyle = this.theme.accent;
    ctx.fillStyle = this.theme.accent;
    ctx.globalAlpha = 0.45 + 0.55 * pulse;
    ctx.lineWidth = 3;
    if (isDst) {
      const y = v.y - W * (1.15 + 0.25 * pulse);
      ctx.beginPath();
      ctx.moveTo(v.x - W * 0.32, y - W * 0.3);
      ctx.lineTo(v.x + W * 0.32, y - W * 0.3);
      ctx.lineTo(v.x, y + W * 0.1);
      ctx.closePath();
      ctx.fill();
    } else {
      R.roundRect(ctx, v.x - W * 0.78, v.y - W * 0.45, W * 1.56, g.H * W + W * 0.75, W * 0.5);
      ctx.setLineDash([6, 6]);
      ctx.stroke();
    }
    ctx.restore();
  };

  CP.Game = Game;
})(this);
