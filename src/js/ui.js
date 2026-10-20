// Screens, sheets and game flow: home, HUD, win/stuck sheets, gift, wheel, shop, levels, settings.
(function (root) {
  'use strict';
  const CP = root.CP;
  const E = CP.Engine, S = CP.Store, A = CP.Audio, R = CP.Render, I18n = CP.I18n;
  const t = (k, v) => I18n.t(k, v);

  const P = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const ICON = {
    home: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/><circle cx="12" cy="12" r="6.6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" ' + P + '><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    restart: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 3.5v5h5"/></svg>',
    tube: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4.5 3h7.5M5.8 3v13.5a2.5 2.5 0 0 0 5 0V3"/><path d="M5.8 11h5"/><path d="M18 9v8M14 13h8"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" ' + P + '><path d="M9.2 18h5.6M10.2 21h3.6"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1 1.3 1 2.2h5.2c0-.9.3-1.6 1-2.2A6 6 0 0 0 12 3z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor"/></svg>',
    gift: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="8" width="18" height="5" rx="1.2"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8C10 4 6 4 6 6.5S9 8 12 8zm0 0c2-4 6-4 6-1.5S15 8 12 8z"/></svg>',
    wheel: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
    bag: '<svg viewBox="0 0 24 24" ' + P + '><path d="M5 8h14l-1.1 12.2a1 1 0 0 1-1 .8H7.1a1 1 0 0 1-1-.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    cal: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 12.6l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.7-1.7 2.4-.4z" fill="currentColor" stroke="none"/></svg>',
    grid: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    users: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.3a5.5 5.5 0 0 1 6 5.2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" ' + P + '><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    x: '<svg viewBox="0 0 24 24" ' + P + ' stroke-width="2.8"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5L12 13l8.5-6.5"/></svg>',
    g: '<svg viewBox="0 0 24 24" ' + P + '><path d="M20 12.2h-8M20 12.2A8 8 0 1 1 17.7 6.4"/></svg>',
    f: '<svg viewBox="0 0 24 24" ' + P + '><path d="M14.5 21v-8h3l.5-3.5h-3.5V7.6c0-1 .3-1.7 1.8-1.7H18V2.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.3H8V13h3v8"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5S3 15 3 8.8A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 9 2.2C21 15 12 20.5 12 20.5z" fill="currentColor"/></svg>',
    spark: '<svg viewBox="0 0 24 24" ' + P + '><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>',
    chat: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="3"/></svg>',
    confetti: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 20l5-13 8 8z"/><path d="M14 4l1 2M19 6l-2 1M20 11h-2M11 3v2"/></svg>',
  };
  const coin = cls => '<i class="coin' + (cls ? ' ' + cls : '') + '" aria-hidden="true"></i>';
  const videoTag = '<span class="video-ic">' + ICON.video + '</span>';

  const $ = s => document.querySelector(s);
  let game, el = {};
  let mode = 'level', levelNum = 1, level = null, undosLeft = 5;
  let bubbleTimer = null, lastCoins = null;

  // ---------- helpers ----------

  function haptic(ms) {
    if (!S.data.haptics) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not allowed */ }
  }

  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  function updateCoins() {
    const c = S.data.coins;
    document.querySelectorAll('[data-coins]').forEach(n => {
      n.textContent = c;
      if (lastCoins != null && c !== lastCoins) {
        const pill = n.closest('.coins');
        if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
      }
    });
    lastCoins = c;
  }

  // ---------- sheets ----------

  let openSheetRef = null;
  function sheet(opts) {
    if (openSheetRef) openSheetRef.close(true);
    const rootEl = document.createElement('div');
    rootEl.className = 'modal-root';
    rootEl.innerHTML =
      '<div class="sheet ' + (opts.cls || '') + '" role="dialog" aria-modal="true">' +
      '<div class="sheet-head"><h2></h2>' + (opts.closable === false ? '' : '<button class="icon-btn x" aria-label="' + t('close') + '">' + ICON.x + '</button>') + '</div>' +
      '<div class="sheet-body ' + (opts.bodyCls || '') + '"></div></div>';
    rootEl.querySelector('h2').textContent = opts.title || '';
    const body = rootEl.querySelector('.sheet-body');
    document.body.appendChild(rootEl);
    let closed = false;
    const ref = {
      el: rootEl, body,
      close(instant) {
        if (closed) return;
        closed = true;
        if (openSheetRef === ref) openSheetRef = null;
        if (opts.onClose) opts.onClose();
        if (instant) { rootEl.remove(); return; }
        rootEl.classList.add('closing');
        setTimeout(() => rootEl.remove(), 180);
      },
    };
    if (opts.closable !== false) {
      rootEl.querySelector('.x').addEventListener('click', () => { A.tap(); ref.close(); });
      rootEl.addEventListener('pointerdown', e => { if (e.target === rootEl) ref.close(); });
    }
    ref.closable = opts.closable !== false;
    openSheetRef = ref;
    opts.build(body, ref);
    return ref;
  }

  function button(cls, html, onClick) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.innerHTML = html;
    b.addEventListener('click', e => { A.tap(); onClick(e, b); });
    return b;
  }

  async function watchAd() {
    const ok = await CP.Ads.showRewarded();
    if (ok) haptic(20);
    return ok;
  }

  // A sheet offering a booster for a video or for coins.
  function offer(opts) {
    sheet({
      title: opts.title,
      build(body, ref) {
        body.classList.add('center');
        const p = document.createElement('p');
        p.textContent = opts.body;
        body.appendChild(p);
        body.appendChild(button('btn-video', videoTag + '<span>' + t('free') + '</span>', async () => {
          ref.close(true);
          if (await watchAd()) opts.grant();
        }));
        body.appendChild(button('', coin('sm') + '<span class="num">' + opts.price + '</span>', () => {
          if (!S.spend(opts.price)) { toast(t('notEnough')); A.deny(); return; }
          A.coin();
          updateCoins();
          ref.close();
          opts.grant();
        }));
        const have = document.createElement('p');
        have.innerHTML = t('have', { n: '<b class="num">' + S.data.coins + '</b>' });
        body.appendChild(have);
      },
    });
  }

  // ---------- theme & style ----------

  function applyTheme() {
    const m = S.data.theme;
    if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-mode', m);
    else document.documentElement.removeAttribute('data-mode');
    requestAnimationFrame(retheme);
  }

  function isNight() {
    return getComputedStyle(document.documentElement).getPropertyValue('--scene-night').trim() === '1';
  }

  function sceneNow() {
    CP.Scene.set(el.home && !el.home.hidden && !el.home.classList.contains('leaving') ? 'home' : S.data.equip.bg, isNight());
  }

  function retheme() {
    if (game) game.readTheme();
    sceneNow();
    drawHero(true);
  }

  function applyStyle() {
    const eq = S.data.equip;
    el.app.className = 'bg-' + eq.bg;
    sceneNow();
    if (!game) return;
    game.style = { skin: eq.tube, liquid: eq.liquid, symbols: S.data.symbols, fx: eq.fx };
    game.layout();
  }

  function measure() {
    const app = el.app.getBoundingClientRect();
    const top = el.topbar.getBoundingClientRect().bottom - app.top + 6;
    const bottom = app.bottom - el.toolbar.getBoundingClientRect().top + 10;
    game.resize();
    game.setInsets(top, bottom);
  }

  // ---------- HUD ----------

  function setCount(node, n) {
    if (n > 0) { node.className = 'count num'; node.textContent = n; }
    else { node.className = 'count ad'; node.innerHTML = ICON.video; }
  }

  function updateHUD() {
    if (!level) return;
    const duel = mode === 'duel';
    el.levelTitle.textContent = duel ? t('duelRound', { n: levelNum }) : mode === 'daily' ? t('dailyTitle') : t('level', { n: levelNum });
    el.btnTube.hidden = el.btnHint.hidden = duel;
    el.btnEmote.hidden = !duel;
    el.undoCount.hidden = duel;
    const tag = mode === 'daily' ? 'daily' : level.cfg.tag;
    el.levelTag.hidden = !tag || tag === 'tutorial';
    if (tag && tag !== 'tutorial') {
      el.levelTag.className = 'tag ' + tag;
      el.levelTag.textContent = t('tag_' + tag);
    }
    el.moves.textContent = t('moves', { n: game.moves() });
    setCount(el.undoCount, undosLeft);
    setCount(el.tubeCount, S.data.inv.tube);
    setCount(el.hintCount, S.data.inv.hint);
    el.btnUndo.disabled = !game.history.length;
    el.btnTube.disabled = game.extraUsed;
    updateCoins();
  }

  function persistPlay() {
    if (!level || game.won || mode === 'duel') return;
    S.data.play = { mode, id: mode === 'daily' ? S.today() : levelNum, undos: undosLeft, state: game.snapshot() };
    S.save();
  }

  // ---------- tutorial bubble ----------

  function showBubble(text, ms) {
    el.bubble.textContent = text;
    el.bubble.hidden = false;
    el.bubble.style.animation = 'none'; void el.bubble.offsetWidth; el.bubble.style.animation = '';
    clearTimeout(bubbleTimer);
    if (ms) bubbleTimer = setTimeout(() => { el.bubble.hidden = true; }, ms);
  }
  function hideBubble() { el.bubble.hidden = true; clearTimeout(bubbleTimer); }

  function tutorialStep() {
    if (!game.tutorial || game.won) return;
    const mv = game.findHint();
    game.showHint(mv);
    showBubble(game.selected < 0 ? t('tut1') : t('tut2'));
  }

  // ---------- level flow ----------

  function begin(newMode, n, stay) {
    if (openSheetRef && !stay) openSheetRef.close(true);
    mode = newMode;
    levelNum = n;
    level = mode === 'daily' ? E.makeDaily(S.today()) : E.makeLevel(n);
    const p = S.data.play;
    const resume = p && p.mode === mode && p.id === (mode === 'daily' ? S.today() : n) && p.state;
    undosLeft = resume ? p.undos : S.REWARDS.undosPerLevel;
    game.load(level, resume ? p.state : null);
    game.tutorial = mode === 'level' && n === 1;
    hideBubble();
    if (!stay) hideHome();
    updateHUD();
    if (game.tutorial) setTimeout(tutorialStep, 350);
    else if (mode === 'level' && n === 2) showBubble(t('tutRule'), 5200);
    else {
      const tag = level.cfg.tag;
      if (tag && t('intro_' + tag) !== 'intro_' + tag && !S.data.seen[tag]) {
        S.data.seen[tag] = true; S.save();
        showBubble(t('intro_' + tag), 4200);
      }
    }
  }

  function startLevel(n) { begin('level', n); }
  function startDaily() { begin('daily', 0); }

  function onWin() {
    hideBubble();
    if (mode === 'duel') { A.win(); haptic(40); CP.Duel.onWin(); return; }
    const moves = game.moves();
    let stars = 3, base, replay = false;
    if (mode === 'daily') {
      base = S.REWARDS.daily;
      S.data.daily.doneDate = S.today();
    } else {
      stars = E.starsFor(moves, level.par);
      replay = levelNum < S.data.level;
      base = replay ? S.REWARDS.replay : S.REWARDS.levelBase + S.REWARDS.perStar * stars;
      S.data.stars[levelNum] = Math.max(S.data.stars[levelNum] || 0, stars);
      if (!replay) S.data.level = levelNum + 1;
    }
    S.data.play = null;
    S.save();
    A.win();
    haptic(40);
    setTimeout(() => showWin(stars, base), 750);
  }

  function showWin(stars, base) {
    const mult = mode === 'daily' ? 2 : 3;
    let granted = false;
    const grant = amount => {
      if (granted) return;
      granted = true;
      S.addCoins(amount);
      A.coin();
      updateCoins();
    };
    sheet({
      title: mode === 'daily' ? t('dailyWinTitle') : t('winTitle'),
      closable: false,
      build(body, ref) {
        body.classList.add('center');
        if (mode === 'level') {
          const st = document.createElement('div');
          st.className = 'stars';
          st.innerHTML = [0, 1, 2].map(i => ICON.star.replace('<svg', '<svg class="' + (i < stars ? 'on' : '') + '"')).join('');
          body.appendChild(st);
        }
        const line = document.createElement('div');
        line.className = 'reward-line';
        line.innerHTML = coin() + '<span class="num">+' + base + '</span>';
        body.appendChild(line);
        const vid = button('btn-video', videoTag + '<span>' + t('watchX', { n: mult }) + '</span><span class="sub num">+' + base * mult + '</span>', async () => {
          if (granted) return;
          if (await watchAd()) {
            grant(base * mult);
            line.innerHTML = coin() + '<span class="num">+' + base * mult + '</span>';
            line.classList.remove('bump'); void line.offsetWidth; line.classList.add('bump');
            vid.disabled = true;
          }
        });
        body.appendChild(vid);
        const go = () => {
          grant(base);
          ref.close();
          if (mode === 'daily') showHome(); else startLevel(S.data.level);
        };
        body.appendChild(button('btn-primary', '<span>' + (mode === 'daily' ? t('home') : t('next')) + '</span>', go));
        if (mode === 'level') {
          const homeBtn = button('', ICON.home + '<span>' + t('home') + '</span>', () => { grant(base); ref.close(); showHome(); });
          body.appendChild(homeBtn);
        }
      },
    });
  }

  function onStuck() {
    sheet({
      title: t('stuckTitle'),
      build(body, ref) {
        const p = document.createElement('p');
        p.textContent = t('stuckBody');
        body.appendChild(p);
        if (game.history.length) body.appendChild(button('btn-violet', ICON.undo + '<span>' + t('undo') + '</span>', () => { ref.close(true); doUndo(); }));
        if (!game.extraUsed && mode !== 'duel') body.appendChild(button('btn-video', ICON.tube + '<span>' + t('tubeTitle') + '</span>', () => { ref.close(true); doTube(); }));
        body.appendChild(button('', ICON.restart + '<span>' + t('restart') + '</span>', () => { ref.close(); doRestart(); }));
      },
    });
  }

  // ---------- tools ----------

  function doUndo() {
    if (!game.history.length) return;
    if (mode === 'duel') { if (game.undo()) { A.drop(); updateHUD(); } return; }
    if (undosLeft > 0) {
      if (game.undo()) { undosLeft--; A.drop(); persistPlay(); updateHUD(); if (game.tutorial) tutorialStep(); }
      return;
    }
    offer({
      title: t('undoOutTitle'), body: t('undoOutBody'), price: S.PRICES.undo5,
      grant() { undosLeft += 5; updateHUD(); persistPlay(); toast('+5 ' + t('undo')); },
    });
  }

  function doRestart() {
    game.restart();
    undosLeft = Math.max(undosLeft, S.REWARDS.undosPerLevel);
    A.drop();
    persistPlay();
    updateHUD();
    if (game.tutorial) setTimeout(tutorialStep, 50);
  }

  function addTubeNow() {
    if (game.addTube()) { A.complete(); toast(t('tubeAdded')); persistPlay(); updateHUD(); }
  }
  function doTube() {
    if (game.won) return;
    if (game.extraUsed) { toast(t('tubeUsed')); A.deny(); return; }
    if (S.data.inv.tube > 0) { S.data.inv.tube--; S.save(); addTubeNow(); return; }
    offer({ title: t('tubeTitle'), body: t('tubeBody'), price: S.PRICES.tube, grant: addTubeNow });
  }

  function doHint() {
    if (game.won) return;
    const mv = game.findHint();
    if (!mv) { toast(t('deadEnd')); A.deny(); return; }
    const show = () => { game.showHint(game.findHint() || mv); A.pick(); updateHUD(); };
    if (S.data.inv.hint > 0) { S.data.inv.hint--; S.save(); show(); return; }
    offer({ title: t('hintTitle'), body: t('hintBody'), price: S.PRICES.hint, grant: show });
  }

  // ---------- home ----------

  let hideTimer = null;
  function showHome() {
    clearTimeout(hideTimer);
    hideBubble();
    el.home.hidden = false;
    el.home.classList.remove('leaving');
    el.app.dataset.home = '1';
    sceneNow();
    renderHome();
    heroRunning = true;
    requestAnimationFrame(heroLoop);
  }
  function hideHome() {
    if (el.home.hidden) return;
    el.home.classList.add('leaving');
    delete el.app.dataset.home;
    sceneNow();
    heroRunning = false;
    hideTimer = setTimeout(() => { el.home.hidden = true; el.home.classList.remove('leaving'); }, 250);
  }

  // A short stretch of the level path: last finished level, the current one, and the next locked ones.
  function renderRoad() {
    if (!el.road) return;
    const cur = S.data.level;
    const nums = [cur - 1, cur, cur + 1, cur + 2].filter(n => n >= 1);
    el.road.innerHTML = '';
    nums.forEach((n, i) => {
      if (i) {
        const dots = document.createElement('span');
        dots.className = 'road-dots' + (n <= cur ? ' lit' : '');
        el.road.appendChild(dots);
      }
      const node = document.createElement('span');
      const boss = n % 10 === 0 && n >= 10;
      node.className = 'road-node ' + (n < cur ? 'done' : n === cur ? 'cur' : 'lock') + (boss ? ' boss' : '');
      const stars = S.data.stars[n] || 0;
      node.innerHTML = '<b class="num">' + n + '</b>' + (n < cur ? '<i class="st">' + '★'.repeat(stars) + '</i>' : '');
      el.road.appendChild(node);
    });
  }

  function renderHome() {
    const words = t('appName').split(' ');
    const title = words.length > 1 ? words[0] + '\n' + words.slice(1).join(' ') : words[0];
    el.logo.textContent = title;
    el.logo.dataset.text = title;
    requestAnimationFrame(alignHome);
    el.playLevel.textContent = t('level', { n: S.data.level });
    const done = S.data.daily.doneDate === S.today();
    renderRoad();
    el.homeStars.textContent = Object.values(S.data.stars).reduce((a, b) => a + b, 0);
    el.dailyBadge.hidden = done;
    const w = S.wheelState();
    el.wheelBadge.hidden = !w.free;
    el.giftDot.hidden = !S.giftState().available;
    updateCoins();
  }

  // little animated tubes on the home screen
  let heroRunning = false, heroCtx = null;
  // Start screen: the background photo is scaled so its glowing platform sits under the stage,
  // and five tube characters stand on it, bobbing, blinking and now and then hopping.
  const BG = { w: 940, h: 1672, px: 470, py: 1042, rx: 320 };
  let homeFit = null;
  function alignHome() {
    const box = el.homeInner, bgEl = el.homeBg;
    if (!box || !box.clientWidth) return;
    const W = box.clientWidth, H = box.clientHeight;
    const F = el.stage.offsetTop + el.stage.offsetHeight;
    const s = Math.max(W / BG.w, H / BG.h, F / BG.py, (H - F) / (BG.h - BG.py));
    const ox = W / 2 - BG.px * s, oy = F - BG.py * s;
    bgEl.style.backgroundSize = BG.w * s + 'px ' + BG.h * s + 'px';
    bgEl.style.backgroundPosition = ox + 'px ' + oy + 'px';
    homeFit = { s, floor: F, cx: W / 2, rx: BG.rx * s, top: el.stage.offsetTop };
  }

  const CHARS = [
    { dx: -2.45, a: -0.2, k: 0.8, layers: [7, 7, 7, 7], mood: 'smile' },
    { dx: -1.3, a: -0.09, k: 0.9, layers: [3, 3, 4, 4], mood: 'laugh' },
    { dx: 0, a: 0, k: 1.12, layers: [5, 2, 8, 8], mood: 'happy' },
    { dx: 1.3, a: 0.09, k: 0.9, layers: [6, 6, 6, 6], mood: 'laugh' },
    { dx: 2.45, a: 0.2, k: 0.8, layers: [1, 1, 2, 1], mood: 'smile' },
  ];

  function drawFace(ctx, W, mood, blink) {
    const ink = '#24123F', ex = W * 0.2, ey = 0;
    const eye = sx => {
      if (blink || mood === 'laugh') {
        ctx.strokeStyle = ink; ctx.lineWidth = W * 0.07; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(sx, ey + W * 0.03, W * 0.09, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(sx, ey, W * 0.13, W * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(sx, ey + W * 0.015, W * 0.1, W * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7A4CFF';
      ctx.beginPath(); ctx.ellipse(sx, ey + W * 0.06, W * 0.07, W * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(sx + W * 0.04, ey - W * 0.045, W * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx - W * 0.035, ey + W * 0.05, W * 0.018, 0, Math.PI * 2); ctx.fill();
    };
    eye(-ex); eye(ex);
    ctx.fillStyle = 'rgba(255,110,160,0.6)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * W * 0.34, ey + W * 0.19, W * 0.09, W * 0.055, 0, 0, Math.PI * 2); ctx.fill(); }
    if (mood === 'happy' || mood === 'laugh') {
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.moveTo(-W * 0.13, ey + W * 0.16); ctx.quadraticCurveTo(0, ey + W * 0.42, W * 0.13, ey + W * 0.16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF6B8F';
      ctx.beginPath(); ctx.ellipse(0, ey + W * 0.27, W * 0.065, W * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = ink; ctx.lineWidth = W * 0.055; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, ey + W * 0.12, W * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  }

  function drawHero(once) {
    const c = el.hero;
    if (!c || el.home.hidden) return;
    const r = { width: c.clientWidth, height: c.clientHeight };
    if (!r.width) return;
    if (!homeFit) alignHome();
    if (!homeFit) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    heroCtx = heroCtx || c.getContext('2d');
    const ctx = heroCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const skin = S.data.equip.tube;
    const g = R.geometry(skin, 4);
    const avail = homeFit.floor - homeFit.top;
    const W = Math.max(14, Math.min(homeFit.rx * 2 / 6.3, r.width / 6.9, 50, avail / (g.H * 1.12 + 0.9)));
    const now = once ? 0 : performance.now();
    const theme = game ? game.theme : {};
    const style = { skin, liquid: S.data.equip.liquid, symbols: false, theme, time: now };
    const floor = homeFit.floor - W * 0.1, cx = homeFit.cx;

    // coloured glow pools on the platform
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CHARS.forEach(ch => {
      const col = R.liquidColor(style, ch.layers[0]);
      const x = cx + ch.dx * W;
      const gl = ctx.createRadialGradient(x, floor, 0, x, floor, W * 1.3);
      gl.addColorStop(0, col + '88'); gl.addColorStop(1, col + '00');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.ellipse(x, floor, W * 1.3, W * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // draw the outer pairs first so the middle one overlaps them
    const hopCycle = 5200, hopWho = Math.floor(now / hopCycle) % CHARS.length, hopK = (now % hopCycle) / 600;
    [0, 4, 1, 3, 2].forEach(i => {
      const ch = CHARS[i];
      const Wi = W * ch.k;
      const hop = i === hopWho && hopK < 1 ? Math.sin(hopK * Math.PI) * W * 0.5 : 0;
      const bob = Math.sin(now / 650 + i * 1.4) * W * 0.05;
      const sway = ch.a + Math.sin(now / 900 + i) * 0.025;
      const bx = cx + ch.dx * W, by = floor - hop + bob;
      const HW = g.H * Wi;
      const px = bx + Math.sin(sway) * HW, py = by - Math.cos(sway) * HW;
      R.drawTube(ctx, { id: 20 + i, x: px, y: py, angle: sway, W: Wi, layers: ch.layers.map(c2 => ({ c: c2, amt: 1, hidden: false })), complete: false, shadow: false, rigid: true }, g, style);
      const fy = HW * 0.6;
      ctx.save();
      ctx.translate(px - Math.sin(sway) * fy, py + Math.cos(sway) * fy);
      ctx.rotate(sway);
      const blink = !once && ((now / 1000 + i * 0.83) % 3.6) < 0.13;
      drawFace(ctx, Wi, i === 2 && hop > 0 ? 'happy' : ch.mood, blink);
      ctx.restore();
    });
  }
  function heroLoop() {
    if (!heroRunning) return;
    drawHero(false);
    requestAnimationFrame(heroLoop);
  }

  // ---------- daily gift ----------

  function openGift(auto) {
    const gs = S.giftState();
    if (auto && !gs.available) return;
    sheet({
      title: t('giftTitle'),
      build(body, ref) {
        const p = document.createElement('p');
        p.textContent = t('giftBody');
        body.appendChild(p);
        const grid = document.createElement('div');
        grid.className = 'days';
        S.REWARDS.gift.forEach((amt, i) => {
          const d = i + 1;
          const cell = document.createElement('div');
          let cls = 'day';
          if (d === 7) cls += ' big';
          if (gs.available ? d < gs.day : d <= gs.day) cls += ' done';
          if (gs.available && d === gs.day) cls += ' today';
          cell.className = cls;
          cell.innerHTML = '<small>' + t('day', { n: d }) + '</small>' + coin('sm') + '<span class="num">' + amt + '</span>';
          grid.appendChild(cell);
        });
        body.appendChild(grid);
        if (gs.available) {
          const amt = S.REWARDS.gift[gs.day - 1];
          body.appendChild(button('btn-video', videoTag + '<span>' + t('watchX', { n: 2 }) + '</span><span class="sub num">+' + amt * 2 + '</span>', async () => {
            if (await watchAd()) { const got = S.claimGift(2); finishGift(ref, got); }
          }));
          body.appendChild(button('btn-primary', '<span>' + t('claim') + '</span><span class="sub num">+' + amt + '</span>', () => finishGift(ref, S.claimGift(1))));
        } else {
          const n = document.createElement('p');
          n.className = 'center';
          n.textContent = t('giftTomorrow', { n: gs.next });
          body.appendChild(n);
        }
      },
    });
  }
  function finishGift(ref, got) {
    if (!got) return;
    A.coin();
    updateCoins();
    toast(t('gotCoins', { n: got }));
    ref.close();
    renderHome();
  }

  // ---------- lucky wheel ----------

  const WHEEL = [
    { kind: 'coins', n: 20, w: 22 }, { kind: 'coins', n: 50, w: 20 }, { kind: 'hint', n: 1, w: 12 }, { kind: 'coins', n: 100, w: 14 },
    { kind: 'tube', n: 1, w: 8 }, { kind: 'coins', n: 30, w: 14 }, { kind: 'coins', n: 200, w: 7 }, { kind: 'coins', n: 500, w: 3 },
  ];
  const WHEEL_COLORS = ['#FF5FA2', '#FFB21E', '#7C5CFF', '#2ECBE9', '#3DD27A', '#FF8C32', '#3B6EF5', '#F2445C'];

  function prizeLabel(p) {
    return p.kind === 'coins' ? t('prize_coins', { n: p.n }) : t('prize_' + p.kind);
  }

  function openWheel() {
    sheet({
      title: t('wheelTitle'),
      build(body) {
        const wrap = document.createElement('div');
        wrap.className = 'wheel-wrap';
        wrap.innerHTML = '<canvas></canvas><svg class="wheel-pin" viewBox="0 0 34 40"><path d="M17 38L4 12a13 13 0 1 1 26 0z" fill="#FFFFFF" stroke="#33264F" stroke-width="3"/><circle cx="17" cy="13" r="5" fill="#FF5FA2"/></svg>';
        body.appendChild(wrap);
        const res = document.createElement('div');
        res.className = 'wheel-result';
        body.appendChild(res);
        const btnBox = document.createElement('div');
        btnBox.style.display = 'flex'; btnBox.style.flexDirection = 'column'; btnBox.style.gap = '10px';
        body.appendChild(btnBox);
        const note = document.createElement('p');
        note.className = 'center';
        body.appendChild(note);
        const canvas = wrap.querySelector('canvas');
        let rot = 0, spinning = false;
        const seg = (Math.PI * 2) / WHEEL.length;

        function draw() {
          const r = { width: canvas.clientWidth, height: canvas.clientHeight };
          if (!r.width) return;
          const dpr = Math.min(window.devicePixelRatio || 1, 3);
          canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
          const ctx = canvas.getContext('2d');
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const cx = r.width / 2, cy = r.height / 2, rad = r.width / 2 - 6;
          ctx.clearRect(0, 0, r.width, r.height);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          WHEEL.forEach((p, i) => {
            const a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, a0, a1); ctx.closePath();
            ctx.fillStyle = WHEEL_COLORS[i]; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.save();
            ctx.rotate(a0 + seg / 2);
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 3;
            if (p.kind === 'coins') {
              ctx.font = '800 ' + Math.round(rad * 0.15) + 'px "Baloo Bhaijaan 2", system-ui, sans-serif';
              ctx.fillText(String(p.n), rad - 14, 2);
              ctx.beginPath(); ctx.arc(rad * 0.38, 0, rad * 0.06, 0, Math.PI * 2); ctx.fillStyle = '#FFD84D'; ctx.fill();
            } else {
              ctx.font = '800 ' + Math.round(rad * 0.1) + 'px "Baloo Bhaijaan 2", system-ui, sans-serif';
              ctx.fillText(p.kind === 'hint' ? t('hint') : t('addTube'), rad - 14, 2);
            }
            ctx.restore();
          });
          ctx.restore();
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, rad * 0.14, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF'; ctx.fill();
          ctx.beginPath(); ctx.arc(cx, cy, rad * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = '#FFB21E'; ctx.fill();
        }

        function pickPrize() {
          const total = WHEEL.reduce((s, p) => s + p.w, 0);
          let x = Math.random() * total;
          for (let i = 0; i < WHEEL.length; i++) { x -= WHEEL[i].w; if (x < 0) return i; }
          return 0;
        }

        function spin(kind) {
          if (spinning) return;
          spinning = true;
          S.useWheel(kind);
          renderButtons();
          res.textContent = '';
          const idx = pickPrize();
          const twoPi = Math.PI * 2;
          const target = -((idx + 0.5) * seg) + (Math.random() - 0.5) * seg * 0.6;
          const base = rot - (rot % twoPi);
          const end = base + twoPi * 6 + ((target % twoPi) + twoPi) % twoPi;
          const start = rot, dur = 4200, t0 = performance.now();
          let lastSeg = Math.floor(rot / seg);
          const step = now => {
            const k = Math.min(1, (now - t0) / dur);
            rot = start + (end - start) * (1 - Math.pow(1 - k, 4));
            const sNow = Math.floor(rot / seg);
            if (sNow !== lastSeg) { lastSeg = sNow; A.tick(); }
            draw();
            if (k < 1) requestAnimationFrame(step);
            else {
              spinning = false;
              const p = WHEEL[idx];
              if (p.kind === 'coins') S.addCoins(p.n);
              else { S.data.inv[p.kind] += p.n; S.save(); }
              A.complete();
              haptic(30);
              res.textContent = t('youWon', { x: prizeLabel(p) });
              updateCoins();
              renderHome();
              renderButtons();
            }
          };
          requestAnimationFrame(step);
        }

        function renderButtons() {
          btnBox.innerHTML = '';
          const ws = S.wheelState();
          if (ws.free) btnBox.appendChild(button('btn-primary', '<span>' + t('spinFree') + '</span>', () => spin('free')));
          else if (ws.adLeft > 0) btnBox.appendChild(button('btn-video', videoTag + '<span>' + t('spinVideo') + '</span>', async () => { if (!spinning && await watchAd()) spin('ad'); }));
          note.textContent = ws.free ? '' : ws.adLeft > 0 ? t('spinsLeft', { n: ws.adLeft }) : t('wheelTomorrow');
          btnBox.querySelectorAll('button').forEach(b => { b.disabled = spinning; });
        }

        requestAnimationFrame(draw);
        renderButtons();
      },
    });
  }

  // ---------- shop ----------

  const BOOSTERS = [{ id: 'hint', price: S.PRICES.hint }, { id: 'tube', price: S.PRICES.tube }];
  const FX_ICON = { confetti: ICON.confetti, hearts: ICON.heart, stars: ICON.star, fireworks: ICON.spark };
  const FX_BG = { confetti: 'linear-gradient(135deg,#FFB21E,#FF5FA2)', hearts: 'linear-gradient(135deg,#FF7EB9,#F2445C)', stars: 'linear-gradient(135deg,#FFD23F,#FF8C32)', fireworks: 'linear-gradient(135deg,#3B6EF5,#8E4FE8)' };

  function previewTube(canvas, skin, liquid) {
    requestAnimationFrame(() => {
      const r = { width: canvas.clientWidth, height: canvas.clientHeight };
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = R.geometry(skin, 4);
      const W = Math.min(r.height / (g.H + 0.9), 30);
      const style = { skin, liquid, symbols: false, theme: game.theme, time: 900 };
      const sets = [[0, 6, 2, 7], [3, 3, 4, 4]];
      sets.forEach((L, i) => {
        R.drawTube(ctx, { id: i, x: r.width / 2 + (i - 0.5) * W * 1.7, y: W * 0.55, angle: 0, W, layers: L.map(c => ({ c, amt: 1, hidden: false })), complete: false }, g, style);
      });
    });
  }

  function openShop(tab) {
    tab = tab || 'tube';
    sheet({
      title: t('shopTitle'), cls: 'tall',
      build(body, ref) {
        const sheetEl = ref.el.querySelector('.sheet');
        const head = sheetEl.querySelector('.sheet-head');
        const pill = document.createElement('div');
        pill.className = 'coins';
        pill.innerHTML = coin() + '<span class="num" data-coins>' + S.data.coins + '</span>';
        head.insertBefore(pill, head.querySelector('.x'));
        const tabs = document.createElement('div');
        tabs.className = 'tabs';
        tabs.setAttribute('role', 'tablist');
        sheetEl.insertBefore(tabs, body);

        const free = document.createElement('div');
        free.className = 'free-card';
        const items = document.createElement('div');
        items.className = 'items';
        body.appendChild(free);
        body.appendChild(items);

        function renderFree() {
          const left = S.freeCoinsLeft();
          free.innerHTML = coin() + '<div class="tx"><b>' + t('freeCoins') + '</b><small>' + (left ? t('freeCoinsBody', { n: S.REWARDS.freeCoins, left }) : t('freeCoinsDone')) + '</small></div>';
          const b = button('btn-video', videoTag + '<span class="num">+' + S.REWARDS.freeCoins + '</span>', async () => {
            if (S.freeCoinsLeft() <= 0) return;
            if (await watchAd()) { S.useFreeCoins(); A.coin(); updateCoins(); renderFree(); }
          });
          b.disabled = !left;
          free.appendChild(b);
        }

        function renderTabs() {
          tabs.innerHTML = '';
          ['tube', 'liquid', 'bg', 'fx', 'boost'].forEach(id => {
            const b = document.createElement('button');
            b.className = 'tab' + (id === tab ? ' on' : '');
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', String(id === tab));
            b.textContent = t('tab_' + id);
            b.addEventListener('click', () => { A.tap(); tab = id; renderTabs(); renderItems(); });
            tabs.appendChild(b);
          });
        }

        function actionBtn(cls, html, fn) {
          const b = document.createElement('button');
          b.className = 'act ' + cls;
          b.innerHTML = html;
          b.addEventListener('click', fn);
          return b;
        }

        function renderItems() {
          items.innerHTML = '';
          if (tab === 'boost') {
            BOOSTERS.forEach(bo => {
              const card = document.createElement('div');
              card.className = 'item';
              card.innerHTML = '<div class="pv" style="background:' + (bo.id === 'hint' ? 'linear-gradient(135deg,#FFD23F,#FF8C32)' : 'linear-gradient(135deg,#2ECBE9,#3B6EF5)') + ';color:#fff">' + (bo.id === 'hint' ? ICON.bulb : ICON.tube).replace('<svg', '<svg width="44" height="44"') + '</div><b>' + t('item_' + bo.id) + '</b><small class="num">' + t('have', { n: S.data.inv[bo.id] }) + '</small>';
              card.appendChild(actionBtn('buy', coin('sm') + '<span class="num">' + bo.price + '</span>', () => {
                if (!S.spend(bo.price)) { toast(t('notEnough')); A.deny(); return; }
                S.data.inv[bo.id]++; S.save(); A.coin(); updateCoins(); updateHUD(); renderItems();
              }));
              items.appendChild(card);
            });
            return;
          }
          S.CATALOG[tab].forEach(it => {
            const card = document.createElement('div');
            const owned = S.owns(tab, it.id), on = S.data.equip[tab] === it.id;
            card.className = 'item' + (on ? ' equipped' : '');
            const pv = document.createElement('div');
            pv.className = 'pv';
            if (tab === 'tube' || tab === 'liquid') {
              const c = document.createElement('canvas');
              pv.appendChild(c);
              pv.style.background = 'var(--surface)';
              previewTube(c, tab === 'tube' ? it.id : S.data.equip.tube, tab === 'liquid' ? it.id : S.data.equip.liquid);
            } else if (tab === 'bg') {
              const c = document.createElement('canvas');
              pv.appendChild(c);
              requestAnimationFrame(() => CP.Scene.thumb(c, it.id, isNight()));
            } else {
              pv.style.background = FX_BG[it.id];
              pv.style.color = '#fff';
              pv.innerHTML = FX_ICON[it.id].replace('<svg', '<svg width="44" height="44"');
            }
            card.appendChild(pv);
            const name = document.createElement('b');
            name.textContent = t('item_' + it.id);
            card.appendChild(name);
            if (on) card.appendChild(actionBtn('inuse', t('inUse'), () => {}));
            else if (owned) card.appendChild(actionBtn('use', t('use'), () => { A.tap(); S.equip(tab, it.id); applyStyle(); renderItems(); }));
            else card.appendChild(actionBtn('buy', coin('sm') + '<span class="num">' + it.price + '</span>', () => {
              if (!S.buy(tab, it.id)) { toast(t('notEnough')); A.deny(); return; }
              A.complete(); haptic(25); toast(t('bought')); updateCoins(); applyStyle(); renderItems();
            }));
            items.appendChild(card);
          });
        }

        renderFree();
        renderTabs();
        renderItems();
      },
    });
  }

  // ---------- levels ----------

  function openLevels() {
    sheet({
      title: t('levelsTitle'), cls: 'tall',
      build(body, ref) {
        const grid = document.createElement('div');
        grid.className = 'lvl-grid';
        const cur = S.data.level;
        for (let n = 1; n <= cur + 6; n++) {
          const b = document.createElement('button');
          const locked = n > cur;
          b.className = 'lvl' + (n === cur ? ' cur' : '') + (locked ? ' locked' : '') + (n % 10 === 0 && n >= 10 ? ' boss' : '');
          if (locked) b.innerHTML = ICON.lock;
          else {
            const st = S.data.stars[n] || 0;
            b.innerHTML = '<span class="num">' + n + '</span>' + (n < cur ? '<span class="st">' + [0, 1, 2].map(i => ICON.star.replace('<svg', '<svg class="' + (i < st ? 'on' : '') + '"')).join('') + '</span>' : '');
            b.addEventListener('click', () => { A.tap(); ref.close(); startLevel(n); });
          }
          b.setAttribute('aria-label', t('level', { n }));
          grid.appendChild(b);
        }
        body.appendChild(grid);
        requestAnimationFrame(() => { const c = grid.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'center' }); });
      },
    });
  }

  // ---------- settings ----------

  function openSettings() {
    sheet({
      title: t('settingsTitle'),
      build(body, ref) {
        const d = S.data;
        function row(label, hint, control) {
          const r = document.createElement('div');
          r.className = 'set-row';
          const lab = document.createElement('div');
          lab.className = 'lab';
          lab.innerHTML = '<b></b>' + (hint ? '<small></small>' : '');
          lab.querySelector('b').textContent = label;
          if (hint) lab.querySelector('small').textContent = hint;
          r.appendChild(lab);
          r.appendChild(control);
          body.appendChild(r);
        }
        function seg(options, value, onPick) {
          const s = document.createElement('div');
          s.className = 'seg';
          options.forEach(([v, label]) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.className = v === value ? 'on' : '';
            b.addEventListener('click', () => { A.tap(); onPick(v); });
            s.appendChild(b);
          });
          return s;
        }
        function sw(key, onChange) {
          const b = document.createElement('button');
          b.className = 'switch';
          b.setAttribute('role', 'switch');
          b.setAttribute('aria-checked', String(!!d[key]));
          b.setAttribute('aria-label', t(key));
          b.addEventListener('click', () => {
            d[key] = !d[key];
            b.setAttribute('aria-checked', String(d[key]));
            S.save();
            onChange(d[key]);
            A.tap();
          });
          return b;
        }
        row(t('language'), '', seg([['ar', 'العربية'], ['en', 'English']], d.lang, v => {
          d.lang = v; S.save(); I18n.setLang(v); updateHUD(); renderHome(); openSettings();
        }));
        row(t('theme'), '', seg([['auto', t('themeAuto')], ['light', t('themeLight')], ['dark', t('themeDark')]], d.theme, v => {
          d.theme = v; S.save(); applyTheme(); openSettings();
        }));
        body.appendChild(Object.assign(document.createElement('div'), { className: 'divider' }));
        row(t('sound'), '', sw('sound', v => A.setSound(v)));
        row(t('music'), '', sw('music', v => A.setMusic(v)));
        row(t('haptics'), '', sw('haptics', v => { if (v) haptic(20); }));
        row(t('symbols'), t('symbolsHint'), sw('symbols', () => applyStyle()));

        const acct = document.createElement('div');
        acct.className = 'acct';
        acct.innerHTML = '<b></b><p></p>';
        acct.querySelector('b').textContent = t('account');
        acct.querySelector('p').textContent = t('accountBody');
        [['g', 'withGoogle'], ['f', 'withFacebook'], ['mail', 'withEmail']].forEach(([ic, key]) => {
          acct.appendChild(button('', ICON[ic] + '<span>' + t(key) + '</span><span class="soon">' + t('soon') + '</span>', () => toast(t('soonToast'))));
        });
        body.appendChild(acct);

        let armed = false;
        const reset = button('danger', '<span>' + t('reset') + '</span>', (e, b) => {
          if (!armed) { armed = true; b.querySelector('span').textContent = t('resetConfirm'); setTimeout(() => { armed = false; if (b.isConnected) b.querySelector('span').textContent = t('reset'); }, 3500); return; }
          S.reset();
          I18n.setLang(S.data.lang);
          applyTheme(); applyStyle();
          ref.close();
          toast(t('resetDone'));
          showHome();
        });
        body.appendChild(reset);
      },
    });
  }

  // ---------- boot ----------

  function init(hotData) {
    S.load(hotData && hotData.save);
    const d = S.data;
    if (!d.lang) { d.lang = I18n.guess(); S.save(); }
    I18n.setLang(d.lang);
    A.setSound(d.sound);

    el = {
      app: $('#app'), canvas: $('#board'), topbar: $('.topbar'), toolbar: $('.toolbar'),
      levelTitle: $('#level-title'), levelTag: $('#level-tag'), moves: $('#moves'),
      btnUndo: $('#btn-undo'), btnTube: $('#btn-tube'), btnHint: $('#btn-hint'), btnEmote: $('#btn-emote'),
      undoCount: $('#btn-undo .count'), tubeCount: $('#btn-tube .count'), hintCount: $('#btn-hint .count'),
      home: $('#home'), hero: $('#hero'), logo: $('.logo'), homeInner: $('#home .home-inner'), homeBg: $('#home-bg'), stage: $('#stage'), playLevel: $('#play-level'),
      road: $('#road'), homeStars: $('#home-stars'), dailyBadge: $('#daily-badge'), wheelBadge: $('#wheel-badge'), giftDot: $('#gift-dot'),
      bubble: $('#bubble'), toast: $('#toast'),
    };
    document.querySelectorAll('[data-icon]').forEach(n => { n.insertAdjacentHTML('afterbegin', ICON[n.dataset.icon]); });

    CP.Scene.init($('#scene'));
    game = new CP.Game(el.canvas, {
      onChange() { updateHUD(); persistPlay(); if (mode === 'duel') CP.Duel.onChange(game); },
      onSettle() { if (game.tutorial) tutorialStep(); },
      onSelect() { if (game.tutorial) tutorialStep(); else if (!el.bubble.hidden && game.moves() > 0) hideBubble(); },
      onWin, onStuck,
      onFirstInput() { A.unlock(); },
      haptic,
      sfx: { pick: A.pick, drop: A.drop, deny: A.deny, pour: A.pour, complete: A.complete, boom: A.boom },
    });
    applyTheme();
    applyStyle();

    const ro = new ResizeObserver(() => { measure(); alignHome(); drawHero(true); });
    ro.observe(el.app);
    ro.observe(el.topbar);
    ro.observe(el.homeInner);

    CP.Map.init({
      toast, haptic,
      startLevel: n => startLevel(n),
      home: () => renderHome(),
      refresh: () => { updateCoins(); renderHome(); updateHUD(); },
    });

    CP.Duel.init({
      sheet, button, toast, coin, ICON, haptic,
      startBoard(lvl, round) {
        mode = 'duel'; level = lvl; levelNum = round; undosLeft = 0;
        game.load(lvl, null);
        game.tutorial = false;
        hideBubble();
        hideHome();
        updateHUD();
      },
      lock(on) { game.locked = on; if (on) game.selected = -1; },
      addCoins(n) { S.addCoins(n); A.coin(); updateCoins(); },
      exitDuel() {
        game.locked = false;
        begin('level', S.data.level, true);
        showHome();
      },
    });
    measure();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const rethemeSoon = () => requestAnimationFrame(retheme);
    if (mq.addEventListener) mq.addEventListener('change', rethemeSoon);
    new MutationObserver(rethemeSoon).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

    const unlockOnce = () => { A.unlock(); A.setMusic(S.data.music); window.removeEventListener('pointerdown', unlockOnce, true); };
    window.addEventListener('pointerdown', unlockOnce, true);

    const on = (id, fn) => $(id).addEventListener('click', e => { A.tap(); fn(e); });
    on('#btn-home', () => { if (CP.Duel.isActive()) CP.Duel.leave(); else showHome(); });
    $('#btn-emote').addEventListener('click', () => CP.Duel.togglePanel());
    on('#btn-settings', openSettings);
    on('#home-settings', openSettings);
    on('#btn-restart', doRestart);
    $('#btn-undo').addEventListener('click', doUndo);
    $('#btn-tube').addEventListener('click', doTube);
    $('#btn-hint').addEventListener('click', doHint);
    on('#coins-pill', () => openShop('boost'));
    on('#home-coins', () => openShop('boost'));
    on('#home-avatar', openSettings);
    on('#home-stars-pill', () => CP.Map.open());
    on('#tab-home', () => { el.home.querySelector('.logo-frame').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 350 }); });
    on('#play-btn', () => startLevel(S.data.level));
    on('#tile-daily', () => {
      if (S.data.daily.doneDate === S.today()) {
        const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
        toast(t('dailyNew', { h: Math.max(1, Math.ceil((mid - now) / 3600000)) }));
      } else startDaily();
    });
    on('#tile-wheel', openWheel);
    on('#tile-shop', () => openShop('tube'));
    on('#tile-levels', () => CP.Map.open());
    on('#tile-friends', () => CP.Duel.open());
    on('#gift-btn', () => openGift(false));

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && openSheetRef && openSheetRef.closable) openSheetRef.close();
    });

    // Prepare the board behind the home screen so "Play" is instant.
    begin('level', d.level, true);
    showHome();
    if (S.giftState().available) setTimeout(() => { if (!openSheetRef) openGift(true); }, 700);
  }

  CP.UI = { init, toast, snapshot: () => ({ save: S.data }), debug: { game: () => game, startLevel, startDaily, showHome, openShop, openWheel, openSettings, openGift } };
})(this);
