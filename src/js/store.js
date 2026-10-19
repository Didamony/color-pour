// Save data, economy and shop catalogue. Saved locally now; a cloud account can sync this same object later.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};
  const KEY = 'colorpour.save.v1';

  const CATALOG = {
    tube: [
      { id: 'classic', price: 0 }, { id: 'glass', price: 400 }, { id: 'vial', price: 700 },
      { id: 'cup', price: 1000 }, { id: 'crystal', price: 1600 }, { id: 'golden', price: 2500 },
    ],
    liquid: [
      { id: 'juicy', price: 0 }, { id: 'pastel', price: 600 }, { id: 'glossy', price: 900 },
      { id: 'neon', price: 1500 }, { id: 'bubbles', price: 1800 }, { id: 'glitter', price: 2500 },
    ],
    bg: [
      { id: 'cloud', price: 0 }, { id: 'sky', price: 400 }, { id: 'mint', price: 600 }, { id: 'ocean', price: 900 },
      { id: 'sunset', price: 1200 }, { id: 'desert', price: 1500 }, { id: 'space', price: 2000 },
    ],
    fx: [
      { id: 'confetti', price: 0 }, { id: 'hearts', price: 600 }, { id: 'stars', price: 900 }, { id: 'fireworks', price: 1500 },
    ],
  };

  const PRICES = { hint: 60, tube: 150, undo5: 40 };
  const REWARDS = {
    gift: [50, 75, 100, 150, 200, 250, 400],
    levelBase: 10, perStar: 5, replay: 5,
    daily: 250, freeCoins: 60, freeCoinsPerDay: 5,
    wheelAdSpins: 3, undosPerLevel: 5,
  };

  function defaults() {
    return {
      v: 1, lang: null, theme: 'auto', sound: true, music: true, haptics: true, symbols: false,
      level: 1, stars: {}, coins: 120, inv: { hint: 3, tube: 1 },
      owned: { tube: ['classic'], liquid: ['juicy'], bg: ['cloud'], fx: ['confetti'] },
      equip: { tube: 'classic', liquid: 'juicy', bg: 'cloud', fx: 'confetti' },
      gift: { last: null, day: 0 },
      wheel: { freeDate: null, adDate: null, adCount: 0 },
      freeCoins: { date: null, count: 0 },
      daily: { doneDate: null },
      play: null,
      seen: {},
    };
  }

  let data = defaults();
  let timer = null;
  const listeners = [];

  function merge(base, saved) {
    for (const k in saved) {
      if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], saved[k]);
      else base[k] = saved[k];
    }
    return base;
  }

  function load(fallback) {
    let saved = null;
    try { const raw = localStorage.getItem(KEY); if (raw) saved = JSON.parse(raw); } catch (e) { saved = null; }
    if (!saved && fallback) saved = fallback;
    data = saved ? merge(defaults(), saved) : defaults();
    return data;
  }

  function save() {
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  }
  function flush() {
    clearTimeout(timer);
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: progress lives for this session only */ }
    listeners.forEach(fn => fn(data));
  }

  function reset() {
    const keep = { lang: data.lang, theme: data.theme, sound: data.sound, music: data.music, haptics: data.haptics };
    data = Object.assign(defaults(), keep);
    flush();
  }

  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function today() { return dateKey(); }
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); }

  function addCoins(n) { data.coins += n; save(); }
  function spend(n) {
    if (data.coins < n) return false;
    data.coins -= n; save(); return true;
  }

  // Daily gift: day 1..7, continues only on consecutive days.
  function giftState() {
    const t = today();
    if (data.gift.last === t) return { available: false, day: data.gift.day, next: (data.gift.day % 7) + 1 };
    const day = data.gift.last === yesterday() ? (data.gift.day % 7) + 1 : 1;
    return { available: true, day, next: day };
  }
  function claimGift(mult) {
    const g = giftState();
    if (!g.available) return 0;
    const amount = REWARDS.gift[g.day - 1] * (mult || 1);
    data.gift = { last: today(), day: g.day };
    addCoins(amount);
    return amount;
  }

  function wheelState() {
    const t = today();
    const free = data.wheel.freeDate !== t;
    const used = data.wheel.adDate === t ? data.wheel.adCount : 0;
    return { free, adLeft: Math.max(0, REWARDS.wheelAdSpins - used) };
  }
  function useWheel(kind) {
    const t = today();
    if (kind === 'free') data.wheel.freeDate = t;
    else {
      if (data.wheel.adDate !== t) { data.wheel.adDate = t; data.wheel.adCount = 0; }
      data.wheel.adCount++;
    }
    save();
  }

  function freeCoinsLeft() {
    return data.freeCoins.date === today() ? Math.max(0, REWARDS.freeCoinsPerDay - data.freeCoins.count) : REWARDS.freeCoinsPerDay;
  }
  function useFreeCoins() {
    const t = today();
    if (data.freeCoins.date !== t) data.freeCoins = { date: t, count: 0 };
    data.freeCoins.count++;
    addCoins(REWARDS.freeCoins);
  }

  function owns(cat, id) { return data.owned[cat].includes(id); }
  function buy(cat, id) {
    const item = CATALOG[cat].find(x => x.id === id);
    if (!item || owns(cat, id)) return false;
    if (!spend(item.price)) return false;
    data.owned[cat].push(id);
    data.equip[cat] = id;
    save();
    return true;
  }
  function equip(cat, id) { if (owns(cat, id)) { data.equip[cat] = id; save(); } }

  CP.Store = {
    CATALOG, PRICES, REWARDS,
    get data() { return data; },
    load, save, flush, reset, today, addCoins, spend,
    giftState, claimGift, wheelState, useWheel, freeCoinsLeft, useFreeCoins,
    owns, buy, equip, onSave(fn) { listeners.push(fn); },
  };
})(this);
