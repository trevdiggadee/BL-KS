/**
 * audio.js
 * Single responsibility: sound. Everything is synthesized at runtime with
 * the Web Audio API (oscillators/noise) rather than loaded from files, per
 * the project rule that audio assets shouldn't depend on external files
 * that could disappear. Swap in real samples later by replacing the play*
 * function bodies — the public API stays the same.
 */

const Audio_ = (() => {
  let ctx = null;
  let musicGain, sfxGain, masterGain;
  let musicOn = true, sfxOn = true;
  let musicVolume = 0.55, sfxVolume = 0.8;
  let musicTimer = null;
  let musicStep = 0;
  let started = false;
  let levelAudio = null;
  let currentLevelTrack = 0;

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
  function setMusicVolume(v) {
    musicVolume = v;
    if (musicGain) musicGain.gain.value = v;
    if (levelAudio) levelAudio.volume = Math.max(0, Math.min(1, v));
  }

  // Level music: Level-1.mp3, Level-2.mp3, Level-3.mp3, etc.
  // Files live beside the game files in the GitHub Pages repository.
  function ensureLevelAudio() {
    if (levelAudio) return levelAudio;
    levelAudio = new Audio();
    levelAudio.preload = 'auto';
    levelAudio.loop = true;
    levelAudio.volume = Math.max(0, Math.min(1, musicVolume));
    levelAudio.setAttribute('playsinline', '');
    levelAudio.addEventListener('error', () => {
      // A missing level track is intentionally silent; the game continues.
      if (levelAudio) levelAudio.removeAttribute('src');
    });
    return levelAudio;
  }

  function stopLevelMusic() {
    if (!levelAudio) return;
    levelAudio.pause();
    try { levelAudio.currentTime = 0; } catch (_) {}
    levelAudio.removeAttribute('src');
    levelAudio.load();
    currentLevelTrack = 0;
  }

  function playLevelMusic(level) {
    if (!musicOn) return;
    const n = Math.max(1, Math.floor(Number(level) || 1));
    if (currentLevelTrack === n && levelAudio && !levelAudio.paused) return;

    const audio = ensureLevelAudio();
    const base = new URL('./', window.location.href);
    audio.src = new URL(`Level-${n}.mp3`, base).href;
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    currentLevelTrack = n;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

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

  // --- Minimal generative background music: a slow arpeggio loop over a
  // dark, moody chord progression, synthesized step by step. ---
  const PROGRESSION = [
    [130.81, 155.56, 196.00], // Cm
    [116.54, 155.56, 174.61], // Ab
    [103.83, 130.81, 155.56], // Gm-ish
    [174.61, 220.00, 261.63], // F
  ];

  function scheduleMusicStep() {
    if (!musicOn || !ctx) return;
    const chord = PROGRESSION[Math.floor(musicStep / 4) % PROGRESSION.length];
    const note = chord[musicStep % chord.length];
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = note * 2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.55);
    musicStep += 1;
    musicTimer = setTimeout(scheduleMusicStep, 420);
  }

  function startMusic() {
    if (!musicOn) return;
    ensureContext();
    resume();
    // Level tracks are started explicitly by Game when a level begins.
  }

  function stopMusic() {
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    stopLevelMusic();
  }

  return {
    resume, setMusicOn, setSfxOn, setMusicVolume, setSfxVolume,
    startMusic, stopMusic, playLevelMusic, sfx: SFX,
  };
})();
