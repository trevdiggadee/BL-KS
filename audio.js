/**
 * audio.js
 * SFX are still synthesized with Web Audio.
 * Background music now uses the Level-1.mp3 … Level-5.mp3 files.
 * Level 1 → Level-1.mp3, Level 2 → Level-2.mp3, … Level ≥5 → Level-5.mp3
 */

const Audio_ = (() => {
  let ctx = null;
  let sfxGain, masterGain;
  let musicOn = true, sfxOn = true;
  let musicVolume = 0.55, sfxVolume = 0.8;

  // --- Level music (HTMLAudioElement for simple looping + volume) ---
  const LEVEL_TRACKS = {
    1: 'Level-1.mp3',
    2: 'Level-2.mp3',
    3: 'Level-3.mp3',
    4: 'Level-4.mp3',
    5: 'Level-5.mp3',
  };

  const musicPlayers = {};   // level → HTMLAudioElement
  let currentLevel = 1;
  let currentMusic = null;

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(masterGain);
  }

  function resume() {
    ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ---------- Music helpers ----------
  function createPlayer(src) {
    const a = new Audio(src);
    a.loop = true;
    a.preload = 'auto';
    a.volume = musicVolume;
    return a;
  }

  function preloadMusic() {
    for (const [lvl, src] of Object.entries(LEVEL_TRACKS)) {
      if (!musicPlayers[lvl]) {
        musicPlayers[lvl] = createPlayer(src);
      }
    }
  }

  function stopCurrentMusic() {
    if (currentMusic) {
      currentMusic.pause();
      currentMusic.currentTime = 0;
      currentMusic = null;
    }
  }

  function playLevelMusic(level) {
    if (!musicOn) return;

    const clamped = Math.max(1, Math.min(5, level | 0));
    currentLevel = clamped;

    const player = musicPlayers[clamped];
    if (!player) return;

    // Already playing the right track
    if (currentMusic === player && !player.paused) return;

    stopCurrentMusic();
    currentMusic = player;
    player.volume = musicVolume;
    player.currentTime = 0;
    const p = player.play();
    if (p && p.catch) p.catch(() => {}); // ignore autoplay blocks
  }

  function setMusicOn(on) {
    musicOn = on;
    if (!on) stopCurrentMusic();
    else if (currentLevel) playLevelMusic(currentLevel);
  }

  function setMusicVolume(v) {
    musicVolume = v;
    Object.values(musicPlayers).forEach(p => { p.volume = v; });
    if (currentMusic) currentMusic.volume = v;
  }

  function startMusic(level = currentLevel) {
    preloadMusic();
    resume();
    playLevelMusic(level || 1);
  }

  function stopMusic() {
    stopCurrentMusic();
  }

  // Browsers may keep media alive while a tab is backgrounded or the app is
  // switched away from. Hard-stop every player on page visibility loss.
  function stopForBackground() {
    Object.values(musicPlayers).forEach((player) => {
      player.pause();
      try { player.currentTime = 0; } catch (_) {}
    });
    currentMusic = null;
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  /** Call this whenever the game level changes */
  function setMusicLevel(level) {
    if (!musicOn) {
      currentLevel = Math.max(1, Math.min(5, level | 0));
      return;
    }
    playLevelMusic(level);
  }

  // ---------- SFX (unchanged synthesis) ----------
  function setSfxOn(on) { sfxOn = on; }
  function setSfxVolume(v) {
    sfxVolume = v;
    if (sfxGain) sfxGain.gain.value = v;
  }

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

  // Preload as soon as the module loads
  preloadMusic();

  return {
    resume,
    setMusicOn, setSfxOn, setMusicVolume, setSfxVolume,
    startMusic, stopMusic, stopForBackground, setMusicLevel,
    sfx: SFX,
  };
})();
