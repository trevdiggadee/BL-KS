/**
 * audio.js
 * Sound effects are synthesized at runtime with the Web Audio API
 * (oscillators/noise). Background music, however, is loaded from real
 * audio files — one track per level (Level-1.mp3 … Level-5.mp3), sitting
 * alongside index.html. Level 6 and above keep looping the Level-5 track.
 */

const Audio_ = (() => {
  let ctx = null;
  let musicGain, sfxGain, masterGain;
  let musicOn = true, sfxOn = true;
  let musicVolume = 0.55, sfxVolume = 0.8;
  let musicTimer = null;
  let musicStep = 0;
  let started = false;

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicVolume;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(masterGain);
  }

  function resume() {
    ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMusicOn(on) { musicOn = on; if (!on) stopMusic(); }
  function setSfxOn(on) { sfxOn = on; }
  function setMusicVolume(v) { musicVolume = v; if (musicGain) musicGain.gain.value = v; if (musicEl) musicEl.volume = v; }
  function setSfxVolume(v) { sfxVolume = v; if (sfxGain) sfxGain.gain.value = v; }

  function tone({ freq, duration = 0.12, type = 'square', gain = 0.22, slideTo = null, delay = 0 }) {
    if (!sfxOn) return;
    ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst({ duration = 0.15, gain = 0.25, delay = 0 }) {
    if (!sfxOn) return;
    ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(g);
    g.connect(sfxGain);
    src.start(t0);
  }

  const SFX = {
    move: () => tone({ freq: 220, duration: 0.045, type: 'square', gain: 0.09 }),
    rotate: () => tone({ freq: 340, duration: 0.06, type: 'square', gain: 0.12 }),
    softDrop: () => tone({ freq: 160, duration: 0.04, type: 'square', gain: 0.08 }),
    hardDrop: () => {
      tone({ freq: 140, duration: 0.09, type: 'sawtooth', gain: 0.2, slideTo: 40 });
      noiseBurst({ duration: 0.08, gain: 0.18 });
    },
    lock: () => tone({ freq: 90, duration: 0.06, type: 'square', gain: 0.15 }),
    hold: () => tone({ freq: 500, duration: 0.05, type: 'triangle', gain: 0.1 }),
    lineClear: (lines) => {
      const notes = [440, 550, 660, 880];
      for (let i = 0; i < Math.min(lines, 4); i++) {
        tone({ freq: notes[i], duration: 0.12, type: 'square', gain: 0.16, delay: i * 0.04 });
      }
    },
    tetris: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, duration: 0.16, type: 'square', gain: 0.2, delay: i * 0.06 }));
      noiseBurst({ duration: 0.25, gain: 0.12, delay: 0.02 });
    },
    combo: (n) => tone({ freq: 300 + Math.min(n, 10) * 40, duration: 0.08, type: 'triangle', gain: 0.15 }),
    levelUp: () => [392, 494, 588, 784].forEach((f, i) => tone({ freq: f, duration: 0.14, type: 'sawtooth', gain: 0.15, delay: i * 0.07 })),
    gameOver: () => [392, 349, 294, 220].forEach((f, i) => tone({ freq: f, duration: 0.28, type: 'sawtooth', gain: 0.18, delay: i * 0.16 })),
    mbSpawn: () => [880, 1320].forEach((f, i) => tone({ freq: f, duration: 0.09, type: 'triangle', gain: 0.14, delay: i * 0.07 })),
    mbActivate: () => [330, 494, 740, 988].forEach((f, i) => tone({ freq: f, duration: 0.12, type: 'sawtooth', gain: 0.15, delay: i * 0.055 })),
    achievement: () => [660, 880, 1100].forEach((f, i) => tone({ freq: f, duration: 0.18, type: 'triangle', gain: 0.2, delay: i * 0.09 })),
    uiTap: () => tone({ freq: 500, duration: 0.04, type: 'triangle', gain: 0.1 }),
    countdown: () => tone({ freq: 700, duration: 0.1, type: 'square', gain: 0.15 }),
    go: () => tone({ freq: 1000, duration: 0.18, type: 'square', gain: 0.18 }),
    highScore: () => [523, 659, 784, 1047, 1318].forEach((f, i) => tone({ freq: f, duration: 0.2, type: 'triangle', gain: 0.2, delay: i * 0.08 })),
  };

  // --- File-based background music, one track per level. ---
  const LEVEL_TRACKS = ['Level-1.mp3', 'Level-2.mp3', 'Level-3.mp3', 'Level-4.mp3', 'Level-5.mp3'];
  let musicEl = null;
  let currentLevel = 1;

  function trackForLevel(level) {
    const idx = Math.min(Math.max(Math.round(level) || 1, 1), LEVEL_TRACKS.length) - 1;
    return LEVEL_TRACKS[idx];
  }

  function ensureMusicEl() {
    if (musicEl) return musicEl;
    musicEl = new window.Audio();
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.volume = musicVolume;
    return musicEl;
  }

  function playTrack(src) {
    const el = ensureMusicEl();
    if (el.dataset.track === src) {
      if (el.paused) el.play().catch(() => {});
      return;
    }
    el.dataset.track = src;
    el.src = src;
    el.currentTime = 0;
    el.play().catch(() => {});
  }

  function startMusic(level = currentLevel) {
    if (!musicOn) return;
    currentLevel = level;
    playTrack(trackForLevel(level));
  }

  function stopMusic() {
    if (musicEl) musicEl.pause();
  }

  function setLevel(level) {
    currentLevel = level;
    if (musicOn && musicEl && !musicEl.paused) {
      playTrack(trackForLevel(level));
    }
  }

  return {
    resume, setMusicOn, setSfxOn, setMusicVolume, setSfxVolume,
    startMusic, stopMusic, setLevel, sfx: SFX,
  };
})();
