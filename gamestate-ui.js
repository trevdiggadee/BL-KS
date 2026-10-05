"use strict";

  // ---------- Game state ----------
  let state = "start"; // start | playing | over | paused
  let score = 0;
  let gameplayScore = 0; // dodge-only score used for boss pacing; excludes bonus-round points
  let best = 0;
  try {
    best = parseInt(localStorage.getItem("aa_best") || "0", 10) || 0;
  } catch (e) { best = 0; }

  // ---------- Checkpoint pickup — collectible glowing item after each bonus round ----------
  let checkpointPickup = null; // { x, y, r, bobPhase, targetNum, collected, vx }
  let checkpointReached = 0; // next boss number the player still has to face (0 = none)
  let checkpointScore = 0; // score stored when checkpoint was collected — enables second life
  let checkpointGameplayScore = 0; // gameplayScore at that same moment — keeps boss pacing in sync on resume
  let checkpointBossesDefeated = 0;

  /* ===== Tutorial System ===== */
  // A short guided intro shown once at the start of a run: the guide character
  // flies in from off-screen, then walks the player through the core mechanics
  // one tip at a time before handing off to real gameplay.
  const TUTORIAL_STEPS = [
    "Tap or click anywhere to fly \u2014 let go and you'll dip back down!",
    "Dodge the buildings, birds, and balloons in your way!",
    "Watch your hearts \u2014 losing them all ends the run!",
    "Fill the storm meter by flying well, then tap it to unleash it!",
    "Reach each boss to keep the adventure going. Good luck, ace!"
  ];
  const TUTORIAL_STEP_MS = 3200; // time each tip stays up before auto-advancing

  // injects the fly-in / bob / sparkle animation once, so this file doesn't
  // depend on CSS defined elsewhere
  let tutorialStyleInjected = false;
  function injectTutorialStyle() {
    if (tutorialStyleInjected) return;
    tutorialStyleInjected = true;
    const style = document.createElement("style");
    style.textContent = `
      #tutorialGuide.tutFlyIn #tutGuideImg {
        animation: tutCharFlyIn 0.9s cubic-bezier(.25,.85,.25,1.15) both,
                   tutFloat 2.2s ease-in-out 0.9s infinite;
      }
      @keyframes tutCharFlyIn {
        0%   { opacity: 0; transform: translate(190px, -210px) rotate(24deg) scale(0.6); filter: blur(6px); }
        50%  { opacity: 1; filter: blur(1px); }
        72%  { transform: translate(-12px, 9px) rotate(-7deg) scale(1.1); filter: blur(0px); }
        88%  { transform: translate(4px, -4px) rotate(3deg) scale(0.97); }
        100% { transform: translate(0,0) rotate(0deg) scale(1); filter: blur(0px); }
      }
      @keyframes tutFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      #tutBubbleText { transition: opacity 0.18s ease; }
      #tutBubbleText.tutFading { opacity: 0; }
    `;
    document.head.appendChild(style);
  }

  function sfxTutorialArrive() {
    if (typeof playTone !== "function") return;
    playTone({ freq: 950, duration: 0.3, type: "sawtooth", vol: 0.055, sweep: -700, attack: 0.005, reverbSend: 0.2 });
    playTone({ freq: 500, duration: 0.22, type: "sine", vol: 0.04, sweep: -260, startDelay: 0.04 });
    [0, 4, 7].forEach((iv, i) => {
      playTone({ freq: (typeof noteFreq === "function" ? noteFreq(72 + iv) : 440 * Math.pow(2, (iv) / 12)),
        duration: 0.24, type: "triangle", vol: 0.09, sweep: 50, startDelay: 0.34 + i * 0.055, attack: 0.005, reverbSend: 0.3 });
    });
  }

  function sfxTutorialTip() {
    if (typeof playTone !== "function") return;
    playTone({ freq: 720, duration: 0.09, type: "triangle", vol: 0.05, sweep: 60, attack: 0.003 });
  }

  function startTutorial() {
    state = "tutorial";
    injectTutorialStyle();
    ensureAudio();

    const overlay = document.getElementById("tutorialGuide");
    const img = document.getElementById("tutGuideImg");
    const textEl = document.getElementById("tutBubbleText");
    const skipBtn = document.getElementById("tutSkipBtn");

    // dedicated tutorial guide art if it's been added to the asset list;
    // falls back to the heart mascot so this never shows a broken image
    const guideImg = (images.tutorialGuide && images.tutorialGuide.naturalWidth) ? images.tutorialGuide
      : (images.heartPickup && images.heartPickup.naturalWidth) ? images.heartPickup : null;
    img.src = guideImg ? guideImg.src : "";

    overlay.classList.remove("hidden");
    overlay.classList.remove("tutFlyIn");
    void overlay.offsetWidth; // restart the fly-in animation each time this runs
    overlay.classList.add("tutFlyIn");
    sfxTutorialArrive();

    let step = 0;
    let done = false;
    let stepTimer = null;

    function showStep(i) {
      textEl.classList.add("tutFading");
      setTimeout(() => {
        textEl.textContent = TUTORIAL_STEPS[i];
        textEl.classList.remove("tutFading");
        sfxTutorialTip();
      }, 180);
    }

    function nextStep() {
      if (done) return;
      step++;
      if (step >= TUTORIAL_STEPS.length) { finish(); return; }
      showStep(step);
      stepTimer = setTimeout(nextStep, TUTORIAL_STEP_MS);
    }

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(stepTimer);
      overlay.classList.add("hidden");
      overlay.classList.remove("tutFlyIn");
      skipBtn.removeEventListener("click", finish);
      if (state === "tutorial") { state = "playing"; startGame(); }
    }

    // first tip shows right as the guide lands, timed to its fly-in
    setTimeout(() => showStep(0), 850);
    stepTimer = setTimeout(nextStep, 850 + TUTORIAL_STEP_MS);

    skipBtn.addEventListener("click", finish);
  }
 // bossesDefeatedCount at that same moment — keeps the level/background in sync on resume

  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const scoreVal = document.getElementById("scoreVal");

  function bumpScorePop() {
    scoreVal.classList.remove("pop");
    void scoreVal.offsetWidth; // restart the animation
    scoreVal.classList.add("pop");
  }

  // ---------- Survival timer (top-right) ----------
  const timerFrame = document.getElementById("timerFrame");
  let runStartTime = 0;
  let elapsedMs = 0;

