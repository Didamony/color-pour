// Two browser pages race each other through the local transport (#localduel) and trade emotes.
const { chromium } = require('playwright');
const OUT = __dirname + '/shots';
const BASE = 'http://127.0.0.1:8765/index.html#localduel';
const wait = ms => new Promise(r => setTimeout(r, ms));

async function tapTube(page, i) {
  const pt = await page.evaluate(i => { const g = CP.UI.debug.game(), v = g.vis[i]; return { x: v.homeX, y: v.homeY + g.geo.H * v.W * 0.5 }; }, i);
  await page.mouse.click(pt.x, pt.y);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mk = async (name, scheme, lang) => {
    const p = await ctx.newPage();
    await p.emulateMedia({ colorScheme: scheme });
    p.on('pageerror', e => errors.push(name + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await p.addInitScript(l => { try { localStorage.setItem('colorpour.save.v1', JSON.stringify({ lang: l, gift: { last: new Date().toISOString().slice(0, 10), day: 1 } })); } catch (e) {} }, lang);
    await p.goto(BASE);
    await wait(900);
    const x = await p.$('.modal-root .x'); if (x) await x.click();
    await wait(300);
    return p;
  };
  const A = await mk('A', 'light', 'ar');
  const B = await mk('B', 'dark', 'en');

  await A.click('#tile-friends'); await wait(400);
  await A.screenshot({ path: OUT + '/duel-1-entry.png' });
  await A.click('.modal-root .btn-primary'); await wait(800);
  const code = (await A.textContent('.code-box .code')).trim();
  console.log('code', code);
  await A.screenshot({ path: OUT + '/duel-2-lobby-wait.png' });

  await B.click('#tile-friends'); await wait(400);
  await B.fill('#duel-code', code);
  await B.click('.join-row button'); await wait(1500);
  await A.screenshot({ path: OUT + '/duel-3-lobby-both.png' });

  await A.click('.emote-row button'); await wait(300);
  await A.click('.modal-root .btn-primary'); await wait(300);
  await B.click('.modal-root .btn-primary'); await wait(1000);
  await B.screenshot({ path: OUT + '/duel-4-countdown.png' });
  await wait(2400);

  // B makes two moves, sends an emote and a message
  const pathB = await B.evaluate(() => { const g = CP.UI.debug.game(); return CP.Engine.solve(g.tubes, g.cap, 300000).path; });
  for (const [a, b] of pathB.slice(0, 3)) { await tapTube(B, a); await wait(100); await tapTube(B, b); await wait(1000); }
  await B.click('#btn-emote'); await wait(300);
  await B.screenshot({ path: OUT + '/duel-5-panel.png' });
  await B.click('.ep-grid button'); await wait(800);
  await B.click('#btn-emote'); await wait(200);
  await B.fill('#duel-msg', 'Catch me if you can!');
  await B.click('.ep-form button'); await wait(500);
  await A.screenshot({ path: OUT + '/duel-6-A-sees-emote.png' });

  // A solves the whole level and should win
  const pathA = await A.evaluate(() => { const g = CP.UI.debug.game(); return CP.Engine.solve(g.tubes, g.cap, 300000).path; });
  for (const [a, b] of pathA) { await tapTube(A, a); await wait(90); await tapTube(A, b); await wait(950); }
  await wait(2200);
  await A.screenshot({ path: OUT + '/duel-7-A-result.png' });
  await B.screenshot({ path: OUT + '/duel-8-B-result.png' });
  const res = await Promise.all([A, B].map(p => p.evaluate(() => ({ phase: CP.Duel.phase, title: document.querySelector('.modal-root h2') && document.querySelector('.modal-root h2').textContent, coins: CP.Store.data.coins }))));
  console.log('A', JSON.stringify(res[0]), 'B', JSON.stringify(res[1]));

  // rematch
  await B.click('.modal-root .btn-primary'); await wait(600);
  await A.screenshot({ path: OUT + '/duel-9-A-rematch-hint.png' });
  await A.click('.modal-root .btn-primary'); await wait(3600);
  console.log('round now', await A.evaluate(() => CP.Duel.round), await B.evaluate(() => CP.Duel.phase));
  await A.click('#btn-home'); await wait(1500);
  await B.screenshot({ path: OUT + '/duel-10-B-left.png' });
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'no errors');
})();
