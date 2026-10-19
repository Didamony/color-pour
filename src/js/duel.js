// Play with a friend: both players race on the same seeded level, see each other's progress,
// and send emotes and short messages. Everything travels as each player's own presence state,
// so it works for anyone who can open the page; the transport can later be swapped for the app's backend.
(function (root) {
  'use strict';
  const CP = root.CP;
  const t = (k, v) => CP.I18n.t(k, v);

  const EMOTES = ['😂', '😍', '😎', '🥳', '😭', '😡', '🤯', '😴', '🔥', '👏', '💪', '👋'];
  const PHRASES = ['phr_hi', 'phr_gg', 'phr_fast', 'phr_wait', 'phr_again', 'phr_wow'];
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const MSG_MAX = 60;
  const REWARD_WIN = 40, REWARD_LOSE = 10;

  // ---------- transports ----------

  async function roomTransport(code) {
    const c = root.claude;
    if (!c || typeof c.use !== 'function') return null;
    const room = await c.use('room');
    if (!room) return null;
    let r;
    try { r = await room.join('duel-' + code.toLowerCase()); } catch (e) { return null; }
    const user = await c.use('user');
    return {
      set: patch => r.presence(patch).catch(() => {}),
      onPeers: fn => r.onPeers(ch => fn(ch.peers.filter(p => !p.sameTab && p.kind === 'viewer').map(p => ({ id: p.peer, by: p.by, state: p.presence || {} })))),
      leave: () => r.leave().catch(() => {}),
      profiles: ids => (user && ids.length ? user.profiles(ids) : Promise.resolve({})),
      me: () => (user ? user.me().catch(() => null) : Promise.resolve(null)),
    };
  }

  // Two tabs of one browser, for trying the duel locally (open the page with #localduel).
  function localTransport(code) {
    if (!('BroadcastChannel' in root)) return null;
    const ch = new BroadcastChannel('colorpour-duel-' + code);
    const id = Math.random().toString(36).slice(2, 10);
    const mine = {}, peers = new Map();
    let handler = null;
    const send = () => ch.postMessage({ id, state: mine });
    const notify = () => handler && handler([...peers.values()].map(p => ({ id: p.id, by: null, state: p.state })));
    ch.onmessage = e => {
      const m = e.data;
      if (!m || m.id === id) return;
      if (m.bye) { peers.delete(m.id); notify(); return; }
      const fresh = !peers.has(m.id);
      peers.set(m.id, { id: m.id, state: m.state, seen: Date.now() });
      if (fresh) send();
      notify();
    };
    const beat = setInterval(() => {
      send();
      let gone = false;
      for (const [k, p] of peers) if (Date.now() - p.seen > 6000) { peers.delete(k); gone = true; }
      if (gone) notify();
    }, 2000);
    return {
      set(patch) { for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } send(); return Promise.resolve(); },
      onPeers(fn) { handler = fn; setTimeout(() => { send(); notify(); }, 0); return () => { handler = null; }; },
      leave() { ch.postMessage({ id, bye: true }); clearInterval(beat); ch.close(); return Promise.resolve(); },
      profiles: () => Promise.resolve({}),
      me: () => Promise.resolve(null),
    };
  }

  function connectTransport(code) {
    if (root.location && root.location.hash === '#localduel') return Promise.resolve(localTransport(code));
    return roomTransport(code);
  }

  // ---------- state ----------

  let ctx = null;
  let tr = null, unsubPeers = null, code = '', round = 1, phase = 'idle';
  let my = {}, opp = null, oppKey = null, seen = { emo: 0, msg: 0 };
  let names = { me: '', meAvatar: '', opp: '', oppAvatar: '' };
  let startAt = 0, sheetRef = null, rewarded = 0, shownResult = null;
  let lastSend = 0;

  const el = {};

  function isActive() { return phase !== 'idle'; }

  function setMy(patch) {
    for (const k in patch) { if (patch[k] === null) delete my[k]; else my[k] = patch[k]; }
    if (tr) tr.set(patch);
  }

  function oppState() { return (opp && opp.state) || {}; }
  function oppName() { return names.opp || t('duelFriend'); }

  function randomCode() {
    let s = '';
    const buf = new Uint32Array(4);
    (root.crypto || { getRandomValues: a => a.map(() => Math.random() * 1e9) }).getRandomValues(buf);
    for (let i = 0; i < 4; i++) s += CODE_CHARS[buf[i] % CODE_CHARS.length];
    return s;
  }

  function levelFor(r) {
    const colors = Math.min(9, 5 + r);
    return CP.Engine.generate(CP.Engine.hashStr('duel:' + code + ':' + r), { colors, empty: 2, cap: 4, hidden: false, maxRun: 2, pick: 'mid', tag: null });
  }

  // ---------- entry ----------

  function open() {
    if (isActive()) { showLobby(); return; }
    ctx.sheet({
      title: t('duelTitle'),
      build(body, ref) {
        const p = document.createElement('p');
        p.textContent = t('duelBody');
        body.appendChild(p);
        body.appendChild(ctx.button('btn-primary', ctx.ICON.users + '<span>' + t('duelCreate') + '</span>', () => { ref.close(true); connect(randomCode()); }));
        const or = document.createElement('div');
        or.className = 'or-line';
        or.textContent = t('or');
        body.appendChild(or);
        const row = document.createElement('form');
        row.className = 'join-row';
        row.innerHTML = '<input id="duel-code" class="code-input" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text">';
        const input = row.querySelector('input');
        input.placeholder = t('duelCodePh');
        input.setAttribute('aria-label', t('duelCodePh'));
        input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
        const join = ctx.button('btn-violet', '<span>' + t('duelJoin') + '</span>', () => {});
        join.type = 'submit';
        row.appendChild(join);
        row.addEventListener('submit', e => {
          e.preventDefault();
          const c = input.value.trim();
          if (c.length !== 4) { ctx.toast(t('duelBadCode')); CP.Audio.deny(); return; }
          ref.close(true);
          connect(c);
        });
        body.appendChild(row);
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = t('duelShareNote');
        body.appendChild(note);
      },
    });
  }

  async function connect(c) {
    ctx.toast(t('duelConnecting'));
    const transport = await connectTransport(c);
    if (!transport) { showUnavailable(); return; }
    tr = transport;
    code = c;
    round = 1;
    phase = 'lobby';
    opp = null; oppKey = null; rewarded = 0; shownResult = null;
    my = {};
    setMy({ v: 1, ready: 0, round: 1 });
    unsubPeers = tr.onPeers(onPeers);
    tr.me().then(me => { if (me) { names.me = me.name || ''; names.meAvatar = me.avatarUrl || ''; renderBar(); if (phase === 'lobby') showLobby(); } });
    showLobby();
  }

  function showUnavailable() {
    ctx.sheet({
      title: t('duelTitle'),
      build(body) {
        const p = document.createElement('p');
        p.textContent = t('duelUnavailable');
        body.appendChild(p);
      },
    });
  }

  function leave() {
    if (tr) tr.leave();
    if (unsubPeers) unsubPeers();
    tr = null; unsubPeers = null; phase = 'idle'; opp = null;
    closePanel();
    if (sheetRef) { sheetRef.close(true); sheetRef = null; }
    renderBar();
    ctx.exitDuel();
  }

  // ---------- peers ----------

  function onPeers(list) {
    const prev = opp;
    opp = list[0] || null;
    if (opp && opp.id !== oppKey) {
      // New opponent: treat their current emote/message as already seen.
      oppKey = opp.id;
      seen = { emo: (opp.state.emo && opp.state.emo.t) || 0, msg: (opp.state.msg && opp.state.msg.t) || 0 };
      if (opp.by) tr.profiles([opp.by]).then(ps => { const p = ps[opp && opp.by]; if (p) { names.opp = p.name || ''; names.oppAvatar = p.avatarUrl || ''; renderBar(); if (phase === 'lobby') showLobby(); } });
      else { names.opp = ''; names.oppAvatar = ''; }
      CP.Audio.complete();
    }
    if (!opp && prev) {
      ctx.toast(t('duelLeft', { name: oppName() }));
      oppKey = null;
    }
    const s = oppState();
    if (s.emo && s.emo.t > seen.emo) { seen.emo = s.emo.t; if (EMOTES.includes(s.emo.e)) floatEmote('opp', s.emo.e); }
    if (s.msg && s.msg.t > seen.msg) { seen.msg = s.msg.t; if (typeof s.msg.s === 'string') floatMsg('opp', s.msg.s.slice(0, MSG_MAX)); }

    if (phase === 'lobby') { showLobby(); maybeStart(); }
    else if (phase === 'playing') { renderBar(); resolve(); }
    else if (phase === 'result') { renderBar(); resolve(); updateResultHint(); }
  }

  // ---------- rounds ----------

  function maybeStart() {
    const s = oppState();
    if (opp && my.ready === round && s.ready === round) countdown();
  }

  function countdown() {
    phase = 'countdown';
    if (sheetRef) { sheetRef.close(true); sheetRef = null; }
    shownResult = null;
    setMy({ round, prog: 0, moves: 0, done: 0, time: null });
    ctx.startBoard(levelFor(round), round);
    ctx.lock(true);
    renderBar();
    const box = document.createElement('div');
    box.className = 'countdown';
    document.body.appendChild(box);
    const steps = ['3', '2', '1', t('go')];
    steps.forEach((s, i) => setTimeout(() => {
      box.innerHTML = '<b></b>';
      box.querySelector('b').textContent = s;
      if (i < 3) CP.Audio.tick(); else CP.Audio.complete();
    }, i * 700));
    setTimeout(() => {
      box.remove();
      phase = 'playing';
      startAt = performance.now();
      ctx.lock(false);
      resolve();
    }, steps.length * 700);
  }

  function onChange(game) {
    if (phase !== 'playing') return;
    // Progress: how many layers already sit on a matching layer below them, across all tubes.
    let good = 0, total = 0;
    for (const tube of game.tubes) {
      if (!tube.length) continue;
      total += game.cap - 1;
      let k = 1;
      while (k < tube.length && tube[k] === tube[0]) k++;
      good += k - 1;
    }
    const prog = total ? Math.round((good / total) * 100) / 100 : 0;
    if (prog !== my.prog || game.moves() !== my.moves) setMy({ prog, moves: game.moves() });
    renderBar();
  }

  function onWin() {
    if (phase !== 'playing') return;
    setMy({ done: round, prog: 1, time: Math.round(performance.now() - startAt) });
    resolve();
  }

  // Decide the round. If both finished, the faster time wins (covers both finishing at once).
  function resolve() {
    if (phase !== 'playing' && phase !== 'result') return;
    const s = oppState();
    const meDone = my.done === round, oppDone = s.done === round;
    if (!meDone && !oppDone) return;
    let win = meDone;
    if (meDone && oppDone) win = my.time <= (+s.time || Infinity);
    if (phase === 'result' && shownResult === win) return;
    if (!meDone && phase === 'playing') ctx.lock(true);
    phase = 'result';
    shownResult = win;
    if (rewarded !== round) {
      rewarded = round;
      ctx.addCoins(win ? REWARD_WIN : REWARD_LOSE);
    }
    if (!win) CP.Audio.deny();
    setTimeout(() => { if (phase === 'result') showResult(); }, meDone ? 900 : 300);
  }

  function fmtTime(ms) {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function rematch() {
    round += 1;
    phase = 'lobby';
    setMy({ ready: round });
    showLobby();
    maybeStart();
  }

  // ---------- sheets ----------

  function avatarHTML(url, label) {
    const safe = (label || '?').trim().charAt(0).toUpperCase();
    return url ? '<img class="avatar" alt="" src="' + url.replace(/"/g, '') + '">' : '<span class="avatar">' + safe.replace(/[<>&"]/g, '') + '</span>';
  }

  function playerCard(isMe) {
    const card = document.createElement('div');
    card.className = 'pcard';
    const name = isMe ? (names.me || t('duelYou')) : oppName();
    const present = isMe || !!opp;
    const ready = isMe ? my.ready === round : oppState().ready === round;
    card.innerHTML = (present ? avatarHTML(isMe ? names.meAvatar : names.oppAvatar, name) : '<span class="avatar wait"><i></i><i></i><i></i></span>') + '<b></b><small></small>';
    card.querySelector('b').textContent = present ? name : t('duelWaitingShort');
    card.querySelector('b').dir = 'auto';
    card.querySelector('small').textContent = present ? (ready ? t('duelIsReady') : t('duelNotReady')) : '';
    if (ready) card.classList.add('ready');
    return card;
  }

  function emoteRow() {
    const row = document.createElement('div');
    row.className = 'emote-row';
    EMOTES.slice(0, 5).forEach(e => {
      const b = document.createElement('button');
      b.textContent = e;
      b.setAttribute('aria-label', e);
      b.addEventListener('click', () => sendEmote(e));
      row.appendChild(b);
    });
    const more = document.createElement('button');
    more.className = 'more';
    more.innerHTML = ctx.ICON.chat;
    more.setAttribute('aria-label', t('emotes'));
    more.addEventListener('click', togglePanel);
    row.appendChild(more);
    return row;
  }

  function showLobby() {
    if (phase !== 'lobby') return;
    const build = (body, ref) => {
      sheetRef = ref;
      const codeBox = document.createElement('div');
      codeBox.className = 'code-box';
      codeBox.innerHTML = '<small></small><div class="code num"></div>';
      codeBox.querySelector('small').textContent = round > 1 ? t('duelRound', { n: round }) : t('duelShare');
      codeBox.querySelector('.code').textContent = code;
      const copy = document.createElement('button');
      copy.className = 'copy';
      copy.textContent = t('duelCopy');
      copy.addEventListener('click', () => {
        const done = () => { copy.textContent = t('duelCopied'); setTimeout(() => { copy.textContent = t('duelCopy'); }, 1500); };
        try { navigator.clipboard.writeText(code).then(done, () => selectCode(codeBox)); } catch (e) { selectCode(codeBox); }
      });
      codeBox.appendChild(copy);
      body.appendChild(codeBox);

      const players = document.createElement('div');
      players.className = 'players';
      players.appendChild(playerCard(true));
      const vs = document.createElement('span');
      vs.className = 'vs';
      vs.textContent = 'VS';
      players.appendChild(vs);
      players.appendChild(playerCard(false));
      body.appendChild(players);

      if (!opp) {
        const w = document.createElement('p');
        w.className = 'center';
        w.textContent = t('duelWaiting');
        body.appendChild(w);
      } else {
        body.appendChild(emoteRow());
      }
      const readyBtn = ctx.button(my.ready === round ? '' : 'btn-primary', '<span>' + (my.ready === round ? t('duelWaitFriend') : t('duelReady')) + '</span>', () => {
        if (my.ready === round) return;
        setMy({ ready: round });
        showLobby();
        maybeStart();
      });
      readyBtn.disabled = my.ready === round;
      body.appendChild(readyBtn);
      body.appendChild(ctx.button('', '<span>' + t('duelLeave') + '</span>', leave));
    };
    if (sheetRef && sheetRef.el.isConnected && sheetRef.kind === 'lobby') {
      sheetRef.body.innerHTML = '';
      build(sheetRef.body, sheetRef);
      return;
    }
    const ref = ctx.sheet({ title: t('duelTitle'), closable: false, build });
    ref.kind = 'lobby';
  }

  function selectCode(box) {
    const r = document.createRange();
    r.selectNodeContents(box.querySelector('.code'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function showResult() {
    const win = shownResult;
    const s = oppState();
    const ref = ctx.sheet({
      title: win ? t('duelWin') : t('duelLose', { name: oppName() }),
      closable: false,
      build(body, r) {
        sheetRef = r;
        body.classList.add('center');
        const big = document.createElement('div');
        big.className = 'result-emoji';
        big.textContent = win ? '🏆' : '😅';
        body.appendChild(big);
        const times = document.createElement('p');
        const parts = [];
        if (my.done === round) parts.push(t('duelYou') + ' ' + fmtTime(my.time));
        if (s.done === round) parts.push(oppName() + ' ' + fmtTime(s.time));
        times.textContent = parts.join(' · ');
        body.appendChild(times);
        const line = document.createElement('div');
        line.className = 'reward-line';
        line.innerHTML = ctx.coin() + '<span class="num">+' + (win ? REWARD_WIN : REWARD_LOSE) + '</span>';
        body.appendChild(line);
        body.appendChild(emoteRow());
        const hint = document.createElement('p');
        hint.className = 'rematch-hint';
        body.appendChild(hint);
        body.appendChild(ctx.button('btn-primary', '<span>' + t('duelAgain') + '</span>', rematch));
        body.appendChild(ctx.button('', '<span>' + t('duelLeave') + '</span>', leave));
      },
    });
    ref.kind = 'result';
    updateResultHint();
  }

  function updateResultHint() {
    if (!sheetRef || sheetRef.kind !== 'result') return;
    const h = sheetRef.el.querySelector('.rematch-hint');
    if (!h) return;
    const s = oppState();
    h.textContent = opp && s.ready > round ? t('duelFriendWants', { name: oppName() }) : (!opp ? t('duelLeft', { name: oppName() }) : '');
  }

  // ---------- duel bar (in the HUD) ----------

  function renderBar() {
    if (!el.bar) return;
    const show = phase !== 'idle' && phase !== 'lobby';
    el.bar.hidden = !show;
    if (!show) return;
    const s = oppState();
    el.meName.textContent = names.me || t('duelYou');
    el.oppName.textContent = opp ? oppName() : t('duelLeftShort');
    el.meFill.style.width = Math.round((my.prog || 0) * 100) + '%';
    el.oppFill.style.width = Math.round((+s.prog || 0) * 100) + '%';
    el.oppChip.classList.toggle('gone', !opp);
  }

  // ---------- emotes & messages ----------

  function canSend() {
    const now = Date.now();
    if (now - lastSend < 700) return false;
    lastSend = now;
    return true;
  }

  function sendEmote(e) {
    if (!tr || !canSend()) return;
    setMy({ emo: { e, t: Date.now() } });
    floatEmote('me', e);
    CP.Audio.pick();
    closePanel();
  }

  function cleanText(s) {
    return String(s).replace(/[\u0000-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MSG_MAX);
  }

  function sendMsg(text) {
    const s = cleanText(text);
    if (!s || !tr || !canSend()) return false;
    setMy({ msg: { s, t: Date.now() } });
    floatMsg('me', s);
    CP.Audio.pick();
    return true;
  }

  function floatEmote(side, e) {
    const n = document.createElement('div');
    n.className = 'emote-float ' + side;
    n.textContent = e;
    n.style.setProperty('--dx', (Math.random() * 40 - 20).toFixed(0) + 'px');
    el.layer.appendChild(n);
    if (side === 'opp') { CP.Audio.tap(); ctx.haptic(15); }
    setTimeout(() => n.remove(), 2400);
  }

  function floatMsg(side, text) {
    el.layer.querySelectorAll('.msg-float.' + side).forEach(x => x.remove());
    const n = document.createElement('div');
    n.className = 'msg-float ' + side;
    const who = document.createElement('small');
    who.textContent = side === 'me' ? (names.me || t('duelYou')) : oppName();
    const body = document.createElement('span');
    body.dir = 'auto';
    body.textContent = text;
    n.appendChild(who);
    n.appendChild(body);
    el.layer.appendChild(n);
    if (side === 'opp') { CP.Audio.tap(); ctx.haptic(15); }
    setTimeout(() => n.remove(), 4200);
  }

  function buildPanel() {
    const p = el.panel;
    p.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'ep-head';
    head.innerHTML = '<b></b>';
    head.querySelector('b').textContent = t('emotes');
    const x = document.createElement('button');
    x.className = 'icon-btn';
    x.innerHTML = ctx.ICON.x;
    x.setAttribute('aria-label', t('close'));
    x.addEventListener('click', closePanel);
    head.appendChild(x);
    p.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'ep-grid';
    EMOTES.forEach(e => {
      const b = document.createElement('button');
      b.textContent = e;
      b.setAttribute('aria-label', e);
      b.addEventListener('click', () => sendEmote(e));
      grid.appendChild(b);
    });
    p.appendChild(grid);
    const chips = document.createElement('div');
    chips.className = 'ep-chips';
    PHRASES.forEach(k => {
      const b = document.createElement('button');
      b.textContent = t(k);
      b.addEventListener('click', () => { if (sendMsg(t(k))) closePanel(); });
      chips.appendChild(b);
    });
    p.appendChild(chips);
    const form = document.createElement('form');
    form.className = 'ep-form';
    form.innerHTML = '<input id="duel-msg" maxlength="' + MSG_MAX + '" autocomplete="off">';
    const input = form.querySelector('input');
    input.placeholder = t('msgPh');
    input.setAttribute('aria-label', t('msgPh'));
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'btn btn-primary';
    send.textContent = t('send');
    form.appendChild(send);
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (sendMsg(input.value)) { input.value = ''; closePanel(); }
    });
    p.appendChild(form);
  }

  function togglePanel() {
    if (!el.panel.hidden) { closePanel(); return; }
    buildPanel();
    el.panel.hidden = false;
    CP.Audio.tap();
  }
  function closePanel() { if (el.panel) el.panel.hidden = true; }

  // ---------- setup ----------

  function init(context) {
    ctx = context;
    el.bar = document.getElementById('duel-bar');
    el.meName = el.bar.querySelector('.me b');
    el.oppName = el.bar.querySelector('.opp b');
    el.meFill = el.bar.querySelector('.me .fill');
    el.oppFill = el.bar.querySelector('.opp .fill');
    el.oppChip = el.bar.querySelector('.opp');
    el.layer = document.getElementById('emote-layer');
    el.panel = document.getElementById('emote-panel');
    renderBar();
  }

  CP.Duel = {
    init, open, leave, onChange, onWin, togglePanel,
    isActive, get phase() { return phase; }, get round() { return round; },
    EMOTES,
  };
})(this);
