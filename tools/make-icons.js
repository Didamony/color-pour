// Draws the app icon and the link-preview image with the game's own tube renderer, then saves PNGs to src/assets.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const renderJs = fs.readFileSync(path.join(ROOT, 'src/js/render.js'), 'utf8');
const OUT = path.join(ROOT, 'src/assets');

const page = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@800&display=swap">
<style>body{margin:0}canvas{display:block}</style></head><body><canvas id="c"></canvas>
<script>${renderJs}</script>
<script>
const R = CP.Render;
const theme = { glass: 'rgba(255,255,255,0.22)', stroke: '#FFFFFF', rim: '#FFFFFF', mystery: '#6B5E8C', accent: '#FFD23F', cork: '#D59C68' };
const style = { skin: 'classic', liquid: 'juicy', symbols: false, theme, time: 0 };
const L = arr => arr.map(c => ({ c, amt: 1, hidden: false }));

function bg(ctx, w, h, r) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#FF6FAE'); g.addColorStop(0.55, '#B05CFF'); g.addColorStop(1, '#5B5CFF');
  ctx.fillStyle = g;
  if (r) { R.roundRect(ctx, 0, 0, w, h, r); ctx.fill(); } else ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w * 0.7);
  glow.addColorStop(0, 'rgba(255,255,255,0.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  if (r) { R.roundRect(ctx, 0, 0, w, h, r); ctx.fill(); } else ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  [[0.12,0.78,0.018],[0.86,0.18,0.014],[0.9,0.7,0.02],[0.2,0.14,0.012],[0.7,0.88,0.012]].forEach(([x,y,s]) => { ctx.beginPath(); ctx.arc(x*w, y*h, s*w, 0, 7); ctx.fill(); });
}

// One tilted tube pouring into a second, with a finished corked tube beside them.
function scene(ctx, tx, ty, W) {
  const g = R.geometry('classic', 4);
  R.drawTube(ctx, { id: 1, x: tx + W * 1.9, y: ty + W * 0.3, angle: 0, W, layers: L([3, 3, 3, 3]), complete: true, corkT: 1 }, g, style);
  const t = R.drawTube(ctx, { id: 2, x: tx, y: ty, angle: 0, W, layers: [{ c: 6, amt: 1 }, { c: 6, amt: 1 }, { c: 0, amt: 1.6 }], complete: false }, g, style);
  // source tube tilted so its lip sits just above the target's mouth
  const th = 1.85;
  const Lx = tx - W * 0.16, Ly = ty - W * 0.55;
  const sx = Lx - (W / 2) * Math.cos(th), sy = Ly - (W / 2) * Math.sin(th);
  ctx.fillStyle = R.LIQUIDS.classic[0];
  R.roundRect(ctx, Lx - W * 0.09, Ly, W * 0.18, t.topY - Ly + 2, W * 0.09); ctx.fill();
  R.drawTube(ctx, { id: 3, x: sx, y: sy, angle: th, W, layers: [{ c: 2, amt: 1 }, { c: 0, amt: 0.6 }], complete: false }, g, style);
  ctx.fillStyle = R.LIQUIDS.classic[0];
  [[-0.38,-0.25,0.08],[0.34,-0.4,0.06],[0.14,-0.6,0.045]].forEach(([dx,dy,s]) => { ctx.beginPath(); ctx.arc(Lx + dx*W, t.topY + dy*W, s*W, 0, 7); ctx.fill(); });
}

window.draw = (kind, w, h) => {
  const c = document.getElementById('c');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (kind === 'icon' || kind === 'maskable') {
    bg(ctx, w, h, kind === 'icon' ? w * 0.22 : 0);
    const k = kind === 'maskable' ? 0.78 : 1;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(k, k); ctx.translate(-w / 2, -h / 2);
    scene(ctx, w * 0.59, h * 0.395, w * 0.11);
    ctx.restore();
  } else {
    bg(ctx, w, h, 0);
    scene(ctx, w * 0.27, h * 0.33, h * 0.1);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(60,20,120,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.font = '800 ' + Math.round(h * 0.2) + 'px "Baloo Bhaijaan 2", sans-serif';
    ctx.fillText('معمل الألوان', w * 0.7, h * 0.44);
    ctx.font = '800 ' + Math.round(h * 0.13) + 'px "Baloo Bhaijaan 2", sans-serif';
    ctx.fillText('Color Lab', w * 0.7, h * 0.64);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.font = '800 ' + Math.round(h * 0.055) + 'px "Baloo Bhaijaan 2", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('اسكب، رتّب، واستمتع', w * 0.7, h * 0.78);
  }
  return c.toDataURL('image/png');
};
</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.setContent(page, { waitUntil: 'networkidle' }).catch(() => {});
  await p.evaluate(async () => { await document.fonts.load('800 60px "Baloo Bhaijaan 2"', 'معمل الألوان Color Lab'); await document.fonts.ready; });
  console.log('font loaded:', await p.evaluate(() => document.fonts.check('800 60px "Baloo Bhaijaan 2"', 'صب')));
  const jobs = [
    ['icon', 512, 512, 'icon-512.png'], ['icon', 192, 192, 'icon-192.png'], ['icon', 180, 180, 'apple-touch-icon.png'],
    ['icon', 64, 64, 'favicon-64.png'], ['icon', 32, 32, 'favicon-32.png'],
    ['maskable', 512, 512, 'icon-maskable-512.png'], ['og', 1200, 630, 'og-image.png'],
  ];
  for (const [kind, w, h, name] of jobs) {
    // draw large and let the browser downscale for crisp small icons
    const scale = w < 256 ? 4 : 1;
    const url = await p.evaluate(([k, W, H]) => draw(k, W, H), [kind, w * scale, h * scale]);
    let buf = Buffer.from(url.split(',')[1], 'base64');
    if (scale > 1) {
      const small = await p.evaluate(([src, W, H]) => new Promise(res => {
        const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H); res(c.toDataURL('image/png')); }; img.src = src;
      }), [url, w, h]);
      buf = Buffer.from(small.split(',')[1], 'base64');
    }
    fs.writeFileSync(path.join(OUT, name), buf);
  }
  await browser.close();
  console.log('icons written');
})();
