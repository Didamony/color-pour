// Game rules, seeded level generator and solver. No DOM access, so it runs in Node tests too.
(function (root) {
  'use strict';

  const PALETTE_SIZE = 12;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Difficulty curve. Every 10th level is a "boss", every level ending in 5 (after 10) is a breather.
  function levelConfig(n) {
    if (n <= 1) return { colors: 2, empty: 1, cap: 4, hidden: false, maxRun: 4, pick: 'easy', tag: 'tutorial' };
    if (n === 2) return { colors: 3, empty: 2, cap: 4, hidden: false, maxRun: 3, pick: 'easy', tag: null };
    if (n === 3) return { colors: 3, empty: 2, cap: 4, hidden: false, maxRun: 2, pick: 'mid', tag: null };
    let colors;
    if (n <= 6) colors = 4;
    else if (n <= 12) colors = 5;
    else if (n <= 22) colors = 6;
    else if (n <= 40) colors = 7;
    else if (n <= 60) colors = 8;
    else if (n <= 85) colors = 9;
    else if (n <= 115) colors = 10;
    else if (n <= 150) colors = 11;
    else colors = 12;
    const boss = n >= 10 && n % 10 === 0;
    const breather = !boss && n > 10 && n % 10 === 5;
    if (breather) colors = Math.max(4, colors - 2);
    if (boss) colors = Math.min(PALETTE_SIZE, colors + 1);
    const cap = (n >= 70 && !breather && n % 3 === 1) ? 5 : 4;
    const hidden = (n >= 30 && boss) || (n >= 80 && n % 4 === 2);
    let tag = null;
    if (boss) tag = 'boss';
    else if (breather) tag = 'chill';
    if (hidden) tag = 'mystery';
    else if (cap === 5 && !tag) tag = 'tall';
    return {
      colors, empty: 2, cap, hidden,
      maxRun: n <= 10 ? 3 : 2,
      pick: breather || n <= 8 ? 'easy' : (n <= 30 ? 'mid' : 'hard'),
      tag,
    };
  }

  function dailyConfig() {
    return { colors: 9, empty: 2, cap: 4, hidden: true, maxRun: 2, pick: 'hard', tag: 'mystery' };
  }

  // ---- rules ----

  function topRun(tube) {
    const n = tube.length;
    if (!n) return 0;
    const c = tube[n - 1];
    let k = 1;
    while (k < n && tube[n - 1 - k] === c) k++;
    return k;
  }

  function isComplete(tube, cap) {
    return tube.length === cap && topRun(tube) === cap;
  }

  function canPour(tubes, cap, i, j) {
    if (i === j) return false;
    const a = tubes[i], b = tubes[j];
    if (!a || !b || !a.length || b.length >= cap) return false;
    if (isComplete(a, cap)) return false;
    return !b.length || b[b.length - 1] === a[a.length - 1];
  }

  function pourAmount(tubes, cap, i, j) {
    return Math.min(topRun(tubes[i]), cap - tubes[j].length);
  }

  function isWon(tubes, cap) {
    for (const t of tubes) if (t.length && !isComplete(t, cap)) return false;
    return true;
  }

  function hasMoves(tubes, cap) {
    for (let i = 0; i < tubes.length; i++)
      for (let j = 0; j < tubes.length; j++)
        if (canPour(tubes, cap, i, j) && !(tubes[j].length === 0 && topRun(tubes[i]) === tubes[i].length)) return true;
    return false;
  }

  // ---- solver: depth-first search with move ordering and symmetry pruning ----

  function keyOf(tubes) {
    const parts = tubes.map(t => t.join(','));
    parts.sort();
    return parts.join('|');
  }

  function genMoves(s, cap) {
    const moves = [];
    for (let i = 0; i < s.length; i++) {
      const src = s[i];
      if (!src.length) continue;
      const run = topRun(src);
      if (run === cap) continue;
      const uniform = run === src.length;
      const top = src[src.length - 1];
      let emptyTried = false;
      for (let j = 0; j < s.length; j++) {
        if (j === i) continue;
        const dst = s[j];
        if (dst.length >= cap) continue;
        let score;
        if (!dst.length) {
          if (uniform || emptyTried) continue;
          emptyTried = true;
          score = 1;
        } else {
          if (dst[dst.length - 1] !== top) continue;
          const space = cap - dst.length;
          const dstUniform = topRun(dst) === dst.length;
          score = 10;
          if (space >= run) score += 6;
          if (dstUniform) score += 4;
          if (dstUniform && dst.length + run === cap) score += 20;
          if (uniform && space >= run) score += 3;
        }
        moves.push([i, j, score]);
      }
    }
    moves.sort((a, b) => b[2] - a[2]);
    return moves;
  }

  function solve(tubes, cap, limit) {
    limit = limit || 200000;
    const s = tubes.map(t => t.slice());
    const seen = new Set([keyOf(s)]);
    const path = [];
    let nodes = 0;
    let aborted = false;

    function dfs() {
      if (isWon(s, cap)) return true;
      if (++nodes > limit) { aborted = true; return false; }
      const moves = genMoves(s, cap);
      for (const [i, j] of moves) {
        const amt = Math.min(topRun(s[i]), cap - s[j].length);
        for (let k = 0; k < amt; k++) s[j].push(s[i].pop());
        const key = keyOf(s);
        if (!seen.has(key)) {
          seen.add(key);
          path.push([i, j]);
          if (dfs()) return true;
          path.pop();
        }
        for (let k = 0; k < amt; k++) s[i].push(s[j].pop());
        if (aborted) return false;
      }
      return false;
    }

    const ok = dfs();
    return { path: ok ? path : null, nodes, aborted };
  }

  // ---- generator ----

  function maxRunIn(tube) {
    let best = 0, cur = 0;
    for (let k = 0; k < tube.length; k++) {
      cur = k && tube[k] === tube[k - 1] ? cur + 1 : 1;
      if (cur > best) best = cur;
    }
    return best;
  }

  function generate(seed, cfg) {
    const want = cfg.pick === 'easy' ? 2 : 3;
    const found = [];
    for (let attempt = 0; attempt < 400 && found.length < want; attempt++) {
      const rnd = mulberry32((seed + Math.imul(attempt, 7919)) >>> 0);
      const colorIds = shuffle([...Array(PALETTE_SIZE).keys()], rnd).slice(0, cfg.colors);
      const seg = [];
      for (const c of colorIds) for (let k = 0; k < cfg.cap; k++) seg.push(c);
      shuffle(seg, rnd);
      const tubes = [];
      for (let t = 0; t < cfg.colors; t++) tubes.push(seg.slice(t * cfg.cap, (t + 1) * cfg.cap));
      if (tubes.some(t => maxRunIn(t) > cfg.maxRun || isComplete(t, cfg.cap))) continue;
      for (let e = 0; e < cfg.empty; e++) tubes.push([]);
      const res = solve(tubes, cfg.cap, 60000);
      if (!res.path) continue;
      found.push({ tubes, par: res.path.length, nodes: res.nodes });
    }
    if (!found.length) throw new Error('generator failed');
    found.sort((a, b) => (a.par + Math.log2(a.nodes + 1)) - (b.par + Math.log2(b.nodes + 1)));
    const pickIdx = cfg.pick === 'easy' ? 0 : cfg.pick === 'mid' ? Math.floor(found.length / 2) : found.length - 1;
    const lvl = found[pickIdx];
    const hidden = lvl.tubes.map(t => t.map((_, k) => cfg.hidden && k < t.length - 1));
    return { tubes: lvl.tubes, hidden, cap: cfg.cap, par: lvl.par, cfg };
  }

  function makeLevel(n) {
    const cfg = levelConfig(n);
    if (n <= 1) {
      // Hand-made first level: three moves, teaches the pour rule.
      return {
        tubes: [[4, 4, 0, 0], [0, 0, 4, 4], []],
        hidden: [[false, false, false, false], [false, false, false, false], []],
        cap: 4, par: 3, cfg,
      };
    }
    return generate(hashStr('level:' + n), cfg);
  }

  function makeDaily(dateStr) {
    return generate(hashStr('daily:' + dateStr), dailyConfig());
  }

  function starsFor(moves, par) {
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.35) + 2) return 2;
    return 1;
  }

  const Engine = {
    PALETTE_SIZE, mulberry32, hashStr, levelConfig, dailyConfig,
    topRun, isComplete, canPour, pourAmount, isWon, hasMoves, solve,
    generate, makeLevel, makeDaily, starsFor,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else (root.CP = root.CP || {}).Engine = Engine;
})(this);