// ---------- Flip Clock logic — mechanical card flip animation ----------
  const flipClockState = { m1: '0', m2: '0', s1: '0', s2: '0' };


  // ---------- Nixie-tube altimeter (JS-drawn) ----------
  function formatAltFt(ft) {
    ft = Math.max(0, Math.floor(ft || 0));
    return String(ft).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function getPlayerAltitudeFt() {
    try {
      if (typeof player === "undefined" || !player) return 0;
      var gy = (typeof groundLevelY === "function") ? groundLevelY() : (typeof H !== "undefined" ? H * 0.88 : 600);
      var py = player.y || 0;
      // Higher on screen = higher altitude; scale to readable feet
      var raw = (gy - py) * 12.5;
      return Math.max(0, Math.min(99999, Math.round(raw)));
    } catch (e) { return 0; }
  }
  function drawNixieAltimeter(forceText) {
    var canvas = document.getElementById("nixieAltCanvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var W = canvas.width, H = canvas.height;
    var text = forceText || ("ALT: " + formatAltFt(getPlayerAltitudeFt()) + " FT");
    ctx.clearRect(0, 0, W, H);
    // Brass plate
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#4a3420");
    bg.addColorStop(0.45, "#2a1c12");
    bg.addColorStop(1, "#1a120a");
    ctx.fillStyle = bg;
    roundRect(ctx, 1, 1, W - 2, H - 2, 6);
    ctx.fill();
    // Outer brass rim
    ctx.strokeStyle = "#c9a06a";
    ctx.lineWidth = 1.5;
    roundRect(ctx, 1.5, 1.5, W - 3, H - 3, 6);
    ctx.stroke();
    ctx.strokeStyle = "#6a4a28";
    ctx.lineWidth = 1;
    roundRect(ctx, 4, 4, W - 8, H - 8, 4);
    ctx.stroke();
    // Tube bay
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    roundRect(ctx, 8, 8, W - 16, H - 16, 3);
    ctx.fill();
    // Digits as individual "tubes"
    var chars = text.split("");
    var n = chars.length;
    var pad = 12;
    var usable = W - pad * 2;
    var tw = usable / n;
    var tubeW = Math.min(18, tw * 0.88);
    var tubeH = H - 18;
    for (var i = 0; i < n; i++) {
      var ch = chars[i];
      var cx = pad + (i + 0.5) * tw;
      var tx = cx - tubeW / 2;
      var ty = (H - tubeH) / 2;
      // glass tube body
      var tg = ctx.createLinearGradient(tx, ty, tx + tubeW, ty);
      tg.addColorStop(0, "rgba(40,20,10,0.9)");
      tg.addColorStop(0.5, "rgba(20,10,5,0.95)");
      tg.addColorStop(1, "rgba(40,20,10,0.9)");
      ctx.fillStyle = tg;
      roundRect(ctx, tx, ty, tubeW, tubeH, 2);
      ctx.fill();
      // warm glow behind glyph
      ctx.save();
      ctx.shadowColor = "rgba(255,140,40,0.95)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(255,120,30,0.15)";
      roundRect(ctx, tx + 1, ty + 1, tubeW - 2, tubeH - 2, 2);
      ctx.fill();
      ctx.restore();
      // glyph
      ctx.save();
      ctx.font = "600 " + Math.floor(tubeH * 0.55) + "px 'Courier New', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,150,50,0.9)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#ffb060";
      ctx.fillText(ch, cx, H / 2 + 0.5);
      // hot core
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffe0a8";
      ctx.globalAlpha = 0.85;
      ctx.fillText(ch, cx, H / 2 + 0.5);
      ctx.restore();
      // glass highlight
      ctx.strokeStyle = "rgba(255,200,120,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 2, ty + 3);
      ctx.lineTo(tx + 2, ty + tubeH - 3);
      ctx.stroke();
    }
    // Rivets
    ctx.fillStyle = "#8a6a38";
    [[7, 7], [W - 7, 7], [7, H - 7], [W - 7, H - 7]].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  window.drawNixieAltimeter = drawNixieAltimeter;
  window.getPlayerAltitudeFt = getPlayerAltitudeFt;

  function updateFlipClock(ms) {
    try {
      var tf = document.getElementById("timerFrame");
      if (tf) tf.style.display = "none";
      var el = document.getElementById("udTimerVal");
      if (el) {
        var totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
        var mm = Math.floor(totalSec / 60);
        var ss = totalSec % 60;
        el.textContent = mm + ":" + (ss < 10 ? "0" : "") + ss;
        el.style.display = "block";
        el.style.visibility = "visible";
        el.removeAttribute("hidden");
      }
    } catch (e) {}
  }

  function animateFlip(pos, fromVal, toVal) {
    const staticEl = document.getElementById('fc-' + pos + '-static');
    const cardEl = document.getElementById('fc-' + pos);
    const topEl = document.getElementById('fc-' + pos + '-top');
    const bottomEl = document.getElementById('fc-' + pos + '-bottom');

    if (!staticEl || !cardEl || !topEl || !bottomEl) return;

    // Set up the flip: top half shows old value, bottom half will show new value
    topEl.querySelector('.digit').textContent = fromVal;
    bottomEl.querySelector('.digit').textContent = toVal;

    // Show the animated card, hide the static one
    staticEl.style.display = 'none';
    cardEl.style.display = '';

    // Reset animations
    topEl.classList.remove('flipping');
    bottomEl.classList.remove('flipping');
    void topEl.offsetWidth; // force reflow

    // Start the flip
    topEl.classList.add('flipping');
    bottomEl.classList.add('flipping');

    // After animation completes, update static to new value and show it
    setTimeout(() => {
      staticEl.textContent = toVal;
      staticEl.style.display = '';
      cardEl.style.display = 'none';
      topEl.classList.remove('flipping');
      bottomEl.classList.remove('flipping');
    }, 450);
  }

  // ---------- Health (4 hits before a crash) ----------
  const MAX_HEALTH = 4;
  const HEART_KEYS = ["asset_extra_11", "asset_extra_12", "asset_extra_13", "asset_extra_14", "heartPickup"];
  const HEART_URLS = [
    "asset_extra_11.webp?cb=2", // 0 hits left
    "asset_extra_12.webp?cb=2",   // 1 hit left
    "asset_extra_13.webp?cb=2",   // 2 hits left
    "asset_extra_14.webp?cb=2",   // 3 hits left
    "heartPickup.webp?cb=2"   // 4 hits left (full health)
  ];
  const HEART_IMAGES = PLACEHOLDER_MODE ? HEART_KEYS.map(renderPlaceholder) : HEART_URLS;
  const MAX_BONUS_HEARTS = 2; // how many extra hearts can stack on top of a full bar
  const healthMeter = document.getElementById("healthMeter");
  const healthImg = document.getElementById("healthImg");
  const bonusHeartsEl = document.getElementById("bonusHearts");
  let health = MAX_HEALTH;
  let invulnerableUntil = 0; // timestamp (ms) — no damage taken before this
  window.__airborneCollectRings = 0;
  window.__airborneCollectCrystals = 0;
  window.__airborneCollectCoins = 0;

  function updateCollectDock() {
    const r = document.getElementById("collectRings");
    const c = document.getElementById("collectCrystals");
    const p = document.getElementById("collectPowerPct"); // repurposed as coin counter
    if (r) {
      const v = String(window.__airborneCollectRings || 0);
      if (r.textContent !== v) {
        r.textContent = v;
        r.classList.remove("pop"); void r.offsetWidth; r.classList.add("pop");
      }
    }
    if (c) {
      const v = String(window.__airborneCollectCrystals || 0);
      if (c.textContent !== v) {
        c.textContent = v;
        c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
      }
    }
    if (p) {
      const v = String(window.__airborneCollectCoins || 0);
      if (p.textContent !== v) {
        p.textContent = v;
        p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop");
      }
    }
  }
  window.updateCollectDock = updateCollectDock;

  function ensureCollectDock() {
    // Collection numbers live on the HUD now — just refresh values
    const mute = document.getElementById("muteBtn");
    if (mute) {
      mute.classList.add("hudAudioBtn");
      // Keep in HUD audio group
      const audio = document.querySelector(".hudAudio");
      if (audio && mute.parentElement !== audio) audio.appendChild(mute);
    }
    updateCollectDock();
  }
  window.ensureCollectDock = ensureCollectDock;

  function updateHudRank(name) {
    const el = document.getElementById("hudRankName");
    if (el) el.textContent = (name || "ROOKIE").toUpperCase();
  }
  window.updateHudRank = updateHudRank;
  // Default rank label during play
  try { updateHudRank("Rookie"); } catch (e) {}

  function updateHealthDisplay() {
    healthImg.src = HEART_IMAGES[Math.max(0, Math.min(MAX_HEALTH, health))];

    const bonus = Math.max(0, health - MAX_HEALTH);
    while (bonusHeartsEl.children.length > bonus) {
      bonusHeartsEl.removeChild(bonusHeartsEl.lastChild);
    }
    while (bonusHeartsEl.children.length < bonus) {
      const img = document.createElement("img");
      img.src = HEART_IMAGES[4];
      img.alt = "Bonus heart";
      bonusHeartsEl.appendChild(img);
    }
    // Critical pulse when at or below 50% of base health
    if (healthMeter) {
      if (health > 0 && health <= MAX_HEALTH * 0.5) {
        healthMeter.classList.add("critical");
      } else {
        healthMeter.classList.remove("critical");
      }
    }
  }

  function pulseHealthMeter() {
    if (!healthMeter) return;
    try {
      healthMeter.classList.remove("hit");
      // Force reflow so animation always restarts
      void healthMeter.offsetWidth;
      healthMeter.classList.add("hit");
      // Safety: clear hit class after animation so critical pulse can resume
      clearTimeout(pulseHealthMeter._t);
      pulseHealthMeter._t = setTimeout(function() {
        if (healthMeter) healthMeter.classList.remove("hit");
      }, 520);
    } catch (e) {}
  }
  window.pulseHealthMeter = pulseHealthMeter;

  function takeHit() {
    // During training combat, force-allow even if state flickered
    var trainingCombat = window.__airborneRuffActive &&
      (window.__airborneRuffStage === "obstacles" || window.__airborneRuffStage === "shield" ||
       window.__airborneRuffStage === "combined");
    if (state !== "playing" && !trainingCombat) return;
    if (bonusActive) return;
    // Only fully block damage during scripted takeoff/landing phases
    var phase = window.__airborneAirfieldPhase || "";
    if (phase === "taxi" || phase === "accel" || phase === "climb" ||
        phase === "land" || phase === "rollout" || phase === "skid" ||
        phase === "score" || phase === "done") {
      return;
    }
    // Ignore sticky invuln flag during combat lessons
    var stHit = window.__airborneRuffStage || "";
    if (window.__airborneAirfieldInvuln &&
        stHit !== "obstacles" && stHit !== "shield" && stHit !== "combined" && stHit !== "platforms") {
      return;
    }
    if (shieldActive || window.__airborneShieldActive) {
      spawnHitParticles(player.x, player.y);
      try { if (typeof sfxDeflect === "function") sfxDeflect(); } catch (e) {}
      shieldImpactTime = performance.now();
      // No coins on shield collision
      return;
    }
    // Shared i-frames — prevents multi-hit / meter flicker same frame
    // Still allow a coin burst marker so rapid contacts from collision path work;
    // takeHit itself skips damage while invulnerable.
    if (performance.now() < invulnerableUntil) return;

    health--;
    dodgeStreak = 0;
    if (health < 0) health = 0;
    updateHealthDisplay();
    pulseHealthMeter();
    invulnerableUntil = performance.now() + 1600;
    try { sfxHit(); } catch (e) {}
    try { triggerScreenShake(3, 160); } catch (e) {}
    try { spawnHitParticles(player.x, player.y); } catch (e) {}
    // Coin burst on damage — skip if collision path already spawned
    if (!window.__airborneSkipTakeHitCoins) {
      try {
        if (typeof window.spawnHitCoinBurst === "function") window.spawnHitCoinBurst();
      } catch (e) {}
    }

    // Training: never game-over — soft recover at 0, longer i-frames (less flicker)
    if (window.__airborneAirfield && window.__airborneAirfieldPhase === "lesson") {
      if (health <= 0) {
        health = MAX_HEALTH;
        updateHealthDisplay();
        if (typeof player !== "undefined" && player) {
          player.y = H * 0.4;
          player.vy = 0;
        }
        invulnerableUntil = performance.now() + 2200;
      }
      return;
    }

    if (health <= 0) {
      crash();
    }
  }

  function startGame() {
    try { ensureAudio(); } catch (eA) { console.warn("[startGame] ensureAudio", eA); }
    try { if (typeof setMusicTheme === "function") setMusicTheme(THEME_NORMAL); } catch (eT) {}
    try { if (typeof startMusic === "function") startMusic(); } catch (eM) {}
    // Clear freeze/pause leftover from prior run
    try {
      state = "playing";
      window.__airborneBossCamPause = false;
      window.__airborneAirfieldPaused = false;
      window.__airborneWorldFrozen = false;
      if (window.__airborneCam) {
        window.__airborneCam.phase = "idle";
        window.__airborneCam.z = 1;
        window.__airborneCam.paused = false;
      }
      if (typeof lastTime !== "undefined") lastTime = null;
      var po = document.getElementById("pauseOverlay");
      if (po) { po.classList.add("hidden"); po.setAttribute("aria-hidden", "true"); }
      var gsEl = document.getElementById("gameScreen");
      if (gsEl) { gsEl.style.display = "block"; gsEl.style.visibility = "visible"; gsEl.style.opacity = "1"; }
    } catch (eClr) {}
    // force hide overlays
    try {
      var _so = document.getElementById("startOverlay");
      if (_so) { _so.classList.add("hidden"); _so.style.display = "none"; }
      var _go = document.getElementById("gameOverOverlay");
      if (_go) _go.classList.add("hidden");
    } catch (eOv) {}
    score = 0;
    gameplayScore = 0;
    dodgeStreak = 0;
    comboPopups = [];
    shieldPickup = null;
    shieldActive = false;
    shieldSpawnTimer = 25 + Math.random() * 15;
    rainDrops = [];
    lightningState = null;
    lightningTimer = 3 + Math.random() * 3;
    stormCloudsDecorative = []; cloudWisps = [];
    try { if (scoreVal) scoreVal.textContent = "0"; } catch (eSc) {}
    elapsedMs = 0;
    runStartTime = performance.now();
    updateFlipClock(elapsedMs);
    health = MAX_HEALTH;
    invulnerableUntil = 0;
    updateHealthDisplay();
    obstacles = [];
    spawnTimer = 0;
    spawnInterval = 1.7;
    obstacleSpeed = 220;
    lastBossTriggered = 0;
    checkpointPickup = null;
    checkpointReached = 0;
    checkpointScore = 0;
    checkpointGameplayScore = 0;
    checkpointBossesDefeated = 0;
    bossNumber = 0;
    bossesDefeatedCount = 0;
    bossActive = false;
    boss = null;
    powerup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    powerupRespawnTimer = 0;
    bullets = [];
    bulletTimer = 0;
    bombs = [];
    bombTimer = 0;
    playerBombs = [];
    playerBombTrailParticles = [];
    arcBombTimer = 0;
    bonusActive = false;
    bonusType = null;
    bonusPending = false;
    if (typeof levelEndActive !== "undefined") { levelEndActive = false; levelEndPhase = null; levelEndPad = null; levelEndFade = 0; }
    if (typeof stopWorldWindDown === "function") stopWorldWindDown();
    window.__airborneWorldFrozen = false;
    if (typeof resetHudFade === "function") resetHudFade();
    if (typeof initBuildings === "function") initBuildings();
    if (typeof initParallaxLayers === "function") initParallaxLayers();
    // Force baseline scroll speed every fresh run (retry included)
    obstacleSpeed = 220;
    spawnInterval = 1.7;
    bonusPendingType = null;
    bonusItems = [];
    bonusTotal = 0;
    bonusCollected = 0;
    bonusPoints = 0;
    rockets = [];
    rocketTimer = 0;
    bossThrowFrame = 0;
    bossThrowFrameTimer = 0;
    bossThrowBombSpawned = false;
    bossBanner = null;
    bossHitFlashUntil = 0;
    bossShakeUntil = 0;
    hitParticles = [];
    explosionBursts = [];
    windParticles = [];
    healPickup = null;
    healSpawnTimer = 6 + Math.random() * 5;
    stormCharge = 0;
    stormMilestoneCount = Math.floor(score / STORM_CHARGE_PER_MILESTONE);
    stormWasReady = false;
    stormActive = false;
    stormCloud = null;
    stormChainBolts = [];
    updateStormMeterDisplay();
    defeatDebris = [];
    shockwaves = [];
    groundVehicles = [];
    buildingSmokeParticles = [];
    defeatSlowMo = false;
    resetPlayer();
    blimpPersonality.squashX = 1;
    blimpPersonality.squashY = 1;
    blimpPersonality.exhaustParticles = [];
    blimpPersonality.propAngle = 0;
    blimpPersonality.propBlurOpacity = 0;
    initBuildings();
    initClouds();
    birdFlocks = [];
    birdFlockTimer = 6 + Math.random() * 8;
    initParallaxLayers();

    // Map level select — jump progress so you're actually on that stage
    const mapLvl = Number(window.__airbornePendingMapLevel) || 0;
    window.__airbornePendingMapLevel = null;
    state = "playing";
    try {
      startOverlay.classList.add("hidden");
      startOverlay.style.display = "none";
    } catch (e) {}
    try { gameOverOverlay.classList.add("hidden"); } catch (e) {}
    try { if (typeof window.__airborneShowUnifiedDock === "function") window.__airborneShowUnifiedDock(); } catch (e) {}

    if (mapLvl >= 2) {
      applyMapLevelProgress(mapLvl);
    } else {
      // Always train on level 1 / hangar start / Take Flight
      window.__airbornePendingMapLevel = null;
      window.__airborneForceTrainRestart = true;
      try { if (window.__airborneHardResetTraining) window.__airborneHardResetTraining(); } catch (e) {}
      const startTrain = window.beginAirfieldTraining ||
        (typeof beginAirfieldTraining === "function" ? beginAirfieldTraining : null);
      if (startTrain) {
        try {
          // Start BGM immediately on the user-tap gesture (iOS requires this)
          try {
            if (typeof window.__airbornePlayTrainingMusic === "function") {
              window.__airbornePlayTrainingMusic();
            }
          } catch (eMus0) {}
          if (typeof obstacles !== "undefined") obstacles = [];
          if (typeof birdFlocks !== "undefined") birdFlocks = [];
          try { if (window.resetTrainingCollectHUD) window.resetTrainingCollectHUD(); } catch (e) {}
          startTrain();
          try {
            if (typeof window.__airbornePlayTrainingMusic === "function") {
              window.__airbornePlayTrainingMusic();
            }
          } catch (eMus1) {}
          if (typeof obstacles !== "undefined") obstacles = [];
          if (typeof birdFlocks !== "undefined") birdFlocks = [];
          console.log("[Airborne] Training started", window.__airborneAirfield, window.__airborneAirfieldPhase, window.__airborneRuffStage);
          // Ensure training flags + screen after beginAirfieldTraining
          try {
            window.__airborneAirfield = true;
            window.__airborneTrainingFlight = true;
            if (typeof state !== "undefined") state = "playing";
            var gs2 = document.getElementById("gameScreen");
            if (gs2) {
              gs2.style.display = "block";
              gs2.style.visibility = "visible";
              gs2.style.opacity = "1";
            }
            var menu2 = document.getElementById("menuScreen");
            if (menu2) menu2.style.display = "none";
            var map2 = document.getElementById("worldMapScreen");
            if (map2) map2.style.display = "none";
            if (typeof resize === "function") resize();
          } catch (eForce) { console.warn("[Airborne] train force", eForce); }
        } catch (err) {
          console.error("[Airborne] Training failed", err);
        }
        if (typeof player !== "undefined" && player && typeof groundLevelY === "function") {
          const gy = groundLevelY();
          const ph = player.h > 0 ? player.h : 40;
          player.y = gy - ph * 0.15;
          player.x = W * 0.25;
          player.vy = 0;
          player.rotation = 0;
        }
      } else {
        console.error("[Airborne] beginAirfieldTraining missing");
        showBanner("LEVEL 1", 2000, "level");
      }
    }
  }

  // Map post 1..6 → bosses already cleared, score at that stage's floor
  function applyMapLevelProgress(mapLevelId) {
    const lvl = Math.max(1, Math.min(6, Number(mapLevelId) || 1));
    const defeated = Math.min(5, lvl - 1);
    const thresholds = [0, 50, 100, 150, 200, 250];
    const gp = thresholds[defeated] || 0;

    // Write progress in bosses.js scope (shared lets), not a phantom global
    if (typeof window.__airborneSetRunProgress === "function") {
      window.__airborneSetRunProgress(defeated, gp);
    } else {
      bossesDefeatedCount = defeated;
      lastBossTriggered = defeated;
    }
    gameplayScore = gp;
    score = gp;
    if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
    checkpointReached = defeated;
    checkpointScore = score;
    checkpointGameplayScore = gameplayScore;
    checkpointBossesDefeated = defeated;

    if (typeof initBuildings === "function") initBuildings();
    if (typeof initParallaxLayers === "function") initParallaxLayers();
    if (typeof initClouds === "function") initClouds();
    // Banner after art refresh so it isn't overwritten by LEVEL 1
    showBanner("LEVEL " + lvl, 2400, "level");
  }
  window.__airborneApplyMapLevel = applyMapLevelProgress;

  function crash() {
    if (state !== "playing") return;
    state = "over";
    state = "over";
    window.__airborneWorldFrozen = false;
    if (typeof stopWorldWindDown === "function") stopWorldWindDown();
    if (typeof resetHudFade === "function") resetHudFade();
    sfxCrash();
    triggerScreenShake(10, 600);
    triggerScreenFlash(0.4, 400);
    stopMusic();
    defeatDebris = [];
    shockwaves = [];
    groundVehicles = [];
    buildingSmokeParticles = [];
    defeatSlowMo = false;
    if (score > best) {
      best = score;
      try { localStorage.setItem("aa_best", String(best)); } catch (e) {}
    }
    document.getElementById("finalScore").textContent = score;
    document.getElementById("bestScoreLine").textContent = "Best: " + best;
    const hideCk = checkpointReached <= 0 || window.__airborneAirfield || window.__airborneRuffActive;
    document.getElementById("checkpointBtn").classList.toggle("hidden", hideCk);
    gameOverOverlay.classList.remove("hidden");
  }

  document.getElementById("startBtn").addEventListener("click", () => { ensureAudio(); sfxClick(); startGame(); document.getElementById("startOverlay").classList.add("hidden"); });
  document.getElementById("retryBtn").addEventListener("click", () => { ensureAudio(); sfxClick(); startGame(); });

  document.getElementById("checkpointBtn").addEventListener("click", () => {
    ensureAudio();
    sfxClick();
    restartFromCheckpoint();
  });

  document.getElementById("menuBtn").addEventListener("click", () => {
    ensureAudio();
    sfxClick();
    state = "start";
    checkpointReached = 0;
    checkpointScore = 0;
    checkpointGameplayScore = 0;
    checkpointBossesDefeated = 0;
    gameOverOverlay.classList.add("hidden");
    document.getElementById("gameScreen").style.display = "none";
    const menuScreenEl = document.getElementById("menuScreen");
    menuScreenEl.style.display = "";
    if (window.__airborneShowMenu) window.__airborneShowMenu();
  });

  function restartFromCheckpoint() {
    // If still in / was training, never jump to level landing — restart training
    if (window.__airborneAirfield || window.__airborneRuffActive) {
      ensureAudio();
      gameOverOverlay.classList.add("hidden");
      if (typeof beginAirfieldTraining === "function") beginAirfieldTraining();
      else if (window.beginAirfieldTraining) window.beginAirfieldTraining();
      state = "playing";
      health = MAX_HEALTH;
      updateHealthDisplay();
      return;
    }
    // Resume game from last checkpoint — keep score, reset health, clear threats
    ensureAudio();
    setMusicTheme(THEME_NORMAL);
    startMusic();
    window.__airborneWorldFrozen = false;
    if (typeof stopWorldWindDown === "function") stopWorldWindDown();
    if (typeof resetHudFade === "function") resetHudFade();

    // Restore score to checkpoint level
    score = checkpointScore;
    scoreVal.textContent = score;
    // gameplayScore and lastBossTriggered drive boss pacing — without restoring
    // these too, they'd stay at their pre-crash values (later than the checkpoint),
    // which could let the player skip straight past a boss they never actually beat
    gameplayScore = checkpointGameplayScore;
    bossesDefeatedCount = checkpointBossesDefeated;
    lastBossTriggered = Math.max(0, checkpointReached - 1);

    // Reset health
    health = MAX_HEALTH;
    invulnerableUntil = performance.now() + 2000;
    updateHealthDisplay();

    // Clear all threats
    obstacles = [];
    bombs = [];
    rockets = [];
    playerBombs = [];
    playerBombTrailParticles = [];
    bullets = [];
    hitParticles = [];
    explosionBursts = [];
    windParticles = [];
    comboPopups = [];

    // Clear boss state
    bossActive = false;
    boss = null;
    bossNumber = 0;
    bossThrowFrame = 0;
    bossThrowFrameTimer = 0;
    bossThrowBombSpawned = false;
    bossBanner = null;
    bossHitFlashUntil = 0;
    bossShakeUntil = 0;

    // Clear powerups and pickups
    powerup = null;
    hasFirepower = false;
    hasDualFire = false;
    hasArcBomb = false;
    powerupRespawnTimer = 0;
    checkpointPickup = null;
    healPickup = null;
    shieldPickup = null;
    shieldActive = false;

    // Reset timers
    spawnTimer = 0;
    spawnInterval = Math.max(0.95, 1.7 - score * 0.03);
    obstacleSpeed = 220 + Math.min(160, score * 6);
    bulletTimer = 0;
    bombTimer = 0;
    rocketTimer = 0;
    arcBombTimer = 0;
    healSpawnTimer = 6 + Math.random() * 5;
    shieldSpawnTimer = 25 + Math.random() * 15;

    // Reset bonus state
    bonusActive = false;
    bonusType = null;
    bonusPending = false;
    bonusPendingType = null;
    bonusItems = [];
    bonusTotal = 0;
    bonusCollected = 0;
    bonusPoints = 0;

    // Reset storm
    stormCharge = 0;
    stormCloudsDecorative = []; cloudWisps = [];
    stormMilestoneCount = 0;
    stormWasReady = false;
    stormActive = false;
    stormCloud = null;
    stormChainBolts = [];
    updateStormMeterDisplay();
    defeatDebris = [];
    shockwaves = [];
    groundVehicles = [];
    buildingSmokeParticles = [];
    defeatSlowMo = false;

    // Reset player
    resetPlayer();
    blimpPersonality.squashX = 1;
    blimpPersonality.squashY = 1;
    blimpPersonality.exhaustParticles = [];
    blimpPersonality.propAngle = 0;
    blimpPersonality.propBlurOpacity = 0;

    // Reset buildings and clouds
    initBuildings();
    initClouds();
    initParallaxLayers(); // resync the background to the restored level immediately — no crossfade, no stray "LEVEL X" banner

    // Resume
    state = "playing";
    runStartTime = performance.now() - elapsedMs;
    gameOverOverlay.classList.add("hidden");
    showBanner("RESUMED FROM CHECKPOINT!", 2000, "checkpoint");
  }


  // ---------- In-game pause / volume panel (bottom-right ⚙) ----------
  let pausedFromState = "playing";
  const pauseOverlay = document.getElementById("pauseOverlay");
  const pauseMusicSlider = document.getElementById("pauseMusicSlider");
  const pauseSfxSlider = document.getElementById("pauseSfxSlider");
  const pauseMusicVal = document.getElementById("pauseMusicVal");
  const pauseSfxVal = document.getElementById("pauseSfxVal");
  const pauseResumeBtn = document.getElementById("pauseResumeBtn");
  const pauseMuteToggle = document.getElementById("pauseMuteToggle");

  function syncPauseSliders() {
    const mv = Math.round(((typeof musicVolumePref !== "undefined") ? musicVolumePref : 0.25) * 100);
    const sv = Math.round(((typeof sfxVolumePref !== "undefined") ? sfxVolumePref : 1) * 100);
    if (pauseMusicSlider) pauseMusicSlider.value = String(mv);
    if (pauseSfxSlider) pauseSfxSlider.value = String(sv);
    if (pauseMusicVal) pauseMusicVal.textContent = mv + "%";
    if (pauseSfxVal) pauseSfxVal.textContent = sv + "%";
    const isMuted = (typeof muted !== "undefined") ? muted : false;
    if (pauseMuteToggle) {
      var lab = pauseMuteToggle.querySelector(".pauseBtnLabel");
      if (lab) lab.textContent = isMuted ? "Unmute All" : "Mute All";
      else pauseMuteToggle.textContent = isMuted ? "Unmute All" : "Mute All";
      pauseMuteToggle.classList.toggle("is-muted", !!isMuted);
    }
  }

  function setMusicVolFromUI(pct) {
    const v = Math.max(0, Math.min(1, pct / 100));
    if (typeof setMusicVolumePref === "function") setMusicVolumePref(v);
    else if (window.__airborneSetMusicVolume) window.__airborneSetMusicVolume(v);
    // Direct fallback on the MP3 element
    const gm = document.getElementById("gameplayMusic");
    if (gm) {
      const isMuted = (typeof muted !== "undefined" && muted);
      gm.volume = isMuted ? 0 : v;
    }
    if (pauseMusicVal) pauseMusicVal.textContent = Math.round(v * 100) + "%";
  }

  function setSfxVolFromUI(pct) {
    const v = Math.max(0, Math.min(1, pct / 100));
    if (typeof setSfxVolumePref === "function") setSfxVolumePref(v);
    if (pauseSfxVal) pauseSfxVal.textContent = Math.round(v * 100) + "%";
  }

  function openPauseMenu() {
    if (state !== "playing" && state !== "bossDialogue") return;
    pausedFromState = state;
    state = "paused";
    syncPauseSliders();
    if (pauseOverlay) {
      pauseOverlay.classList.remove("hidden");
      pauseOverlay.setAttribute("aria-hidden", "false");
    }
    try {
      document.body.classList.add("pause-open");
      var dock = document.getElementById("unifiedDock");
      if (dock) dock.classList.add("pauseHidden");
    } catch (e) {}
    if (typeof sfxClick === "function") sfxClick();
  }

  function closePauseMenu() {
    if (state !== "paused") return;
    state = pausedFromState || "playing";
    window.__airbornePaused = false;
    if (pauseOverlay) {
      pauseOverlay.classList.add("hidden");
      pauseOverlay.setAttribute("aria-hidden", "true");
    }
    try {
      document.body.classList.remove("pause-open");
      var dock = document.getElementById("unifiedDock");
      if (dock) dock.classList.remove("pauseHidden");
    } catch (e) {}
    if (typeof sfxClick === "function") sfxClick();
  }

  if (pauseMusicSlider) {
    pauseMusicSlider.addEventListener("input", () => {
      setMusicVolFromUI(parseInt(pauseMusicSlider.value, 10));
    });
    pauseMusicSlider.addEventListener("change", () => {
      setMusicVolFromUI(parseInt(pauseMusicSlider.value, 10));
    });
    pauseMusicSlider.addEventListener("pointerdown", (e) => e.stopPropagation());
    pauseMusicSlider.addEventListener("click", (e) => e.stopPropagation());
  }
  if (pauseSfxSlider) {
    pauseSfxSlider.addEventListener("input", () => {
      setSfxVolFromUI(parseInt(pauseSfxSlider.value, 10));
    });
    pauseSfxSlider.addEventListener("change", () => {
      setSfxVolFromUI(parseInt(pauseSfxSlider.value, 10));
    });
    pauseSfxSlider.addEventListener("pointerdown", (e) => e.stopPropagation());
    pauseSfxSlider.addEventListener("click", (e) => e.stopPropagation());
  }
  if (pauseResumeBtn) {
    pauseResumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePauseMenu();
    });
  }
  if (pauseMuteToggle) {
    pauseMuteToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof ensureAudio === "function") ensureAudio();
      const next = !(typeof muted !== "undefined" && muted);
      if (typeof setMuted === "function") setMuted(next);
      else if (window.__airborneSetMuted) window.__airborneSetMuted(next);
      // Direct MP3 mute/unmute
      const gm = document.getElementById("gameplayMusic");
      if (gm) {
        if (next) gm.volume = 0;
        else gm.volume = (typeof musicVolumePref !== "undefined") ? musicVolumePref : 0.25;
      }
      syncPauseSliders();
      const btn = document.getElementById("muteBtn");
      if (btn) {
        btn.dataset.mode = "settings";
        btn.textContent = "⚙";
      }
    });
  }
  
  const pauseHangarBtn = document.getElementById("pauseHangarBtn");
  if (pauseHangarBtn) {
    pauseHangarBtn.addEventListener("click", (e) => {
      try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
      try { closePauseMenu(); } catch (err) {}
      // Full wipe so restart never resumes mid-flight with leftover rings/birds
      try {
        if (window.__airborneHardResetTraining) window.__airborneHardResetTraining();
        else if (window.__airborneClearAllGameplay) window.__airborneClearAllGameplay();
      } catch (err) {}
      try {
        if (typeof obstacles !== "undefined") obstacles = [];
        if (typeof birdFlocks !== "undefined") birdFlocks = [];
        if (typeof bombs !== "undefined") bombs = [];
        if (typeof powerup !== "undefined") powerup = null;
        if (typeof shieldPickup !== "undefined") shieldPickup = null;
        if (typeof healPickup !== "undefined") healPickup = null;
        if (typeof hearts !== "undefined") hearts = [];
        if (typeof bossActive !== "undefined") bossActive = false;
        if (typeof boss !== "undefined") boss = null;
      } catch (err) {}
      try {
        window.__airborneAirfield = false;
        window.__airborneTrainingFlight = false;
        window.__airborneRuffActive = false;
        window.__airborneRuffStage = "idle";
        window.__airborneAirfieldPhase = "done";
        window.__airborneTaxiUntil = 0;
        window.__airborneBossCamPause = false;
        window.__airborneAirfieldPaused = false;
      } catch (err) {}
      try {
        if (typeof window.__airborneFinishToHangar === "function") {
          window.__airborneFinishToHangar();
        } else if (typeof window.__airborneFinishToHangar === "function") {
          window.__airborneFinishToHangar();
        } else if (typeof finishToHangar === "function") {
          finishToHangar();
        }
      } catch (err) { console.warn(err); }
      try {
        if (typeof state !== "undefined") state = "menu";
        var gsEl = document.getElementById("gameScreen");
        if (gsEl) gsEl.style.display = "none";
        var menu = document.getElementById("menuScreen");
        if (menu) { menu.style.display = "block"; menu.classList.remove("hidden"); }
      } catch (err) {}
    });
  }

  if (pauseOverlay) {
    pauseOverlay.addEventListener("click", (e) => {
      if (e.target === pauseOverlay) closePauseMenu();
    });
  }

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.dataset.mode = "settings";
    muteBtn.classList.add("cd-mute");
    muteBtn.innerHTML = '';
    muteBtn.setAttribute("aria-label", "Pause and settings");
    muteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof ensureAudio === "function") ensureAudio();
      if (state === "paused") {
        closePauseMenu();
      } else if (state === "playing" || state === "bossDialogue") {
        openPauseMenu();
      } else {
        // Menu / game-over — toggle mute only
        const next = !(typeof muted !== "undefined" && muted);
        if (typeof setMuted === "function") setMuted(next);
        muteBtn.dataset.mode = "settings";
        muteBtn.classList.add("cd-mute");
        muteBtn.innerHTML = '';
      }
    });
  }

  // Bridge for the menu screen: calling this begins gameplay immediately,
  // skipping this screen's own start overlay. If assets are still loading
  // (should be near-instant since they're embedded base64), the start is
  // queued and fires the moment loading finishes.
  let pendingStart = false;
  function bridgeStart() {
    try {
      pendingStart = false;
      var gsEl = document.getElementById("gameScreen");
      if (gsEl) {
        gsEl.style.display = "block";
        gsEl.style.visibility = "visible";
        gsEl.style.opacity = "1";
      }
      var mapEl = document.getElementById("worldMapScreen");
      if (mapEl) { mapEl.style.display = "none"; }
      var menuEl = document.getElementById("menuScreen");
      if (menuEl) menuEl.style.display = "none";
      startGame();
    } catch (e) {
      console.error("[bridgeStart]", e);
      pendingStart = true;
      // Still try training if level 1
      try {
        if ((Number(window.__airbornePendingMapLevel) || 1) <= 1 &&
            typeof window.beginAirfieldTraining === "function") {
          window.beginAirfieldTraining();
        }
      } catch (e2) {}
    }
  }
  window.__airborneGameStart = bridgeStart;
  window.__airborneEnterGameplay = bridgeStart;
  window.startGame = startGame;


  // When assets finish loading after a map-start was queued
  window.__airborneOnAssetsReady = function() {
    if (pendingStart) {
      pendingStart = false;
      if (window.__airbornePendingMapLevel && Number(window.__airbornePendingMapLevel) >= 1) {
        startGame();
      } else {
        startTutorial();
      }
    }
  };

  // Global hold tracking (survives phase checks; required for landing drive)
  window.__airbornePointerDown = false;
  window.__airborneLastHoldAt = 0;
  function __aaMarkHold() {
    window.__airbornePointerDown = true;
    window.__airborneLastHoldAt = performance.now();
    window.__airborneAirfieldHold = true;
  }
  function __aaClearHold(e) {
    // Multi-touch: only clear when no fingers remain
    try {
      if (e && e.touches && e.touches.length > 0) return;
      if (e && typeof e.buttons === "number" && e.buttons !== 0) return;
    } catch (err) {}
    window.__airbornePointerDown = false;
    window.__airborneAirfieldHold = false;
  }
  // Capture phase — always mark hold regardless of UI overlays
  window.addEventListener("pointerdown", __aaMarkHold, true);
  window.addEventListener("touchstart", __aaMarkHold, true);
  window.addEventListener("mousedown", __aaMarkHold, true);
  window.addEventListener("pointerup", __aaClearHold, true);
  window.addEventListener("touchend", __aaClearHold, true);
  window.addEventListener("mouseup", __aaClearHold, true);
  function handleInput(e) {
    if (e.cancelable) e.preventDefault();
    try { ensureAudio(); } catch (eAu) {}
    window.__airbornePointerDown = true;
    var afp = window.__airborneAirfieldPhase;
    // Any active airfield runway/drive — do not require state==playing
    if (window.__airborneAirfield &&
        (afp === "taxi" || afp === "accel" || afp === "skid" || afp === "land")) {
      window.__airborneAirfieldHold = true;
    }
    if (state === "playing" || window.__airborneAirfield) flap();
  }
  function handleInputUp(e) {
    if (e && e.touches && e.touches.length > 0) return;
    window.__airbornePointerDown = false;
    window.__airborneAirfieldHold = false;
  }
  canvas.addEventListener("touchstart", handleInput, { passive: false });
  canvas.addEventListener("mousedown", handleInput);
  canvas.addEventListener("pointerdown", handleInput);
  document.addEventListener("pointerdown", function(e) {
    window.__airbornePointerDown = true;
    var afp = window.__airborneAirfieldPhase;
    if (window.__airborneAirfield &&
        (afp === "taxi" || afp === "accel" || afp === "skid" || afp === "land")) {
      window.__airborneAirfieldHold = true;
      if (afp === "taxi" || afp === "accel") {
        if (typeof window.__airborneAirfieldBoost === "function") window.__airborneAirfieldBoost();
      }
    }
  }, true);
  canvas.addEventListener("touchend", handleInputUp, { passive: true });
  canvas.addEventListener("touchcancel", handleInputUp, { passive: true });
  canvas.addEventListener("mouseup", handleInputUp);
  canvas.addEventListener("pointerup", handleInputUp);
  window.addEventListener("mouseup", handleInputUp);
  window.addEventListener("pointerup", handleInputUp);
  window.addEventListener("blur", function() {
    window.__airbornePointerDown = false;
    window.__airborneAirfieldHold = false;
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      try { ensureAudio(); } catch (eAu2) {}
      window.__airbornePointerDown = true;
      var afp = window.__airborneAirfieldPhase;
      if (window.__airborneAirfield &&
          (afp === "taxi" || afp === "accel" || afp === "skid" || afp === "land")) {
        window.__airborneAirfieldHold = true;
      }
      if (state === "playing" || window.__airborneAirfield) flap();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      window.__airbornePointerDown = false;
      window.__airborneAirfieldHold = false;
    }
  });


  // =====================================================================
  // FEATURE ADDITIONS: Screen Effects, Atmospheric Particles, 
  // Parallax Layers, Blimp Personality
  // =====================================================================

  // ---------- Screen Effects System ----------
  const screenChromatic = document.getElementById('screenChromatic');
  const screenFlash = document.getElementById('screenFlash');
  let screenShakeIntensity = 0;
  let screenShakeDecay = 0;
  let screenShakeOffsetX = 0;
  let screenShakeOffsetY = 0;

  function triggerScreenShake(intensity, durationMs) {
    screenShakeIntensity = intensity;
    screenShakeDecay = intensity / (durationMs / 1000);
  }

  function updateScreenEffects(dt) {
    // Chromatic aberration on high-speed moments
    if (screenChromatic) {
      const speed = Math.abs(player.vy);
      const chromaIntensity = Math.min(1, (speed - 300) / 400);
      screenChromatic.classList.toggle('active', chromaIntensity > 0.3 || bossActive);
      screenChromatic.style.opacity = (0.05 + chromaIntensity * 0.08).toFixed(3);
    }

    // Screen shake decay
    if (screenShakeIntensity > 0) {
      screenShakeIntensity -= screenShakeDecay * dt;
      if (screenShakeIntensity < 0) screenShakeIntensity = 0;
      screenShakeOffsetX = (Math.random() - 0.5) * screenShakeIntensity * 2;
      screenShakeOffsetY = (Math.random() - 0.5) * screenShakeIntensity * 2;
      canvas.style.transform = 'translate(' + screenShakeOffsetX.toFixed(1) + 'px,' + screenShakeOffsetY.toFixed(1) + 'px)';
    } else {
      canvas.style.transform = '';
    }
  }

  function triggerScreenFlash(opacity, durationMs) {
    if (!screenFlash) return;
    screenFlash.style.opacity = opacity;
    screenFlash.style.transition = 'opacity ' + (durationMs * 0.3) + 'ms ease-in, opacity ' + (durationMs * 0.7) + 'ms ease-out ' + (durationMs * 0.3) + 'ms';
    requestAnimationFrame(() => {
      screenFlash.style.opacity = '0';
    });
  }


  (function wireMusicBtn() {
    const btn = document.getElementById("musicBtn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (typeof musicVolumePref === "number") {
          if (musicVolumePref > 0.01) {
            window.__airborneMusicVolSave = musicVolumePref;
            musicVolumePref = 0;
            btn.textContent = "♪̸";
          } else {
            musicVolumePref = window.__airborneMusicVolSave || 0.25;
            btn.textContent = "♪";
          }
          if (typeof applyMusicVolume === "function") applyMusicVolume();
          else if (typeof gameMusic !== "undefined" && gameMusic) {
            gameMusic.volume = musicVolumePref;
          }
        }
      } catch (err) {}
    });
  })();


