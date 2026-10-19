// Rewarded video ads. Only shown when the player taps a video button.
// In the Android app (Capacitor + @capacitor-community/admob) real AdMob videos play;
// in the browser a test player stands in so the reward flow can be tried.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};
  const t = (k, v) => CP.I18n.t(k, v);

  // Google's public test unit. Replace with your own rewarded ad unit ID before publishing.
  const REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';
  const MOCK_SECONDS = 5;

  function admob() {
    const cap = root.Capacitor;
    return cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.AdMob;
  }

  let ready = null;
  async function showReal(AdMob) {
    if (!ready) ready = AdMob.initialize({ initializeForTesting: REWARDED_UNIT_ID.startsWith('ca-app-pub-3940256099942544') });
    await ready;
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_UNIT_ID });
    const reward = await AdMob.showRewardVideoAd();
    return !!reward;
  }

  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function showMock() {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'ad-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      const C = 2 * Math.PI * 52;
      el.innerHTML =
        '<span class="ad-label">' + t('adLabel') + '</span>' +
        '<button class="ad-close" aria-label="' + t('close') + '">' + ICON_X + '</button>' +
        '<div class="ad-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/>' +
        '<circle class="arc" cx="60" cy="60" r="52" fill="none" stroke="#FFC23D" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/></svg><b class="num">' + MOCK_SECONDS + '</b></div>' +
        '<h3>' + t('adTitle') + '</h3><p>' + t('adBody') + '</p>' +
        '<button class="btn btn-video get" hidden>' + t('adGet') + '</button>' +
        '<div class="ad-confirm" hidden><p>' + t('adLeaveQ') + '</p><button class="btn btn-video keep">' + t('adKeep') + '</button><button class="btn btn-ghost leave">' + t('adLeave') + '</button></div>';
      document.body.appendChild(el);
      const arc = el.querySelector('.arc'), num = el.querySelector('.ad-ring b');
      const get = el.querySelector('.get'), confirmBox = el.querySelector('.ad-confirm');
      let elapsed = 0, paused = false, done = false, last = performance.now();
      const tick = now => {
        if (!el.isConnected) return;
        if (!paused && !done) {
          elapsed += now - last;
          const p = Math.min(1, elapsed / (MOCK_SECONDS * 1000));
          arc.setAttribute('stroke-dashoffset', String(C * (1 - p)));
          num.textContent = String(Math.ceil(MOCK_SECONDS - p * MOCK_SECONDS));
          if (p >= 1) { done = true; num.textContent = '✓'; get.hidden = false; get.focus(); }
        }
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const finish = ok => { el.remove(); resolve(ok); };
      get.addEventListener('click', () => finish(true));
      el.querySelector('.ad-close').addEventListener('click', () => {
        if (done) return finish(true);
        paused = true; confirmBox.hidden = false;
      });
      el.querySelector('.keep').addEventListener('click', () => { paused = false; confirmBox.hidden = true; });
      el.querySelector('.leave').addEventListener('click', () => finish(false));
    });
  }

  let busy = false;
  async function showRewarded() {
    if (busy) return false;
    busy = true;
    if (CP.Audio) CP.Audio.setMusic(false);
    try {
      const real = admob();
      return real ? await showReal(real) : await showMock();
    } catch (e) {
      if (CP.UI) CP.UI.toast(t('adFail'));
      return false;
    } finally {
      busy = false;
      if (CP.Audio && CP.Store) CP.Audio.setMusic(CP.Store.data.music);
    }
  }

  CP.Ads = { showRewarded, isReal: () => !!admob() };
})(this);
