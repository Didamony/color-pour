// All sounds are synthesised with Web Audio, so the game ships without audio files.
(function (root) {
  'use strict';
  const CP = root.CP = root.CP || {};
  let ctx = null, master = null, musicGain = null, musicTimer = null;
  let soundOn = true, musicOn = true;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
    } catch (e) { ctx = null; }
    return ctx;
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
    o.connect(g); g.connect(opts.dest || master);
    o.start(start); o.stop(start + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(start, dur, freq, vol) {
    if (!ctx || !soundOn) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(start); src.stop(start + dur + 0.02);
  }

  const Audio = {
    unlock() { ensure(); if (musicOn) startMusic(); },
    setSound(on) { soundOn = on; },
    setMusic(on) { musicOn = on; if (on) { if (ctx) startMusic(); } else stopMusic(); },
    pick() { if (!ensure()) return; const t = ctx.currentTime; tone(520, t, 0.09, { to: 820, vol: 0.14 }); },
    drop() { if (!ensure()) return; const t = ctx.currentTime; tone(700, t, 0.08, { to: 430, vol: 0.1 }); },
    deny() { if (!ensure()) return; const t = ctx.currentTime; tone(180, t, 0.12, { type: 'triangle', vol: 0.12 }); tone(150, t + 0.08, 0.12, { type: 'triangle', vol: 0.1 }); },
    // Glugs rise in pitch as the target tube fills up.
    pour(amount, fillFrom, ms) {
      if (!ensure()) return;
      const t0 = ctx.currentTime + 0.3;
      const n = Math.max(3, Math.round(ms / 85));
      for (let k = 0; k < n; k++) {
        const f = fillFrom + (amount / 4) * (k / n);
        const st = t0 + k * (ms / 1000 / n) + Math.random() * 0.02;
        tone(260 + f * 380 + Math.random() * 40, st, 0.07, { to: 420 + f * 520, vol: 0.11 });
        noise(st, 0.06, 900 + f * 900, 0.05);
      }
    },
    complete() {
      if (!ensure()) return;
      const t = ctx.currentTime + 0.05;
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.25, { type: 'triangle', vol: 0.12 }));
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