window.__udProgressTarget = 0;
window.__udProgressShown = 0;
window.updateUnifiedProgress = function (pct) {
  try {
    window.__udProgressTarget = Math.max(0, Math.min(100, pct || 0));
    var val = document.getElementById("udProgressVal");
    if (val) val.style.display = "none";
  } catch (e) {}
};
window.tickUnifiedProgress = function (dt) {
  try {
    var target = window.__udProgressTarget || 0;
    var shown = window.__udProgressShown || 0;
    // Smooth grow toward target (no jump)
    var speed = 45; // % per second
    if (shown < target) shown = Math.min(target, shown + speed * (dt || 0.016));
    else if (shown > target) shown = Math.max(target, shown - speed * (dt || 0.016));
    window.__udProgressShown = shown;
    var ring = document.getElementById("udProgressRing");
    var circle = document.querySelector("#unifiedDock .udCircle") || document.getElementById("stormMeter");
    if (ring) ring.style.setProperty("--ud-progress", shown.toFixed(2) + "%");
    if (circle) circle.style.setProperty("--ud-progress", shown.toFixed(2) + "%");
  } catch (e) {}
};

(function ensureUnifiedDockVisible() {
  function show() {
    var d = document.getElementById("unifiedDock");
    if (!d) return;
    d.classList.remove("menuHidden");
    d.classList.add("gameActive");
    d.style.display = "flex";
    d.style.opacity = "1";
    d.style.visibility = "visible";
    d.style.pointerEvents = "none";
    d.style.left = "auto";
    d.style.right = "calc(env(safe-area-inset-right, 0px) + 12px)";
    d.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + 16px)";
    d.style.transform = "none";
    d.style.zIndex = "50";
  }
  window.__airborneShowUnifiedDock = show;
})();

try {
  var _obsDock = new MutationObserver(function () {
    if (typeof window.__airborneApplyShipPowerIcon === "function") window.__airborneApplyShipPowerIcon();
  });
  var _dock = document.getElementById("unifiedDock");
  if (_dock) _obsDock.observe(_dock, { attributes: true, attributeFilter: ["class"] });
} catch (e) {}
