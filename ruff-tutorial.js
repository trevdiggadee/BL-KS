"use strict";

// ============================================================
// R.U.F.F. — Radio Utility Flight Friend (Training Instructor)
// ============================================================

(function () {
  // AIRBORNE_BUILD ruff412 2026-09-02T04:50Z-platfix
  window.__AIRBORNE_BUILD = "ruff414";
  window.__AIRBORNE_BUILD_STAMP = "2026-09-02T04:50Z-platfix";
  try { console.log("%c Airborne build ruff412 ", "background:#1a5;color:#fff;font-weight:bold;", "2026-09-02T04:50Z-platfix"); } catch (e) {}

  const RUFF_FRAME_COUNT = 36;
  const CRYSTAL_FRAME_COUNT = 25;
  const CRYSTAL_SCORE = 15;

  // Pilot rank progression — HUD shows Rookie until end-of-level rank-up
  const PILOT_RANKS = [
    { id: 0, name: "Cadet",           title: "Starting pilot",   minScore: 0 },
    { id: 1, name: "Air Scout",       title: "Learning the skies", minScore: 500 },
    { id: 2, name: "Sky Ranger",      title: "Proven pilot",     minScore: 1200 },
    { id: 3, name: "Squadron Leader", title: "Experienced ace",  minScore: 2500 },
    { id: 4, name: "Pilot",           title: "Elite flyer",      minScore: 4000 },
    { id: 5, name: "Sky Marshal",     title: "Master of the air", minScore: 6000 },
    { id: 6, name: "Legendary",       title: "Ultimate rank",    minScore: 10000 }
  ];

  function getPilotRank(totalScore, stats) {
    // Training / early game: always Cadet. Higher ranks unlock with future achievements.
    void totalScore; void stats;
    return PILOT_RANKS[0];
    // Future:
    // let rank = PILOT_RANKS[0];
    // for (let i = 0; i < PILOT_RANKS.length; i++) {
    //   if ((totalScore || 0) >= PILOT_RANKS[i].minScore) rank = PILOT_RANKS[i];
    // }
    // return rank;
  }

  // ---------- State ----------
  let ruffActive = false;
  let ruffStage = "idle"; // see STAGES
  let ruffStageT = 0;
  let ruffLineIdx = 0;
  let ruffLineT = 0;
  let ruffLines = [];
  let ruffWaitingInput = false;
  let ruffWaitingCollect = 0; // crystals needed
  let ruffWaitingAvoid = false;
  let ruffWaitingRing = 0;
  let ruffBob = 0;
  let ruffFrame = 0;
  let ruffFrameT = 0;
  let ruffX = 0;
  let ruffJetParticles = [];
  let ruffSpeakLines = [];
  let ruffMotionGhosts = [];
  let ruffGhostCd = 0;
  let ruffY = 0;
  let ruffSpeakClose = 0;
  let ruffTilt = 0;
  let ruffScalePulse = 1;
  let ruffStats = {
    crystals: 0,
    coins: 0,
    rings: 0,
    powerups: 0,
    obstaclesAvoided: 0,
    bestCombo: 0,
    landingStars: 3,
    ringMisses: 0,
    ringStreak: 0,
    ringBestStreak: 0,
    ringPerfects: 0,
    ringScore: 0,
    ringRank: "",
    ringPerfectFlight: false
  };

  // ---- Ring streak / scoring (20-ring run) ----
  window.__airborneRingTotalTarget = 20;
  window.__airborneRingSpawned = 0;
  window.__airborneRingMult = 1;
  window.__airborneRingHud = { streak: 0, mult: 1, score: 0, lastPts: 0, flash: 0, title: "" };

  function ringStreakMult(streak) {
    if (streak >= 12) return 5;
    if (streak >= 8) return 4;
    if (streak >= 5) return 3;
    if (streak >= 3) return 2;
    return 1;
  }
  function ringStreakColor(streak) {
    // progressive glow identity
    if (streak >= 12) return { core: "#fff6c8", mid: "#ff44ee", outer: "#8800ff", name: "LEGEND" };
    if (streak >= 8) return { core: "#ffe8a0", mid: "#ff8a20", outer: "#ff2200", name: "BLAZE" };
    if (streak >= 5) return { core: "#e8fff0", mid: "#40ff90", outer: "#00aa55", name: "ACE" };
    if (streak >= 3) return { core: "#e8f4ff", mid: "#40b0ff", outer: "#2060cc", name: "HOT" };
    return { core: "#ffe8d0", mid: "#ff9040", outer: "#cc4010", name: "" };
  }
  function onRingPassed(quality) {
    // quality 0..1 — 1 = perfect center
    ruffStats.rings = (ruffStats.rings || 0) + 1;
    try {
      window.__airborneCollectRings = ruffStats.rings;
      if (typeof updateCollectDock === "function") updateCollectDock();
      else if (typeof window.updateCollectDock === "function") window.updateCollectDock();
    } catch (eHud) {}
    ruffStats.ringStreak = (ruffStats.ringStreak || 0) + 1;
    if (ruffStats.ringStreak > (ruffStats.ringBestStreak || 0)) {
      ruffStats.ringBestStreak = ruffStats.ringStreak;
    }
    if (quality >= 0.72) ruffStats.ringPerfects = (ruffStats.ringPerfects || 0) + 1;
    var mult = ringStreakMult(ruffStats.ringStreak);
    window.__airborneRingMult = mult;
    var base = 100;
    var perfectBonus = quality >= 0.72 ? 50 : 0;
    var pts = (base + perfectBonus) * mult;
    ruffStats.ringScore = (ruffStats.ringScore || 0) + pts;
    // Ring points stay on ring score only — do not add to main score
    window.__airborneRingHud = {
      streak: ruffStats.ringStreak,
      mult: mult,
      score: ruffStats.ringScore,
      lastPts: pts,
      flash: 1.15,
      title: quality >= 0.72 ? "PERFECT" : (mult >= 3 ? "STREAK x" + mult : "RING")
    };
    ruffStats.bestCombo = Math.max(ruffStats.bestCombo || 0, ruffStats.ringStreak);
    try { maybeFinishRingsLesson(); } catch (e) {}
    return { mult: mult, pts: pts, streak: ruffStats.ringStreak, colors: ringStreakColor(ruffStats.ringStreak) };
  }
  function onRingMissed() {
    ruffStats.ringMisses = (ruffStats.ringMisses || 0) + 1;
    ruffStats.ringStreak = 0;
    window.__airborneRingMult = 1;
    window.__airborneRingHud = window.__airborneRingHud || {};
    window.__airborneRingHud.streak = 0;
    window.__airborneRingHud.mult = 1;
    window.__airborneRingHud.flash = 0.6;
    window.__airborneRingHud.title = "MISS";
    window.__airborneRingHud.lastPts = 0;
    try { maybeFinishRingsLesson(); } catch (e) {}
  }
  
  function showRingResultsBanner() {
    try {
      if (window.__airborneRingResultsShown && window.__airborneRingResultsCanvas &&
          window.__airborneRingResultsCanvas.t < 3.5) return;
      window.__airborneRingResultsShown = true;
      // Compute rank once so score + rank share one panel
      var rank = "Rookie";
      try {
        if (typeof computeRingRank === "function") rank = computeRingRank() || "Rookie";
        else if (window.__airborneComputeRingRank) rank = window.__airborneComputeRingRank() || "Rookie";
        else if (ruffStats && ruffStats.ringRank) rank = ruffStats.ringRank;
      } catch (eR) {}
      var n = (ruffStats && ruffStats.rings) ? ruffStats.rings : 0;
      var totN = window.__airborneRingTotalTarget || 20;
      var best = (ruffStats && ruffStats.ringBestStreak) ? ruffStats.ringBestStreak : 0;
      window.__airborneRingResultsCanvas = {
        t: 0,
        life: 3.6,
        text: String(n) + " / " + String(totN),
        n: n,
        total: totN,
        rank: rank,
        bestStreak: best,
        perfectFlight: !!(ruffStats && ruffStats.ringPerfectFlight),
        style: "ringCompact",
        frame: 0,
        embers: null
      };
      console.log("[Rings] UNIFIED", n, "/", totN, rank);
      try {
        if (typeof sfxRingSummary === "function") sfxRingSummary();
        else if (window.sfxRingSummary) window.sfxRingSummary();
        else if (typeof sfxRankUp === "function") sfxRankUp();
      } catch (eS) {}
      ["aaRingSummary", "aaRingResults"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    } catch (e) {
      console.warn("ring summary", e);
      window.__airborneRingResultsShown = true;
    }
  }
  window.showRingResultsBanner = showRingResultsBanner;



    function maybeFinishRingsLesson() {
    try {
      if (window.__airborneRingResultsShown) return;
      var st = window.__airborneRuffStage || ruffStage || "";
      if (st !== "rings") return;
      var target = window.__airborneRingTotalTarget || 20;
      var spawned = window.__airborneRingSpawned || 0;
      if (spawned < target) return;
      // Prefer resolved count, but don't hard-require misses (can lag one frame)
      var resolved = (ruffStats.rings || 0) + (ruffStats.ringMisses || 0);
      var ringsLeft = 0;
      try {
        if (typeof window.__airborneCountTrainingRings === "function")
          ringsLeft = window.__airborneCountTrainingRings();
      } catch (e) {}
      if (resolved < target && ringsLeft > 0) return;
      showRingResultsBanner();
      setTimeout(function () {
        try {
          if ((window.__airborneRuffStage || ruffStage) === "rings") setStage("obstacles");
        } catch (e) {}
      }, 4200); // wait for score medal to finish (~3.6s) + buffer
    } catch (e) { console.warn("maybeFinishRings", e); }
  }


  function computeRingRank() {
    var total = window.__airborneRingTotalTarget || 20;
    var got = ruffStats.rings || 0;
    var misses = ruffStats.ringMisses || 0;
    var best = ruffStats.ringBestStreak || 0;
    var perfects = ruffStats.ringPerfects || 0;
    var pct = total > 0 ? (got / total) * 100 : 0;
    var perfectPct = got > 0 ? (perfects / Math.max(got, 1)) * 100 : 0;
    var rank = "Rookie";
    var perfectFlight = false;
    if (got >= total && misses === 0 && perfectPct >= 75 && best >= total) {
      rank = "Legendary";
      perfectFlight = true;
    } else if (pct >= 90 && perfects >= 5 && misses <= 2) {
      rank = "Elite";
    } else if (pct >= 80 && best >= 3) {
      rank = "Skilled";
    } else if (pct >= 60) {
      rank = "Rookie";
    } else {
      rank = "Rookie";
    }
    ruffStats.ringRank = rank;
    ruffStats.ringPerfectFlight = perfectFlight;
    if (perfectFlight) {
      ruffStats.ringScore = (ruffStats.ringScore || 0) + 1000;
    }
    return rank;
  }
  window.__airborneOnRingCollect = function (quality) {
    return onRingPassed(typeof quality === "number" ? quality : 0.5);
  };
  window.__airborneOnRingMiss = onRingMissed;
  window.__airborneComputeRingRank = computeRingRank;
  window.__airborneRingStreakColor = ringStreakColor;

  function drawRingStreakHud(ctx) {
    if (!ctx) return;
    var hud = window.__airborneRingHud;
    if (!hud) return;
    if (!(window.__airborneAirfieldRings || (hud.flash > 0))) return;
    var W = ctx.canvas.width, H = ctx.canvas.height;
    if (hud.flash > 0) hud.flash = Math.max(0, hud.flash - 0.016);
    var col = ringStreakColor(hud.streak || 0);
    ctx.save();
    // Streak / mult panel top-center
    var st = hud.streak || 0;
    var label = (st > 0 ? ("+" + st) : "STREAK 0") + "   x" + (hud.mult || 1);
    ctx.font = "900 18px Rockwell, Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var y = H * 0.11;
    ctx.shadowColor = col.mid;
    ctx.shadowBlur = 12 + (hud.streak || 0);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    var tw = ctx.measureText(label).width + 36;
    ctx.fillRect(W * 0.5 - tw / 2, y - 16, tw, 32);
    ctx.fillStyle = col.core;
    ctx.fillText(label, W * 0.5, y);
    // Score pop after ring
    if (hud.flash > 0 && hud.lastPts > 0) {
      var a = Math.min(1, hud.flash);
      ctx.globalAlpha = a;
      ctx.font = "900 " + (22 + (1 - a) * 10) + "px Rockwell, Georgia, serif";
      ctx.fillStyle = col.core;
      ctx.shadowBlur = 16;
      var popY = y + 36 + (1 - a) * 20;
      var stN = hud.streak || 0;
      if (stN > 0) {
        ctx.font = "900 " + (28 + (1 - a) * 14) + "px Rockwell, Georgia, serif";
        ctx.fillStyle = col.core;
        ctx.fillText("+" + stN, W * 0.5, popY - 6);
      }
      ctx.font = "900 " + (16 + (1 - a) * 6) + "px Rockwell, Georgia, serif";
      var t = (hud.title ? hud.title + "  " : "") + (hud.lastPts ? ("+" + hud.lastPts) : "");
      if (t) ctx.fillText(t, W * 0.5, popY + 18);
      ctx.font = "700 14px Rockwell, Georgia, serif";
      ctx.fillStyle = "#ffe8c0";
      ctx.fillText("RING SCORE " + (hud.score || 0), W * 0.5, popY + 22);
    } else if (window.__airborneAirfieldRings) {
      ctx.globalAlpha = 0.85;
      ctx.font = "700 13px Rockwell, Georgia, serif";
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f0e0c0";
      ctx.fillText("RING SCORE " + (hud.score || 0) + "   " + (ruffStats.rings || 0) + "/" + (window.__airborneRingTotalTarget || 20), W * 0.5, y + 28);
    }
    ctx.restore();
  }
  window.__airborneDrawRingStreakHud = drawRingStreakHud;

  let ruffCrystals = [];
  window.__airborneRuffMuted = true; // mute Ruff dialog for now
  let ruffLandingCelebrated = false;

  
  // ========== SELF-CONTAINED TRAINING AUDIO (own AudioContext) ==========
  var __trainCtx = null;
  var __trainMaster = null;
  var __trainBed = null;
  var __trainEngine = null;
  var __trainWind = null;

  function trainEnsure() {
    try {
      if (!__trainCtx) {
        __trainCtx = new (window.AudioContext || window.webkitAudioContext)();
        __trainMaster = __trainCtx.createGain();
        __trainMaster.gain.value = 0.55;
        __trainMaster.connect(__trainCtx.destination);
      }
      if (__trainCtx.state === "suspended") __trainCtx.resume();
      return true;
    } catch (e) {
      console.warn("trainEnsure", e);
      return false;
    }
  }

  function trainEngineStart() {
    if (!trainEnsure() || __trainEngine) return;
    try {
      var o = __trainCtx.createOscillator();
      var lp = __trainCtx.createBiquadFilter();
      var g = __trainCtx.createGain();
      o.type = "sawtooth";
      o.frequency.value = 52;
      lp.type = "lowpass";
      lp.frequency.value = 220;
      g.gain.value = 0.0001;
      o.connect(lp); lp.connect(g); g.connect(__trainMaster);
      g.gain.linearRampToValueAtTime(0.07, __trainCtx.currentTime + 0.6);
      o.start();
      __trainEngine = { o: o, g: g, lp: lp };
    } catch (e) { __trainEngine = null; }
  }
  function trainEngineStop() {
    var n = __trainEngine; __trainEngine = null;
    if (!n) return;
    try { n.g.gain.cancelScheduledValues(0); n.g.gain.setValueAtTime(0.0001, __trainCtx.currentTime); n.o.stop(); n.o.disconnect(); n.g.disconnect(); } catch (e) {}
  }
  function trainWindStart() {
    if (!trainEnsure() || __trainWind) return;
    try {
      var len = __trainCtx.sampleRate * 2;
      var buf = __trainCtx.createBuffer(1, len, __trainCtx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = __trainCtx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var bp = __trainCtx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.6;
      var g = __trainCtx.createGain();
      g.gain.value = 0.0001;
      src.connect(bp); bp.connect(g); g.connect(__trainMaster);
      g.gain.linearRampToValueAtTime(0.05, __trainCtx.currentTime + 0.8);
      src.start();
      __trainWind = { s: src, g: g, bp: bp };
    } catch (e) { __trainWind = null; }
  }
  function trainWindStop() {
    var n = __trainWind; __trainWind = null;
    if (!n) return;
    try { n.g.gain.cancelScheduledValues(0); n.g.gain.setValueAtTime(0.0001, __trainCtx.currentTime); n.s.stop(); n.s.disconnect(); n.g.disconnect(); } catch (e) {}
  }

  function trainBeep(freq, dur, vol, type) {
    if (!trainEnsure()) return;
    try {
      var t0 = __trainCtx.currentTime;
      var o = __trainCtx.createOscillator();
      var g = __trainCtx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(Math.max(0.001, vol || 0.2), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
      o.connect(g);
      g.connect(__trainMaster);
      o.start(t0);
      o.stop(t0 + (dur || 0.15) + 0.05);
    } catch (e) {}
  }

  function trainChord(freqs, dur, vol) {
    if (!trainEnsure()) return;
    freqs.forEach(function (f, i) {
      setTimeout(function () { trainBeep(f, dur || 0.2, (vol || 0.15), "sine"); }, i * 60);
    });
  }

  // ---- Flight Training BGM — simple HTMLAudio (same model as splash/menu) ----
  var TRAIN_BGM_VOL = 0.20;
  var TRAIN_BOSS_VOL = 0.20;

  function getTrainingMusicEl() {
    var el = document.getElementById("trainingMusic");
    if (!el) {
      el = document.createElement("audio");
      el.id = "trainingMusic";
      el.loop = true;
      el.preload = "auto";
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
      el.src = "Cloud_Cruisers.mp3";
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }

  function getTrainingBossMusicEl() {
    var el = document.getElementById("trainingBossMusic");
    if (!el) {
      el = document.createElement("audio");
      el.id = "trainingBossMusic";
      el.loop = true;
      el.preload = "auto";
      el.setAttribute("playsinline", "");
      el.src = "the_engine_s_decree.mp3";
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }

  function __pauseOtherPageMusic() {
    try {
      ["menuMusic", "splashMusic", "gameplayMusic"].forEach(function (id) {
        var n = document.getElementById(id);
        if (n) { try { n.pause(); } catch (e) {} }
      });
    } catch (e) {}
  }

  function playTrainingMusic() {
    try {
      __pauseOtherPageMusic();
      // Stop boss if running
      try {
        var boss = getTrainingBossMusicEl();
        boss.pause();
        boss.volume = 0;
      } catch (e) {}

      var el = getTrainingMusicEl();
      // Ensure src points at Cloud Cruisers
      try {
        if (!el.getAttribute("src") || String(el.getAttribute("src")).indexOf("Cloud") < 0) {
          el.setAttribute("src", "Cloud_Cruisers.mp3");
          el.load();
        }
      } catch (e) {}

      el.loop = true;
      // iOS: set volume then play — do NOT reset currentTime unless paused
      var already = false;
      try { already = !el.paused && el.currentTime > 0; } catch (e) {}
      if (already) {
        el.volume = TRAIN_BGM_VOL;
        return;
      }
      el.volume = TRAIN_BGM_VOL;
      var p = el.play();
      if (p && typeof p.then === "function") {
        p.then(function () {
          try { el.volume = TRAIN_BGM_VOL; } catch (e) {}
        }).catch(function () {
          // Retry once — common on iOS if load wasn't ready
          try {
            el.load();
            el.volume = TRAIN_BGM_VOL;
            el.play().then(function () {
              try { el.volume = TRAIN_BGM_VOL; } catch (e2) {}
            }).catch(function () {});
          } catch (e3) {}
        });
      }
    } catch (e) {}
  }

  function stopTrainingMusic(hard) {
    try {
      var el = getTrainingMusicEl();
      if (!el) return;
      if (hard) {
        try { el.pause(); } catch (e) {}
        try { el.volume = 0; } catch (e) {}
        return;
      }
      // Soft fade ~1s
      var startV = el.volume || TRAIN_BGM_VOL;
      var t0 = performance.now();
      (function step() {
        var p = Math.min(1, (performance.now() - t0) / 1000);
        try { el.volume = startV * (1 - p); } catch (e) {}
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          try { el.pause(); el.volume = 0; } catch (e2) {}
        }
      })();
    } catch (e) {}
  }

  function playTrainingBossMusic() {
    try {
      var train = getTrainingMusicEl();
      var boss = getTrainingBossMusicEl();
      if (!boss) return;
      boss.loop = true;
      boss.volume = 0;
      // Start boss under training track, then crossfade ~2s
      var startBoss = function () {
        var p = boss.play();
        if (p && p.then) {
          p.catch(function () {
            try { boss.load(); boss.volume = 0; boss.play().catch(function () {}); } catch (e2) {}
          });
        }
        var t0 = performance.now();
        var dur = 2200;
        var trainStart = 0;
        try { trainStart = train ? (train.volume || TRAIN_BGM_VOL) : 0; } catch (e) { trainStart = TRAIN_BGM_VOL; }
        if (window.__trainXfadeRaf) cancelAnimationFrame(window.__trainXfadeRaf);
        (function step() {
          var u = Math.min(1, (performance.now() - t0) / dur);
          // smoothstep
          var s = u * u * (3 - 2 * u);
          try { if (train) train.volume = Math.max(0, trainStart * (1 - s)); } catch (e) {}
          try { boss.volume = TRAIN_BOSS_VOL * s; } catch (e) {}
          if (u < 1) {
            window.__trainXfadeRaf = requestAnimationFrame(step);
          } else {
            try {
              if (train) { train.pause(); train.volume = 0; }
            } catch (e3) {}
            try { boss.volume = TRAIN_BOSS_VOL; } catch (e4) {}
          }
        })();
      };
      startBoss();
    } catch (e) { console.warn("playTrainingBossMusic", e); }
  }

  function stopTrainingBossMusic(hard) {
    try {
      var el = getTrainingBossMusicEl();
      if (!el) return;
      try { el.pause(); el.volume = 0; } catch (e) {}
    } catch (e) {}
  }

  function stopAllTrainingAudio() {
    stopTrainingBossMusic(true);
    stopTrainingMusic(true);
    try { trainEngineStop(); } catch (e) {}
    try { trainWindStop(); } catch (e) {}
  }

  function sfxTrainingCoin() {
    try {
      trainBeep(988, 0.07, 0.16, "sine");
      setTimeout(function () { trainBeep(1319, 0.09, 0.14, "sine"); }, 55);
    } catch (e) {}
  }
  function sfxTrainingCrystal() {
    try { trainChord([784, 988, 1175, 1568], 0.14, 0.12); } catch (e) {}
  }
  function sfxTrainingRing() {
    try {
      trainBeep(660, 0.08, 0.14, "triangle");
      setTimeout(function () { trainBeep(880, 0.1, 0.12, "triangle"); }, 70);
      setTimeout(function () { trainBeep(1320, 0.12, 0.1, "sine"); }, 140);
    } catch (e) {}
  }
  function sfxTrainingPower() {
    try { trainChord([220, 330, 440, 660], 0.2, 0.14); } catch (e) {}
  }
  function sfxTrainingLand() {
    try {
      trainBeep(196, 0.25, 0.12, "triangle");
      setTimeout(function () { trainBeep(147, 0.3, 0.1, "sine"); }, 120);
    } catch (e) {}
  }
  function sfxTrainingBossWarn() {
    try { trainBeep(80, 0.45, 0.16, "sawtooth"); } catch (e) {}
  }

  window.__airbornePlayTrainingMusic = playTrainingMusic;
  window.__airborneStopTrainingMusic = stopTrainingMusic;
  window.stopTrainingBossMusic = stopTrainingBossMusic;
  window.stopTrainingMusic = stopTrainingMusic;
  window.stopAllTrainingAudio = stopAllTrainingAudio;


  let ruffCoins = [];

  function placeTrainingPowerIcon() {
    try {
      var dock = document.getElementById("unifiedDock");
      if (dock) {
        dock.classList.add("trainingShow");
        dock.classList.add("gameActive");
        dock.classList.remove("menuHidden");
        dock.style.display = "flex";
        dock.style.opacity = "1";
        dock.style.visibility = "visible";
      }
      var meter = document.getElementById("stormMeter");
      if (meter) {
        meter.classList.add("trainingPos");
        meter.classList.remove("trainingHidden");
        meter.style.display = "flex";
        meter.style.visibility = "visible";
        meter.style.opacity = "1";
        meter.style.pointerEvents = "auto";
      }
      window.__airborneAirfieldAllowPowerup = true;
      // Training: power fully charged from the start
      try {
        if (typeof STORM_MAX === "number") {
          if (typeof stormCharge !== "undefined") stormCharge = STORM_MAX;
          if (typeof window.stormCharge !== "undefined") window.stormCharge = STORM_MAX;
        } else {
          if (typeof stormCharge !== "undefined") stormCharge = 100;
        }
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      } catch (eCh) {}
    } catch (e) {}
  }
  function clearTrainingPowerIcon() {
    try {
      var meter = document.getElementById("stormMeter");
      if (meter) {
        meter.classList.remove("trainingPos");
        meter.classList.remove("trainingHidden");
      }
      var dock = document.getElementById("unifiedDock");
      if (dock) {
        dock.classList.remove("trainingShow");
        dock.classList.remove("gameActive");
        dock.classList.add("menuHidden");
      }
    } catch (e) {}
  }

  const COIN_SCORE = 10;
  let ruffMarkers = [];
  let ruffCombo = 0;
  let ruffSkipAll = false;
  let ruffIntroDone = false;
  let ruffSparkles = [];
  let ruffIntroFly = false;
  let ruffIntroFlyT = 0;
  let ruffIntroLineArmed = false;
  let ruffPowerOrb = null;

  // Stage order
  const FLIGHT_COLLECT_STAGES = {
    altitude: true,
    rings: true,
    platforms: true,
    combined: true,
    airship: false,
    obstacles: false,
    shield: false,
    boss1: false,
    cruise: false,
    intro: false,
    takeoff: false,
    landing: false,
    report: false
  };

  const STAGE_ORDER = [
    "intro",
    "takeoff",
    "cruise",
    "altitude",
    "rings",
    "obstacles",
    "platforms",
    "shield",
    "combined",
    "boss1",
    "landing",
    "report"
  ];

  const DIALOGUE = {
    intro: [
      "Testing… testing… can you hear me, rookie?",
      "Excellent. That means the radio works.",
      "Whether the pilot works remains to be determined.",
      "I'm R.U.F.F. Your Radio Utility Flight Friend.",
      "Today I'll teach you everything before real airspace."
    ],
    takeoff: [
      "First lesson: getting off the ground.",
      "HOLD the screen to accelerate down the runway.",
      "There we go! Easy does it — you're flying now."
    ],
    cruise: [
      "Nice lift. Feel the air under her — steady as she goes."
    ],
    altitude: [
      "Your blimp doesn't just go up. You control how high she flies.",
      "Small taps. Small movements. Stay between the markers."
    ],
    crystals: [
      "See those blue crystals? Those are Sky Crystals.",
      "Collect them whenever you can — they boost your score."
    ],
    obstacles: [
      "Now let's see if you can avoid something.",
      "Birds, balloons, and other flyers will cost you a heart if you hit them.",
      "Steer around them — I recommend not flying directly into one."
    ],
    shield: [
      "See that glowing shield icon?",
      "Grab it and you'll be protected for a short time.",
      "Hits bounce off while the shield is up — very handy."
    ],
    powerup: [
      "Now THAT is something you want. Power-up ahead!",
      "Power-ups give special abilities. Use them wisely."
    ],
    rings: [
      "Alright, rookie. Time for some precision flying.",
      "Fly through the rings. Chain them for a combo."
    ],
    platforms: [
      "See those floating platforms? Use altitude to thread the path.",
      "Coins sit on top — dip and climb to scoop them up.",
      "That golden arch holds a crystal. Fly through the middle!"
    ],
    airship: [
      "Hold up — heavy traffic ahead.",
      "That's an industrial hauler. Give it a wide berth.",
      "Wait until it clears the sky before we continue."
    ],
    boss1: [
      "Incoming contact — this is the real deal, rookie.",
      "Baron Blackpowder. Bomb bay and all.",
      "The sky will darken. Stay sharp and empty that balloon."
    ],
    combined: [
      "Okay, rookie. You've learned the basics.",
      "Now let's see what you remember. Stay sharp!"
    ],
    landing: [
      "Training isn't complete until you can bring her home.",
      "Line up with the strip and ease her down."
    ],
    crash: [
      "Ground inspection complete.",
      "Well… that's one way to inspect an obstacle."
    ],
    good: [
      "Excellent.",
      "Nice.",
      "Now you're getting greedy. I like it.",
      "Keep it going!",
      "That was close.",
      "Beautiful!"
    ]
  };

  // ---------- DOM ----------

  const TRACE_STAGES = [
    "intro", "takeoff", "altitude", "rings", "obstacles",
    "platforms", "combined", "shield", "landing"
  ];
  const TRACE_LABELS = {
    intro: "Radio check",
    // takeoff suppressed,
    altitude: "Altitude",
    crystals: "Sky crystals",
    obstacles: "Obstacles",
    shield: "Shield",
    powerup: "Power-up",
    rings: "Rings",
    combined: "Combined",
    landing: "Landing",
    report: "Flight report"
  };

  function ensureFlightTraceDom() {
    // Circular meter uses CSS vars — no node DOM needed
  }

  function showLessonBanner(title) {
    if (!title) return;
    window.__airborneFtBanner = null;
    // Remove old DOM banners
    try {
      var n = document.getElementById("aaFlightBanner");
      if (n && n.parentNode) n.parentNode.removeChild(n);
    } catch (e) {}
    var key = String(title).toLowerCase();
    var style = "default";
    if (key.indexOf("flight") >= 0) style = "flight";
    else if (key.indexOf("takeoff") >= 0 || key.indexOf("take off") >= 0) style = "takeoff";
    else if (key.indexOf("altitude") >= 0) style = "altitude";
    else if (key.indexOf("ring") >= 0) style = "rings";
    else if (key.indexOf("platform") >= 0 || key.indexOf("sky") >= 0) style = "platforms";
    else if (key.indexOf("obstacle") >= 0 || key.indexOf("bird") >= 0) style = "obstacles";
    else if (key.indexOf("shield") >= 0) style = "shield";
    else if (key.indexOf("combined") >= 0 || key.indexOf("combo") >= 0) style = "combined";
    else if (key.indexOf("land") >= 0) style = "landing";
    else if (key.indexOf("boss") >= 0) style = "boss";
    else if (key.indexOf("crystal") >= 0) style = "crystals";
    else if (key.indexOf("power") >= 0) style = "powerup";
    window.__airborneLessonBanner = {
      title: String(title).toUpperCase(),
      style: style,
      t: 0,
      life: (style === "flight") ? 3.4 : 2.6,
      frame: 0
    };
    try {
      if (typeof sfxTrainingStageClear === "function") sfxTrainingStageClear();
      else if (typeof sfxRingCollect === "function") sfxRingCollect();
    } catch (eS) {}
  }
  window.__airborneShowLessonBanner = showLessonBanner;

  function showFlightTraceBanner() {
    // Only at the very start of a training run
    try {
      if (window.__airborneFlightTitleShown) return;
      showLessonBanner("Flight Training");
      window.__airborneFlightTitleShown = true;
    } catch (e) {}
  }
  function updateFlightTrainingBanner(dt) {
    var b = window.__airborneFtBanner;
    if (!b) return;
    b.t += dt;
    if (b.t >= b.life) window.__airborneFtBanner = null;
  }

  function drawFlightTrainingBanner() {
    var b = window.__airborneFtBanner;
    if (!b || typeof ctx === "undefined") return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 700;
    var u = b.t / b.life;
    var alpha = 1;
    if (u < 0.15) alpha = u / 0.15;
    else if (u > 0.75) alpha = Math.max(0, 1 - (u - 0.75) / 0.25);
    var scale = (u < 0.15) ? (0.75 + 0.25 * (u / 0.15)) : 1;
    if (u > 0.85) scale = 1 + 0.05 * ((u - 0.85) / 0.15);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "source-over";
    ctx.translate(W0 * 0.5, H0 * 0.396);
    ctx.scale(scale, scale);

    // Panel
    var text = b.text || "FLIGHT TRAINING";
    ctx.font = "800 " + Math.max(14, Math.min(26, W0 * 0.055)) + "px Rockwell, Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var tw = ctx.measureText(text).width;
    var padX = Math.max(28, W0 * 0.06);
    var padY = Math.max(16, H0 * 0.018);
    var bw = tw + padX * 2;
    var bh = Math.max(48, H0 * 0.07);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(-bw / 2 + 4, -bh / 2 + 6, bw, bh, 14);
    ctx.fill();

    // Gold border plate
    var grd = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    grd.addColorStop(0, "rgba(40,24,10,0.94)");
    grd.addColorStop(1, "rgba(20,12,6,0.96)");
    ctx.fillStyle = grd;
    roundRect(-bw / 2, -bh / 2, bw, bh, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,70,0.95)";
    ctx.lineWidth = 3;
    roundRect(-bw / 2, -bh / 2, bw, bh, 14);
    ctx.stroke();
    ctx.strokeStyle = "rgba(180,120,30,0.5)";
    ctx.lineWidth = 1.5;
    roundRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8, 10);
    ctx.stroke();

    // Text
    ctx.fillStyle = "#ffe566";
    ctx.shadowColor = "rgba(255,180,40,0.7)";
    ctx.shadowBlur = 16;
    ctx.fillText(text, 0, 1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff6c0";
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillText(text, 0, -1);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    if (!ctx) return;
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function showFlightTrace() {
    ensureFlightTraceDom();
    const el = document.getElementById("ruffFlightTrace");
    if (el) {
      el.classList.add("visible");
      el.setAttribute("aria-hidden", "false");
    }
  }

  function hideFlightTrace() {
    try {
      const el = document.getElementById("ruffFlightTrace");
      if (el) {
        el.classList.remove("visible");
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
  }

  function updateFlightTrace(stage) {
    showFlightTrace();
    const idx = TRACE_STAGES.indexOf(stage);
    const total = TRACE_STAGES.length;
    // Fill as solid circular bar (0 → full across lessons)
    const progress = idx < 0 ? 0 : Math.min(1, (idx + 1) / total);
    const deg = progress * 360;
    const meter = document.getElementById("ruffFlightTraceMeter");
    const fill = document.getElementById("ruffFlightTraceFill");
    const pct = document.getElementById("ruffFlightTracePct");
    if (meter) {
      meter.style.setProperty("--ft-progress", deg + "deg");
      // Bounce on every lesson change
      meter.classList.remove("ft-bounce");
      void meter.offsetWidth;
      meter.classList.add("ft-bounce");
    }
    if (fill) fill.style.setProperty("--ft-progress", deg + "deg");
    // Center shows run timer (updated each frame from main loop)
    if (pct && typeof elapsedMs === "number") {
      const totalSec = Math.floor(elapsedMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      pct.textContent = m + ":" + String(s).padStart(2, "0");
    }
    const lab = document.getElementById("ruffFlightTraceLabel");
    if (lab) { lab.textContent = ""; lab.style.display = "none"; }
  }

  function radioEl() { return document.getElementById("ruffRadio"); }
  function radioText() { return document.getElementById("ruffText"); }
  function titleEl() { return document.getElementById("ruffTitleBanner"); }
  function reportEl() { return document.getElementById("ruffReport"); }

  function ensureSkipHandler() {
    const btn = document.getElementById("ruffSkipBtn");
    if (btn && !btn._ruffBound) {
      btn._ruffBound = true;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        skipLine();
      });
    }
    const cont = document.getElementById("ruffContinueBtn");
    if (cont) {
      cont.textContent = "RETURN TO HANGAR ▶";
      cont.onclick = function (e) {
        try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
        try { if (typeof sfxClick === "function") sfxClick(); } catch (err) {}
        if (typeof finishToHangar === "function") finishToHangar();
        else if (window.__airborneFinishToHangar) window.__airborneFinishToHangar();
        else finishToMap();
      };
      cont.style.pointerEvents = "auto";
      cont.style.zIndex = "80";
    }
  }

  // ---------- Voice (Web Speech — radio-ish) ----------
  function speakLine(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.84;  // slower, more natural
      u.pitch = 0.82;
      u.rate = Math.max(0.75, Math.min(0.95, u.rate));
      u.volume = (typeof sfxVolume === "number" ? sfxVolume : 0.7);
      // Prefer a lower male-ish voice if available
      const voices = window.speechSynthesis.getVoices() || [];
      const pick = voices.find(v => /en/i.test(v.lang) && /male|daniel|fred|alex|david/i.test(v.name))
        || voices.find(v => /en/i.test(v.lang))
        || null;
      if (pick) u.voice = pick;
      u.onend = function () { ruffSpeechDone = true; };
      u.onerror = function () { ruffSpeechDone = true; };
      window.speechSynthesis.speak(u);
      // Safety: force done after estimated speak time
      const safe = Math.max(5, text.length * 0.08 + 2.5);
      setTimeout(function () { ruffSpeechDone = true; }, safe * 1000);
    } catch (e) { ruffSpeechDone = true; }
  }

  function stopSpeak() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  }

  // ---------- Radio UI ----------
  function showRadio(text, duration) {
    // Ruff voice/dialog muted for now
    if (window.__airborneRuffMuted !== false) {
      try { hideRadio(); } catch (e) {}
      ruffSpeechDone = true;
      return;
    }
    ensureSkipHandler();
    const el = radioEl();
    const tx = radioText();
    if (!el || !tx) return;
    tx.textContent = text;
    el.classList.add("visible", "speaking");
    ruffSpeakClose = 1;
    ruffLineT = 0;
    ruffSpeechDone = false;
    // Hold long enough to finish the full sentence (+ pause after)
    const est = Math.max(4.5, text.length * 0.075 + 2.0);
    ruffLineDuration = duration || est;
    speakLine(text);
  }
  let ruffLineDuration = 5;
  let ruffSpeechDone = true;

  function hideRadio() {
    const el = radioEl();
    if (el) el.classList.remove("visible", "speaking");
    ruffSpeakClose = 0;
    stopSpeak();
  }

  function setLessonPopup(kind) {
    let el = document.getElementById("ruffLessonPopup");
    if (!el) {
      el = document.createElement("div");
      el.id = "ruffLessonPopup";
      el.innerHTML = '<img id="ruffLessonImg" alt=""/><span id="ruffLessonLabel"></span>';
      document.body.appendChild(el);
    }
    const img = document.getElementById("ruffLessonImg");
    const lab = document.getElementById("ruffLessonLabel");
    const map = {
      crystals: { key: "blue_crystal_01", label: "SKY CRYSTAL" },
      obstacles: { key: "bird_01", label: "OBSTACLE" },
      powerup: { key: "cloud", label: "POWER-UP" },
      rings: { key: null, label: "GOLD RING" },
      altitude: { key: null, label: "ALTITUDE" },
      landing: { key: "landing_field", label: "LANDING" },
      shield: { key: "shieldPickup", label: "SHIELD" }
    };
    const info = map[kind];
    if (!info) { el.classList.remove("visible"); return; }
    lab.textContent = info.label;
    // try image keys
    let srcImg = null;
    if (info.key && typeof images !== "undefined" && images[info.key] && images[info.key].naturalWidth) {
      srcImg = images[info.key];
    } else if (kind === "crystals") {
      for (let i = 1; i <= 5; i++) {
        const k = "blue_crystal_" + String(i).padStart(2, "0");
        if (images[k] && images[k].naturalWidth) { srcImg = images[k]; break; }
      }
    } else if (kind === "powerup") {
      for (const k of ["power_icon_blimp5", "cloud", "pirate_bomb"]) {
        if (images[k] && images[k].naturalWidth) { srcImg = images[k]; break; }
      }
    } else if (kind === "obstacles") {
      // any bird frame
      for (const k of Object.keys(images || {})) {
        if (/bird|balloon|mini_blimp/i.test(k) && images[k].naturalWidth) { srcImg = images[k]; break; }
      }
    }
    if (srcImg && srcImg.src) {
      img.src = srcImg.src;
      img.style.display = "";
    } else {
      img.style.display = "none";
    }
    el.classList.add("visible");
  }
  function hideLessonPopup() {
    const el = document.getElementById("ruffLessonPopup");
    if (el) el.classList.remove("visible");
  }

  function showTitle(text, ms) {
    const el = titleEl();
    if (!el) return;
    el.textContent = text;
    el.classList.add("visible");
    setTimeout(function () { el.classList.remove("visible"); }, ms || 2200);
  }

  function skipLine() {
    ruffLineT = ruffLineDuration;
    stopSpeak();
  }

  // ---------- Stage control ----------
  function setStage(name) {
    // Hard rule: never jump rings → platforms (must be obstacles first)
    if ((ruffStage === "rings" || window.__airborneRuffStage === "rings") && name === "platforms") {
      name = "obstacles";
      console.log("[R.U.F.F.] rings→platforms blocked; forcing obstacles");
    }
    try {
      if (ruffStage === "rings" && name !== "rings" && window.__airborneComputeRingRank) {
        window.__airborneComputeRingRank();
        var rk = ruffStats.ringRank || "";
        if (ruffStats.ringPerfectFlight) {
          /* no rank banner */
        } else if (rk) {
          /* no rank banner */
        }
      }
    } catch (eRank) {}

    if (!name) return;
    // Boss BGM continues through landing/report until hangar reset
    // (only stopped by stopAllTrainingAudio / hangar)

    ruffStage = name;
    // Lesson name banner
    try {
      var lessonTitles = {
        intro: "Flight Training",
        // takeoff: no title popup
        // cruise: skip — already shown at intro
        // altitude / rings: no banner
        obstacles: "Obstacles",
        shield: "Shield",
        combined: "Combined Practice",
        boss1: "Boss Fight",
        landing: "Landing",
        // report: no lesson banner
      };
      // Lesson banners — skip takeoff; Flight Training only once per run
      if (name !== "report" && name !== "platforms" && name !== "takeoff" && name !== "cruise" && lessonTitles[name]) {
        if (name === "intro") {
          window.__airborneFlightTitleShown = false; // reset so title always shows at run start
          showLessonBanner("Flight Training");
          window.__airborneFlightTitleShown = true;
        } else if (lessonTitles[name] && lessonTitles[name] !== "Flight Training") {
          showLessonBanner(lessonTitles[name]);
        }
      }
    } catch (eBan) {}

    ruffStageT = 0;
    ruffLessonPendingNext = false;
    ruffLessonClearing = false;
    ruffLessonPauseT = 0;
    ruffLineIdx = 0;
    ruffLines = (DIALOGUE && DIALOGUE[name]) ? DIALOGUE[name].slice() : [];
    ruffWaitingInput = false;
    ruffWaitingCollect = 0;
    ruffWaitingAvoid = false;
    ruffWaitingRing = 0;
    window.__airborneRuffStage = name;
    window.__airborneTrainingFlight = true;
    window.__airborneRuffActive = true;
    ruffActive = true;

    window.__airborneAirfieldAllowShield = (name === "shield" || name === "combined");
    if (!window.__airborneAirfieldAllowShield) {
      try { shieldPickup = null; } catch (e) {}
    }
    window.__airborneAirfieldAllowPowerup = true;

    try {
      if (typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      }
    } catch (e) {}
    try { placeTrainingPowerIcon(); } catch (e) {}

    // Progress UI — show dock + update percent
    try {
      var stages = ["intro","takeoff","cruise","altitude","rings","obstacles","platforms","shield","combined","boss1","landing","report"];
      var si = stages.indexOf(name);
      if (si < 0) si = 0;
      var pct = (name === "report" || name === "landing") ? 100 : ((si / (stages.length - 1)) * 100);
      if (typeof window.updateUnifiedProgress === "function") window.updateUnifiedProgress(pct);
      var dock = document.getElementById("unifiedDock");
      if (dock) {
        dock.classList.add("trainingShow");
        dock.classList.add("gameActive");
        dock.classList.remove("menuHidden");
        dock.style.display = "";
        dock.style.visibility = "visible";
      }
      var sm = document.getElementById("stormMeter");
      if (sm) {
        sm.classList.add("trainingPos");
        sm.classList.remove("trainingHidden");
        sm.style.display = "flex";
        sm.style.visibility = "visible";
      }
    } catch (e) {}
    try { updateFlightTrace(name); } catch (e) {}
    try { showFlightTrace(); } catch (e) {}

    if (name !== "powerup") ruffPowerOrb = null;
    if (typeof powerup !== "undefined" && name !== "powerup" && name !== "combined") {
      try { powerup = null; } catch (e) {}
    }

    try {
      if (name !== "report" && name !== "idle" && (!ruffBgBalloons || !ruffBgBalloons.length)) {
        spawnTrainingBgBalloons();
      }
    } catch (e) {}

    try {
      if (ruffLines && ruffLines.length && name !== "report") {
        showRadio(ruffLines[0], name === "intro" ? 2.2 : 3.0);
        ruffLineIdx = 0;
        ruffLineT = 0;
      }
    } catch (e) {}

    // Per-stage setup
    if (name === "intro") {
      ruffIntroFly = true;
      ruffIntroFlyT = 0;
      window.__airborneRuffIntroFly = true;
      window.__airborneRuffIntroT = 0;
      window.__airborneRuffFollowBlend = 0;
      ruffX = (typeof W !== "undefined" ? W : 400) * 0.92;
      ruffY = (typeof H !== "undefined" ? H : 600) * 0.22;
      ruffLineDuration = 3.5;
      ruffSpeechDone = true;
      ruffIntroLineArmed = false;
    } else if (name === "takeoff") {
      ruffIntroFly = false;
      window.__airborneRuffIntroFly = false;
      window.__airborneAirfieldPaused = false;
      window.__airborneResetRunway = true;
      try {
        if (typeof airfieldDriveDist !== "undefined") airfieldDriveDist = 0;
        if (typeof airfieldPhaseT !== "undefined") airfieldPhaseT = 0;
        if (typeof airfieldTakeoffSpeed !== "undefined") airfieldTakeoffSpeed = 50;
        if (typeof airfieldPhase !== "undefined") airfieldPhase = "taxi";
      } catch (e) {}
      window.__airborneAirfieldPhase = "taxi";
      try { trainEngineStart(); trainWindStart(); } catch (e) {}
    } else if (name === "cruise") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      try { ruffCoins = []; ruffCrystals = []; } catch (e) {}
    } else if (name === "altitude") {
      // no Flight Training banner here (only once at intro)
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      try { spawnAltitudeMarkers(); } catch (e) {}
      try { spawnTrainingCoins(6); spawnCrystals(3); } catch (e) {}
    } else if (name === "rings") {
      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 199; // rings -5% again
      window.__airborneRingSpawned = 0;
      window.__airborneRingSpawnT = 0;
      window.__airborneRingsPreSpawned = false;
      window.__airborneRingTotalTarget = 20;
      window.__airborneRingSpawned = 0;
      window.__airborneRingSerial = 0;
      window.__airborneRingSpawnT = 1.2; // first ring almost immediately
      // Clear any leftover rings via real API
      try {
        var arr = window.__airborneGetObstacles && window.__airborneGetObstacles();
        if (arr && arr.length) {
          for (var zi = arr.length - 1; zi >= 0; zi--) {
            var zo = arr[zi];
            if (zo && (zo.isRing || zo.type === "gold_ring")) arr.splice(zi, 1);
          }
        }
      } catch (eClr) {}
      window.__airborneRingResultsShown = false;
      console.log("[R.U.F.F.] rings stage start — sequential 20");
      window.__airborneRingMult = 1;
      ruffStats.rings = 0;
      ruffStats.ringMisses = 0;
      ruffStats.ringStreak = 0;
      ruffStats.ringBestStreak = 0;
      ruffStats.ringPerfects = 0;
      ruffStats.ringScore = 0;
      ruffStats.ringRank = "";
      ruffStats.ringPerfectFlight = false;
      window.__airborneRingHud = { streak: 0, mult: 1, score: 0, lastPts: 0, flash: 0, title: "" };
    } else if (name === "platforms") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      try { spawnTrainingPlatformsLesson(); } catch (e) { console.warn("platforms", e); }
    } else if (name === "obstacles") {
      try { showLessonBanner("Obstacles"); } catch (eBan) {}
      window.__airborneAirfieldObstacles = true;
      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldInvuln = false; // allow collision damage
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.174;
      try { if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 198; } catch (e) {}
      // Hard clear platforms so they cannot appear after rings
      try {
        ruffPlatforms = [];
        window.__airborneRuffPlatforms = [];
        ruffCoins = (ruffCoins || []).filter(function (c) { return c && !c.fixedToPlatform; });
        ruffCrystals = (ruffCrystals || []).filter(function (c) { return c && !c.fixedToPlatform; });
      } catch (e) {}
    } else if (name === "shield") {
      try {
        ruffCoins = (ruffCoins || []).filter(function (c) { return c && c.fixedToPlatform && !c.collected; });
        ruffCrystals = (ruffCrystals || []).filter(function (c) { return c && c.fixedToPlatform && !c.collected; });
      } catch (e) {}
      window.__airborneAirfieldObstacles = true;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.75;
    } else if (name === "airship") {
      // Airship removed — skip straight to combined
      window.__airborneAirfieldRings = true;
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.95;
      ruffAirship = null;
      try { ruffCoins = []; ruffCrystals = []; } catch (e) {}
      try { spawnTrainingPlatformsLesson(); } catch (e) {}
      // Rewrite stage to combined so UI/progress match
      ruffStage = "combined";
      window.__airborneRuffStage = "combined";
    } else if (name === "combined") {
      try { showLessonBanner("Combined"); } catch (eBan) {}
      window.__airborneTrainingBoss = false;
      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldObstacles = true;
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.63; // +50% birds
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 200;
      ruffAirship = null;
      // No rings in combined — platforms + birds only
      window.__airborneRingSpawned = 999;
      try { ruffCoins = []; ruffCrystals = []; } catch (e) {}
      try { spawnTrainingPlatformsLesson(); } catch (e) { console.warn("combined plats", e); }
    } else if (name === "boss1") {
      // Only hard-clear leftovers; prefer natural scroll-off before boss
      try {
        ruffCoins = [];
        ruffCrystals = [];
        ruffPlatforms = [];
        window.__airborneRuffPlatforms = [];
      } catch (e) {}
      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldObstacles = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      window.__airborneTrainingBoss = true;
      window.__airborneTrainingBossDone = false;
      window.__airborneTrainingBossTried = false;
      try { playTrainingBossMusic(); } catch (e) {}
    } else if (name === "landing") {
      window.__airborneRuffRequestLand = true;
    }

    try { if (typeof syncStageFlags === "function") syncStageFlags(); } catch (e) {}
    console.log("[R.U.F.F.] setStage", name);
  }

  function updateFlightCollectibles(dt) {
    var st = ruffStage || window.__airborneRuffStage || "";
    // Platforms keep moving + coins collectible until they scroll off
    if ((ruffPlatforms && ruffPlatforms.length) || st === "platforms" || st === "combined") {
      try { updateTrainingPlatforms(dt); } catch (e) {}
      try { updateTrainingCoins(dt); } catch (e) {}
      try { updateCrystals(dt); } catch (e) {}
      return;
    }
    if (st === "intro" || st === "takeoff" || st === "cruise" || st === "obstacles" ||
        st === "shield" || st === "boss1" || st === "report" || st === "idle" || st === "landing") {
      return;
    }
    if (FLIGHT_COLLECT_STAGES && FLIGHT_COLLECT_STAGES[st] === false) return;
    try { updateCrystals(dt); } catch (e) {}
    try { updateTrainingCoins(dt); } catch (e) {}
  }

  function syncStageFlags() {
    // Do NOT force obstacleSpeed or unpause during intro/runway
    if (ruffStage === "intro" || ruffStage === "takeoff") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof powerup !== "undefined") powerup = null;
    } else if (ruffStage === "altitude") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
    }
  }

  function advanceLine() {
    ruffLineIdx++;
    if (ruffLineIdx < ruffLines.length) {
      showRadio(ruffLines[ruffLineIdx]); // full natural duration
      return false;
    }
    hideRadio();
    return true; // finished lines
  }

  function nextStage() {
    try { sfxTrainingStageClear(); } catch (e) {}
    const i = STAGE_ORDER.indexOf(ruffStage);
    if (i < 0 || i >= STAGE_ORDER.length - 1) {
      setStage("report");
      return;
    }
    setStage(STAGE_ORDER[i + 1]);
  }

  // Gate: wait until lesson items leave/collected, then 2s pause, then nextStage
  var ruffLessonClearing = false;
  var ruffLessonPauseT = 0;
  var ruffLessonPendingNext = false;

  function stopLessonSpawns() {
    window.__airborneAirfieldObstacles = false;
    window.__airborneAirfieldRings = false;
    if (typeof spawnInterval !== "undefined") spawnInterval = 999;
  }

  function lessonItemsPending() {
    var pending = 0;
    try {
      if (ruffCrystals && ruffCrystals.length) {
        pending += ruffCrystals.filter(function (c) { return c && !c.collected && c.x > -60; }).length;
      }
      if (ruffCoins && ruffCoins.length) {
        pending += ruffCoins.filter(function (c) { return c && !c.collected && c.x > -60; }).length;
      }
      if (typeof obstacles !== "undefined" && obstacles && obstacles.length) {
        pending += obstacles.filter(function (o) {
          return o && o.x + (o.w || 0) > -40;
        }).length;
      }
      if (window.__airborneFirePickup && !window.__airborneFirePickup.collected && window.__airborneFirePickup.x > -60) {
        pending += 1;
      }
      if (typeof shieldPickup !== "undefined" && shieldPickup && shieldPickup.x > -50) {
        pending += 1;
      }
      if (typeof powerup !== "undefined" && powerup && powerup.x > -50) {
        pending += 1;
      }
      if (ruffAirship && ruffAirship.x + (ruffAirship.w || 0) > -40) {
        pending += 1;
      }
    } catch (e) {}
    return pending;
  }

  function requestNextStage() {
    // Start clearing current lesson items
    if (!ruffLessonPendingNext) {
      ruffLessonPendingNext = true;
      ruffLessonClearing = true;
      ruffLessonPauseT = 0;
      stopLessonSpawns();
    }
  }

  function tickLessonGate(dt) {
    if (!ruffLessonPendingNext) return;
    ruffLessonPauseT += dt;
    // Never soft-lock: after 0.6s always advance
    if (ruffLessonPauseT >= 0.6) {
      try { stopLessonSpawns(); } catch (e) {}
      ruffLessonPendingNext = false;
      ruffLessonClearing = false;
      ruffLessonPauseT = 0;
      nextStage();
    }
  }


  // ---------- Floating training platforms (steampunk sky docks) ----------
  var ruffPlatforms = [];
  var PLATFORM_SCROLL_SPEED = 41.1; // ~15% faster so full set clears ~10s sooner
  var PLATFORM_KEYS = [
    "island_barrel_platform", "island_gear_wheel_platform", "island_ring_portal_blue",
    "island_market_stall", "island_tiny_rock_grass", "island_tiny_rock_mossy", "island_propeller_platform",
    "island_gazebo", "island_cherry_blossom", "prop_tree_standalone", "island_tree_lamppost", "island_signpost"
  ];

  function spawnTrainingPlatformsLesson() {
    ruffPlatforms = [];
    ruffCoins = (ruffCoins || []).filter(function (c) { return c && c.fixedToPlatform; });
    ruffCrystals = (ruffCrystals || []).filter(function (c) { return c && c.fixedToPlatform; });
    // Clear free-float collectibles
    ruffCoins = [];
    ruffCrystals = [];

    var W0 = (typeof W !== "undefined" ? W : 400);
    var H0 = (typeof H !== "undefined" ? H : 600);
    // Strategic vertical lanes: low / mid-low / mid / mid-high / high
    // Sequence teaches: climb, dive, weave, arch crystal, climb again
    var sequence = [
      // Vertical lanes spread 0.28–0.72; large horizontal gaps
      // Crystals
      { key: "island_barrel_platform",     yFrac: 0.50, gap: 1.85, coinMode: "none", crystal: true },
      { key: "island_gear_wheel_platform", yFrac: 0.68, gap: 1.80, coinMode: "deck", coins: 3, crystal: true },
      { key: "island_ring_portal_blue",    yFrac: 0.32, gap: 1.90, coinMode: "none", crystal: true },
      // Coins
      { key: "island_market_stall",        yFrac: 0.58, gap: 1.85, coinMode: "deck", coins: 4 },
      { key: "island_tiny_rock_grass",     yFrac: 0.72, gap: 1.70, coinMode: "sparse", coins: 2 },
      { key: "island_tiny_rock_mossy",     yFrac: 0.28, gap: 1.70, coinMode: "sparse", coins: 2 },
      { key: "island_propeller_platform",  yFrac: 0.42, gap: 1.90, coinMode: "deck", coins: 4 },
      // Empty
      { key: "island_gazebo",              yFrac: 0.55, gap: 1.80, coinMode: "none" },
      { key: "island_cherry_blossom",      yFrac: 0.35, gap: 1.85, coinMode: "none" },
      { key: "prop_tree_standalone",       yFrac: 0.62, gap: 1.70, coinMode: "none" },
      { key: "island_tree_lamppost",       yFrac: 0.30, gap: 1.75, coinMode: "none" },
      { key: "island_signpost",            yFrac: 0.70, gap: 1.70, coinMode: "none" }
    ];
    var x = W0 + 100; // always enter from right — never pop in mid-screen
    sequence.forEach(function (spec, idx) {
      var img = (typeof images !== "undefined" && images) ? images[spec.key] : null;
      var aspect = (img && img.naturalWidth && img.naturalHeight)
        ? (img.naturalWidth / img.naturalHeight) : 2.2;
      var h = Math.min(H0 * 0.30, 150);
      if (spec.key === "island_ring_portal_blue" || spec.key === "island_stone_arch") h = Math.min(H0 * 0.30, 140);
      if (spec.key === "island_barrel_platform" || spec.key.indexOf("tiny") >= 0) h = Math.min(H0 * 0.16, 85);
      if (spec.key === "island_signpost") h = Math.min(H0 * 0.26, 125);
      if (spec.key === "island_propeller_platform" || spec.key === "island_market_stall") h = Math.min(H0 * 0.26, 125);
      if (spec.key === "island_greenhouse_factory" || spec.key === "island_cherry_blossom") h = Math.min(H0 * 0.32, 150);
      if (spec.key === "island_gazebo" || spec.key === "island_watchtower_windsock") h = Math.min(H0 * 0.30, 140);
      if (spec.key === "island_crane" || spec.key === "island_crate_platform") h = Math.min(H0 * 0.24, 120);
      var w = h * aspect;
      // Cap width so platforms stay readable
      if (w > W0 * 0.85) { w = W0 * 0.85; h = w / aspect; }
      var y = H0 * spec.yFrac;
      var plat = {
        key: spec.key,
        x: x,
        y: y,
        w: w,
        h: h,
        speed: PLATFORM_SCROLL_SPEED,
        crystal: !!spec.crystal,
        phase: Math.random() * Math.PI * 2,
        // Mechanical parts behind hull — varied, not frantic
        props: [],
        gears: [],
        dirt: []
      };
      // propellers removed



      ruffPlatforms.push(plat);
      window.__airborneRuffPlatforms = ruffPlatforms;
      // Coins on best landing surfaces; crystal only on barrel platform
      if (spec.coinMode && spec.coinMode !== "none") {
        placeCoinsOnPlatform(plat, spec.coins || 2, spec.coinMode);
      }
      if (spec.crystal) placeCrystalOnBarrel(plat);
      x += w * spec.gap + 90;
    });
  }

  function placeCoinsOnPlatform(plat, count, mode) {
    count = count || 2;
    mode = mode || "deck";
    var coinR = 13;
    // Deck sits near upper third of sprite for most islands
    var topY = -plat.h * (mode === "sparse" ? 0.425 : 0.486); // elevated on deck
    var pad = mode === "sparse" ? plat.w * 0.28 : plat.w * 0.18;
    var usable = Math.max(24, plat.w - pad * 2);
    count = Math.max(1, Math.min(count, Math.floor(usable / (coinR * 2.2))));
    for (var i = 0; i < count; i++) {
      var t = (i + 0.5) / count;
      ruffCoins.push({
        x: plat.x + pad + t * usable,
        y: plat.y + topY,
        r: coinR,
        bob: Math.random() * Math.PI * 2,
        collected: false,
        fixedToPlatform: true,
        platRef: plat,
        platOffX: pad + t * usable,
        platOffY: topY,
        frame: 0,
        frameT: 0,
        speed: plat.speed
      });
    }
  }

  function placeCrystalOnBarrel(plat) {
    // Center of barrel / glass dome platform (second asset)
    ruffCrystals.push({
      x: plat.x + plat.w * 0.5,
      y: plat.y - plat.h * 0.25,
      r: 20,
      frame: 0,
      frameT: 0,
      collected: false,
      fixedToPlatform: true,
      platRef: plat,
      platOffX: plat.w * 0.5,
      platOffY: -plat.h * 0.25
    });
  }

  function updateTrainingPlatforms(dt) {
    if (!ruffPlatforms || !ruffPlatforms.length) return;
    var now = performance.now() / 1000;
    ruffPlatforms.forEach(function (p) {
      if (p.squash) p.squash = Math.max(0, p.squash - dt * 0.85); // slow spring recovery

      p.speed = PLATFORM_SCROLL_SPEED;
      p.x -= PLATFORM_SCROLL_SPEED * dt;
      // mark off-screen for prune
      if (p.x + (p.w || 0) < -40) p._off = true;
      if (p.squash) p.squash = Math.max(0, p.squash - dt * 0.75);
      // Dynamic motion: gentle bob + slow sway
      p.bobT = (p.bobT || Math.random() * 10) + dt;
      p.bobY = Math.sin(p.bobT * 1.4 + (p.phase || 0)) * 5 + (p.squash ? p.squash * 14 : 0);
      // Symmetric dip — same speed down and up (~70 px/s)
      p.dipY = p.dipY || 0;
      p.dipTarget = (p.dipTarget != null) ? p.dipTarget : 0;
      var dipSpd = 70;
      if (p.dipTarget > 0) {
        // moving down toward target
        if (p.dipY < p.dipTarget) {
          p.dipY = Math.min(p.dipTarget, p.dipY + dipSpd * dt);
          if (p.dipY >= p.dipTarget - 0.5) {
            p.dipTarget = 0; // reached bottom — start return
          }
        }
      } else if (p.dipY > 0) {
        // moving back up
        p.dipY = Math.max(0, p.dipY - dipSpd * dt);
      }
      p.bobY += p.dipY;
      p.sway = Math.sin(p.bobT * 0.7 + (p.phase || 0)) * 3;
            // Soft dirt — 50% less volume, lighter drift
      p.dirt = p.dirt || [];
      if (Math.random() < 0.025) {
        p.dirt.push({
          x: (Math.random() - 0.5) * p.w * 0.55,
          y: p.h * 0.28,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 0.6 + Math.random() * 1.4,
          life: 2.0 + Math.random() * 1.2,
          age: 0,
          r: 0.6 + Math.random() * 1.0,
          soft: true
        });
      }
      for (var di = p.dirt.length - 1; di >= 0; di--) {
        var d = p.dirt[di];
        d.age += dt;
        d.x += d.vx * dt * 0.18;
        d.y += d.vy * dt * 0.18;
        d.vy += 1.8 * dt;
        d.vx *= (1 - 0.1 * dt);
        if (d.age >= d.life) p.dirt.splice(di, 1);
      }
      // Soft steam puffs
      p.fxT = (p.fxT || 0) - dt;
      if (p.fxT <= 0) {
        p.fxT = 0.18 + Math.random() * 0.25;
        p.fx = p.fx || [];
        p.fx.push({
          x: p.w * (0.25 + Math.random() * 0.5),
          y: -p.h * 0.3,
          vx: (Math.random() - 0.5) * 16,
          vy: -20 - Math.random() * 30,
          life: 0.55 + Math.random() * 0.4,
          age: 0,
          r: 4 + Math.random() * 7,
          kind: "steam"
        });
        if (p.fx.length > 14) p.fx.splice(0, p.fx.length - 14);
      }
      (p.fx || []).forEach(function (f) {
        f.age += dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.r += dt * 8;
      });
      p.fx = (p.fx || []).filter(function (f) { return f.age < f.life; });
    });
    // Solid platforms — blimp cannot pass through
    if (typeof player !== "undefined" && player) {
      ruffPlatforms.forEach(function (p) {
      // Soft squash recovery (cartoon)
      if (p.squash) p.squash = Math.max(0, p.squash - dt * 0.85);
      // Dirt continuously dribbles off earthy bottoms
      p.dirt = p.dirt || [];
      if (Math.random() < 0.35) {
        p.dirt.push({
          x: (Math.random() - 0.5) * p.w * 0.8,
          y: p.h * 0.42,
          vx: (Math.random() - 0.5) * 20,
          vy: 30 + Math.random() * 50,
          life: 0.5 + Math.random() * 0.5,
          age: 0,
          r: 1.2 + Math.random() * 2.2
        });
      }
      for (var di = p.dirt.length - 1; di >= 0; di--) {
        var d = p.dirt[di];
        d.age += dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 120 * dt;
        if (d.age >= d.life) p.dirt.splice(di, 1);
      }
        // Top hitbox lowered 20% (less restriction on deck)
        var top = p.y - p.h * 0.5 + p.h * 0.20 + (p.bobY || 0);
        var bot = p.y + p.h * 0.5 + (p.bobY || 0);
        var left = p.x + (p.sway || 0) + p.w * 0.06;
        var right = p.x + p.w + (p.sway || 0) - p.w * 0.06;
        var px = player.x, py = player.y;
        var hw = player.w * 0.38, hh = player.h * 0.38;
        if (px + hw > left && px - hw < right && py + hh > top && py - hh < bot) {
          var dL = (px + hw) - left;
          var dR = right - (px - hw);
          var dT = (py + hh) - top;
          var dB = bot - (py - hh);
          var m = Math.min(dL, dR, dT, dB);
          if (m === dT) {
            // Loose cartoon trampoline + platform dips down then springs back
            player.y = top - hh - 1;
            var impact = Math.abs(player.vy || 0);
            var bounce = Math.min(195, Math.max(70, impact * 0.62 + 55));
            player.vy = -bounce;
            p.squash = 0.32;
            p.springT = 0.55;
            // Physical dip: move platform down, then ease back up
            // Start a symmetric dip (down then up at same speed)
            p.dipTarget = Math.min(34.5, Math.max(16, (12 + impact * 0.05) * 1.15)); // +15% deeper
            p.dirt = p.dirt || [];
            for (var di = 0; di < 10; di++) {
              p.dirt.push({
                x: (Math.random() - 0.5) * p.w * 0.6,
                y: p.h * 0.3,
                vx: (Math.random() - 0.5) * 40,
                vy: 8 + Math.random() * 22,
                life: 0.9 + Math.random() * 0.7,
                age: 0,
                r: 1.2 + Math.random() * 2.2
              });
            }
            try {
              if (window.__airborneFlapPulse) window.__airborneFlapPulse();
            } catch (eB) {}
            // Bounce SFX
            try {
              trainBeep(180, 0.06, 0.14, "triangle");
              setTimeout(function () { try { trainBeep(140, 0.08, 0.1, "sine"); } catch (e) {} }, 50);
            } catch (eSfx) {}
            // Dust puff at contact
            try {
              var hx = player.x + (player.w || 40) * 0.5;
              var hy = top;
              p.dirt = p.dirt || [];
              for (var dpi = 0; dpi < 14; dpi++) {
                p.dirt.push({
                  x: (Math.random() - 0.5) * p.w * 0.5,
                  y: p.h * 0.2,
                  vx: (Math.random() - 0.5) * 50,
                  vy: -20 - Math.random() * 40,
                  life: 0.45 + Math.random() * 0.35,
                  age: 0,
                  r: 1.5 + Math.random() * 2.5
                });
              }
              if (typeof particles !== "undefined" && particles) {
                for (var pi = 0; pi < 10; pi++) {
                  particles.push({
                    x: hx + (Math.random() - 0.5) * 40,
                    y: hy,
                    vx: (Math.random() - 0.5) * 80,
                    vy: -30 - Math.random() * 50,
                    life: 0.5 + Math.random() * 0.3,
                    color: ["#c4b59a", "#a89878", "#ddd4c4"][pi % 3],
                    size: 3 + Math.random() * 5
                  });
                }
              }
            } catch (eDust) {}
          } else if (m === dB) {
            player.y = bot + hh + 1;
            player.vy = Math.max(Math.abs(player.vy) * 0.25 + 40, 30);
          } else if (m === dL) {
            player.x = left - hw - 1;
            player.vy = Math.min(player.vy, -45);
          } else {
            player.x = right + hw + 1;
            player.vy = Math.min(player.vy, -35);
          }
        }
      });
    }
    // Prune platforms that fully left the screen
    try {
      if (ruffPlatforms && ruffPlatforms.length) {
        ruffPlatforms = ruffPlatforms.filter(function (p) { return p && !p._off; });
        window.__airborneRuffPlatforms = ruffPlatforms;
      }
    } catch (eOff) {}
    // Keep fixed coins/crystal locked to platform tops
    (ruffCoins || []).forEach(function (c) {
      if (!c.fixedToPlatform || !c.platRef) return;
      var p = c.platRef;
      c.x = p.x + c.platOffX + (p.sway || 0);
      c.y = p.y + c.platOffY + (p.bobY || 0);
      c.speed = p.speed;
    });
    (ruffCrystals || []).forEach(function (c) {
      if (!c.fixedToPlatform || !c.platRef) return;
      var p = c.platRef;
      c.x = p.x + (c.platOffX || 0) + (p.sway || 0);
      c.y = p.y + (c.platOffY || 0) + (p.bobY || 0);
    });
    ruffPlatforms = ruffPlatforms.filter(function (p) { return p.x + p.w > 0; }); // fully off left edge
    window.__airborneRuffPlatforms = ruffPlatforms;
    try { syncPlatformDomOverlays(); } catch (eDom) {}
  }


  function drawMechGear(ctx, x, y, r, ang, teeth) {
    teeth = teeth || 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * Math.PI * 2;
      var a1 = ((i + 0.35) / teeth) * Math.PI * 2;
      var a2 = ((i + 0.5) / teeth) * Math.PI * 2;
      var a3 = ((i + 0.85) / teeth) * Math.PI * 2;
      var rOut = r;
      var rIn = r * 0.72;
      if (i === 0) ctx.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
      ctx.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
      ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
      ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
      ctx.lineTo(Math.cos(a3) * rIn, Math.sin(a3) * rIn);
    }
    ctx.closePath();
    var gg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r);
    gg.addColorStop(0, "#c4a574");
    gg.addColorStop(0.55, "#8a6a3a");
    gg.addColorStop(1, "#3a2810");
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = "rgba(40,28,12,0.75)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "#2a1c0c";
    ctx.fill();
    ctx.strokeStyle = "rgba(212,175,55,0.5)";
    ctx.stroke();
    ctx.restore();
  }

  function drawMechProp(ctx, x, y, r, ang, blades) {
    blades = blades || 3;
    ctx.save();
    ctx.translate(x, y);
    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#5a4830";
    ctx.fill();
    ctx.strokeStyle = "rgba(212,175,55,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Blades
    for (var i = 0; i < blades; i++) {
      var a = ang + (i / blades) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.35, -r * 0.18, r * 0.95, -r * 0.08);
      ctx.quadraticCurveTo(r * 0.5, 0, r * 0.95, r * 0.08);
      ctx.quadraticCurveTo(r * 0.35, r * 0.18, 0, 0);
      ctx.closePath();
      var pg = ctx.createLinearGradient(0, 0, r, 0);
      pg.addColorStop(0, "rgba(180,160,120,0.85)");
      pg.addColorStop(0.5, "rgba(120,100,70,0.55)");
      pg.addColorStop(1, "rgba(80,60,40,0.25)");
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.restore();
    }
    // Motion blur ring hint
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(200,180,140,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }


  function syncPlatformDomOverlays() {
    // Disabled — canvas-only, no white box overlays
    try {
      var layer = document.getElementById("platDomLayer");
      if (layer) { layer.innerHTML = ""; layer.remove(); }
    } catch (e) {}
  }

  function drawTrainingPlatforms() {
    window.__airborneRuffPlatforms = ruffPlatforms;
    if (!ruffPlatforms || !ruffPlatforms.length) return;
    var c = (typeof ctx !== "undefined") ? ctx : null;
    if (!c) {
      try {
        var el = document.getElementById("gameCanvas");
        if (el) c = el.getContext("2d");
      } catch (e0) {}
    }
    if (!c) return;

    for (var i = 0; i < ruffPlatforms.length; i++) {
      var p = ruffPlatforms[i];
      if (!p) continue;
      var w = +p.w || 0, h = +p.h || 0;
      if (w < 4 || h < 4) continue;
      var ox = (+p.x || 0) + (+p.sway || 0);
      var oy = (+p.y || 0) - h * 0.5 + (+p.bobY || 0);
      if (!isFinite(ox) || !isFinite(oy)) continue;
      var img = null;
      try {
        if (typeof images !== "undefined" && images) img = images[p.key];
      } catch (e1) {}
      if (!(img && img.complete && img.naturalWidth > 0)) continue;

      var squash = Math.max(0, Math.min(0.35, +p.squash || 0));
      var sx = 1 + squash * 0.12;
      var sy = 1 - squash * 0.4;
      if (!isFinite(sx) || sx <= 0) sx = 1;
      if (!isFinite(sy) || sy <= 0) sy = 1;

      try {
        c.save();
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
        // Props + gears behind / under deck
        try {
        } catch (eP) {}
        c.save();
        c.translate(ox + w * 0.5, oy + h * 0.5);
        c.scale(sx, sy);
        c.drawImage(img, -w * 0.5, -h * 0.5, w, h);
        c.restore();
        // Dirt
        (p.dirt || []).forEach(function (d) {
          var lifeA = 1 - (d.age || 0) / Math.max(0.01, d.life || 1);
          ctx.globalAlpha = 0.35 * lifeA;

          // softer dirt
          if (!d || !(d.life > 0)) return;
          var t = 1 - d.age / d.life;
          if (t <= 0) return;
          c.globalAlpha = t * 0.4;
          c.fillStyle = d.r > 2.2 ? "rgba(120,95,70,0.7)" : "rgba(150,120,90,0.55)";
          c.beginPath();
          c.arc(ox + w * 0.5 + d.x, oy + h * 0.55 + d.y, Math.max(0.6, d.r * t), 0, Math.PI * 2);
          c.fill();
        });
        // Steam
        (p.fx || []).forEach(function (f) {
          var u = 1 - f.age / f.life;
          if (u <= 0) return;
          var fx = ox + f.x, fy = oy + h * 0.5 + f.y;
          c.globalAlpha = u * 0.3;
          var g = c.createRadialGradient(fx, fy, 0, fx, fy, f.r);
          g.addColorStop(0, "rgba(230,230,235,0.65)");
          g.addColorStop(1, "rgba(180,180,190,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(fx, fy, f.r, 0, Math.PI * 2);
          c.fill();
        });
        c.globalAlpha = 1;
        c.restore();
      } catch (eDraw) {
        console.warn("[plat] draw fail", p.key, eDraw);
      }
    }
  }
  window.__airborneDrawTrainingPlatforms = drawTrainingPlatforms;
  window.__airborneDrawTrainingCoins = drawTrainingCoins;
  window.__airborneDrawTrainingCrystals = drawCrystals;






  // ---------- Crystals ----------
  function spawnCrystals(n) {
    var st0 = ruffStage || window.__airborneRuffStage || "";
    if (st0 === "intro" || st0 === "takeoff" || st0 === "cruise" || st0 === "altitude" || st0 === "rings") return;
    // APPEND only — never wipe crystals already on screen (was causing random disappear)
    n = n || 4;
    const existing = (ruffCrystals || []).filter(function (c) { return c && !c.collected; });
    ruffCrystals = existing;
    const W0 = (typeof W !== "undefined" ? W : 400);
    const H0 = (typeof H !== "undefined" ? H : 600);
    let maxX = W0;
    existing.forEach(function (c) { if (c.x > maxX) maxX = c.x; });
    for (let i = 0; i < n; i++) {
      ruffCrystals.push({
        x: Math.max(W0 + 80, maxX + 100) + i * 150,
        y: H0 * (0.28 + Math.random() * 0.35),
        r: 18,
        frame: Math.floor(Math.random() * CRYSTAL_FRAME_COUNT),
        frameT: 0,
        collected: false
      });
    }
  }

  function spawnAltitudeMarkers() {
    // Markers disabled (no dashed lines on screen)
    ruffMarkers = [];
  }

  function playCrystalCollectSfx() {
    try { sfxTrainingCrystal(); } catch (e) {}
  }
  function playRingCollectSfx() {
    try { sfxTrainingRing(); } catch (e) {}
  }
  function playRankUpSfx() {
    try {
      if (typeof sfxRankUp === "function") sfxRankUp();
      else if (typeof sfxLevelCompleteFanfare === "function") sfxLevelCompleteFanfare();
    } catch (e) {}
  }


  // ---------- Training airship obstacle (between rings and combined) ----------
  var ruffAirship = null;

  function spawnTrainingAirship() {
    ruffAirship = null; // removed from training
  }

  function updateTrainingAirship(dt) {
    if (!ruffAirship) return;
    ruffAirship.x -= (ruffAirship.speed || 55) * dt;
    ruffAirship.bob = (ruffAirship.bob || 0) + dt * 1.2;
    ruffAirship.frameT = (ruffAirship.frameT || 0) + dt;
    var fd = 1 / 12;
    while (ruffAirship.frameT >= fd) {
      ruffAirship.frameT -= fd;
      ruffAirship.frame = ((ruffAirship.frame || 0) + 1) % 25; // 5x5 sheet
    }
    // Realistic steam (white, buoyant) + smoke (grey, drifts back)
    if (!ruffAirship.smoke) ruffAirship.smoke = [];
    if (!ruffAirship.drones) ruffAirship.drones = [];
    var cy0 = ruffAirship.y + Math.sin(ruffAirship.bob || 0) * 6;
    // Stack vents along hull — continuous soft plumes
    if (Math.random() < 0.85) {
      var ventX = ruffAirship.x + ruffAirship.w * (0.12 + Math.random() * 0.55);
      var ventY = cy0 + ruffAirship.h * (0.25 + Math.random() * 0.35);
      var isSteam = Math.random() < 0.55;
      ruffAirship.smoke.push({
        x: ventX,
        y: ventY,
        vx: -8 - Math.random() * 18 - (ruffAirship.speed || 40) * 0.08,
        vy: isSteam ? (-25 - Math.random() * 35) : (-6 - Math.random() * 14),
        life: isSteam ? (0.7 + Math.random() * 0.6) : (0.9 + Math.random() * 0.8),
        age: 0,
        r: isSteam ? (4 + Math.random() * 5) : (5 + Math.random() * 7),
        steam: isSteam,
        turb: Math.random() * Math.PI * 2
      });
    }
    if (Math.random() < 0.5) {
      ruffAirship.smoke.push({
        x: ruffAirship.x + ruffAirship.w * (0.05 + Math.random() * 0.2),
        y: cy0 + ruffAirship.h * (0.4 + Math.random() * 0.3),
        vx: -25 - Math.random() * 30,
        vy: -4 - Math.random() * 12,
        life: 1.0 + Math.random() * 0.7,
        age: 0,
        r: 6 + Math.random() * 8,
        steam: false,
        turb: Math.random() * 6
      });
    }
    for (var si = ruffAirship.smoke.length - 1; si >= 0; si--) {
      var p = ruffAirship.smoke[si];
      p.age += dt;
      p.turb = (p.turb || 0) + dt * 3;
      p.x += p.vx * dt + Math.sin(p.turb) * 6 * dt;
      p.y += p.vy * dt;
      // smoke rises slower, spreads; steam rises fast then softens
      if (p.steam) {
        p.vy *= (1 - 0.35 * dt);
        p.r += 14 * dt;
      } else {
        p.vy -= 4 * dt;
        p.vx *= (1 - 0.15 * dt);
        p.r += 11 * dt;
      }
      if (p.age >= p.life) ruffAirship.smoke.splice(si, 1);
    }
    if (ruffAirship.smoke.length > 48) ruffAirship.smoke.splice(0, ruffAirship.smoke.length - 48);

    // Small drones deploying from the ship with trails
    if (ruffAirship.drones.length < 5 && Math.random() < 0.025) {
      var dx0 = ruffAirship.x + ruffAirship.w * (0.3 + Math.random() * 0.4);
      var dy0 = cy0 + ruffAirship.h * 0.55;
      ruffAirship.drones.push({
        x: dx0, y: dy0,
        vx: -30 - Math.random() * 50,
        vy: (Math.random() - 0.5) * 40,
        life: 2.2 + Math.random() * 1.5,
        age: 0,
        trail: [],
        blink: Math.random() * 6
      });
    }
    for (var di = ruffAirship.drones.length - 1; di >= 0; di--) {
      var d = ruffAirship.drones[di];
      d.age += dt;
      d.blink += dt * 8;
      d.vy += Math.sin(d.age * 3.2) * 20 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.trail.push({ x: d.x, y: d.y, a: 1 });
      if (d.trail.length > 12) d.trail.shift();
      for (var ti = 0; ti < d.trail.length; ti++) d.trail[ti].a *= 0.88;
      if (d.age >= d.life || d.x < -40) ruffAirship.drones.splice(di, 1);
    }
    // Solid hull — blimp cannot pass through airship
    if (typeof player !== "undefined" && player) {
      var cy = ruffAirship.y + Math.sin(ruffAirship.bob) * 6;
      var ax = ruffAirship.x + ruffAirship.w * 0.08;
      var aw = ruffAirship.w * 0.84;
      var ay = cy + ruffAirship.h * 0.12;
      var ah = ruffAirship.h * 0.72;
      var px = player.x, py = player.y;
      var hw = player.w * 0.38, hh = player.h * 0.38;
      // AABB push-out
      var overlapX = (hw + aw * 0.5) - Math.abs(px - (ax + aw * 0.5));
      var overlapY = (hh + ah * 0.5) - Math.abs(py - (ay + ah * 0.5));
      if (overlapX > 0 && overlapY > 0) {
        // Always push player LEFT of airship — never vertical launch (prevents crash)
        player.x = Math.min(player.x, ax - hw - 4);
        // Clamp Y inside playable band
        if (typeof H !== "undefined") {
          player.y = Math.max(player.h * 0.5, Math.min(H * 0.82, player.y));
        }
        player.vy = Math.min(player.vy || 0, 0);
        if (!ruffAirship.hitCd || ruffAirship.hitCd <= 0) {
          ruffAirship.hitCd = 1.0;
          try {
            if (!(typeof shieldActive !== "undefined" && shieldActive) &&
                !(window.__airborneAirfieldInvuln) &&
                typeof takeHit === "function") {
              takeHit();
            }
          } catch (eHit) { console.warn("airship hit", eHit); }
        }
      }
      if (ruffAirship.hitCd > 0) ruffAirship.hitCd -= dt;
    }
    // Propeller spin state (slightly slower)
    ruffAirship.propAngle = (ruffAirship.propAngle || 0) + dt * 12;
    ruffAirship.propBlur = 0.55 + 0.45 * Math.abs(Math.sin(ruffAirship.propAngle * 0.5));
    // Wind streaks across entire vessel
    try {
      var emit = (typeof maybeEmitWind === "function") ? maybeEmitWind : window.maybeEmitWind;
      if (emit) {
        var cyW = ruffAirship.y + Math.sin(ruffAirship.bob || 0) * 6;
        emit(ruffAirship.x + ruffAirship.w * 0.5, cyW + ruffAirship.h * 0.4, ruffAirship.w * 0.85, ruffAirship.h * 0.7, 14, dt, "obstacle");
        emit(ruffAirship.x + ruffAirship.w * 0.2, cyW + ruffAirship.h * 0.35, ruffAirship.w * 0.4, ruffAirship.h * 0.5, 9, dt, "obstacle");
        emit(ruffAirship.x + ruffAirship.w * 0.75, cyW + ruffAirship.h * 0.45, ruffAirship.w * 0.4, ruffAirship.h * 0.5, 9, dt, "obstacle");
        emit(ruffAirship.x + ruffAirship.w * 0.4, cyW + ruffAirship.h * 0.55, ruffAirship.w * 0.5, ruffAirship.h * 0.35, 7, dt, "obstacle");
      }
    } catch (eW) {}
    // Fully off left edge (entire hull past screen)
    if (ruffAirship.x + ruffAirship.w < -20) {
      ruffAirship = null;
    }
  }

  function drawTrainingAirship() {
    if (!ruffAirship || typeof ctx === "undefined") return;
    var a = ruffAirship;
    var cy = a.y + Math.sin(a.bob || 0) * 6;
    // Soft layered steam/smoke behind hull
    if (a.smoke && a.smoke.length) {
      for (var i = 0; i < a.smoke.length; i++) {
        var p = a.smoke[i];
        var u = 1 - p.age / p.life;
        if (u <= 0) continue;
        var fade = u * u; // softer falloff
        ctx.globalAlpha = Math.max(0, fade * (p.steam ? 0.28 : 0.38));
        if (p.steam) {
          ctx.fillStyle = "rgba(235,242,248," + (0.55 + 0.35 * u) + ")";
        } else {
          ctx.fillStyle = "rgba(48,46,44," + (0.5 + 0.3 * u) + ")";
        }
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * (1.1 + (1 - u) * 0.4), p.r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        // soft outer halo
        ctx.globalAlpha = Math.max(0, fade * 0.12);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 1.6, p.r * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    var sheet = (typeof images !== "undefined" && images) ? images.training_airship : null;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (sheet && sheet.naturalWidth) {
      var cols = 5, rows = 5;
      var fw = sheet.naturalWidth / cols;
      var fh = sheet.naturalHeight / rows;
      var fr = (a.frame || 0) % 25;
      var col = fr % cols;
      var row = Math.floor(fr / cols) % rows;
      var pad = Math.min(fw, fh) * 0.03;
      // Double-draw for solid presence
      ctx.drawImage(sheet, col * fw + pad, row * fh + pad, fw - pad * 2, fh - pad * 2, a.x, cy, a.w, a.h);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(sheet, col * fw + pad, row * fh + pad, fw - pad * 2, fh - pad * 2, a.x, cy, a.w, a.h);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "rgba(80,60,40,1)";
      ctx.fillRect(a.x, cy, a.w, a.h * 0.7);
    }
    ctx.restore();

    // Propeller disc at nose (left side of airship facing leftward travel)
    var propX = a.x + a.w * 0.06;
    var propY = cy + a.h * 0.48;
    var propR = a.h * 0.22;
    ctx.save();
    ctx.translate(propX, propY);
    ctx.rotate(a.propAngle || 0);
    ctx.globalAlpha = 0.4 * (a.propBlur || 1);
    ctx.strokeStyle = "rgba(160,170,180,0.7)";
    ctx.lineWidth = 2.5;
    for (var pi = 0; pi < 4; pi++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(propR * 0.55, 0, propR * 0.55, propR * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(120,130,140,0.25)";
      ctx.fill();
    }
    ctx.restore();
    // Motion blur ring
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "rgba(200,220,240,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(propX, propY, propR * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // (no white highlight — avoids box artifact)

    // Drones + trails in front
    if (a.drones && a.drones.length) {
      for (var di = 0; di < a.drones.length; di++) {
        var d = a.drones[di];
        // trail
        if (d.trail) {
          for (var ti = 0; ti < d.trail.length; ti++) {
            var tp = d.trail[ti];
            ctx.globalAlpha = Math.max(0, tp.a * 0.35);
            ctx.fillStyle = "rgba(120,200,255,0.8)";
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 1.5 + ti * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 0.95;
        var blink = 0.5 + 0.5 * Math.sin(d.blink || 0);
        // small drone body
        ctx.fillStyle = "rgba(40,44,52,0.95)";
        ctx.fillRect(d.x - 5, d.y - 2, 10, 4);
        ctx.fillStyle = "rgba(80,90,100,0.9)";
        ctx.fillRect(d.x - 7, d.y - 1, 3, 2);
        ctx.fillRect(d.x + 4, d.y - 1, 3, 2);
        // status light
        ctx.fillStyle = "rgba(80,220,255," + (0.6 + 0.4 * blink) + ")";
        ctx.beginPath();
        ctx.arc(d.x + 2, d.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // engine glow
        ctx.fillStyle = "rgba(255,160,60,0.55)";
        ctx.beginPath();
        ctx.arc(d.x - 6, d.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }


  // ---------- Training boss atmosphere (far balloons + sky darken) ----------
  var ruffBgBalloons = [];
  var ruffBossDark = 0; // 0..1 overlay strength

  // One-shot special hot-air balloon (mid-training only)
  var ruffSpecialBalloon = null;
  var ruffSpecialBalloonImg = null;
  var ruffSpecialBalloonDone = false;

  function ensureSpecialBalloonImg() {
    if (ruffSpecialBalloonImg) return;
    ruffSpecialBalloonImg = new Image();
    ruffSpecialBalloonImg.src = "bg_hotair_balloon.webp?v=ruff338";
  }

  function maybeSpawnSpecialBalloon() {
    if (ruffSpecialBalloonDone || ruffSpecialBalloon) return;
    // Mid-training stages only (after altitude, before landing)
    var mid = { obstacles:1, rings:1, crystals:1, shield:1, powerup:1, airship:1, combined:1 };
    if (!mid[ruffStage]) return;
    // Appear once when stage timer is past ~3s
    if (ruffStageT < 3) return;
    ensureSpecialBalloonImg();
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    ruffSpecialBalloon = {
      x: W0 + 30,
      y: H0 * (0.12 + Math.random() * 0.25),
      speed: (18 + Math.random() * 8) * 0.8, // 20% slower
      bob: Math.random() * Math.PI * 2,
      scale: 0.22 + Math.random() * 0.06,
      alpha: 0.85
    };
    ruffSpecialBalloonDone = true;
  }

  function updateSpecialBalloon(dt) {
    maybeSpawnSpecialBalloon();
    if (!ruffSpecialBalloon) return;
    var b = ruffSpecialBalloon;
    b.x -= b.speed * dt;
    b.bob += dt * 0.8;
    if (b.x < -180) ruffSpecialBalloon = null;
  }

  function drawSpecialBalloon() {
    if (!ruffSpecialBalloon || typeof ctx === "undefined") return;
    ensureSpecialBalloonImg();
    var img = ruffSpecialBalloonImg;
    if (!img || !img.complete || !img.naturalWidth) return;
    var b = ruffSpecialBalloon;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var bw = W0 * b.scale;
    var bh = bw * (img.naturalHeight / img.naturalWidth);
    var by = b.y + Math.sin(b.bob) * 6;
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.drawImage(img, b.x, by, bw, bh);
    ctx.restore();
  }


  // Each asset is dedicated to exactly one layer (far → near, fixed sizes)
  var HOTAIR_KEYS = [
    "hotair_night_stars",   // layer 0 farthest
    "hotair_floral_teal",   // layer 1
    "hotair_mosaic",        // layer 2
    "hotair_compass",       // layer 3
    "hotair_red_cream"      // layer 4 nearest (if used)
  ];
  var hotairImgs = null;
  function ensureHotairImgs() {
    if (hotairImgs) return;
    hotairImgs = {};
    HOTAIR_KEYS.forEach(function(k) {
      var im = new Image();
      im.src = k + ".webp?v=ruff367";
      hotairImgs[k] = im;
    });
  }

  // Fixed scales: farther = smaller (no random size)
  var HOTAIR_LAYERS = [
    { id: 0, key: "hotair_night_stars", speed: 2.5, scale: 0.07, dark: 1, y0: 0.12, y1: 0.12, behindMountains: true, behindClouds: false },
    { id: 1, key: "hotair_floral_teal", speed: 4.0, scale: 0.10, dark: 1, y0: 0.28, y1: 0.28, behindMountains: true, behindClouds: false },
    { id: 2, key: "hotair_mosaic",      speed: 6.0, scale: 0.13, dark: 1, y0: 0.40, y1: 0.40, behindMountains: false, behindClouds: false },
    { id: 3, key: "hotair_compass",     speed: 8.0, scale: 0.17, dark: 1, y0: 0.52, y1: 0.52, behindMountains: false, behindClouds: false }
  ];

  var ruffBgBalloonSpawnT = 0;
  var ruffBgBalloonSpawned = 0;
  var RUFF_BG_BALLOON_MAX = 4;
  var RUFF_BG_BALLOON_GAP = 7.5; // seconds between new balloons

  function pushOneBgBalloon(forceX) {
    ensureHotairImgs();
    if (!ruffBgBalloons) ruffBgBalloons = [];
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    // Only ONE balloon per layer at a time
    var occupied = {};
    for (var oi = 0; oi < ruffBgBalloons.length; oi++) {
      if (ruffBgBalloons[oi] && ruffBgBalloons[oi].x > -80) {
        occupied[ruffBgBalloons[oi].layerId] = true;
      }
    }
    var freeLayers = [];
    for (var li = 0; li < HOTAIR_LAYERS.length; li++) {
      if (!occupied[HOTAIR_LAYERS[li].id]) freeLayers.push(HOTAIR_LAYERS[li]);
    }
    if (!freeLayers.length) return; // all layers already have a balloon
    var layer = freeLayers[0]; // next free layer only
    var key = layer.key || HOTAIR_KEYS[layer.id % HOTAIR_KEYS.length];
    var ly = layer.y0; // fixed height per layer
    ruffBgBalloons.push({
      key: key,
      layer: layer,
      layerId: layer.id,
      behindMountains: !!layer.behindMountains,
      behindClouds: !!layer.behindClouds,
      x: (typeof forceX === "number") ? forceX : (W0 + 40),
      y: H0 * ly,
      s: layer.scale, // fixed size — no random
      speed: layer.speed, // fixed speed — no random
      bob: layer.id * 1.7,
      bobSpd: 0.3,
      dark: layer.dark
    });
    ruffBgBalloonSpawned++;
    ruffBgBalloons.sort(function(a, b) {
      return (a.layerId || 0) - (b.layerId || 0);
    });
  }

  function spawnTrainingBgBalloons() {
    ensureHotairImgs();
    ruffBgBalloons = [];
    ruffBgBalloonSpawnT = 2.5; // first balloon after a short delay
    ruffBgBalloonSpawned = 0;
    // Only seed ONE far balloon so the sky isn't full at start
    var W0 = (typeof W !== "undefined") ? W : 400;
    pushOneBgBalloon(W0 * 0.75);
  }

  function updateTrainingBgBalloons(dt) {
    try { updateSpecialBalloon(dt); } catch (e) {}
    // Stagger remaining balloons across the level
    if (ruffBgBalloonSpawned < RUFF_BG_BALLOON_MAX) {
      ruffBgBalloonSpawnT -= dt;
      if (ruffBgBalloonSpawnT <= 0) {
        pushOneBgBalloon();
        ruffBgBalloonSpawnT = RUFF_BG_BALLOON_GAP + Math.random() * 3;
      }
    }
    if (!ruffBgBalloons || !ruffBgBalloons.length) return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    for (var i = 0; i < ruffBgBalloons.length; i++) {
      var b = ruffBgBalloons[i];
      b.x -= b.speed * dt;
      b.bob += dt * (b.bobSpd || 0.5);
      // Same instance recycles off left — still only 2 of each type total
      if (b.x < -140) {
        b.x = W0 + 50 + Math.random() * 80;
        var layer = b.layer || HOTAIR_LAYERS[0];
        // Full vertical spread on recycle
        b.y = H0 * (0.10 + Math.random() * 0.50);
      }
    }
  }

  function drawHotairBalloonList(mode) {
    // mode: "mountains" | "clouds" | "front"
    if (!ruffBgBalloons || !ruffBgBalloons.length || typeof ctx === "undefined") return;
    ensureHotairImgs();
    var W0 = (typeof W !== "undefined") ? W : 400;
    for (var i = 0; i < ruffBgBalloons.length; i++) {
      var b = ruffBgBalloons[i];
      if (mode === "mountains") {
        if (!b.behindMountains) continue;
      } else if (mode === "clouds") {
        if (!b.behindClouds || b.behindMountains) continue;
      } else {
        if (b.behindClouds || b.behindMountains) continue;
      }
      var img = hotairImgs && hotairImgs[b.key];
      if (!img || !img.complete || !img.naturalWidth) continue;
      var bw = W0 * b.s;
      var bh = bw * (img.naturalHeight / img.naturalWidth);
      var by = b.y + Math.sin(b.bob) * (4 + b.s * 12);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      // Full opacity — no brightness fade / no transparency
      ctx.drawImage(img, b.x, by, bw, bh);
      ctx.restore();
    }
  }

  function drawTrainingBgBalloonsBehindMountains() {
    drawHotairBalloonList("mountains");
  }
  function drawTrainingBgBalloonsBehindClouds() {
    drawHotairBalloonList("clouds");
  }
  function drawTrainingBgBalloons() {
    try { drawSpecialBalloon(); } catch (e) {}
    drawHotairBalloonList("front");
  }

  window.__airborneDrawTrainingBgBalloonsBehindMountains = drawTrainingBgBalloonsBehindMountains;
  window.__airborneDrawTrainingBgBalloonsBehind = drawTrainingBgBalloonsBehindClouds;
  window.__airborneDrawTrainingBgBalloons = drawTrainingBgBalloons;
  window.__airborneUpdateTrainingBgBalloons = updateTrainingBgBalloons;

  function updateTrainingBossDark(dt, target) {
    ruffBossDark = 0; // never darken training stages
  }

  function drawTrainingBossDark() {
    return; // Disabled — no full-screen darken during training
    if (!ruffBossDark || ruffBossDark < 0.02 || typeof ctx === "undefined") return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    var a = Math.min(0.55, ruffBossDark * 0.55);
    ctx.save();
    // Full-screen dusk (everywhere), stronger at edges like a flocking storm
    var g = ctx.createRadialGradient(W0 * 0.5, H0 * 0.35, W0 * 0.1, W0 * 0.5, H0 * 0.4, W0 * 0.85);
    g.addColorStop(0, "rgba(10,8,20," + (a * 0.45) + ")");
    g.addColorStop(0.55, "rgba(8,6,18," + (a * 0.75) + ")");
    g.addColorStop(1, "rgba(0,0,0," + a + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W0, H0);
    // No hard grey rectangle at top — smooth dusk only
    ctx.restore();
  }


  var ruffScreenDust = [];
  function ensureScreenDust() {
    return; // Disabled — black dust overlay darkened rings/airship
    if (ruffScreenDust.length) return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    for (var i = 0; i < 55; i++) {
      ruffScreenDust.push({
        x: Math.random() * W0,
        y: Math.random() * H0,
        vx: -8 - Math.random() * 18,
        vy: (Math.random() - 0.5) * 6,
        r: 0.6 + Math.random() * 1.2,
        a: 0.15 + Math.random() * 0.35
      });
    }
  }
  function updateScreenDust(dt) {
    ruffScreenDust = [];
    return;
    if (!ruffScreenDust.length) return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 600;
    for (var i = 0; i < ruffScreenDust.length; i++) {
      var d = ruffScreenDust[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt + Math.sin((d.x + d.y) * 0.02) * 4 * dt;
      if (d.x < -4) { d.x = W0 + 4; d.y = Math.random() * H0; }
      if (d.y < -4) d.y = H0 + 2;
      if (d.y > H0 + 4) d.y = -2;
    }
  }
  function drawScreenDust() {
    return; // Disabled
    if (!ruffScreenDust.length || typeof ctx === "undefined") return;
    ctx.save();
    for (var i = 0; i < ruffScreenDust.length; i++) {
      var d = ruffScreenDust[i];
      ctx.globalAlpha = d.a;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function updateCrystals(dt) {
    if (!ruffCrystals.length) return;
    // Stable scroll — same every lesson (combined included)
    let spd = 210;
    const px = (typeof player !== "undefined" && player) ? player.x : 0;
    const py = (typeof player !== "undefined" && player) ? player.y : 0;
    const pw = (typeof player !== "undefined" && player) ? player.w * 0.4 : 20;
    const ph = (typeof player !== "undefined" && player) ? player.h * 0.4 : 16;

    ruffCrystals.forEach(function (c) {
      if (c.collected) return;
      if (c.fixedToPlatform && c.platRef) {
        c.x = c.platRef.x + (c.platOffX || 0);
        c.y = c.platRef.y + (c.platOffY || 0);
      } else {
        c.x -= spd * dt;
      }
      c.frameT += dt;
      const cFps = 24; // smooth crystal loop
      const cFd = 1 / cFps;
      while (c.frameT >= cFd) {
        c.frameT -= cFd;
        c.frame = (c.frame + 1) % CRYSTAL_FRAME_COUNT;
      }
      // collect
      if (Math.abs(c.x - px) < pw + c.r && Math.abs(c.y - py) < ph + c.r) {
        c.collected = true;
        ruffStats.crystals++; playCrystalCollectSfx();
        window.__airborneCollectCrystals = (window.__airborneCollectCrystals || 0) + 1;
        if (typeof updateCollectDock === "function") updateCollectDock();
        // Crystals counted separately — do not add to main dodge score
        // if (typeof score === "number") score += CRYSTAL_SCORE;
        if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
        if (ruffWaitingCollect > 0) ruffWaitingCollect--;
        // Sparkle burst
        for (let s = 0; s < 14; s++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 120;
          ruffSparkles.push({
            x: c.x, y: c.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 30,
            life: 0.45 + Math.random() * 0.35,
            age: 0,
            r: 2 + Math.random() * 3,
            color: Math.random() > 0.4 ? "#7ecbff" : "#fff8e0"
          });
        }
        if (ruffStats.crystals === 1) showRadio("That's one.", 2.2);
        else if (ruffStats.crystals % 5 === 0) showRadio("Now you're getting greedy. I like it.", 2.6);
      }
    });
    ruffCrystals = ruffCrystals.filter(c => !c.collected && c.x > -40);
  }

  function updateSparkles(dt) {
    ruffSparkles.forEach(function (s) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt;
      s.vx *= 0.98;
    });
    ruffSparkles = ruffSparkles.filter(s => s.age < s.life);
  }

  function drawSparkles() {
    if (!ruffSparkles.length || typeof ctx === "undefined") return;
    ruffSparkles.forEach(function (s) {
      const t = 1 - s.age / s.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * t, 0, Math.PI * 2);
      ctx.fill();
      // star glint
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 2, s.y);
      ctx.lineTo(s.x + s.r * 2, s.y);
      ctx.moveTo(s.x, s.y - s.r * 2);
      ctx.lineTo(s.x, s.y + s.r * 2);
      ctx.stroke();
      ctx.restore();
    });
  }


  function spawnTrainingCoins(n) {
    var stC = ruffStage || window.__airborneRuffStage || "";
    if (stC === "intro" || stC === "takeoff" || stC === "cruise" || stC === "altitude" || stC === "rings") return;
    if (stC === "platforms") return; // only fixed platform coins
    n = n || 4;
    const groundY = (typeof groundLevelY === "function") ? groundLevelY() : (typeof H !== "undefined" ? H * 0.78 : 400);
    for (let i = 0; i < n; i++) {
      var cy = (typeof H !== "undefined" ? H : 600) * (0.22 + Math.random() * 0.42);
      ruffCoins.push({
        x: (typeof W !== "undefined" ? W : 400) + 40 + i * (70 + Math.random() * 50),
        y: cy,
        yBase: cy,
        r: 14,
        spin: Math.random() * Math.PI * 2,
        bob: Math.random() * Math.PI * 2,
        speed: 95,
        collected: false,
        spark: 0
      });
    }
  }

  function updateTrainingCoins(dt) {
    if (!ruffCoins.length) return;
    // Stable scroll — same every lesson (combined included)
    var spd = 210;
    const px = (typeof player !== "undefined" && player) ? player.x : 0;
    const py = (typeof player !== "undefined" && player) ? player.y : 0;
    const pw = (typeof player !== "undefined" && player) ? player.w * 0.42 : 20;
    const ph = (typeof player !== "undefined" && player) ? player.h * 0.42 : 16;
    ruffCoins.forEach(function (c) {
      if (c.collected) return;
      // Platform-fixed coins: position owned by updateTrainingPlatforms
      if (c.fixedToPlatform && c.platRef) {
        c.x = c.platRef.x + c.platOffX;
        c.y = c.platRef.y + c.platOffY + Math.sin((c.bob = (c.bob || 0) + dt * 2.4)) * 2;
      } else {
      c.speed = spd;
      c.x -= spd * dt;
      // Gentle bob only on Y — does not affect horizontal speed
      c.bob += dt * 2.4;
      c.yBase = (c.yBase != null) ? c.yBase : c.y;
      c.y = c.yBase + Math.sin(c.bob) * 3.5;
      }
      c.glow = (c.glow || 0) + dt * 4;
      c.sparkT = (c.sparkT || 0) - dt;
      if (c.sparkT <= 0) {
        c.sparkT = 0.07 + Math.random() * 0.1;
        if (!c.sparks) c.sparks = [];
        var sa = Math.random() * Math.PI * 2;
        var dist = c.r * (0.7 + Math.random() * 0.6);
        c.sparks.push({
          x: Math.cos(sa) * dist,
          y: Math.sin(sa) * dist,
          vx: Math.cos(sa) * (6 + Math.random() * 14),
          vy: Math.sin(sa) * (6 + Math.random() * 14) - 10,
          life: 0.4 + Math.random() * 0.35, age: 0, r: 0.9 + Math.random() * 1.2
        });
      }
      if (c.sparks) {
        for (var si = c.sparks.length - 1; si >= 0; si--) {
          var sp = c.sparks[si];
          sp.age += dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          if (sp.age >= sp.life) c.sparks.splice(si, 1);
        }
      }
      var hitPad = c.fixedToPlatform ? 1.35 : 1.0;
      if (Math.abs(c.x - px) < (pw + c.r) * hitPad && Math.abs(c.y - py) < (ph + c.r) * hitPad) {
        c.collected = true;
        ruffStats.coins = (ruffStats.coins || 0) + 1;
        try { sfxTrainingCoin(); } catch (e) {}
        window.__airborneCollectCoins = (window.__airborneCollectCoins || 0) + 1;
        try {
          if (typeof window.addStormChargeForScore === "function") window.addStormChargeForScore(typeof score === "number" ? score : 0);
        } catch (e) {}

        try {
          if (typeof updateCollectDock === "function") updateCollectDock();
          else {
            const coinEl = document.getElementById("collectPowerPct");
            if (coinEl) coinEl.textContent = String(window.__airborneCollectCoins);
          }
        } catch (e) {}
        // Coins counted separately — do not add to main dodge score
        // if (typeof score === "number") score += COIN_SCORE;
        if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
        try { sfxTrainingCoin(); } catch (e) {}
        for (let s = 0; s < 12; s++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 50 + Math.random() * 100;
          ruffSparkles.push({
            x: c.x, y: c.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 40,
            life: 0.4 + Math.random() * 0.3,
            age: 0,
            r: 2 + Math.random() * 2.5,
            color: Math.random() > 0.35 ? "#ffd700" : "#fff3a0"
          });
        }
      }
    });
    ruffCoins = ruffCoins.filter(c => !c.collected && c.x > -50);
  }

  // Star-coin sprite sheet (36 frames, horizontal, bg removed)
  window.__airborneCoinSheet = window.__airborneCoinSheet || (function () {
    var im = new Image();
    im.src = "coin_star_sheet.png?v=ruff298";
    return im;
  })();
  window.__airborneCoinFrame = 0;
  window.__airborneCoinFrameT = 0;

  function drawTrainingCoins() {
    if (!ruffCoins.length || typeof ctx === "undefined") return;
    var sheet = window.__airborneCoinSheet;
    var sheetReady = sheet && sheet.complete && sheet.naturalWidth > 0;
    var fw = 128, nFrames = 36;
    ruffCoins.forEach(function (c) {
      if (c.collected) return;
      const by = c.y + Math.sin(c.bob) * 5;
      // Single static frame — no animation
      var frame = 0;
      const size = c.r * 2.5;
      var pulse = 0.75 + 0.25 * Math.sin((c.glow || c.bob) * 1.2);
      ctx.save();
      ctx.translate(c.x, by);
      // Glow BEHIND coin: solid core + luminous glow around it
      ctx.globalCompositeOperation = "source-over";
      var coreR = c.r * (0.92 + 0.06 * pulse);
      // Outer glow first (behind everything)
      ctx.globalAlpha = 0.55 + 0.2 * pulse;
      var outer = ctx.createRadialGradient(0, 0, coreR * 0.4, 0, 0, c.r * 2.6);
      outer.addColorStop(0, "rgba(255,230,120,0.7)");
      outer.addColorStop(0.4, "rgba(255,190,50,0.4)");
      outer.addColorStop(1, "rgba(255,150,20,0)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      // Solid opaque core
      ctx.globalAlpha = 1;
      var core = ctx.createRadialGradient(-coreR*0.15, -coreR*0.15, 0, 0, 0, coreR);
      core.addColorStop(0, "rgb(255,252,220)");
      core.addColorStop(0.4, "rgb(255,220,80)");
      core.addColorStop(0.8, "rgb(240,180,40)");
      core.addColorStop(1, "rgb(210,150,30)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();
      // Bright ring glow around solid core
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(255,240,160,0.9)";
      ctx.lineWidth = Math.max(1.5, c.r * 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.4 + 0.2 * pulse;
      ctx.strokeStyle = "rgba(255,200,60,0.6)";
      ctx.lineWidth = Math.max(2, c.r * 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 1.25, 0, Math.PI * 2);
      ctx.stroke();
      // Glimmer sparkles around floating coin
      (c.sparks || []).forEach(function(sp) {
        var t = 1 - sp.age / sp.life;
        var sr = Math.max(0.4, sp.r * t * 1.4);
        ctx.globalAlpha = t * 0.95;
        ctx.fillStyle = "#fffef0";
        // 4-point star glimmer
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - sr * 2.2);
        ctx.lineTo(sp.x + sr * 0.35, sp.y - sr * 0.35);
        ctx.lineTo(sp.x + sr * 2.2, sp.y);
        ctx.lineTo(sp.x + sr * 0.35, sp.y + sr * 0.35);
        ctx.lineTo(sp.x, sp.y + sr * 2.2);
        ctx.lineTo(sp.x - sr * 0.35, sp.y + sr * 0.35);
        ctx.lineTo(sp.x - sr * 2.2, sp.y);
        ctx.lineTo(sp.x - sr * 0.35, sp.y - sr * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = t * 0.55;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sr * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (sheetReady) {
        ctx.drawImage(sheet, frame * fw, 0, fw, fw, -size / 2, -size / 2, size, size);
      } else {
        // fallback gold disc + star
        const squash = 0.55 + 0.45 * Math.abs(Math.cos(c.spin));
        ctx.scale(squash, 1);
        var g = ctx.createRadialGradient(-c.r * 0.3, -c.r * 0.35, 1, 0, 0, c.r);
        g.addColorStop(0, "#fff6c8");
        g.addColorStop(0.35, "#ffd700");
        g.addColorStop(0.75, "#d4a017");
        g.addColorStop(1, "#8a6a0a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }


  function drawCrystals() {
    if (!ruffCrystals.length || typeof ctx === "undefined") return;
    var tnow = performance.now() * 0.001;
    ruffCrystals.forEach(function (c) {
      if (c.collected) return;
      const key = "blue_crystal_" + String(c.frame + 1).padStart(2, "0");
      const img = (typeof images !== "undefined") ? images[key] : null;
      const s = c.r * 2.2;
      c.fxT = (c.fxT || 0) + 0.016;
      var pulse = 0.7 + 0.3 * Math.sin(tnow * 2.2 + (c.x || 0) * 0.01);
      ctx.save();
      ctx.translate(c.x, c.y);
      // Splash-style blue aura
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35 * pulse;
      var aura = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.15);
      aura.addColorStop(0, "rgba(120,220,255,0.5)");
      aura.addColorStop(0.45, "rgba(40,140,255,0.2)");
      aura.addColorStop(1, "rgba(40,100,220,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2);
      ctx.fill();
      // Soft core glow
      ctx.globalAlpha = 0.55 * pulse;
      var core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
      core.addColorStop(0, "rgba(200,250,255,0.7)");
      core.addColorStop(0.5, "rgba(100,200,255,0.35)");
      core.addColorStop(1, "rgba(40,120,255,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Rising blue sparkles
      if (!c.sparkles) c.sparkles = [];
      if (Math.random() < 0.06) {
        c.sparkles.push({
          x: (Math.random() - 0.5) * s * 0.5,
          y: s * 0.15,
          life: 1.2 + Math.random() * 0.5,
          age: 0,
          r: 0.8 + Math.random() * 1.1
        });
      }
      for (var si = (c.sparkles || []).length - 1; si >= 0; si--) {
        var sp = c.sparkles[si];
        sp.age += 0.016;
        sp.y -= 8 * 0.016;
        var st = 1 - sp.age / sp.life;
        if (st <= 0) { c.sparkles.splice(si, 1); continue; }
        ctx.globalAlpha = st * 0.95;
        ctx.fillStyle = "rgba(220,250,255,1)";
        ctx.shadowColor = "rgba(180,240,255,0.9)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * st, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (img && img.naturalWidth) {
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
      } else {
        ctx.fillStyle = "#4fc3f7";
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawMarkers() {
    // Disabled — dashed altitude guides removed per design
    return;
  }

  function updateMarkers(dt) {
    const spd = (typeof obstacleSpeed === "number" ? obstacleSpeed : 180);
    ruffMarkers.forEach(function (m) { m.x -= spd * dt; });
    ruffMarkers = ruffMarkers.filter(m => m.x > -40);
  }

  // ---------- Companion ----------
  function updateRuffCompanion(dt) {
    if (!ruffActive) return;
    try {
    ruffBob += dt * 2.6;
    ruffFrameT += dt;
    const ruffFps = 12; // smooth companion loop
    const ruffFd = 1 / ruffFps;
    while (ruffFrameT >= ruffFd) {
      ruffFrameT -= ruffFd;
      ruffFrame = (ruffFrame + 1) % RUFF_FRAME_COUNT;
    }
    // Dramatic intro fly-in from upper-right
    if (ruffIntroFly && ruffStage === "intro") {
      window.__airborneRuffIntroFly = true;
      ruffIntroFlyT += dt;
      window.__airborneRuffIntroT = ruffIntroFlyT;
      const destX = (typeof W !== "undefined" ? W : 400) * 0.18;
      const destY = (typeof H !== "undefined" ? H : 600) * 0.28;
      const k = Math.min(1, ruffIntroFlyT / 1.0);
      const ease = 1 - Math.pow(1 - k, 3);
      const startX = (typeof W !== "undefined" ? W : 400) * 0.95;
      const startY = (typeof H !== "undefined" ? H : 600) * 0.18;
      ruffX = startX + (destX - startX) * ease;
      ruffY = startY + (destY - startY) * ease + Math.sin(ruffIntroFlyT * 4) * 6 * (1 - ease);
      ruffTilt = -0.25 * (1 - ease) + Math.sin(ruffBob * 1.3) * 0.08;
      ruffScalePulse = 1.05 + (1 - ease) * 0.2 + Math.sin(ruffBob * 2.1) * 0.03;
      // Jetpack during intro fly-in
      if (Math.random() < 0.9) {
        ruffJetParticles.push({
          x: ruffX - 12, y: ruffY + 16,
          vx: -60 - Math.random() * 40, vy: 25 + Math.random() * 30,
          life: 0.3, age: 0, r: 3 + Math.random() * 3, hot: true
        });
      }
      ruffJetParticles.forEach(function (p) {
        p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r *= (1 - dt);
      });
      ruffJetParticles = ruffJetParticles.filter(function (p) { return p.age < p.life; });
      if (!ruffIntroLineArmed && ruffIntroFlyT > 0.35 && ruffLines.length) {
        ruffIntroLineArmed = true;
        ruffLineIdx = 0;
        ruffLineT = 0;
        ruffSpeechDone = true;
        showRadio(ruffLines[0], 3.2);
      }
      window.__airborneRuffX = ruffX;
      window.__airborneRuffY = ruffY;
      return;
    }
    window.__airborneRuffIntroFly = false;
    if (typeof player === "undefined" || !player) return;
    // Behind + above with clear gap so sprites never touch
    const gapX = player.w * 0.50 + 28;
    const gapY = player.h * 0.30 + 18; // 30% of blimp height above
    const H0 = (typeof H !== "undefined" ? H : 600);
    const W0 = (typeof W !== "undefined" ? W : 400);
    let targetX = player.x - gapX;
    let targetY = player.y - gapY + Math.sin(ruffBob) * 10 + Math.sin(ruffBob * 1.7) * 3;
    // Keep Ruff on-screen — when player is high, stay beside rather than above
    const minY = H0 * 0.08;
    const maxY = H0 * 0.72;
    if (targetY < minY) targetY = Math.max(minY, player.y + player.h * 0.15);
    targetY = Math.max(minY, Math.min(maxY, targetY));
    targetX = Math.max(W0 * 0.04, Math.min(W0 * 0.55, targetX));
    const close = ruffSpeakClose > 0 ? 8 : 0;
    ruffX += (targetX + close - ruffX) * Math.min(1, dt * 3.2);
    ruffY += (targetY - ruffY) * Math.min(1, dt * 3.2);
    ruffX = Math.max(W0 * 0.04, Math.min(W0 * 0.7, ruffX));
    ruffY = Math.max(minY, Math.min(maxY, ruffY));
    // Motion lean / bank
    // Subtle hover + lean toward movement
    var lean = Math.max(-1, Math.min(1, (targetY - ruffY) * 0.012));
    ruffTilt = Math.sin(ruffBob * 1.45) * 0.14 + Math.sin(ruffBob * 0.55) * 0.05 + lean * 0.18;
    ruffScalePulse = 1 + Math.sin(ruffBob * 2.4) * 0.04 + Math.sin(ruffBob * 0.9) * 0.015;
    if (ruffSpeakClose > 0) ruffSpeakClose = Math.max(0, ruffSpeakClose - dt * 0.5);

    // Jetpack exhaust (behind / slightly below)
    if (Math.random() < 0.85) {
      for (let j = 0; j < 2; j++) {
        ruffJetParticles.push({
          x: ruffX - 14 + (Math.random() - 0.5) * 8,
          y: ruffY + 18 + (Math.random() - 0.5) * 6,
          vx: -40 - Math.random() * 50,
          vy: 20 + Math.random() * 35,
          life: 0.25 + Math.random() * 0.25,
          age: 0,
          r: 2.5 + Math.random() * 3.5,
          hot: Math.random() < 0.55
        });
      }
    }
    if (ruffJetParticles.length > 40) ruffJetParticles.splice(0, ruffJetParticles.length - 40);
    ruffJetParticles.forEach(function (p) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.r *= (1 - 1.2 * dt);
    });
    ruffJetParticles = ruffJetParticles.filter(function (p) { return p.age < p.life && p.r > 0.4; });

    // Motion ghosts (afterimage)
    if (Math.random() < 0.35) {
      ruffGhostCd = (ruffGhostCd || 0) - dt;
      if (ruffGhostCd <= 0) {
        ruffGhostCd = 0.045;
        ruffMotionGhosts.push({
          x: ruffX, y: ruffY, age: 0, life: 0.42,
          tilt: ruffTilt, frame: ruffFrame, scale: ruffScalePulse || 1
        });
      }
    }
    ruffMotionGhosts.forEach(function (g) { g.age += dt; });
    ruffMotionGhosts = ruffMotionGhosts.filter(function (g) { return g.age < g.life; });
    if (ruffMotionGhosts.length > 12) ruffMotionGhosts.splice(0, ruffMotionGhosts.length - 12);

    // Speaking: small black lines from mouth area
    const radio = document.getElementById("ruffRadio");
    const speaking = radio && radio.classList.contains("speaking");
    if (speaking && Math.random() < 0.55) {
      ruffSpeakLines.push({
        x: ruffX + 10 + Math.random() * 6,
        y: ruffY + 6 + (Math.random() - 0.5) * 8,
        vx: 25 + Math.random() * 35,
        vy: (Math.random() - 0.5) * 20,
        life: 0.18 + Math.random() * 0.15,
        age: 0,
        len: 4 + Math.random() * 7
      });
    }
    ruffSpeakLines.forEach(function (s) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    });
    ruffSpeakLines = ruffSpeakLines.filter(function (s) { return s.age < s.life; });
    } catch (e) { console.warn("updateRuffCompanion", e); }
  }

  function getRuffCtx() {
    try {
      if (typeof ctx !== "undefined" && ctx && ctx.canvas) return ctx;
    } catch (e) {}
    try {
      var c = document.getElementById("gameCanvas");
      if (c) return c.getContext("2d");
    } catch (e2) {}
    return null;
  }

  function ensureRuffDomBuddy() {
    var el = document.getElementById("ruffDomBuddy");
    if (el) return el;
    el = document.createElement("div");
    el.id = "ruffDomBuddy";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = [
      "position:fixed",
      "z-index:45",
      "width:88px",
      "height:88px",
      "pointer-events:none",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "border-radius:50%",
      "background:radial-gradient(circle at 35% 30%, #ffe08a 0%, #c9a24a 45%, #6a4a18 100%)",
      "box-shadow:0 0 18px rgba(255,200,60,0.75), inset 0 -6px 12px rgba(0,0,0,0.25)",
      "border:2px solid #5a3e14",
      "font:800 11px/1.1 system-ui,sans-serif",
      "color:#fff8e0",
      "text-shadow:0 1px 2px #000",
      "transform:translate(-50%,-50%)"
    ].join(";");
    el.innerHTML = "<div style='text-align:center'>R.U.F.F.<br><span style=\"font-size:9px;opacity:.85\">pilot buddy</span></div>";
    document.body.appendChild(el);
    return el;
  }

  function syncRuffDomBuddy(show, x, y) {
    try {
      var el = ensureRuffDomBuddy();
      if (!show) { el.style.display = "none"; return; }
      var canvas = document.getElementById("gameCanvas");
      var rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      var W0 = (typeof W !== "undefined" && W > 0) ? W : rect.width;
      var H0 = (typeof H !== "undefined" && H > 0) ? H : rect.height;
      var sx = rect.left + (x / W0) * rect.width;
      var sy = rect.top + (y / H0) * rect.height;
      el.style.display = "flex";
      el.style.left = sx + "px";
      el.style.top = sy + "px";
    } catch (e) {}
  }

  function drawRuffCompanion() {
    // Force-active during training
    if (window.__airborneAirfield || window.__airborneRuffActive || window.__airborneTrainingFlight) {
      ruffActive = true;
      window.__airborneRuffActive = true;
    }
    if (!ruffActive) {
      syncRuffDomBuddy(false);
      return;
    }
    if (ruffStage === "report") {
      syncRuffDomBuddy(false);
      return;
    }

    var W0 = (typeof W !== "undefined" && W > 0) ? W : 400;
    var H0 = (typeof H !== "undefined" && H > 0) ? H : 600;
    var dx = ruffX, dy = ruffY;
    if (!(dx > 20) || !isFinite(dx)) dx = W0 * 0.72;
    if (!(dy > 20) || !isFinite(dy)) dy = H0 * 0.28;
    dx = Math.max(40, Math.min(W0 - 40, dx));
    dy = Math.max(40, Math.min(H0 - 40, dy));
    ruffX = dx; ruffY = dy;

    // DOM buddy only if no sprite frames loaded (repo has correct ruff_*.webp)
    var hasSprite = !!(img && img.naturalWidth);
    if (!hasSprite) syncRuffDomBuddy(true, dx, dy);
    else syncRuffDomBuddy(false);

    var c = getRuffCtx();
    if (!c) return;

    var idx = ((ruffFrame | 0) % RUFF_FRAME_COUNT) + 1;
    var key = "ruff_" + String(idx).padStart(2, "0");
    var img = (typeof images !== "undefined") ? images[key] : null;
    if (!img || !img.naturalWidth) {
      for (var i = 1; i <= RUFF_FRAME_COUNT; i++) {
        var k2 = "ruff_" + String(i).padStart(2, "0");
        if (typeof images !== "undefined" && images[k2] && images[k2].naturalWidth) { img = images[k2]; break; }
      }
    }
    var size = 96;
    var sc = size * (ruffScalePulse || 1);

    try {
      (ruffJetParticles || []).forEach(function (p) {
        var t = 1 - p.age / p.life;
        c.save();
        c.globalAlpha = Math.max(0, t * 0.85);
        c.fillStyle = p.hot ? "rgba(255,160,40,0.9)" : "rgba(80,70,65,0.7)";
        c.beginPath();
        c.arc(p.x, p.y, Math.max(0.5, p.r * t), 0, Math.PI * 2);
        c.fill();
        c.restore();
      });
    } catch (eJ) {}

    // Ghost motion trails (behind Ruff)
    try {
      for (var gi = 0; gi < (ruffMotionGhosts || []).length; gi++) {
        var g = ruffMotionGhosts[gi];
        if (!g) continue;
        var gu = 1 - (g.age / (g.life || 0.42));
        if (gu <= 0.05) continue;
        c.save();
        c.globalAlpha = gu * 0.28;
        c.translate(g.x, g.y);
        c.rotate(g.tilt || 0);
        var gsc = sc * (g.scale || 1) * (0.92 + gu * 0.05);
        if (img && img.naturalWidth) {
          c.drawImage(img, -gsc / 2, -gsc / 2, gsc, gsc);
        } else {
          c.fillStyle = "rgba(201,162,74," + (gu * 0.45) + ")";
          c.beginPath();
          c.ellipse(0, 4, gsc * 0.28, gsc * 0.32, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    } catch (eGh) {}

    c.save();
    try {
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
      c.translate(dx, dy);
      c.rotate(ruffTilt || 0);

      if (img && img.naturalWidth) {
        c.drawImage(img, -sc / 2, -sc / 2, sc, sc);
      } else {
        var s = sc * 0.55;
        c.globalAlpha = 0.4;
        var glow = c.createRadialGradient(0, 0, 2, 0, 0, s * 1.5);
        glow.addColorStop(0, "rgba(255,210,80,0.9)");
        glow.addColorStop(1, "rgba(255,180,40,0)");
        c.fillStyle = glow;
        c.beginPath();
        c.arc(0, 0, s * 1.5, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
        c.fillStyle = "#c9a24a";
        c.strokeStyle = "#5a3e14";
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(0, 4, s * 0.55, s * 0.62, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = "#e8d5a0";
        c.beginPath();
        c.ellipse(0, 10, s * 0.32, s * 0.36, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#d4b05c";
        c.beginPath();
        c.arc(0, -s * 0.42, s * 0.38, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = "#2a6aaa";
        c.beginPath();
        c.arc(-s * 0.14, -s * 0.44, s * 0.12, 0, Math.PI * 2);
        c.arc(s * 0.14, -s * 0.44, s * 0.12, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#d4af37";
        c.beginPath();
        c.arc(-s * 0.14, -s * 0.44, s * 0.12, 0, Math.PI * 2);
        c.arc(s * 0.14, -s * 0.44, s * 0.12, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = "#8a6a30";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(s * 0.1, -s * 0.72);
        c.lineTo(s * 0.22, -s * 1.05);
        c.stroke();
        c.fillStyle = "#ff4d4d";
        c.beginPath();
        c.arc(s * 0.22, -s * 1.05, 4, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#6a5a40";
        c.fillRect(-s * 0.55, -s * 0.05, s * 0.22, s * 0.4);
        c.fillRect(s * 0.33, -s * 0.05, s * 0.22, s * 0.4);
        c.fillStyle = "#fff8e0";
        c.font = "bold " + Math.max(10, s * 0.24) + "px system-ui,sans-serif";
        c.textAlign = "center";
        c.fillText("R.U.F.F.", 0, s * 0.98);
      }
    } catch (eDraw) {
      console.warn("drawRuffCompanion", eDraw);
    }
    c.restore();
  }



  // ---------- Flight report ----------
  function showFlightReport() {
    try { if (window.updateUnifiedProgress) window.updateUnifiedProgress(100); } catch (e) {}
    // Epic celebration before score UI
    if (!window.__airborneEndCelebrationDone) {
      window.__airborneEndCelebrationDone = true;
      window.__airborneEndCelebration = { t: 0, life: 0.45 };
      try {
        // Burst fireworks + confetti
        if (typeof spawnVictoryFirework === "function") {
          spawnVictoryFirework((typeof W !== "undefined" ? W : 400) * 0.3, (typeof H !== "undefined" ? H : 600) * 0.28);
          spawnVictoryFirework((typeof W !== "undefined" ? W : 400) * 0.5, (typeof H !== "undefined" ? H : 600) * 0.22);
          spawnVictoryFirework((typeof W !== "undefined" ? W : 400) * 0.7, (typeof H !== "undefined" ? H : 600) * 0.3);
        }
        if (typeof spawnFirework === "function") {
          spawnFirework((typeof W !== "undefined" ? W : 400) * 0.4, (typeof H !== "undefined" ? H : 600) * 0.35);
          spawnFirework((typeof W !== "undefined" ? W : 400) * 0.6, (typeof H !== "undefined" ? H : 600) * 0.32);
        }
        if (typeof particles !== "undefined" && particles) {
          var W0 = (typeof W !== "undefined") ? W : 400;
          var H0 = (typeof H !== "undefined") ? H : 600;
          for (var i = 0; i < 80; i++) {
            var ang = Math.random() * Math.PI * 2;
            var sp = 50 + Math.random() * 220;
            particles.push({
              x: W0 * 0.5, y: H0 * 0.4,
              vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40,
              life: 1.2 + Math.random() * 1.0,
              color: ["#ffd24a","#ff6b3d","#7ecbff","#ffe9a8","#ff4d6d","#7ef0ff","#fff"][i % 7],
              size: 2 + Math.random() * 5
            });
          }
        }
        try { trainChord([523, 659, 784, 1046, 1318], 0.3, 0.22); } catch (e) {}
      } catch (e) {}
      // Short celebration then show report (avoid 10s dead air)
      setTimeout(function () {
        try { showFlightReport(); } catch (e) {}
      }, 120);
      return;
    }

    const el = reportEl();
    if (!el) return;
    try {
      el.style.display = "";
      el.style.pointerEvents = "auto";
      el.style.zIndex = "70";
      const cont = document.getElementById("ruffContinueBtn");
      if (cont) {
        cont.textContent = "";
        cont.setAttribute("aria-label", "Return to Hangar");
        cont.onclick = function (e) {
          try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
          if (typeof finishToHangar === "function") finishToHangar();
          else finishToMap();
        };
        cont.style.pointerEvents = "auto";
      }
    } catch (e) {}

    const rows = document.getElementById("ruffReportRows");
    const final = document.getElementById("ruffFinalScore");
    try {
      ["#ruffReport .panel h2", "#ruffReport .title", "#ruffReportLabel", "#ruffReport .fsLabel"].forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (n) { n.style.display = "none"; });
      });
    } catch (e) {}
    const rankBanner = document.getElementById("ruffRankBanner");
    const rankNameEl = document.getElementById("ruffRankName");
    const rankTitleEl = document.getElementById("ruffRankTitle");
    const medalImg = document.getElementById("ruffMedalImg");
    // Score report keeps rank medal (medal_badge) — NOT boss weapon asset

    if (rows) {
      function row(label, val) {
        return '<div class="row"><span>' + label + '</span><span>' + val + '</span></div>';
      }
      rows.innerHTML =
        row("SKY CRYSTALS", "×" + (ruffStats.crystals || 0)) +
        row("COINS", "×" + (ruffStats.coins || 0)) +
        row("RINGS", (ruffStats.rings || 0) + " / " + (window.__airborneRingTotalTarget || 20)) +
        row("RING STREAK", "×" + (ruffStats.ringBestStreak || 0)) +
        row("OBSTACLES AVOIDED", "×" + (ruffStats.obstaclesAvoided || 0)) +
        row("BEST COMBO", "×" + (ruffStats.bestCombo || 0)) +
        row("LANDING", "★".repeat(Math.max(1, ruffStats.landingStars || 3)));
      rows.style.opacity = "1";
      rows.style.visibility = "visible";
    }

    // Prefer live score; if zero, derive a training score from stats so popup isn't stuck at 0
    var sc = 0;
    try {
      if (typeof score === "number") sc = score;
      else if (typeof window.score === "number") sc = window.score;
      else if (typeof gameplayScore === "number") sc = gameplayScore;
    } catch (e) {}
    try {
      var derived = (ruffStats.crystals || 0) * 25
        + (ruffStats.coins || 0) * 10
        + (ruffStats.rings || 0) * 50
        + (ruffStats.ringScore || 0)
        + (ruffStats.obstaclesAvoided || 0) * 15
        + (ruffStats.bestCombo || 0) * 20
        + Math.max(1, ruffStats.landingStars || 3) * 50;
      if (!(sc > 0)) sc = derived;
      else if (sc < derived) sc = derived;
      if (!(sc > 0)) sc = Math.max(1, (ruffStats.rings || 0) * 50);
      if (typeof score === "number" && score < sc) {
        score = sc;
        try {
          if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(sc);
          var sv = document.getElementById("scoreVal");
          if (sv) sv.textContent = String(sc);
        } catch (e) {}
      }
    } catch (e) {}
    const pilotRank = getPilotRank(sc, ruffStats);

    // Hide rank banner until score finishes counting
    if (rankBanner) {
      rankBanner.classList.remove("visible");
      rankBanner.style.opacity = "0";
    }
    if (rankNameEl) rankNameEl.textContent = (pilotRank.name || "Cadet").toUpperCase();
    if (rankTitleEl) { rankTitleEl.textContent = ""; rankTitleEl.style.display = "none"; }
    // Rank-up reveal: was Rookie during flight
    try {
      if (typeof updateHudRank === "function") updateHudRank(pilotRank.name || "Cadet");
    } catch (e) {}
    if (medalImg) {
      medalImg.classList.remove("weaponUnlockMedal");
      medalImg.style.filter = "";
      const src = (typeof images !== "undefined" && images.medal_badge && images.medal_badge.src)
        ? images.medal_badge.src
        : "medal_badge.webp";
      medalImg.src = src;
      medalImg.alt = pilotRank.name || "Cadet";
    }

    if (final) {
      final.innerHTML = '<span class="fsValue">0</span>';
      final.style.cssText = "position:absolute;left:10%;right:10%;top:52%;height:22%;display:flex!important;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:1!important;visibility:visible!important;z-index:20;color:#f0d878;pointer-events:none;";
      final.classList.remove("fadeOut");
    }
    if (rankBanner) {
      rankBanner.classList.remove("visible", "bounceIn");
      rankBanner.style.opacity = "0";
    }
    el.classList.add("visible");
    try {
      el.style.display = "flex";
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.zIndex = "90";
      el.style.pointerEvents = "auto";
    } catch (e) {}
    ensureSkipHandler();

    // Count-up → fade score → big RANK UP bounce
    const duration = 1600;
    const t0 = performance.now();
    function tick(now) {
      const u = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - u, 3);
      const n = Math.round(sc * eased);
      if (final) {
        var fv = final.querySelector(".fsValue");
        if (fv) fv.textContent = String(n);
        else final.innerHTML = '<span class="fsValue">' + n + '</span>';
      }
      if (u < 1) {
        requestAnimationFrame(tick);
      } else {
        if (final) {
          var fv2 = final.querySelector(".fsValue");
          if (fv2) fv2.textContent = String(sc);
          else final.innerHTML = '<span class="fsValue">' + sc + '</span>';
        }
        // RANK UP pops big over medal area first, then fades; medal + rank name reveal
        if (rankBanner && !window.__airborneRankUpPlayed) {
          window.__airborneRankUpPlayed = true;
          rankBanner.classList.add("visible");
          rankBanner.classList.remove("bounceIn", "medalShow", "rankNameShow");
          rankBanner.style.opacity = "1";
          var rankUpEl = rankBanner.querySelector(".rankUp");
          if (rankUpEl) {
            rankUpEl.classList.remove("popIn");
            void rankUpEl.offsetWidth;
            rankUpEl.classList.add("popIn");
          }
          playRankUpSfx();
          // After RANK UP peaks, reveal medal
          setTimeout(function () {
            rankBanner.classList.add("medalShow");
          }, 420);
          // After RANK UP fades, show rank name
          setTimeout(function () {
            rankBanner.classList.add("rankNameShow");
            showRadio("Not bad for a first flight, " + (pilotRank.name || "Cadet") + ".", 3.2);
          }, 1200);
        }
      }
    }
    requestAnimationFrame(tick);
  }

  function row(label, val) {
    return '<div class="row"><span>' + label + '</span><span>' + val + '</span></div>';
  }

  
  
  
  function clearAllGameplayEntities() {
    try {
      window.__udProgressTarget = 0;
      window.__airborneOneShotUsed = {};
      window.__udProgressShown = 0;
      if (window.updateUnifiedProgress) window.updateUnifiedProgress(0);
      if (window.tickUnifiedProgress) window.tickUnifiedProgress(1);
    } catch (e) {}
    try { if (window.__airborneClearCombatFx) window.__airborneClearCombatFx(); } catch (e) {}
    try { if (window.__airborneClearAtmosphereFx) window.__airborneClearAtmosphereFx(); } catch (e) {}
    try { if (window.__airborneClearPowerEntities) window.__airborneClearPowerEntities(); } catch (e) {}
    try { if (window.__airborneClearObstacles) window.__airborneClearObstacles(); } catch (e) {}
    try {
      ruffPlatforms = [];
      window.__airborneRuffPlatforms = [];
      ruffCoins = [];
      ruffCrystals = [];
      ruffAirship = null;
      ruffMarkers = [];
      ruffSparkles = [];
    } catch (e) {}
    try {
      var layer = document.getElementById("platDomLayer");
      if (layer) { layer.innerHTML = ""; layer.remove(); }
    } catch (e) {}
    try {
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof birdFlocks !== "undefined") birdFlocks = [];
      if (typeof bombs !== "undefined") bombs = [];
      if (typeof rockets !== "undefined") rockets = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof shieldPickup !== "undefined") shieldPickup = null;
      if (typeof healPickup !== "undefined") healPickup = null;
      if (typeof hearts !== "undefined") hearts = [];
      if (typeof particles !== "undefined") particles = [];
      if (typeof comboPopups !== "undefined") comboPopups = [];
    } catch (e) {}
    try {
      ruffCrystals = [];
      ruffCoins = [];
      ruffPlatforms = [];
      if (typeof ruffRings !== "undefined") ruffRings = [];
      ruffBgBalloons = [];
      ruffAirship = null;
      ruffPowerOrb = null;
      ruffMarkers = [];
      window.__airborneRuffAirship = null;
      window.__airborneRuffRings = [];
    } catch (e) {}
    try {
      if (window.__airborneHeatseekers) window.__airborneHeatseekers.length = 0;
      if (window.__airborneWarBullets) window.__airborneWarBullets.length = 0;
      if (window.__airborneOrphanTrails) window.__airborneOrphanTrails.length = 0;
      if (window.__airborneFireballs) window.__airborneFireballs.length = 0;
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneOrphanTrails = [];
      window.__airborneFireballs = [];
      window.__airborneActivePowerVisual = null;
      window.__airborneHeatseekUntil = 0;
    } catch (e) {}
    try {
      // Training boss atmosphere
      window.__airborneTrainingBoss = false;
    window.__airborneRingSerial = 0;

      window.__airborneTrainingBossBalloons = null;
    } catch (e) {}
    try {
      if (typeof score === "number") score = 0;
      if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = "0";
    } catch (e) {}
  }
  window.__airborneClearAllGameplay = clearAllGameplayEntities;


  function resetTrainingCollectHUD() {
    try {
      ruffStats = { crystals: 0, coins: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, landingStars: 3 };
    } catch (e) {}
    try {
      window.__airborneRingCollects = 0;
      window.__airborneCoinCollects = 0;
      window.__airborneCrystalCollects = 0;
    } catch (e) {}
    try {
      var el;
      el = document.getElementById("collectRings"); if (el) el.textContent = "0";
      el = document.getElementById("collectCrystals"); if (el) el.textContent = "0";
      el = document.getElementById("collectPowerPct"); if (el) el.textContent = "0";
      el = document.getElementById("scoreVal"); if (el) el.textContent = "0";
    } catch (e) {}
    try {
      if (typeof score === "number") score = 0;
      if (typeof gameplayScore === "number") gameplayScore = 0;
    } catch (e) {}
  }

  function hardResetTrainingState(opts) {
    try { stopAllTrainingAudio(); } catch (eAud) {}
    opts = opts || {};
    var keepAirfield = !!opts.keepAirfield;
    try { clearAllGameplayEntities(); } catch (e) {}
    try { resetTrainingCollectHUD(); } catch (e) {}

    // Platforms / collectibles / airship — always wipe on reset/restart
    try {
      ruffPlatforms = [];
      window.__airborneRuffPlatforms = [];
      ruffCoins = [];
      ruffCrystals = [];
      ruffAirship = null;
      ruffMarkers = [];
      ruffSparkles = [];
      ruffBgBalloons = [];
      ruffScreenDust = [];
    } catch (e) {}
    try {
      var layer = document.getElementById("platDomLayer");
      if (layer) { layer.innerHTML = ""; layer.remove(); }
    } catch (e) {}
    try { if (window.__airborneClearObstacles) window.__airborneClearObstacles(); } catch (e) {}
    try {
      if (typeof birdFlocks !== "undefined" && birdFlocks && birdFlocks.length) birdFlocks.length = 0;
      if (typeof bombs !== "undefined" && bombs && bombs.length) bombs.length = 0;
      if (typeof rockets !== "undefined" && rockets && rockets.length) rockets.length = 0;
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof shieldPickup !== "undefined") shieldPickup = null;
      if (typeof particles !== "undefined" && particles && particles.length) particles.length = 0;
    } catch (e) {}

    try {
      ruffActive = false;
      ruffStage = "idle";
      ruffStageT = 0;
      ruffLineIdx = 0;
      ruffLineT = 0;
      ruffLines = [];
      ruffWaitingInput = false;
      ruffWaitingCollect = 0;
      ruffWaitingAvoid = false;
      ruffWaitingRing = 0;
      ruffLandingCelebrated = false;
      ruffStats = { crystals: 0, coins: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, landingStars: 3 };
      ruffJetParticles = [];
      ruffMotionGhosts = [];
      ruffSpeakLines = [];
      ruffFrame = 0;
      ruffFrameT = 0;
      ruffX = 0;
      ruffY = 0;
      ruffLessonPendingNext = false;
      ruffLessonClearing = false;
      ruffLessonPauseT = 0;
    } catch (e) {}

    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
  window.__airborneStageOrder = STAGE_ORDER;
    window.__airborneRuffLandArmed = false;
    window.__airborneRuffRequestLand = false;
    window.__airborneTrainingPowerUsed = false;
    window.__airborneTrainingBoss = false;
    window.__airborneRingSerial = 0;

    window.__airborneTrainingBossDone = false;
    window.__airborneTrainingBossTried = false;
    window.__airborneTrainingReportReady = false;
    window.__airborneTrainingReportShown = false;
    window.__airborneForceTrainRestart = true;
    window.__airborneAirfieldAllowPowerup = true;
    window.__airborneFlightTitleShown = false;
    window.__airborneEndCelebrationDone = false;
    window.__airborneEndCelebration = null;
    window.__airborneRingResultsShown = false;
    window.__airborneRingResultsHoldT = 0;
    window.__airborneRingSpawned = 0;
    window.__airborneRingSerial = 0;
    window.__airborneRingsPreSpawned = false;
    window.__airborneRingTotalTarget = 20;
    window.__airborneRankUpPlayed = false;
    window.__airborneAirfield = false;
    window.__airborneTrainingFlight = false;
    window.__airborneAirfieldInvuln = false;
    window.__airborneAirfieldObstacles = false;
    window.__airborneAirfieldRings = false;
    window.__airborneAirfieldPhase = "idle";
    window.__airborneTaxiUntil = 0;
    try {
      if (typeof score !== "undefined") score = 0;
      if (typeof health !== "undefined" && typeof MAX_HEALTH !== "undefined") health = MAX_HEALTH;
      if (typeof invulnerableUntil !== "undefined") invulnerableUntil = 0;
    } catch (e) {}
    try {
      var rr = document.getElementById("aaRingResults");
      if (rr && rr.parentNode) rr.parentNode.removeChild(rr);
    } catch (e) {}
    window.__airborneRankUpPlayed = false;
    window.__airborneLandTouchAt = 0;
    window.__airborneTaxiUntil = 0;
    window.__airborneBossCamPause = false;
    window.__airborneAirfieldPaused = false;
    window.__airborneWorldFrozen = false;
    window.__airborneLessonDriverT = 0;
    window.__airborneLessonDriverArmed = false;
    window.__airborneForceSetStage = null;
    window.__airborneRingCollects = 0;
    window.__airborneCollectCoins = 0;
    window.__airborneCollectCrystals = 0;

    try {
      if (window.__airborneCam) {
        window.__airborneCam.phase = "idle";
        window.__airborneCam.z = 1;
        window.__airborneCam.paused = false;
      }
      if (typeof applyCamCss === "function") applyCamCss(1);
    } catch (eCam) {}
    try {
      var po = document.getElementById("pauseOverlay");
      if (po) { po.classList.add("hidden"); po.setAttribute("aria-hidden", "true"); }
    } catch (ePo) {}
    try { if (typeof lastTime !== "undefined") lastTime = null; } catch (eLt) {}
    try {
      if (typeof score === "number") score = 0;
      if (typeof gameplayScore === "number") gameplayScore = 0;
    } catch (e) {}

    if (!keepAirfield) {
      window.__airborneAirfield = false;
      window.__airborneTrainingFlight = false;
      window.__airborneAirfieldPhase = "done";
      window.__airborneAirfieldHold = false;
      window.__airborneAirfieldPaused = false;
    }
    window.__airborneResetRunway = true;
    try {
      window.__airborneFireballs = [];
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneOrphanTrails = [];
      window.__airborneActivePowerVisual = null;
      window.__airborneActivePowerUntil = 0;
      window.__airborneFirePowerActive = false;
    } catch (e) {}
    try {
      var rep = document.getElementById("ruffReport");
      if (rep) {
        rep.classList.remove("visible");
        rep.style.display = "none";
      }
    } catch (e) {}
    console.log("[R.U.F.F.] hardReset", window.__AIRBORNE_BUILD || "?", keepAirfield);
  }


  window.__airborneHardResetTraining = hardResetTrainingState;
  window.resetTrainingCollectHUD = resetTrainingCollectHUD;

  function finishToHangar_mark(){ try { window.__airborneOneShotUsed = {}; } catch(e) {} }
  function finishToHangar() {
    window.__airborneReturnToHangar = true;
    try { if (typeof lastTime !== "undefined") lastTime = null; } catch (e) {}
    try {
      var po = document.getElementById("pauseOverlay");
      if (po) { po.classList.add("hidden"); po.setAttribute("aria-hidden", "true"); }
      document.body.classList.remove("pause-open");
      window.__airborneAirfieldPaused = false;
      if (typeof state !== "undefined" && state === "paused") state = "menu";
    } catch (e) {}
    try { hardResetTrainingState(); } catch (e) {}
    try { stopAllTrainingAudio(); } catch (e) {}
    try { hideFlightTrace(); } catch (e) {}
    try { hideRadio(); } catch (e) {}
    try { stopSpeak(); } catch (e) {}
    try {
      var el = reportEl();
      if (el) { el.classList.remove("visible"); el.style.display = "none"; }
    } catch (e) {}
    ruffActive = false;
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
  window.__airborneStageOrder = STAGE_ORDER;
    window.__airborneRuffRequestLand = false;
    window.__airborneRuffLandArmed = false;
    window.__airborneTrainingBoss = false;
    window.__airborneRingSerial = 0;

    window.__airborneTrainingBossDone = false;
    try { clearTrainingPowerIcon(); } catch (e) {}
    try {
      if (typeof window.endAirfieldTrainingToMap === "function") window.endAirfieldTrainingToMap();
    } catch (e) {}
    // ALWAYS force hangar — never leave map visible
    try { if (typeof state !== "undefined") state = "menu"; } catch (e) {}
    try {
      var map = document.getElementById("worldMapScreen");
      if (map) {
        map.style.display = "none";
        map.style.visibility = "hidden";
        map.classList.add("hidden");
        map.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
    try {
      var gs = document.getElementById("gameScreen");
      if (gs) { gs.style.display = "none"; }
    } catch (e) {}
    try {
      var so = document.getElementById("startOverlay");
      if (so) { so.classList.add("hidden"); so.style.display = "none"; }
    } catch (e) {}
    try {
      var menu = document.getElementById("menuScreen");
      if (menu) {
        menu.style.display = "flex";
        menu.style.visibility = "visible";
        menu.style.opacity = "1";
        menu.classList.remove("hidden");
      }
    } catch (e) {}
    try { if (window.__airborneShowHangar) window.__airborneShowHangar(); } catch (e) {}
    try { if (window.__airborneShowMenu) window.__airborneShowMenu(); } catch (e) {}
    try { if (typeof startMenuMusic === "function") startMenuMusic(); } catch (e) {}
    // Hide map again after any async map show
    setTimeout(function () {
      try {
        var map2 = document.getElementById("worldMapScreen");
        if (map2) {
          map2.style.display = "none";
          map2.classList.add("hidden");
        }
        var menu2 = document.getElementById("menuScreen");
        if (menu2) {
          menu2.style.display = "flex";
          menu2.classList.remove("hidden");
        }
      } catch (e) {}
      window.__airborneReturnToHangar = false;
    }, 50);
  }
  window.__airborneFinishToHangar = finishToHangar;


function finishToMap() {
    try { stopAllTrainingAudio(); } catch (e) {}

    try { hideFlightTrace(); } catch (e) {}
    try { hideRadio(); } catch (e) {}
    try { stopSpeak(); } catch (e) {}
    try {
      const el = reportEl();
      if (el) {
        el.classList.remove("visible");
        el.style.display = "none";
      }
    } catch (e) {}
    ruffActive = false;
    window.__airborneRuffActive = false;
    window.__airborneRuffStage = "idle";
  window.__airborneStageOrder = STAGE_ORDER;
    window.__airborneRuffRequestLand = false;
    window.__airborneRuffLandArmed = false;
    try { syncRuffDomBuddy(false); } catch (e) {}
    try {
      var layer = document.getElementById("platDomLayer");
      if (layer) layer.innerHTML = "";
    } catch (eL) {}
    try { clearTrainingPowerIcon(); } catch (e) {}
    // Prefer window exports (functions are scoped inside other files)
    try {
      if (typeof window.endAirfieldTrainingToMap === "function") {
        window.endAirfieldTrainingToMap();
      } else if (typeof endAirfieldTrainingToMap === "function") {
        endAirfieldTrainingToMap();
      }
    } catch (e) { console.warn("endAirfield", e); }
    // Always force map visible as fallback
    try {
      if (typeof window.__airborneShowWorldMap === "function") {
        window.__airborneShowWorldMap({ mode: "start" });
      }
    } catch (e) { console.warn("showWorldMap", e); }
    try {
      const gs = document.getElementById("gameScreen");
      if (gs) gs.style.display = "none";
      const ms = document.getElementById("worldMapScreen");
      if (ms) {
        ms.style.display = "block";
        ms.style.visibility = "visible";
        ms.style.opacity = "1";
      }
      if (typeof state !== "undefined") state = "start";
    } catch (e) {}
  }
  window.__airborneFinishToMap = finishToMap;

  window.__airborneShowRuffReport = function() {
    ruffActive = true;
    try { if (typeof window.__airborneApplyShipPowerIcon === "function") window.__airborneApplyShipPowerIcon(); } catch (e) {};
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "report";
    window.__airborneRuffRequestLand = false;
    try { hideRadio(); } catch (e0) {}
    try { setStage("report"); } catch (e) {}
    try { showFlightReport(); } catch (e2) {
      // Fallback if setStage path failed
      try {
        var el = document.getElementById("ruffReport");
        if (el) el.classList.add("visible");
      } catch (e3) {}
    }
  };

  // ---------- Public API ----------
  function beginRuffTraining() {
    try { console.log("[R.U.F.F.] begin", window.__AIRBORNE_BUILD, window.__AIRBORNE_BUILD_STAMP); } catch (e) {}
    try {
      ruffPlatforms = [];
      window.__airborneRuffPlatforms = [];
      ruffCoins = [];
      ruffCrystals = [];
      ruffAirship = null;
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof birdFlocks !== "undefined") birdFlocks = [];
    } catch (eBeg) {}
    // Soft clear without killing airfield flags
    try { hardResetTrainingState({ keepAirfield: true }); } catch (e) {}
    try { resetTrainingCollectHUD(); } catch (e) {}
    try { if (window.__airborneClearAllGameplay) window.__airborneClearAllGameplay(); } catch (e) {}

    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "intro";
    ruffStage = "intro";
    ruffStageT = 0;
    ruffLineIdx = 0;
    ruffLineT = 0;
    ruffLandingCelebrated = false;
    ruffIntroFly = true;
    ruffIntroFlyT = 0;
    ruffIntroLineArmed = false;
    ruffSpeechDone = true;
    ruffScalePulse = 1.15;
    ruffWaitingInput = false;
    ruffWaitingCollect = 0;
    ruffWaitingAvoid = false;
    ruffWaitingRing = 0;
    window.__airborneRuffLandArmed = false;
    window.__airborneRuffRequestLand = false;
    window.__airborneTrainingPowerUsed = false;
    window.__airborneTrainingBoss = false;
    window.__airborneRingSerial = 0;

    window.__airborneTrainingBossDone = false;
    window.__airborneTrainingBossTried = false;

    // Visible from first frame (fly-in starts on-screen)
    var _W = (typeof W !== "undefined" && W > 0) ? W : 390;
    var _H = (typeof H !== "undefined" && H > 0) ? H : 700;
    ruffX = _W * 0.88;
    ruffY = _H * 0.22;
    ruffTilt = -0.2;
    ruffFrame = 0;
    ruffFrameT = 0;

    ruffLines = (DIALOGUE && DIALOGUE.intro) ? DIALOGUE.intro.slice() : [];
    ruffLineDuration = 3.5;

    ruffCrystals = [];
    ruffCoins = [];
    try { if (typeof ruffRings !== "undefined") ruffRings = []; } catch (e) {}
    ruffBgBalloons = [];
    try {
      ruffStats = { crystals: 0, coins: 0, rings: 0, powerups: 0, obstaclesAvoided: 0, bestCombo: 0, survivingStars: 3 };
    } catch (e) {}

    try {
      trainEnsure();
      playTrainingMusic();
      setTimeout(function () { try { playTrainingMusic(); } catch (eR) {} }, 200);
      setTimeout(function () { try { playTrainingMusic(); } catch (eR2) {} }, 800);
      trainEngineStart();
      trainWindStart();
      trainBeep(523, 0.1, 0.22);
      setTimeout(function(){ trainBeep(659, 0.1, 0.2); }, 120);
      setTimeout(function(){ trainBeep(784, 0.12, 0.18); }, 240);
    } catch (e) { console.warn("train audio start", e); }

    try { placeTrainingPowerIcon(); } catch (e) {}
    try {
      var ft = document.getElementById("ruffFlightTrace");
      if (ft) { ft.style.display = "none"; ft.style.visibility = "hidden"; }
    } catch (e) {}
    // Large centered FLIGHT TRAINING banner
    window.__airborneFlightTitleShown = false;
    window.__airborneEndCelebrationDone = false;
    window.__airborneEndCelebration = null;
    window.__airborneRingResultsShown = false;
    window.__airborneRingResultsHoldT = 0;
    window.__airborneRingSpawned = 0;
    window.__airborneRingSerial = 0;
    window.__airborneRingsPreSpawned = false;
    window.__airborneRingTotalTarget = 20;
    window.__airborneRankUpPlayed = false;
    window.__airborneAirfield = false;
    window.__airborneTrainingFlight = false;
    window.__airborneAirfieldInvuln = false;
    window.__airborneAirfieldObstacles = false;
    window.__airborneAirfieldRings = false;
    window.__airborneAirfieldPhase = "idle";
    window.__airborneTaxiUntil = 0;
    try {
      if (typeof score !== "undefined") score = 0;
      if (typeof health !== "undefined" && typeof MAX_HEALTH !== "undefined") health = MAX_HEALTH;
      if (typeof invulnerableUntil !== "undefined") invulnerableUntil = 0;
    } catch (e) {}
    try {
      var rr = document.getElementById("aaRingResults");
      if (rr && rr.parentNode) rr.parentNode.removeChild(rr);
    } catch (e) {}
    window.__airborneTrainingReportShown = false;
    window.__airborneTrainingReportReady = false;
    try {
      ruffLessonPendingNext = false;
      ruffLessonClearing = false;
      ruffAirship = null;
    } catch (e) {}
    // Use setStage for full intro wiring (does not clear ruffActive)
    try {
      // Avoid recursive hard clear inside setStage collectible wipe only
      setStage("intro");
    } catch (e) {
      console.warn("setStage intro", e);
    }
    // setStage resets intro fly — re-arm after
    ruffActive = true;
    window.__airborneRuffActive = true;
    window.__airborneAirfield = true;
    window.__airborneTrainingFlight = true;
    ruffIntroFly = true;
    ruffIntroFlyT = 0;
    ruffX = _W * 0.95;
    ruffY = _H * 0.16;
    window.__airborneRuffX = ruffX;
    window.__airborneRuffY = ruffY;
    window.__airborneRuffIntroFly = true;
    window.__airborneRuffIntroT = 0;
    window.__airborneRuffStage = "intro";
    ruffStage = "intro";
    console.log("[R.U.F.F.] begin", ruffActive, ruffStage, Math.round(ruffX), Math.round(ruffY));
  }


  function updateRuff(dt) {
    // Force Ruff visible whenever training airfield is active
    if (window.__airborneAirfield && !ruffActive) {
      ruffActive = true;
      window.__airborneRuffActive = true;
      if (!ruffStage || ruffStage === "idle") {
        ruffStage = "intro";
        window.__airborneRuffStage = "intro";
        ruffIntroFly = true;
        ruffIntroFlyT = 0;
        var _W = (typeof W !== "undefined" && W > 0) ? W : 390;
        var _H = (typeof H !== "undefined" && H > 0) ? H : 700;
        ruffX = _W * 0.88;
        ruffY = _H * 0.22;
        ruffLines = (typeof DIALOGUE !== "undefined" && DIALOGUE.intro) ? DIALOGUE.intro.slice() : [];
      }
    }

    if (!ruffActive && window.__airborneRuffActive) {
      ruffActive = true;
      if (!ruffStage || ruffStage === "idle") {
        ruffStage = window.__airborneRuffStage || "intro";
        if (ruffStage === "intro") {
          ruffIntroFly = true;
        }
      }
    }
    if (!ruffActive) return;
    window.__airborneRuffX = ruffX;
    window.__airborneRuffY = ruffY;
    if (window.__airborneForceSetStage) {
      var _fs = window.__airborneForceSetStage;
      window.__airborneForceSetStage = null;
      if (_fs && _fs !== ruffStage) {
        setStage(_fs);
        console.log("[R.U.F.F.] forceSetStage", _fs);
      }
    }
    if (window.__airborneForceRuffCruise) {
      window.__airborneForceRuffCruise = false;
      ruffIntroFly = false;
      window.__airborneRuffIntroFly = false;
      if (ruffStage === "intro" || ruffStage === "takeoff" || ruffStage === "idle" || !ruffStage) {
        setStage("cruise");
        console.log("[R.U.F.F.] force → cruise");
      }
    }
    ruffStageT += dt;
    ruffLineT += dt;
    try { tickLessonGate(dt); } catch (e) {}
    // Background balloons drift for the entire training session
    try {
      if (window.__airborneAirfield && ruffStage && ruffStage !== "report" && ruffStage !== "idle") {
        if (!ruffBgBalloons || !ruffBgBalloons.length) spawnTrainingBgBalloons();
        updateTrainingBgBalloons(dt);
      }
    } catch (e) {}
    // Keep training power icon visible (center bottom)
    try {
      var __sm = document.getElementById("stormMeter");
      if (__sm && !__sm.classList.contains("trainingPos")) placeTrainingPowerIcon();
    } catch (e) {}
    // Do NOT force obstacleSpeed or unpause during intro/runway —
    // airfield owns those. Only ensure cruise speed once airborne lessons run.
    const afPh = window.__airborneAirfieldPhase;
    if (afPh === "lesson") {
      // Slightly higher tempo during training (birds/items)
      if (typeof obstacleSpeed !== "undefined") {
        const target = (ruffStage === "obstacles" || ruffStage === "shield" || ruffStage === "combined")
          ? 255 : 230;
        if (obstacleSpeed < target) obstacleSpeed = target;
      }
    }
    // Only clear pause once intro is done and player is in takeoff+ stages
    if (ruffStage !== "intro" && ruffStage !== "idle") {
      if (afPh === "taxi" || afPh === "accel" || afPh === "climb" || afPh === "lesson") {
        // allow airfield to manage pause; do not force true
      }
    }
    updateRuffCompanion(dt);
    updateSparkles(dt);
    // Always keep coins/crystals flowing during flight training
    try { updateFlightCollectibles(dt); } catch (eCol) {}
    try {
      if (ruffCoins && ruffCoins.length) {
        ruffCoins = ruffCoins.filter(function (c) {
          return c && !c.collected && c.x > -80;
        });
      }
      if (ruffCrystals && ruffCrystals.length) {
        ruffCrystals = ruffCrystals.filter(function (c) {
          return c && !c.collected && c.x > -80;
        });
      }
    } catch (e) {}

    // Auto-advance dialogue lines
    if (ruffLines.length && ruffLineIdx < ruffLines.length &&
        ruffLineT >= ruffLineDuration && ruffSpeechDone) {
      const done = advanceLine();
      if (done) {
        // Stage-specific after dialogue
        if (ruffStage === "intro") {
          ruffIntroFly = false;
          nextStage(); // → takeoff
        } else if (ruffStage === "altitude" && ruffMarkers.length === 0) {
          nextStage();
        } else if (ruffStage === "combined" && ruffStageT > 22) {
          nextStage(); // → landing
        }
      }
    }

    // Intro: advance lines on a timer, then go to takeoff (must finish before drive)
    if (ruffStage === "intro") {
      if (ruffIntroLineArmed && ruffLineIdx < ruffLines.length &&
          ruffLineT >= Math.max(1.6, ruffLineDuration || 2)) {
        ruffLineIdx++;
        ruffLineT = 0;
        if (ruffLineIdx < ruffLines.length) {
          showRadio(ruffLines[ruffLineIdx], 3.2);
        }
      }
      if ((ruffIntroLineArmed && ruffLineIdx >= ruffLines.length && ruffLineT > 1.2) ||
          ruffStageT > 14) {
        ruffIntroFly = false;
        ruffIntroFlyT = 99;
        window.__airborneRuffIntroFly = false;
        window.__airborneAirfieldPaused = false;
        window.__airborneTrainingFlight = true;
        setStage("takeoff");
        console.log("[R.U.F.F.] intro done → takeoff");
      }
    }

    
  // Keep ring results overlay alive across stage change
  // Ring HUD lifetime handled only inside __airborneDrawRingSummary

// Stage logic — every stage has a hard timeout so training never freezes
    if (ruffStage === "takeoff") {
      const ph = window.__airborneAirfieldPhase;
      window.__airborneTrainingFlight = true;
      if (ph === "lesson" || (ph === "climb" && ruffStageT > 1.2) || ruffStageT > 28) {
        setStage("cruise");
        console.log("[R.U.F.F.] takeoff → cruise");
      }
    }
    // Catch-up if airfield already in lesson phase
    if ((ruffStage === "intro" || ruffStage === "takeoff") &&
        window.__airborneAirfieldPhase === "lesson") {
      ruffIntroFly = false;
      window.__airborneRuffIntroFly = false;
      setStage("cruise");
      console.log("[R.U.F.F.] catch-up → cruise");
    } else if (ruffStage === "cruise") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      window.__airborneFirePickup = null;
      if (ruffStageT > 8) {
        setStage("altitude");
        console.log("[R.U.F.F.] cruise → altitude");
      }
    } else if (ruffStage === "altitude") {
      ruffMarkers = [];
      if (ruffStageT > 15) {
        setStage("rings");
        console.log("[R.U.F.F.] altitude → rings");
      }
    } else if (ruffStage === "rings") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false; // dedicated spawner only
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 199;
      window.__airborneRingTotalTarget = 20;
      // Never show platforms during / right after rings
      try { ruffPlatforms = []; window.__airborneRuffPlatforms = []; } catch (eClr) {}

      // Sequential spawn: 1 ring every 1.15s until exactly 20
      window.__airborneRingSpawnT = (window.__airborneRingSpawnT || 0) + dt;
      var spawned = window.__airborneRingSpawned || 0;
      var spawnEvery = 1.15;
      // If we're short near the end, spawn faster so we always hit 20
      if (spawned >= 15 && spawned < 20) spawnEvery = 0.85;
      if (spawned < 20 && window.__airborneRingSpawnT >= spawnEvery) {
        window.__airborneRingSpawnT = 0;
        try {
          if (typeof window.spawnNextTrainingRing === "function") window.spawnNextTrainingRing();
          else if (typeof window.spawnGoldRing === "function") window.spawnGoldRing();
        } catch (eSp) { console.warn("ring seq", eSp); }
        spawned = window.__airborneRingSpawned || 0;
      }
      // Hard guarantee: if timer somehow skips the 20th, force it
      if (spawned === 19 && ruffStageT > 22) {
        try {
          if (typeof window.spawnNextTrainingRing === "function") window.spawnNextTrainingRing();
          else if (typeof window.spawnGoldRing === "function") window.spawnGoldRing();
        } catch (e20) {}
        spawned = window.__airborneRingSpawned || 0;
      }

      // Count rings from the REAL obstacles list
      var ringsLeft = 0;
      try {
        if (typeof window.__airborneCountTrainingRings === "function") {
          ringsLeft = window.__airborneCountTrainingRings();
        } else if (typeof window.__airborneGetObstacles === "function") {
          var arr = window.__airborneGetObstacles() || [];
          for (var ri = 0; ri < arr.length; ri++) {
            var ro = arr[ri];
            if (ro && (ro.isRing || ro.type === "gold_ring") && (ro.x + (ro.w || 40) > -30)) ringsLeft++;
          }
        }
      } catch (eRL) {}

      if ((spawned >= 20 && ringsLeft === 0 && ruffStageT > 16) || ruffStageT > 100) {
        try { showRingResultsBanner(); } catch (e) {}
        setStage("obstacles");
        console.log("[R.U.F.F.] rings → obstacles + summary");
      }
    } else if (ruffStage === "crystals" || ruffStage === "powerup") {
      setStage("obstacles");
    } else if (ruffStage === "platforms") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (!ruffPlatforms || !ruffPlatforms.length) {
        try { spawnTrainingPlatformsLesson(); } catch (e) { console.warn("plat respawn", e); }
      }
      try { updateTrainingPlatforms(dt); } catch (e) {}
      // Wait until every platform has scrolled fully off
      // Drop platforms fully past the left edge (must fully leave screen)
      try {
        ruffPlatforms = (ruffPlatforms || []).filter(function (p) {
          return p && (p.x + (p.w || 0) > -40);
        });
        window.__airborneRuffPlatforms = ruffPlatforms;
      } catch (ePr) {}
      var anyPlat = ruffPlatforms && ruffPlatforms.some(function (p) {
        return p && (p.x + (p.w || 0) > -20);
      });
      if (!anyPlat && ruffStageT > 8) {
        setStage("shield");
        console.log("[R.U.F.F.] platforms → shield (cleared)");
      } else if (ruffStageT > 60) {
        setStage("shield");
        console.log("[R.U.F.F.] platforms → shield (timeout)");
      }
    } else if (ruffStage === "obstacles") {
      window.__airborneAirfieldInvuln = false;
      window.__airborneAirfieldObstacles = true;
      try { if (typeof state !== "undefined" && state !== "playing" && state !== "paused") state = "playing"; } catch (e) {}
      // No platforms in this lesson
      try {
        ruffPlatforms = [];
        window.__airborneRuffPlatforms = [];
        ruffCoins = (ruffCoins || []).filter(function (c) { return c && !c.fixedToPlatform && !c.collected; });
        ruffCrystals = (ruffCrystals || []).filter(function (c) { return c && !c.fixedToPlatform && !c.collected; });
      } catch (e) {}
      if (typeof spawnInterval !== "undefined") spawnInterval = 0.174;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 198;

      if (ruffLessonPendingNext) {
        stopLessonSpawns();
      } else {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 0.174;
        if (ruffStageT > 16) {
          window.__airborneAirfieldObstacles = false;
          if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        }
        const obsCount = (typeof obstacles !== "undefined" && obstacles) ? obstacles.length : 0;
        if ((ruffStageT > 14 && obsCount === 0) || ruffStageT > 20) {
          ruffStats.obstaclesAvoided += 2;
          setStage("platforms");
          console.log("[R.U.F.F.] obstacles → platforms");
        }
      }
    } else if (ruffStage === "airship") {
      setStage("boss1");
    } else if (ruffStage === "shield") {
      try { ruffCoins = []; ruffCrystals = []; } catch (e) {}
      window.__airborneAirfieldAllowShield = true;
      // Spawn shield early
      if ((typeof shieldPickup === "undefined" || !shieldPickup || shieldPickup.x < -50) && ruffStageT < 8 && !(typeof shieldActive !== "undefined" && shieldActive)) {
        shieldPickup = {
          x: (typeof W !== "undefined" ? W : 400) + 40,
          y: (typeof H !== "undefined" ? H : 600) * 0.4,
          w: 42, h: 42, speed: 160, bobPhase: 0,
          frame: 0, frameT: 0, embers: []
        };
      }
      // After shield is up (or 5s), send obstacles to demonstrate protection
      if ((typeof shieldActive !== "undefined" && shieldActive) || ruffStageT > 5) {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 1.3;
      }
      // Stop birds near end so stage can finish cleanly
      if (ruffStageT > 30) {
        window.__airborneAirfieldObstacles = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      }
      if (ruffStageT > 22) {
        window.__airborneAirfieldObstacles = false;
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        setStage("combined");
        console.log("[R.U.F.F.] shield → combined");
      }
      if (false && !ruffLessonPendingNext && ruffStageT > 30) {
        requestNextStage();
      }
    } else if (ruffStage === "powerup") {
      window.__airborneAirfieldAllowPowerup = true;
    try {
      if (typeof stormCharge !== "undefined" && typeof STORM_MAX === "number") {
        stormCharge = STORM_MAX;
        if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      }
    } catch (e) {}
      // NO floating fire pickup — meter is charged by coins only
      window.__airborneFirePickup = null;
      try { placeTrainingPowerIcon(); } catch (e) {}
      // Keep coins flowing so player can reach 25
      try {
        if ((ruffCoins || []).length < 8) spawnTrainingCoins(5);
      } catch (e) {}
      // Charge meter from coins (1 coin = full)
      try {
        if (typeof window.addStormChargeForScore === "function") {
          window.addStormChargeForScore(typeof score === "number" ? score : 0);
        }
      } catch (e) {}
      // Once charged (or power already used), spawn obstacles to blast
      var coins = window.__airborneCollectCoins || 0;
      var charged = (typeof stormCharge === "number" && typeof STORM_MAX === "number" && stormCharge >= STORM_MAX);
      if (charged || window.__airborneTrainingPowerUsed) {
        window.__airborneAirfieldObstacles = true;
        if (typeof spawnInterval !== "undefined") spawnInterval = 0.9;
      }
      // Detect activation
      if (typeof stormActive !== "undefined" && stormActive) {
        if (!window.__airborneTrainingPowerUsed) {
          try { sfxTrainingPower(); } catch (e) {}
        }
        window.__airborneTrainingPowerUsed = true;
      }
      // Advance only after power was activated, then wait 5 seconds
      if (window.__airborneTrainingPowerUsed) {
        window.__airborneTrainingPowerWait = (window.__airborneTrainingPowerWait || 0) + dt;
        if (!ruffLessonPendingNext && window.__airborneTrainingPowerWait >= 5.0) {
          window.__airborneAirfieldObstacles = false;
          if (typeof spawnInterval !== "undefined") spawnInterval = 999;
          requestNextStage();
        }
      }
    } else if (ruffStage === "platforms") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      try { updateTrainingPlatforms(dt); } catch (e) {}
      // Wait until every platform has scrolled off (failsafe 90s)
      var platsLeft = (ruffPlatforms || []).length;
      if (!ruffLessonPendingNext && ((ruffStageT > 8 && platsLeft === 0) || ruffStageT > 90)) {
        ruffPlatforms = [];
        requestNextStage();
      }
    } else if (ruffStage === "rings") {
      // Handled above — full 20-ring gate (do not early-exit here)
      if (typeof powerup !== "undefined") powerup = null;
    } else if (ruffStage === "airship") {
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      if (!ruffAirship && ruffStageT < 1.5) {
        try { spawnTrainingAirship(); } catch (e) {}
      }
      updateTrainingAirship(dt);
      ensureScreenDust();
      updateScreenDust(dt);
      // Wait until airship fully cleared the left edge
      if ((ruffStageT > 2 && !ruffAirship) || ruffStageT > 28) {
        ruffAirship = null;
        setStage("boss1");
        console.log("[R.U.F.F.] airship → boss1");
      }
    } else if (ruffStage === "boss1") {
      // Sweep any leftover platforms immediately so boss is clean
      if (ruffPlatforms && ruffPlatforms.length) {
        ruffPlatforms = [];
        window.__airborneRuffPlatforms = [];
      }
      try { ruffCoins = []; ruffCrystals = []; ruffPlatforms = []; } catch (e) {}
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      try { bossBanner = null; } catch (e) {}
      // Balloons drift in first (~4s), sky darkens gradually, then boss
      // Keep continuous balloons — only seed if empty, without jump-resetting positions
      if (!ruffBgBalloons || !ruffBgBalloons.length) {
        try { spawnTrainingBgBalloons(); } catch (e) {}
      }
      updateTrainingBgBalloons(dt);
      ensureScreenDust();
      updateScreenDust(dt);
      // No screen darken when boss appears
      updateTrainingBossDark(dt, 0);
      ruffBossDark = 0;
      // Boss arrives after short intro (~1.2s) — no long pause
      if (ruffStageT > 1.2 && !window.__airborneTrainingBossTried && !window.__airborneTrainingBossDone &&
          !(typeof bossActive !== "undefined" && bossActive) && !ruffLessonPendingNext) {
        try {
          window.__airborneTrainingBossTried = true;
          window.__airborneTrainingBoss = true;
          try { bossBanner = null; } catch (e0) {}
          if (typeof triggerBoss === "function") {
            triggerBoss(1);
            if (typeof boss !== "undefined" && boss) {
              boss.maxHealth = 30;
              boss.health = 30;
            }
            try {
              if (typeof window.__airborneStartBossCam === "function") window.__airborneStartBossCam();
            } catch (eCam) {}
          }
          try { bossBanner = null; } catch (e1) {}
        } catch (e) {}
      }
      if (!ruffLessonPendingNext && !window.__airborneBossCamPause) {
        // Account for ~7s cinematic (zoom + 5s hold + zoom in)
        if (window.__airborneTrainingBossDone ||
            (ruffStageT > 14 && window.__airborneTrainingBossTried &&
             typeof bossActive !== "undefined" && !bossActive && !bossSinking)) {
          window.__airborneTrainingBoss = false;
    window.__airborneRingSerial = 0;

          updateTrainingBossDark(dt, 0);
          requestNextStage();
        } else if (ruffStageT > 50) {
          try {
            if (typeof bossActive !== "undefined") bossActive = false;
            boss = null;
            bossSinking = null;
          } catch (e) {}
          window.__airborneTrainingBoss = false;
    window.__airborneRingSerial = 0;

          window.__airborneTrainingBossDone = true;
          window.__airborneBossWeaponUnlock = true;
          requestNextStage();
        }
      }
    } else if (ruffStage === "combined") {
      window.__airborneTrainingBoss = false;
      try {
        if (typeof bossActive !== "undefined" && bossActive) { bossActive = false; boss = null; }
      } catch (e) {}
      window.__airborneFirePickup = null;
      window.__airborneAirfieldRings = false;
      window.__airborneAirfieldObstacles = true;
      ruffAirship = null;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 199;
      // No rings in combined
      if ((!ruffPlatforms || !ruffPlatforms.length) && ruffStageT < 2) {
        try { spawnTrainingPlatformsLesson(); } catch (e) {}
      }
      try { updateTrainingPlatforms(dt); } catch (e) {}
      var platsLeftC = (ruffPlatforms || []).length;
      if (!ruffLessonPendingNext && ((ruffStageT > 14 && platsLeftC === 0) || ruffStageT > 45)) {
        ruffPlatforms = [];
        window.__airborneRuffPlatforms = [];
        window.__airborneAirfieldObstacles = false;
        setStage("boss1");
        console.log("[R.U.F.F.] combined → boss1");
      }
    } else if (ruffStage === "landing") {
      // Sweep collectibles off as descent begins
      try {
        (ruffCoins || []).forEach(function (c) { if (c) c.x = -999; });
        (ruffCrystals || []).forEach(function (c) { if (c) c.x = -999; });
        ruffCoins = [];
        ruffCrystals = [];
        ruffPlatforms = [];
      } catch (eSweep) {}

      // Clean landing: request once, force taxi if stuck in land too long
      window.__airborneTrainingFlight = true;
      window.__airborneAirfield = true;
      try {
        if (typeof levelEndActive !== "undefined") levelEndActive = false;
        if (typeof levelEndPhase !== "undefined") levelEndPhase = null;
        if (typeof bossActive !== "undefined") bossActive = false;
      } catch (e) {}
      if (!window.__airborneRuffLandArmed) {
        window.__airborneRuffLandArmed = true;
        window.__airborneRuffRequestLand = true;
        ruffLandingCelebrated = false;
      }
      var ph0 = window.__airborneAirfieldPhase;
      if (ruffStageT > 0.4 && ph0 !== "land" && ph0 !== "skid" && ph0 !== "score" && ph0 !== "done") {
        window.__airborneRuffRequestLand = true;
      }
      // If still descending after 5s, force taxi
      if (ph0 === "land" && ruffStageT > 5.0) {
        try {
          if (typeof window.__airborneForceLandingSkid === "function") window.__airborneForceLandingSkid();
        } catch (eLd) {}
      }
      const ph = window.__airborneAirfieldPhase;
      // Celebration when touchdown / drive complete
      if (!ruffLandingCelebrated && (ph === "land_drive" || ph === "landed" || ph === "done" || window.__airborneTrainingReportReady)) {
        ruffLandingCelebrated = true;
        try { sfxTrainingLand(); } catch (e) {}
        try { trainChord([523, 659, 784, 1046, 1318], 0.25, 0.2); } catch (e) {}
        try {
          // Burst particles like level complete
          if (typeof particles !== "undefined" && particles && typeof player !== "undefined" && player) {
            for (var fi = 0; fi < 40; fi++) {
              var ang = Math.random() * Math.PI * 2;
              var sp = 60 + Math.random() * 180;
              particles.push({
                x: player.x, y: player.y,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40,
                life: 0.9 + Math.random() * 0.7,
                color: ["#ffd24a", "#ff6b3d", "#7ecbff", "#ffe9a8", "#ff4d6d"][fi % 5],
                size: 2 + Math.random() * 4
              });
            }
          }
        } catch (e) {}
        try {
          // Extra firework bursts via existing level FX if present
          if (typeof spawnFirework === "function") {
            spawnFirework(player.x, player.y - 40);
            spawnFirework(player.x - 50, player.y - 60);
            spawnFirework(player.x + 50, player.y - 55);
          }
        } catch (e) {}
      }
      // Report when world-buildings signals ready, or failsafe
      if (ph === "score" || ph === "done" || window.__airborneTrainingReportReady || window.__airborneTrainingReportShown) {
        try {
          if (!window.__airborneTrainingReportShown) {
            window.__airborneTrainingReportShown = true;
            if (typeof showFlightReport === "function") showFlightReport();
            else if (typeof window.__airborneShowRuffReport === "function") window.__airborneShowRuffReport();
          }
        } catch (eRep) {}
        nextStage(); // → report
      } else if (ruffStageT > 8) {
        // Failsafe only after full land + drive window
        try {
          window.__airborneTrainingReportShown = true;
          window.__airborneTrainingReportReady = true;
          if (typeof window.__airborneShowRuffReport === "function") window.__airborneShowRuffReport();
          else if (typeof showFlightReport === "function") showFlightReport();
          var el = document.getElementById("ruffReport");
          if (el) { el.classList.add("visible"); el.style.display = "flex"; el.style.zIndex = "90"; }
        } catch (e) {}
        nextStage();
      }
    } else if (ruffStage === "report") {
      // report UI handles exit
    } else if (ruffStageT > 16) {
      // Unknown stage safety
      nextStage();
    }
  }

  function drawRuff() {
    if (window.__airborneAirfield || window.__airborneRuffActive || window.__airborneTrainingFlight) {
      ruffActive = true;
      window.__airborneRuffActive = true;
      if (!ruffStage || ruffStage === "idle") {
        ruffStage = window.__airborneRuffStage || "intro";
        window.__airborneRuffStage = ruffStage;
      }
    }
    if (!ruffActive && window.__airborneRuffActive) {
      ruffActive = true;
      if (!ruffStage || ruffStage === "idle") ruffStage = window.__airborneRuffStage || "intro";
    }
    if (!ruffActive) return;
    if (!window.__ruffDrawLogged) {
      window.__ruffDrawLogged = true;
      console.log("[R.U.F.F.] drawing", ruffStage, Math.round(ruffX), Math.round(ruffY));
    }
    try { drawMarkers(); } catch (e) {}
    // Platforms under coins/crystals
    // Platforms drawn early in main-loop (behind birds/blimp/ruff)
    try { drawCrystals(); } catch (e) {}
    try { drawTrainingCoins(); } catch (e) {}
    try { drawTrainingAirship(); } catch (e) {}
    try { drawScreenDust(); } catch (e) {}
    if (ruffStage !== "boss1" && window.__airborneRuffStage !== "boss1") {
      try { drawTrainingBossDark(); } catch (e) {}
    }
    try { drawSparkles(); } catch (e) {}
    // Companion sprite drawn by main-loop drawTrainingRuffEmergency (follow + anim)
    // Still publish position for emergency
    try {
      if (typeof player !== "undefined" && player) {
        window.__airborneRuffX = ruffX;
        window.__airborneRuffY = ruffY;
      }
    } catch (e) {}
  }

  function drawPowerOrb() {
    if (!ruffPowerOrb || ruffPowerOrb.collected || typeof ctx === "undefined") return;
    const o = ruffPowerOrb;
    const y = o.y + Math.sin(o.bob || 0) * 12;
    const pulse = 1 + Math.sin(o.pulse || 0) * 0.12;
    ctx.save();
    // Aura
    const grd = ctx.createRadialGradient(o.x, y, 4, o.x, y, o.r * 2.2 * pulse);
    grd.addColorStop(0, "rgba(160,230,255,0.55)");
    grd.addColorStop(0.5, "rgba(100,180,255,0.2)");
    grd.addColorStop(1, "rgba(100,180,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(o.x, y, o.r * 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Icon image if available
    const img = (typeof images !== "undefined") ? (images.power_icon_blimp1 || images.cloud || images.pirate_bomb) : null;
    const s = o.r * 2 * pulse;
    if (img && img.naturalWidth) {
      ctx.drawImage(img, o.x - s / 2, y - s / 2, s, s);
    } else {
      ctx.fillStyle = "#7ecbff";
      ctx.beginPath();
      ctx.arc(o.x, y, o.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Spark ring
    ctx.strokeStyle = "rgba(255,230,120,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x, y, o.r * 1.35 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Contextual reactions (called from elsewhere)
  window.__airborneRuffReact = function (kind) {
    if (!ruffActive) return;
    if (ruffStage === "intro" || ruffStage === "report") return;
    const lines = DIALOGUE.good;
    if (kind === "crash") {
      showRadio(DIALOGUE.crash[Math.floor(Math.random() * DIALOGUE.crash.length)], 2.2);
    } else if (kind === "ring") {
      ruffStats.rings++;
      ruffCombo++;
      if (ruffCombo > ruffStats.bestCombo) ruffStats.bestCombo = ruffCombo;
      if (ruffCombo >= 3) showRadio("Keep it going!", 1.6);
    } else if (kind === "powerup") {
      ruffStats.powerups++;
      showRadio("You've got a charge! Use it wisely.", 2.2);
    } else if (kind === "nearMiss") {
      showRadio("That was close.", 1.5);
    }
  };

  window.__airborneForceRuffAltitude = function() {
    if (!ruffActive) {
      ruffActive = true;
      window.__airborneRuffActive = true;
    }
    // After takeoff → free-fly cruise (10s) before lessons/coins
    if (ruffStage === "intro" || ruffStage === "takeoff" || ruffStage === "idle") {
      setStage("cruise");
    }
  };
  // Boolean flag consumed in updateRuff (was wrongly assigned the function above -> always truthy -> skipped intro)
  window.__airborneForceRuffCruise = false;
  window.__airborneBeginRuff = beginRuffTraining;
  window.placeTrainingPowerIcon = placeTrainingPowerIcon;
  function updateEndCelebration(dt) {
    var c = window.__airborneEndCelebration;
    if (!c) return;
    c.t += dt;
    if (c.t < c.life && Math.random() < 0.12) {
      try {
        if (typeof spawnFirework === "function") {
          spawnFirework((typeof W !== "undefined" ? W : 400) * (0.2 + Math.random() * 0.6),
                        (typeof H !== "undefined" ? H : 600) * (0.15 + Math.random() * 0.35));
        }
      } catch (e) {}
    }
    if (c.t >= c.life) window.__airborneEndCelebration = null;
  }
  function drawEndCelebration() {
    var c = window.__airborneEndCelebration;
    if (!c || typeof ctx === "undefined") return;
    var W0 = (typeof W !== "undefined") ? W : 400;
    var H0 = (typeof H !== "undefined") ? H : 700;
    var u = c.t / c.life;
    var alpha = u < 0.12 ? (u / 0.12) : (u > 0.8 ? Math.max(0, 1 - (u - 0.8) / 0.2) : 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W0, H0);
    ctx.globalAlpha = alpha;
    ctx.translate(W0 * 0.5, H0 * 0.34);
    var sc = u < 0.2 ? (0.6 + 0.4 * (u / 0.2)) : 1;
    ctx.scale(sc, sc);
    ctx.font = "900 " + Math.max(20, Math.min(40, W0 * 0.08)) + "px Rockwell, Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.fillStyle = "#ffe566";
    ctx.shadowColor = "rgba(255,180,40,0.8)";
    ctx.shadowBlur = 22;
    ctx.strokeText("TRAINING COMPLETE", 0, 0);
    ctx.fillText("TRAINING COMPLETE", 0, 0);
    ctx.font = "700 " + Math.max(12, Math.min(18, W0 * 0.04)) + "px system-ui, sans-serif";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff6c8";
    ctx.fillText("Outstanding work, pilot!", 0, Math.max(28, H0 * 0.05));
    ctx.restore();
  }
  window.drawFlightTrainingBanner = drawFlightTrainingBanner;
  window.updateFlightTrainingBanner = updateFlightTrainingBanner;
  window.showFlightTraceBanner = showFlightTraceBanner;
  window.drawEndCelebration = drawEndCelebration;
  window.updateEndCelebration = updateEndCelebration;
  window.__airborneUpdateRuff = updateRuff;
  window.__airborneDrawRuff = drawRuff;
  window.__airborneRuffActive = false;
  window.__airborneRuffStage = "idle";
  window.__airborneStageOrder = STAGE_ORDER;
  window.__airborneRuffRequestLand = false;
  window.__airborneRingCollects = 0;
})();

window.__airborneDrawRingSummary = function (ctx, W, H, dt) {
  var rr = window.__airborneRingResultsCanvas;
  if (!rr || !ctx) return;
  rr.t = (rr.t || 0) + (typeof dt === "number" ? Math.min(dt, 0.05) : 0.016);
  rr.frame = (rr.frame || 0) + 1;
  var life = rr.life || 3.6;

  var a = 1, scale = 1;
  if (rr.t < 0.32) {
    var u = rr.t / 0.32;
    a = u;
    scale = 0.55 + 0.5 * (1 - Math.pow(1 - u, 3));
  } else if (rr.t > life - 0.45) {
    var f = (rr.t - (life - 0.45)) / 0.45;
    a = Math.max(0, 1 - f);
    scale = 1 - 0.1 * f;
  } else {
    scale = 1 + 0.018 * Math.sin(rr.t * 2.8);
  }
  if (rr.t >= life) { window.__airborneRingResultsCanvas = null; return; }
  if (a <= 0.02) return;

  var cx = W * 0.5;
  var cy = H * 0.32;
  var R = Math.min(W, H) * 0.26 * scale; // 50% smaller

  var rank = (rr.rank || "Rookie").toUpperCase();
  // Gold-only palette (no blue / green)
  var accent = "#e0b050";
  var accentHi = "#ffe8b0";
  if (rank === "LEGENDARY") { accent = "#ffd24a"; accentHi = "#fff6c8"; }
  else if (rank === "ELITE") { accent = "#f0c060"; accentHi = "#fff0c8"; }
  else if (rank === "SKILLED") { accent = "#d4a04a"; accentHi = "#f5e0b0"; }

  var propImg = null;
  try {
    if (typeof images !== "undefined" && images && images.propeller_brass_ring && images.propeller_brass_ring.naturalWidth)
      propImg = images.propeller_brass_ring;
  } catch (e) {}

  // Embers around medal
  if (!rr.embers) {
    rr.embers = [];
    for (var i = 0; i < 28; i++) {
      var ang0 = Math.random() * Math.PI * 2;
      rr.embers.push({
        ang: ang0,
        dist: R * (0.85 + Math.random() * 0.55),
        size: 1 + Math.random() * 2.2,
        spd: 0.4 + Math.random() * 1.2,
        life: Math.random() * 40,
        maxLife: 35 + Math.random() * 40
      });
    }
  }

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);

  // Expanding shock rings on pop-in
  if (rr.t < 0.7) {
    var er = R * (0.6 + rr.t * 2.2);
    var ea = (1 - rr.t / 0.7) * 0.45 * a;
    ctx.strokeStyle = "rgba(255, 210, 120," + ea + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, er, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232, 160, 60," + (ea * 0.6) + ")";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, er * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Soft gold atmosphere
  var glow = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.5);
  glow.addColorStop(0, "rgba(230, 170, 60, 0.28)");
  glow.addColorStop(0.55, "rgba(120, 70, 20, 0.12)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Embers
  for (var ei = 0; ei < rr.embers.length; ei++) {
    var p = rr.embers[ei];
    p.ang += 0.012 * p.spd;
    p.dist += Math.sin(rr.frame * 0.05 + ei) * 0.15;
    p.life++;
    var pa = 1 - p.life / p.maxLife;
    if (p.life >= p.maxLife) {
      p.ang = Math.random() * Math.PI * 2;
      p.dist = R * (0.9 + Math.random() * 0.5);
      p.life = 0;
      pa = 1;
    }
    ctx.globalAlpha = a * Math.max(0, pa) * 0.85;
    ctx.fillStyle = accentHi;
    ctx.shadowColor = "#ffd060";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(Math.cos(p.ang) * p.dist, Math.sin(p.ang) * p.dist, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a;

  // Spinning propeller (faster on pop-in)
  var spinSpd = rr.t < 0.5 ? 0.22 : 0.11;
  var spin = rr.frame * spinSpd;
  ctx.save();
  ctx.rotate(spin);
  if (propImg) {
    var propSize = R * 2.75; // larger than glass circle
    ctx.globalAlpha = a * 0.95;
    ctx.drawImage(propImg, -propSize * 0.5, -propSize * 0.5, propSize, propSize);
  } else {
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = "rgba(180,120,40,0.75)";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    for (var bi = 0; bi < 4; bi++) {
      ctx.save();
      ctx.rotate((bi / 4) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.55, R * 0.18, R * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#c9a050";
    ctx.fill();
  }
  ctx.restore();

  // Transparent glass circle
  ctx.globalAlpha = a;
  var glass = ctx.createRadialGradient(0, 0, R * 0.12, 0, 0, R);
  glass.addColorStop(0, "rgba(45, 30, 12, 0.12)");
  glass.addColorStop(0.5, "rgba(30, 20, 10, 0.28)");
  glass.addColorStop(1, "rgba(18, 12, 6, 0.45)");
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = glass;
  ctx.fill();

  // Brass double rim
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 230, 180, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(212, 160, 74, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.08, 0, Math.PI * 2);
  ctx.stroke();

  // Rim nodes
  for (var si = 0; si < 8; si++) {
    var ang = rr.frame * 0.04 + (si / 8) * Math.PI * 2;
    var tw = 0.4 + 0.6 * Math.sin(rr.frame * 0.1 + si);
    ctx.globalAlpha = a * tw * 0.85;
    ctx.fillStyle = accentHi;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * R * 1.0, Math.sin(ang) * R * 1.0, 2 + tw, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a;

  // Text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 " + Math.round(R * 0.25) + "px Rockwell,Georgia,serif";
  ctx.fillStyle = "rgba(201,160,106,0.95)";
  ctx.fillText("RINGS", 0, -R * 0.3);

  var targetN = rr.n != null ? rr.n : 0;
  var tot = rr.total || 20;
  var shown = targetN;
  if (rr.t < 0.85) {
    shown = Math.round(targetN * Math.min(1, Math.max(0, (rr.t - 0.15) / 0.6)));
  }
  ctx.font = "900 " + Math.round(R * 0.5) + "px Rockwell,Georgia,serif";
  ctx.fillStyle = "#ffe8b0";
  ctx.shadowColor = "rgba(232,170,60,0.55)";
  ctx.shadowBlur = 14;
  ctx.fillText(shown + " / " + tot, 0, R * 0.06);
  ctx.shadowBlur = 0;

  var rankA = a;
  if (rr.t < 0.55) rankA = a * Math.max(0, (rr.t - 0.3) / 0.25);
  ctx.globalAlpha = rankA;
  ctx.font = "700 " + Math.round(R * 0.21) + "px Rockwell,Georgia,serif";
  ctx.fillStyle = accent;
  ctx.fillText(rank, 0, R * 0.4);

  ctx.restore();
};

window.__airborneDrawLessonBanner = function (ctx, W, H, dt) {
  var lb = window.__airborneLessonBanner;
  if (!lb || !ctx) return;
  // Don't stack over rings score
  if (window.__airborneRingResultsCanvas && window.__airborneRingResultsCanvas.t < 2.5) return;

  lb.t = (lb.t || 0) + (typeof dt === "number" ? Math.min(dt, 0.05) : 0.016);
  lb.frame = (lb.frame || 0) + 1;
  var life = lb.life || 2.6;
  var a = 1, scale = 1;
  if (lb.t < 0.28) {
    var u = lb.t / 0.28;
    a = u;
    scale = 0.7 + 0.35 * (1 - Math.pow(1 - u, 3));
  } else if (lb.t > life - 0.4) {
    var f = (lb.t - (life - 0.4)) / 0.4;
    a = Math.max(0, 1 - f);
    scale = 1 - 0.08 * f;
  } else {
    scale = 1 + 0.012 * Math.sin(lb.t * 3);
  }
  if (lb.t >= life) { window.__airborneLessonBanner = null; return; }
  if (a <= 0.02) return;

  var style = lb.style || "default";
  var cx = W * 0.5;
  var cy = H * 0.26;
  var R = Math.min(W, H) * ((style === "flight") ? 0.20 : 0.14) * scale;

  // Unique gold-family accents + spin rates (no blue)
  var accent = "#e0b050";
  var accentHi = "#ffe8b0";
  var spinRate = 0.10;
  var segs = 4;
  var glowStr = 0.22;
  if (style === "flight") { accent = "#f0c060"; spinRate = 0.08; segs = 6; glowStr = 0.28; }
  else if (style === "takeoff") { accent = "#e8a838"; spinRate = 0.16; segs = 3; glowStr = 0.26; }
  else if (style === "altitude") { accent = "#d4a04a"; spinRate = 0.06; segs = 5; glowStr = 0.2; }
  else if (style === "rings") { accent = "#ffd24a"; spinRate = 0.14; segs = 8; glowStr = 0.3; }
  else if (style === "platforms") { accent = "#c9963a"; spinRate = 0.05; segs = 4; glowStr = 0.18; }
  else if (style === "obstacles") { accent = "#e09030"; spinRate = 0.18; segs = 3; glowStr = 0.24; }
  else if (style === "shield") { accent = "#e8c878"; spinRate = 0.09; segs = 6; glowStr = 0.26; }
  else if (style === "combined") { accent = "#f0b848"; spinRate = 0.12; segs = 5; glowStr = 0.28; }
  else if (style === "landing") { accent = "#c9a060"; spinRate = 0.04; segs = 4; glowStr = 0.16; }
  else if (style === "boss") { accent = "#ffc040"; spinRate = 0.2; segs = 8; glowStr = 0.35; }
  else if (style === "crystals") { accent = "#e8c060"; spinRate = 0.11; segs = 5; glowStr = 0.25; }
  else if (style === "powerup") { accent = "#f0d070"; spinRate = 0.13; segs = 6; glowStr = 0.3; }

  var propImg = null;
  try {
    if (typeof images !== "undefined" && images && images.propeller_brass_ring && images.propeller_brass_ring.naturalWidth)
      propImg = images.propeller_brass_ring;
  } catch (e) {}

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);

  // Glow
  var glow = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.4);
  glow.addColorStop(0, "rgba(230,170,60," + glowStr + ")");
  glow.addColorStop(0.55, "rgba(120,70,20,0.1)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Unique: segmented outer ring
  ctx.save();
  ctx.rotate(lb.frame * spinRate * 0.4);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 8;
  var gap = 0.18;
  var step = (Math.PI * 2) / segs;
  for (var si = 0; si < segs; si++) {
    var a0 = si * step + gap * 0.5;
    var a1 = (si + 1) * step - gap * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.12, a0, a1);
    ctx.stroke();
  }
  ctx.restore();

  // Combined: second counter-rotating ring
  if (style === "combined" || style === "boss" || style === "flight") {
    ctx.save();
    ctx.rotate(-lb.frame * spinRate * 0.55);
    ctx.strokeStyle = "rgba(255, 220, 140, 0.45)";
    ctx.lineWidth = 1.5;
    for (var sj = 0; sj < segs; sj++) {
      var b0 = sj * step + gap;
      var b1 = (sj + 1) * step - gap;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.22, b0, b1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Takeoff: upward gold streaks
  if (style === "takeoff") {
    ctx.globalAlpha = a * 0.55;
    ctx.strokeStyle = accentHi;
    ctx.lineWidth = 1.5;
    for (var ui = 0; ui < 5; ui++) {
      var ux = (ui - 2) * R * 0.22;
      var uy = R * 0.9 - (lb.frame * 1.5 + ui * 12) % (R * 1.6);
      ctx.beginPath();
      ctx.moveTo(ux, uy + R * 0.2);
      ctx.lineTo(ux, uy);
      ctx.stroke();
    }
    ctx.globalAlpha = a;
  }

  // Altitude: vertical tick marks
  if (style === "altitude") {
    ctx.strokeStyle = "rgba(232, 180, 80, 0.5)";
    ctx.lineWidth = 1.5;
    for (var ti = 0; ti < 5; ti++) {
      var ty = -R * 0.7 + ti * (R * 0.35);
      ctx.beginPath();
      ctx.moveTo(-R * 1.25, ty);
      ctx.lineTo(-R * 1.1, ty);
      ctx.moveTo(R * 1.1, ty);
      ctx.lineTo(R * 1.25, ty);
      ctx.stroke();
    }
  }

  // Spinning prop
  ctx.save();
  ctx.rotate(lb.frame * spinRate);
  if (propImg) {
    var propSize = R * (style === "boss" ? 2.85 : 2.7); // larger than glass circle
    ctx.globalAlpha = a * 0.92;
    ctx.drawImage(propImg, -propSize * 0.5, -propSize * 0.5, propSize, propSize);
  } else {
    ctx.fillStyle = "rgba(180,120,40,0.75)";
    for (var bi = 0; bi < 4; bi++) {
      ctx.save();
      ctx.rotate((bi / 4) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.5, R * 0.15, R * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // Transparent glass disc
  ctx.globalAlpha = a;
  var glass = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  glass.addColorStop(0, "rgba(40,28,12,0.12)");
  glass.addColorStop(0.55, "rgba(28,18,10,0.3)");
  glass.addColorStop(1, "rgba(16,10,5,0.48)");
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,230,180,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  // Rim sparkles
  for (var sk = 0; sk < 6; sk++) {
    var ang = lb.frame * 0.05 + (sk / 6) * Math.PI * 2;
    var tw = 0.4 + 0.6 * Math.sin(lb.frame * 0.12 + sk);
    ctx.globalAlpha = a * tw * 0.8;
    ctx.fillStyle = accentHi;
    ctx.beginPath();
    ctx.arc(Math.cos(ang) * R * 0.98, Math.sin(ang) * R * 0.98, 1.5 + tw, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = a;

  // Title text (wrap long titles)
  var title = lb.title || "";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = accentHi;
  ctx.shadowColor = "rgba(180,120,40,0.5)";
  ctx.shadowBlur = 10;
  var fontSize = Math.round(R * (title.length > 12 ? 0.275 : 0.35)); // +25%
  ctx.font = "800 " + fontSize + "px Rockwell,Georgia,serif";
  // Multi-line if needed
  var words = title.split(" ");
  if (title.length > 14 && words.length > 1) {
    var mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(" "), 0, -R * 0.12);
    ctx.fillText(words.slice(mid).join(" "), 0, R * 0.18);
  } else {
    ctx.fillText(title, 0, 0);
  }
  ctx.shadowBlur = 0;

  ctx.restore();
};

