// All sounds are synthesised with Web Audio, so the game ships without audio files.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};
  let ctx = null, master = null, musicGain = null, musicTimer = null, sfxBus = null, verbSend = null;
  let soundOn = true, musicOn = true;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
      // a small room reverb gives water and chimes some space
      const verb = ctx.createConvolver();
      verb.buffer = impulse(1.4, 2.6);
      verbSend = ctx.createGain(); verbSend.gain.value = 0.22;
      verbSend.connect(verb); verb.connect(master);
      sfxBus = ctx.createGain(); sfxBus.connect(master); sfxBus.connect(verbSend);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function impulse(seconds, decay) {
    const len = Math.round(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function tone(freq, start, dur, opts) {
    opts = opts || {};
    if (!ctx || (!soundOn && opts.dest !== musicGain)) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
    const v = opts.vol || 0.2;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(v, start + Math.min(0.015, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(opts.dest || sfxBus || master);
    o.start(start); o.stop(start + dur + 0.02);
  }

  function noiseBuffer() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < d.length; i++) {
        // pinkish noise: softer and more like running water than white noise
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
    }
    return noiseBuf;
  }

  // One air bubble: a sine whose pitch rises as it decays (how real bubbles sound).
  function bubble(start, f0, vol, len) {
    if (!ctx || !soundOn) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + Math.random() * 0.5), start + len);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    o.connect(g); g.connect(sfxBus);
    o.start(start); o.stop(start + len + 0.02);
  }

  // A stream of liquid falling into a tube. The hollow part of the tube resonates higher as it fills.
  function water(start, dur, fillFrom, fillTo) {
    if (!ctx || !soundOn) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(); src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    const res = ctx.createBiquadFilter(); res.type = 'bandpass'; res.Q.value = 3.2;
    const res2 = ctx.createBiquadFilter(); res2.type = 'peaking'; res2.Q.value = 6; res2.gain.value = 9;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    const g = ctx.createGain();
    const fA = 420 + fillFrom * 1100, fB = 420 + fillTo * 1100;
    res.frequency.setValueAtTime(fA, start); res.frequency.linearRampToValueAtTime(fB, start + dur);
    res2.frequency.setValueAtTime(fA * 2.1, start); res2.frequency.linearRampToValueAtTime(fB * 2.1, start + dur);
    // turbulent loudness: small random wobble every few milliseconds
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.5, start + 0.05);
    for (let t = start + 0.06; t < start + dur - 0.05; t += 0.035) g.gain.linearRampToValueAtTime(0.32 + Math.random() * 0.28, t);
    g.gain.linearRampToValueAtTime(0.3, start + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.14);
    const mix = ctx.createGain(); mix.gain.value = 0.55;
    src.connect(hp); hp.connect(res); res.connect(res2); res2.connect(lp); lp.connect(g); g.connect(mix); mix.connect(sfxBus);
    src.start(start, Math.random()); src.stop(start + dur + 0.2);
    // bubbles riding on the stream, more of them and higher as the tube fills
    const n = Math.round(dur * 38);
    for (let k = 0; k < n; k++) {
      const p = Math.random(), st = start + 0.03 + p * dur;
      const fill = fillFrom + (fillTo - fillFrom) * p;
      bubble(st, 320 + fill * 700 + Math.random() * 520, 0.02 + Math.random() * 0.06, 0.03 + Math.random() * 0.05);
    }
    // splash as the stream hits, and drips after it stops
    splash(start, 0.12 + 0.06 * (1 - fillFrom));
    bubble(start + dur + 0.09, 1100 + fillTo * 600, 0.07, 0.06);
    bubble(start + dur + 0.22, 1300 + fillTo * 700, 0.045, 0.05);
  }

  function splash(start, vol) {
    if (!ctx || !soundOn) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2600, start); f.frequency.exponentialRampToValueAtTime(500, start + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol * 3, start + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(start, Math.random()); src.stop(start + 0.25);
  }

  // A small bell: a few inharmonic partials with a long ring.
  function bell(freq, start, vol, len) {
    [[1, 1], [2.76, 0.35], [5.4, 0.12], [8.93, 0.05]].forEach(([m, a]) => {
      tone(freq * m, start, len * (m === 1 ? 1 : 0.6), { vol: vol * a });
    });
  }

  let noiseBuf = null;
  function noise(start, dur, freq, vol) {
    if (!ctx || !soundOn) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus || master);
    src.start(start); src.stop(start + dur + 0.02);
  }

  const Audio = {
    unlock() { ensure(); if (musicOn) startMusic(); },
    setSound(on) { soundOn = on; },
    setMusic(on) { musicOn = on; if (on) { if (ctx) startMusic(); } else stopMusic(); },
    pick() { if (!ensure()) return; const t = ctx.currentTime; tone(520, t, 0.09, { to: 820, vol: 0.14 }); },
    drop() { if (!ensure()) return; const t = ctx.currentTime; tone(700, t, 0.08, { to: 430, vol: 0.1 }); },
    deny() { if (!ensure()) return; const t = ctx.currentTime; tone(180, t, 0.12, { type: 'triangle', vol: 0.12 }); tone(150, t + 0.08, 0.12, { type: 'triangle', vol: 0.1 }); },
    // Liquid pouring: starts when the stream leaves the lip, lasts as long as the pour animation.
    pour(amount, fillFrom, ms, cap, delayMs) {
      if (!ensure()) return;
      const t0 = ctx.currentTime + (delayMs != null ? delayMs : 220) / 1000;
      water(t0, ms / 1000, fillFrom, Math.min(1, fillFrom + amount / (cap || 4)));
    },
    // A tube is sealed: the cork pops on, then a bell arpeggio that climbs with each finished tube.
    complete(nth) {
      if (!ensure()) return;
      const t = ctx.currentTime + 0.02;
      splash(t, 0.05);
      tone(520, t, 0.06, { to: 180, vol: 0.22 });
      const step = Math.pow(2, Math.min(7, nth || 0) / 12);
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(f * step, t + 0.09 + i * 0.07, 0.07, 0.9));
      for (let k = 0; k < 10; k++) tone(3000 + Math.random() * 2500, t + 0.15 + Math.random() * 0.5, 0.12, { vol: 0.015 });
    },
    win() {
      if (!ensure()) return;
      const t = ctx.currentTime + 0.05;
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.1, i === 6 ? 0.6 : 0.2, { type: 'triangle', vol: 0.14 }));
    },
    coin() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      tone(1319, t, 0.08, { type: 'square', vol: 0.05 }); tone(1760, t + 0.07, 0.18, { type: 'square', vol: 0.05 });
    },
    boom() { if (!ensure()) return; const t = ctx.currentTime; noise(t, 0.35, 300, 0.18); tone(90, t, 0.3, { to: 50, vol: 0.12 }); },
    tick() { if (!ensure()) return; tone(1400, ctx.currentTime, 0.03, { type: 'square', vol: 0.03 }); },
    tap() { if (!ensure()) return; tone(660, ctx.currentTime, 0.05, { vol: 0.08 }); },
  };

  // Soft generative music: pentatonic notes over a slow pad, very quiet.
  const SCALE = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
  const CHORDS = [[130.8, 196.0, 261.6], [110.0, 164.8, 220.0], [87.3, 130.8, 174.6], [98.0, 146.8, 196.0]];
  let step = 0;
  function startMusic() {
    if (!ctx || musicTimer) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2);
    const beat = 0.48;
    let next = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      while (next < ctx.currentTime + 0.6) {
        if (step % 8 === 0) {
          const ch = CHORDS[(step / 8) % CHORDS.length];
          ch.forEach(f => tone(f, next, beat * 8, { type: 'sine', vol: 0.05, dest: musicGain }));
        }
        if (Math.random() < 0.55) {
          const f = SCALE[Math.floor(Math.random() * SCALE.length)];
          tone(f, next, beat * 1.6, { type: 'triangle', vol: 0.06, dest: musicGain });
        }
        step++;
        next += beat;
      }
    }, 150);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (ctx) musicGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.2);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  CP.Audio = Audio;
})(this);
