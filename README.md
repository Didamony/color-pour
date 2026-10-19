# Color Pour · صبّ الألوان

A cute color-sorting puzzle in Arabic and English: pour liquids between tubes until every tube holds one color.

- Endless seeded levels, every one checked solvable by the built-in solver
- Light and dark themes, Arabic (RTL) and English
- Coins, shop, daily gift, lucky wheel, daily challenge
- Opt-in rewarded videos (test player on the web; AdMob in the Android app)
- Play with a friend: live race with emotes and messages

## Build

```
python3 tools/build.py
```

Writes `dist/www/index.html` (full page) and `dist/color-pour.html`. Every push to `main` publishes `dist/www` to GitHub Pages.

## Tests

```
node tools/test-engine.js 250        # generator + solver over 250 levels
node tools/e2e.js                    # browser run (needs Playwright)
node tools/e2e-duel.js               # two-player run, serve dist/www on :8765 first
```
