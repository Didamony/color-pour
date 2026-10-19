// Checks that levels 1..N generate quickly, are solvable, and that the solver path really wins.
const E = require('../src/js/engine.js');
const N = +process.argv[2] || 200;
let worst = 0, worstLvl = 0, total = 0;
function replay(lvl, path) {
  const t = lvl.tubes.map(x => x.slice());
  for (const [i, j] of path) {
    if (!E.canPour(t, lvl.cap, i, j)) throw new Error('illegal move in solution');
    const a = E.pourAmount(t, lvl.cap, i, j);
    for (let k = 0; k < a; k++) t[j].push(t[i].pop());
  }
  return E.isWon(t, lvl.cap);
}
for (let n = 1; n <= N; n++) {
  const t0 = Date.now();
  const lvl = E.makeLevel(n);
  const ms = Date.now() - t0;
  total += ms;
  if (ms > worst) { worst = ms; worstLvl = n; }
  const res = E.solve(lvl.tubes, lvl.cap, 300000);
  if (!res.path || !replay(lvl, res.path)) throw new Error('level ' + n + ' not solvable');
  if (n <= 12 || n % 10 === 0 || n % 25 === 0)
    console.log(`L${n} colors=${lvl.cfg.colors} cap=${lvl.cap} tag=${lvl.cfg.tag} par=${lvl.par} gen=${ms}ms`);
}
const d = E.makeDaily('2026-10-19');
console.log('daily par', d.par, 'hidden', d.hidden.flat().filter(Boolean).length);
const again = E.makeLevel(37), again2 = E.makeLevel(37);
console.log('deterministic', JSON.stringify(again.tubes) === JSON.stringify(again2.tubes));
console.log(`OK ${N} levels, avg ${(total / N).toFixed(1)}ms, worst ${worst}ms (L${worstLvl})`);
