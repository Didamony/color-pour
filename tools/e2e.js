// Plays the built page in headless Chromium at phone size and saves screenshots.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/www/index.html');
const OUT = path.resolve(__dirname, 'shots');
const wait = ms => new Promise(r => setTimeout(r, ms));

async function tapTube(page, i) {
  const pt = await page.evaluate(i => {
    const g = CP.UI.debug.game(), v = g.vis[i];
    return { x: v.homeX, y: v.homeY + g.geo.H * v.W * 0.5 };
  }, i);
  await page.mouse.click(pt.x, pt.y);
}

async function solveCurrent(page, shotAt) {
  const path = await page.evaluate(() => { const g = CP.UI.debug.game(); return CP.Engine.solve(g.tubes, g.cap, 300000).path; });
  for (let k = 0; k < path.length; k++) {
    const [a, b] = path[k];
    await tapTube(page, a); await wait(120);
    await tapTube(page, b);
    if (k === shotAt) { await wait(520); await page.screenshot({ path: OUT + '/pour.png' }); }
    await wait(900);
  }
  return path.length;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, locale: scheme === 'light' ? 'ar-EG' : 'en-US' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(scheme + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(scheme + ' console: ' + m.text()); });
    await page.goto(URL);
    await wait(1400);
    await page.screenshot({ path: `${OUT}/${scheme}-1-gift.png` });
    await page.click('.modal-root .btn-primary');
    await wait(500);
    await page.screenshot({ path: `${OUT}/${scheme}-2-home.png` });
    await page.click('#play-btn');
    await wait(700);
    await page.screenshot({ path: `${OUT}/${scheme}-3-level1.png` });
    const n = await solveCurrent(page, scheme === 'light' ? 1 : -1);
    await wait(1500);
    await page.screenshot({ path: `${OUT}/${scheme}-4-win.png` });
    await page.click('.modal-root .btn-primary');
    await wait(600);
    await solveCurrent(page, -1);
    await wait(1400);
    const winVisible = await page.$('.modal-root .stars');
    console.log(scheme, 'level1 moves', n, 'level2 win sheet', !!winVisible);
    await page.click('.modal-root .btn-primary');
    await wait(500);
    // a later level with hidden colors and the tube booster
    await page.evaluate(() => { CP.Store.data.level = 30; CP.UI.debug.startLevel(30); });
    await wait(800);
    await page.screenshot({ path: `${OUT}/${scheme}-5-level30.png` });
    await page.click('#btn-hint'); await wait(400);
    await page.click('#btn-tube'); await wait(700);
    await page.screenshot({ path: `${OUT}/${scheme}-6-boosters.png` });
    await page.evaluate(() => CP.UI.debug.openShop('tube')); await wait(700);
    await page.screenshot({ path: `${OUT}/${scheme}-7-shop.png` });
    await page.evaluate(() => CP.UI.debug.openWheel()); await wait(500);
    await page.click('.modal-root .btn-primary'); await wait(4800);
    await page.screenshot({ path: `${OUT}/${scheme}-8-wheel.png` });
    await page.evaluate(() => CP.UI.debug.openSettings()); await wait(500);
    await page.screenshot({ path: `${OUT}/${scheme}-9-settings.png` });
    if (scheme === 'dark') {
      await page.evaluate(() => { CP.Store.data.level = 75; CP.UI.debug.startLevel(74); });
      await wait(700);
      await page.screenshot({ path: `${OUT}/${scheme}-10-level74.png` });
      await page.evaluate(() => CP.UI.debug.openGift()); await wait(300);
      await page.click('.modal-root .x'); await wait(300);
      await page.click('#btn-tube'); await wait(300);
      await page.screenshot({ path: `${OUT}/${scheme}-11-offer.png` });
      await page.click('.modal-root .btn-video'); await wait(2000);
      await page.screenshot({ path: `${OUT}/${scheme}-12-ad.png` });
      await wait(3600);
      await page.click('.ad-overlay .get'); await wait(600);
      console.log('tube after ad', await page.evaluate(() => CP.UI.debug.game().extraUsed));
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(scheme, 'horizontal overflow', overflow);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'no errors');
})();
