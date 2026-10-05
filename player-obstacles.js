window.__airborneRingDebug = false;
"use strict";

  // ---------- Player ----------
  const GRAVITY = 1500;       // px/s^2
  const FLAP_VELOCITY = -430; // px/s (instant upward speed on tap)
  const MAX_FALL_SPEED = 700;

  const player = {
    x: 0, y: 0,
    vy: 0,
    w: 84, h: 50, // hitbox-ish display size, aspect-corrected below
    rotation: 0
  };

  function applyPlayerBlimpSize() {
    // Normalize on-screen size so every vessel reads about the same scale.
    // Little Spy (blimp6) stays intentionally smaller.
    const sel = (typeof selectedBlimp !== "undefined" && selectedBlimp) ? selectedBlimp : "blimp1";
    let scale = 1.0;
    if (sel === "blimp1") scale = 1.15;              // Zeppelin Ace +15%
    else if (sel === "blimp6") scale = 0.72 * 1.10;       // Little Spy smaller +10%
    else if (sel === "blimp4") scale = 1.20 * 1.05;  // Steampunk
    else if (sel === "blimp8") scale = 1.15;         // Ironworks +15%
    else if (sel === "blimp9") scale = 1.10;         // Jolly Rogers +10%
    else if (sel === "blimp11") scale = 1.05 * 1.05; // War Shark +5% then +5%
    else if (sel === "blimp12") scale = 1.15 * 1.05 * 1.05; // Sky Rocket stack +5%
    else if (sel === "blimp13") scale = 1.05 * 1.05; // Iron Lattice +5% then +5%
    else if (sel === "blimp14") scale = 1.10;        // Pirate Rocket +10%
    else if (sel === "blimp15") scale = 1.10 * 1.10 * 1.10; // Royal Stripe +10% again

    const firstFrame = currentPlayerImage();
    const aspect = (firstFrame && firstFrame.naturalWidth && firstFrame.naturalHeight / firstFrame.naturalWidth) || 0.55;
    // Fit inside a shared bounding box (width-capped) so large/tall sprites don't dominate
    const boxW = Math.min(118, W * 0.24) * scale;
    const boxH = boxW * 0.62;
    if (aspect > (boxH / boxW)) {
      player.h = boxH;
      player.w = boxH / aspect;
    } else {
      player.w = boxW;
      player.h = boxW * aspect;
    }
  }

  function resetPlayer() {
    applyPlayerBlimpSize();
    player.x = W * 0.22;
    player.y = H * 0.4;
    player.vy = 0;
    player.rotation = 0;
    playerBlimpFrame = 0;
    playerBlimpFrameTimer = 0;
  }

  function updatePlayerBlimpAnimation(dt) {
    const sel = typeof selectedBlimp !== "undefined" ? selectedBlimp : "blimp1";
    const anim = BLIMP_ANIM[sel] || BLIMP_ANIM.blimp1;
    playerBlimpFrameTimer += dt;
    const frameDuration = 1 / anim.fps;
    while (playerBlimpFrameTimer >= frameDuration) {
      playerBlimpFrameTimer -= frameDuration;
      playerBlimpFrame = (playerBlimpFrame + 1) % anim.frameCount;
    }
  }

  var __lastFlapAt = 0;
  function flap() {
    // Allow runway hold during training even if state glitched
    if (state !== "playing" && !window.__airborneAirfield) return;
    // One physical tap fires touchstart + pointerdown (+ mousedown): count it once
    var __nowF = (typeof performance !== "undefined") ? performance.now() : Date.now();
    if (__nowF - __lastFlapAt < 35) return;
    __lastFlapAt = __nowF;
    // Don't flap-react while docked on the pad
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) return;
    // Airfield runway / post-land taxi: never flap (prevents jump)
    var afp = window.__airborneAirfieldPhase;
    if (window.__airborneAirfield &&
        (afp === "taxi" || afp === "accel" || afp === "skid" || afp === "score" ||
         afp === "rollout" || afp === "climb")) {
      // NOTE: "done"/no-phase deliberately NOT blocked here: updatePlayer() applies gravity in
      // those phases, so blocking taps made the blimp sink with dead controls.
      window.__airborneAirfield = true;
      if (afp === "climb") {
        // Scripted climb ignores taps, but remember one so the handoff to free flight feels responsive
        window.__airborneClimbTapBuffered = true;
      }
      if (afp === "taxi" || afp === "accel") {
        window.__airborneAirfieldHold = true;
        window.__airbornePointerDown = true;
        window.__airborneAirfieldBoostPending = true;
        // A quick TAP also drives the runway: keeps "holding" true for a short window
        window.__airborneAirfieldHoldUntil = __nowF + 450;
      }
      return; // no vertical jump
    }
    // land approach only: allow flare
    if (window.__airborneAirfieldPaused) {
      return;
    }
    if (window.__airborneAirfield && afp === "land") {
      player.vy = Math.min(player.vy, FLAP_VELOCITY * 1.15);
    } else {
      player.vy = FLAP_VELOCITY;
    }
    try { sfxFlap(); } catch (eSfx) {}
    // Visual pulse on every ship (squash kick, fin lag, exhaust)
    try { if (window.__airborneFlapPulse) window.__airborneFlapPulse(); } catch (ePulse) {}
  }

  function updatePlayer(dt) {
    if (window.__airborneBossCamPause) return;

    // Calm rest on the landing pad
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) {
      player.vy = 0;
      player.rotation = 0;
      player.y = levelEndPad.surfaceY - player.h * 0.42;
      player.x = levelEndPad.x + levelEndPad.w * (levelEndPad.deckCenterFrac || 0.42);
      if (typeof blimpPersonality !== "undefined" && blimpPersonality) {
        blimpPersonality.squashX = 1;
        blimpPersonality.squashY = 1;
        blimpPersonality.squashTargetX = 1;
        blimpPersonality.squashTargetY = 1;
        blimpPersonality.flapKickY = 0;
        blimpPersonality.finLag = 0;
        blimpPersonality.exhaustParticles = [];
        blimpPersonality.speedStreaks = [];
      }
      return;
    }

    // Airfield: scripted phases freeze physics; still run exhaust personality
    const afPhase = window.__airborneAirfieldPhase;
    if (window.__airborneAirfield &&
        (afPhase === "taxi" || afPhase === "accel" || afPhase === "climb" ||
         afPhase === "score" || afPhase === "skid" || afPhase === "rollout" ||
         window.__airborneAirfieldPaused)) {
      player.vy = 0;
      updateBlimpPersonality(dt);
      return;
    }
    // land: player-controlled (updateAirfield integrates); keep exhaust alive
    if (window.__airborneAirfield && afPhase === "land") {
      updateBlimpPersonality(dt);
      return;
    }
    // lesson / training flight falls through to gravity
    // Keep training blimp further back — but never during land/skid drive
    var afp = window.__airborneAirfieldPhase;
    var landingDrive = (afp === "land" || afp === "skid" || afp === "score" || afp === "done" || afp === "rollout");
    if (!landingDrive && (window.__airborneAirfield || window.__airborneTrainingFlight)) {
      var lockX = (typeof W !== "undefined" ? W : 400) * 0.22;
      if (Math.abs(player.x - lockX) > 2) {
        player.x += (lockX - player.x) * Math.min(1, 4 * dt);
      } else {
        player.x = lockX;
      }
    }

    // Carried-over takeoff hold: keep gentle auto-flaps until the finger lifts, then normal tap-to-flap
    if (window.__airborneCarryHold) {
      if (!window.__airbornePointerDown) {
        window.__airborneCarryHold = false;
      } else {
        window.__airborneCarryHoldT = (window.__airborneCarryHoldT || 0) + dt;
        if (window.__airborneCarryHoldT >= 0.5) {
          window.__airborneCarryHoldT = 0;
          flap();
        }
      }
    }

    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    player.y += player.vy * dt;

    // rotation follows velocity, clamped
    const target = Math.max(-0.4, Math.min(0.55, player.vy / 600));
    player.rotation += (target - player.rotation) * 0.15;

    const groundY = groundLevelY();
    if (player.y + player.h / 2 > groundY) {
      player.y = groundY - player.h / 2;
      // Airfield open sky / training: never damage from bottom
      if (window.__airborneAirfield || window.__airborneAirfieldInvuln ||
          (typeof isLevelEndActive === "function" && isLevelEndActive())) {
        player.vy = Math.min(player.vy, 0);
      } else {
        takeHit();
      }
    }
    if (player.y - player.h / 2 < 0) {
      player.y = player.h / 2;
      player.vy = 0;
    }

    maybeEmitWind(player.x - player.w * 0.32, player.y, player.w * 0.5, player.h, 10, dt, "player");
  
    updateBlimpPersonality(dt);}


  function drawBlimpSurfaceShadow() {
    try {
      // In-game shadow disabled — menu blimp uses separate soft shadow
      if (!(window.__airborneMenuBlimpShadow)) return;
      if (typeof ctx === "undefined" || typeof player === "undefined" || !player) return;
      if (window.__airborneRuffStage === "report") return;
      var groundY = (typeof groundLevelY === "function") ? groundLevelY() : ((typeof H !== "undefined" ? H : 700) * 0.88);
      var nearest = groundY;
      // Platforms
      try {
        var plats = (typeof ruffPlatforms !== "undefined" && ruffPlatforms) ? ruffPlatforms
          : (window.__airborneRuffPlatforms || []);
        for (var i = 0; i < plats.length; i++) {
          var p = plats[i];
          if (!p) continue;
          var top = (p.y != null ? p.y : 0) + (p.bobY || 0);
          // only if roughly above platform in X
          var pl = p.x, pr = p.x + (p.w || 80);
          if (player.x > pl - 20 && player.x < pr + 20 && top > player.y) {
            if (top < nearest) nearest = top;
          }
        }
      } catch (e) {}
      var dist = nearest - (player.y + (player.h || 40) * 0.45);
      if (dist < 0) dist = 0;
      // Shadow only when within ~180px of surface
      if (dist > 180) return;
      var prox = 1 - dist / 180; // 1 = on surface, 0 = far
      prox = Math.max(0, Math.min(1, prox));
      var alpha = 0.08 + 0.32 * prox * prox;
      var scaleX = 0.35 + 0.65 * prox;
      var scaleY = 0.18 + 0.22 * prox;
      var bw = (player.w || 48) * scaleX;
      var bh = (player.h || 28) * scaleY;
      var sx = player.x;
      var sy = nearest - 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(sx, sy, bw * 0.55, Math.max(3, bh * 0.35), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } catch (e) {}
  }
  window.drawBlimpSurfaceShadow = drawBlimpSurfaceShadow;

  function drawPlayer() {
    try {
    // Hide blimp during the end-of-level black fade (overlay draws after player)
    // Keep blimp visible during training landing/score
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut" &&
        !(window.__airborneAirfield && (window.__airborneAirfieldPhase === "land" ||
          window.__airborneAirfieldPhase === "skid" || window.__airborneAirfieldPhase === "score"))) return;
    const img = currentPlayerImage();
    if (!img || !img.naturalWidth) {
      // Never let the player silently vanish — draw a simple visible
      // placeholder and log why, so this is diagnosable if it recurs.
      if (!drawPlayer._warned) {
        drawPlayer._warned = true;
        console.warn("Airborne Aces: currentPlayerImage() returned nothing usable — drawing a fallback shape instead of the blimp.");
      }
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation);
      ctx.fillStyle = "#c9a66b";
      ctx.strokeStyle = "#3a2410";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const rw = Math.max(4, (player.w || 40) / 2);
      const rh = Math.max(4, (player.h || 24) / 2);
      ctx.scale(1, rh / rw);
      ctx.arc(0, 0, rw, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    // Motion blur removed — was reading as a shadow on the blimp
    // (kept function available for obstacles)

    // Streaks + prop behind body; flame drawn on top after sprite for seamless blend
    if (typeof drawBlimpPersonality === "function") drawBlimpPersonality(false);
    if (typeof drawBlimpPropBlur === "function") drawBlimpPropBlur();

    ctx.save();
    const docked = (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked);
    const kickY = (!docked && blimpPersonality && blimpPersonality.flapKickY) ? blimpPersonality.flapKickY : 0;
    const fin = (!docked && blimpPersonality) ? (blimpPersonality.finLag || 0) * 0.28 : 0;
    ctx.translate(player.x, player.y + kickY);
    ctx.rotate(player.rotation + fin);
    if (!docked && performance.now() < invulnerableUntil) {
      ctx.globalAlpha = (Math.floor(performance.now() / 90) % 2 === 0) ? 1 : 0.35;
    } else if (window.__airborneInCloud) {
      // Level-3 style: blimp reads through the cloud
      ctx.globalAlpha = 0.78;
    }
    if (docked) {
      ctx.scale(1, 1);
    } else if (blimpPersonality) {
      ctx.scale(blimpPersonality.squashX || 1, blimpPersonality.squashY || 1);
    }
    ctx.drawImage(img, -player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();
    // Flame layered on top with additive blend so it merges into the nozzle
    if (typeof drawBlimpPersonality === "function") drawBlimpPersonality(true);
    } catch (e) { console.warn("drawPlayer", e); }
  }

  // ---------- Obstacles ----------
  let obstacles = [];
  window.__airborneClearObstacles = function () {
    try { obstacles.length = 0; } catch (e) {}
    try { if (typeof hearts !== "undefined") hearts.length = 0; } catch (e) {}
    try {
      window.__airborneFirePowerActive = false;
      window.__airborneFirePickup = null;
      window.__airborneFireAura = [];
      window.__airborneFireTrail = [];
    } catch (e) {}
    try { window.__airborneObstacles = obstacles; } catch (e) {}
  };
  window.__airborneGetObstacles = function () { return obstacles; };

  let spawnTimer = 0;
  let spawnInterval = 1.7; // seconds, decreases slightly as score rises
  let obstacleSpeed = 199; // rings -5% again

  // ---------- Dodge combo / graze system ----------
  const GRAZE_THRESHOLD = 16;  // px — how close a non-collision counts as a "graze"
  const GRAZE_BONUS = 2;
  const STREAK_MILESTONE = 5;  // award a bonus every N consecutive un-hit dodges
  const STREAK_BONUS = 10;
  const WAKE_RANGE = 48; // px — spawn turbulence when an obstacle nearly grazes the player
  let dodgeStreak = 0;
  let comboPopups = []; // floating "GRAZE!" / "5x STREAK!" text
  function spawnComboPopup(x, y, text, color) {
    comboPopups.push({
      x: W * 0.5,
      y: H * 0.28,
      text: text,
      color: color || "#f0d878",
      born: performance.now(),
      life: 1400
    });
  }

  function updateComboPopups() {
    const now = performance.now();
    comboPopups = comboPopups.filter(p => now - p.born < p.life);
  }

  function drawComboPopups() {
    const now = performance.now();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    comboPopups.forEach(p => {
      const t = (now - p.born) / p.life;
      let a = 1;
      if (t < 0.14) a = t / 0.14;
      else if (t > 0.7) a = Math.max(0, 1 - (t - 0.7) / 0.3);
      const pop = t < 0.18 ? (0.7 + 0.4 * (t / 0.18)) : 1;
      // Slower spin
      const spin = (now - p.born) / 520;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W * 0.5, H * 0.245);
      ctx.scale(pop, pop);
      const R = Math.max(28, Math.min(42, W * 0.10));
      // Outer soft pulse
      const pulse = 1 + 0.04 * Math.sin(now / 200);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.35 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(110, 30, 48, 0.22)";
      ctx.fill();
      ctx.rotate(spin);
      // Redesigned gear — thicker rim, fewer cleaner teeth, brass rim highlight
      const teeth = 8;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * Math.PI * 2;
        const a1 = ((i + 0.28) / teeth) * Math.PI * 2;
        const a2 = ((i + 0.42) / teeth) * Math.PI * 2;
        const a3 = ((i + 0.72) / teeth) * Math.PI * 2;
        const rOut = R;
        const rIn = R * 0.78;
        if (i === 0) ctx.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
        ctx.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
        ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
        ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
        ctx.lineTo(Math.cos(a3) * rIn, Math.sin(a3) * rIn);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(-R * 0.25, -R * 0.25, 2, 0, 0, R);
      g.addColorStop(0, "#a33d55");
      g.addColorStop(0.45, "#6e2236");
      g.addColorStop(1, "#2e0c16");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(160, 70, 90, 0.95)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Inner disc
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.52, 0, Math.PI * 2);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.52);
      g2.addColorStop(0, "#7a2a3c");
      g2.addColorStop(1, "#3d121e");
      ctx.fillStyle = g2;
      ctx.fill();
      ctx.strokeStyle = "rgba(200, 120, 130, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Hub + bolt
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#1e0a10";
      ctx.fill();
      ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Number upright
      ctx.rotate(-spin);
      const fs = Math.max(14, Math.min(19, R * 0.58));
      ctx.font = "bold " + fs + "px Rockwell, Georgia, serif";
      ctx.fillStyle = "#f8ecd8";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(String(p.text), 0, Math.max(2, R * 0.08));
      ctx.shadowBlur = 0;
      ctx.restore();
    });
    ctx.restore();
  }

  function pickObstacleType() {
    // Flight training: birds only
    if (window.__airborneAirfield || window.__airborneTrainingFlight) {
      return Math.random() < 0.5 ? "bird_a" : "bird_b";
    }
    const next = nextBossConfig();
    if (next && !bossActive) {
      const leadInStart = next.threshold - 25;
      if (gameplayScore >= leadInStart && gameplayScore < next.threshold && Math.random() < 0.3) {
        return next.miniType;
      }
    }
    return Math.random() < 0.5 ? "bird_a" : "bird_b";
  }

  // Training bird spritesheets (new aviator birds)
  window.__TRAINING_BIRD_SHEETS = [
    { key: "bird_gull_sheet", cols: 6, rows: 6, frames: 36 },
    { key: "bird_bluebird_sheet", cols: 5, rows: 5, frames: 25 },
    { key: "bird_owl_sheet", cols: 6, rows: 6, frames: 36 },
    { key: "bird_toucan_sheet", cols: 5, rows: 5, frames: 25 },
    { key: "bird_cardinal_sheet", cols: 5, rows: 5, frames: 25 },
    { key: "bird_eagle_sheet", cols: 5, rows: 5, frames: 25 },
    { key: "bird_sparrow_sheet", cols: 6, rows: 6, frames: 36 },
    { key: "bird_flamingo_sheet", cols: 6, rows: 6, frames: 36 }
  ];
  function pickTrainingBirdSpecies() {
    var list = window.__TRAINING_BIRD_SHEETS;
    return list[Math.floor(Math.random() * list.length)];
  }
  window.__trainingBirdSheetImgs = window.__trainingBirdSheetImgs || {};
  function ensureDroneSheet() {
    if (window.__droneSheetImg && window.__droneSheetImg.complete && window.__droneSheetImg.naturalWidth) {
      try { if (typeof images !== "undefined" && images) images.drone_scout_sheet = window.__droneSheetImg; } catch (e) {}
      return window.__droneSheetImg;
    }
    if (typeof images !== "undefined" && images && images.drone_scout_sheet && images.drone_scout_sheet.naturalWidth) {
      window.__droneSheetImg = images.drone_scout_sheet;
      return window.__droneSheetImg;
    }
    if (window.__droneSheetLoading) return null;
    window.__droneSheetLoading = true;
    var paths = [
      "drone_scout_sheet.png?v=ruff493",
      "drone_scout_sheet.png",
      "drone_scout_sheet.webp?v=ruff493",
      "drone_scout_sheet.webp"
    ];
    var i = 0;
    function tryNext() {
      if (i >= paths.length) { window.__droneSheetLoading = false; return; }
      var path = paths[i++];
      var im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = function () {
        if (im.naturalWidth > 0) {
          window.__droneSheetImg = im;
          try { if (typeof images !== "undefined" && images) images.drone_scout_sheet = im; } catch (e) {}
          window.__droneSheetLoading = false;
          console.log("[Assets] drone sheet OK", path, im.naturalWidth + "x" + im.naturalHeight);
        } else tryNext();
      };
      im.onerror = function () { tryNext(); };
      im.src = path;
    }
    tryNext();
    return null;
  }
  try {
    window.__droneSheetImg = null;
    window.__droneSheetLoading = false;
    setTimeout(ensureDroneSheet, 200);
  } catch (e) {}

  function ensureTrainingBirdSheets() {
    var list = window.__TRAINING_BIRD_SHEETS || [];
    list.forEach(function(sp) {
      if (window.__trainingBirdSheetImgs[sp.key]) return;
      var im = new Image();
      im.src = sp.key.replace("bird_", "bird_") + ".webp?v=ruff348";
      // key is bird_gull_sheet -> file bird_gull_sheet.webp
      im.src = sp.key + ".webp?v=ruff348";
      window.__trainingBirdSheetImgs[sp.key] = im;
      try { if (typeof images !== "undefined" && images) images[sp.key] = im; } catch (e) {}
    });
  }
  function drawDroneScout(o, drawY) {
    if (!o) return false;
    try { ensureDroneSheet(); } catch (e) {}
    var img = window.__droneSheetImg || null;
    try {
      if (!img && typeof images !== "undefined" && images) img = images.drone_scout_sheet;
    } catch (e) {}

    var dw = Math.max(56, o.w || 80);
    var dh = Math.max(56, o.h || dw);
    o.w = dw; o.h = dh;
    var x = (typeof o.x === "number" && o.x === o.x) ? o.x : 0;
    var y = (typeof drawY === "number" && drawY === drawY) ? drawY : ((typeof o.y === "number") ? o.y : 100);
    var cx = x + dw / 2;
    var cy = y + dh / 2;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Wind streaks (visible motion cue)
    ctx.strokeStyle = "rgba(200,230,255,0.55)";
    ctx.lineWidth = 2.5;
    for (var wi = 0; wi < 4; wi++) {
      var wy = cy - 12 + wi * 8;
      ctx.beginPath();
      ctx.moveTo(cx - dw * 0.1, wy);
      ctx.lineTo(cx - dw * 0.7 - wi * 5, wy + (wi - 1.5) * 2);
      ctx.stroke();
    }

    // Trail
    if (o.droneTrail && o.droneTrail.length) {
      for (var ti = 0; ti < o.droneTrail.length; ti++) {
        var t = o.droneTrail[ti];
        if (!t) continue;
        ctx.globalAlpha = 0.15 + 0.25 * (ti / o.droneTrail.length);
        ctx.fillStyle = "#5eead4";
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    var drawnSheet = false;
    if (img && img.complete && img.naturalWidth > 8) {
      try {
        // New steampunk orb sheet: 9×9 = 81 frames
        var cols = 9, rows = 9, n = 81;
        var fr = ((o.animFrame || 0) % n + n) % n;
        var col = fr % cols;
        var row = Math.floor(fr / cols) % rows;
        var fw = img.naturalWidth / cols;
        var fh = img.naturalHeight / rows;
        // soft lens glow
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#3dfe9a";
        ctx.beginPath();
        ctx.arc(cx, cy - dh * 0.12, dw * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(img, col * fw, row * fh, fw, fh, x, y, dw, dh);
        drawnSheet = true;
      } catch (eImg) {
        drawnSheet = false;
      }
    }

    if (!drawnSheet) {
      // Large, unmistakable steampunk drone fallback
      ctx.translate(cx, cy);
      // body
      var grd = ctx.createRadialGradient(-dw*0.1, -dh*0.1, 4, 0, 0, dw*0.42);
      grd.addColorStop(0, "#5a534c");
      grd.addColorStop(1, "#2a2622");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 2, dw * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e0b85a";
      ctx.lineWidth = 3;
      ctx.stroke();
      // lens
      ctx.fillStyle = "#1a9fd4";
      ctx.beginPath();
      ctx.arc(0, 6, dw * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8cf";
      ctx.lineWidth = 2;
      ctx.stroke();
      // tube light
      ctx.fillStyle = "#2aff9a";
      ctx.shadowColor = "#2aff9a";
      ctx.shadowBlur = 12;
      ctx.fillRect(-5, -dh * 0.5, 10, dh * 0.32);
      ctx.shadowBlur = 0;
      // wings
      ctx.fillStyle = "#d4a84b";
      ctx.beginPath();
      ctx.moveTo(-dw*0.32, 0);
      ctx.quadraticCurveTo(-dw*0.7, -dh*0.35, -dw*0.55, dh*0.1);
      ctx.quadraticCurveTo(-dw*0.4, dh*0.05, -dw*0.32, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dw*0.32, 0);
      ctx.quadraticCurveTo(dw*0.7, -dh*0.35, dw*0.55, dh*0.1);
      ctx.quadraticCurveTo(dw*0.4, dh*0.05, dw*0.32, 0);
      ctx.fill();
      // rivets
      ctx.fillStyle = "#c9a227";
      for (var ri = 0; ri < 6; ri++) {
        var ang = ri * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(ang)*dw*0.28, Math.sin(ang)*dw*0.28, 2.2, 0, Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
    return true;
  }

  
  function boostBirdSheetOpacity(img) {
    try {
      if (!img || !img.naturalWidth || img.__alphaBoosted) return img;
      var c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      var g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      var data = g.getImageData(0, 0, c.width, c.height);
      var d = data.data;
      for (var i = 0; i < d.length; i += 4) {
        var a = d[i + 3];
        if (a > 8 && a < 230) {
          // Strengthen semi-transparent bird pixels
          d[i + 3] = Math.min(255, Math.floor(a * 1.65 + 40));
        } else if (a > 0 && a <= 8) {
          // Near-invisible fringe: keep or slight boost
          d[i + 3] = Math.min(255, a * 3);
        }
      }
      g.putImageData(data, 0, 0);
      var out = new Image();
      out.src = c.toDataURL("image/png");
      out.__alphaBoosted = true;
      out.width = c.width;
      out.height = c.height;
      // Use when loaded
      img.__alphaBoosted = true;
      img.__boostedCanvas = c;
      return img;
    } catch (e) { return img; }
  }

  function drawBirdFromSheet(o, drawY) {
    var sp = o.birdSpecies;
    if (!sp) return false;
    ensureTrainingBirdSheets();
    var img = (typeof images !== "undefined" && images && images[sp.key]) || window.__trainingBirdSheetImgs[sp.key];
    if (!img || !img.complete || !img.naturalWidth) return false;
    var cols = sp.cols || 6, rows = sp.rows || 6, n = sp.frames || (cols * rows);
    var fr = (o.animFrame || 0) % n;
    var col = fr % cols;
    var row = Math.floor(fr / cols) % rows;
    var fw = img.naturalWidth / cols;
    var fh = img.naturalHeight / rows;
    try { boostBirdSheetOpacity(img); } catch (eB) {}
    var src = (img.__boostedCanvas) ? img.__boostedCanvas : img;
    var sw = img.naturalWidth || src.width;
    var sh = img.naturalHeight || src.height;
    fw = sw / cols;
    fh = sh / rows;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (o.powerAffected || o.onFire || o.rot) {
      ctx.translate(o.x + o.w / 2, drawY + o.h / 2);
      ctx.rotate(o.rot || 0);
      ctx.drawImage(src, col * fw, row * fh, fw, fh, -o.w / 2, -o.h / 2, o.w, o.h);
      // Second pass strengthens thin sprites
      ctx.globalAlpha = 0.55;
      ctx.drawImage(src, col * fw, row * fh, fw, fh, -o.w / 2, -o.h / 2, o.w, o.h);
    } else {
      ctx.drawImage(src, col * fw, row * fh, fw, fh, o.x, drawY, o.w, o.h);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(src, col * fw, row * fh, fw, fh, o.x, drawY, o.w, o.h);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    return true;
  }




  // Spend 5 collected coins on hit — they burst out, arc, and fall off-screen
  if (!window.__airborneHitCoins) window.__airborneHitCoins = [];
  const HIT_COIN_COST = 5;

  function refreshCoinCounter() {
    try {
      if (typeof updateCollectDock === "function") updateCollectDock();
      else {
        var coinEl = document.getElementById("collectPowerPct");
        if (coinEl) coinEl.textContent = String(window.__airborneCollectCoins || 0);
      }
    } catch (e) {}
  }

  function spawnHitCoinBurst(opts) {
    try {
      if (typeof player === "undefined" || !player) return;
      opts = opts || {};
      var free = !!opts.free;
      var force = !!opts.force;
      var now = performance.now();
      // Throttle only non-forced bursts (power kills use force for reliability)
      if (!force && window.__airborneLastCoinBurst && now - window.__airborneLastCoinBurst < 180) return;

      var have = window.__airborneCollectCoins || 0;
      if (!free && have < HIT_COIN_COST) {
        return;
      }

      if (!free) {
        window.__airborneCollectCoins = have - HIT_COIN_COST;
        try {
          if (typeof ruffStats !== "undefined" && ruffStats) {
            ruffStats.coins = Math.max(0, (ruffStats.coins || 0) - HIT_COIN_COST);
          }
        } catch (e) {}
        refreshCoinCounter();
      }

      window.__airborneLastCoinBurst = now;
      var cx = (opts.atX != null) ? opts.atX : player.x;
      var cy = (opts.atY != null) ? opts.atY : player.y;
      if (!window.__airborneHitCoins) window.__airborneHitCoins = [];
      var list = window.__airborneHitCoins;
      for (var i = 0; i < HIT_COIN_COST; i++) {
        var ang = (i / HIT_COIN_COST) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        // outward burst then gravity arcs them down off-screen
        var spd = 140 + Math.random() * 100;
        var startR = 14 + Math.random() * 8;
        list.push({
          x: cx + Math.cos(ang) * startR,
          y: cy + Math.sin(ang) * startR * 0.7,
          r: 13 + Math.random() * 3,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd * 0.55 - (40 + Math.random() * 50), // initial lift then fall
          spin: Math.random() * Math.PI * 2,
          bob: Math.random() * Math.PI * 2,
          life: 4.0,
          age: 0,
          falling: true,
          collected: false
        });
      }
      try {
        if (typeof sfxTrainingCoin === "function") sfxTrainingCoin();
      } catch (e) {}
    } catch (e) {}
  }
  window.spawnHitCoinBurst = spawnHitCoinBurst;
  window.spawnHitRingBurst = spawnHitCoinBurst;

  function updateHitCoins(dt) {
    var list = window.__airborneHitCoins;
    if (!list || !list.length) return;
    var H0 = typeof H !== "undefined" ? H : 600;
    var W0 = typeof W !== "undefined" ? W : 800;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // air drag then strong gravity — arch down and fall off screen
      c.vx *= (1 - 0.35 * dt);
      c.vy += 420 * dt; // fall hard
      if (c.vy > 520) c.vy = 520;
      // static coin — no spin anim
      c.bob += dt * 2.5;
      // No player re-collection — spent coins leave the run
      if (c.y > H0 + 40 || c.x < -80 || c.x > W0 + 80 || c.age >= c.life) {
        list.splice(i, 1);
      }
    }
  }

  if (!window.__airborneCoinSheet) {
    window.__airborneCoinSheet = (function () {
      var im = new Image();
      im.src = "coin_star_sheet.png?v=ruff298";
      return im;
    })();
  }

  function drawHitCoins() {
    var list = window.__airborneHitCoins;
    if (!list || !list.length || typeof ctx === "undefined") return;
    var sheet = window.__airborneCoinSheet;
    var sheetReady = sheet && sheet.complete && sheet.naturalWidth > 0;
    var fw = 128, nFrames = 36;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var by = c.y + Math.sin(c.bob) * 2;
      var fade = c.y > (typeof H !== "undefined" ? H : 600) - 40
        ? Math.max(0.15, 1 - (c.y - ((typeof H !== "undefined" ? H : 600) - 40)) / 80)
        : 1;
      var frame = 0; // single static image, no animation
      var size = (c.r || 12) * 2.4;
      ctx.save();
      ctx.translate(c.x, by);
      var pulse = 0.75 + 0.25 * Math.sin((c.spin || 0) * 2);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * 0.5 * pulse;
      var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, (c.r || 12) * 2.4);
      hg.addColorStop(0, "rgba(255,250,200,0.8)");
      hg.addColorStop(0.4, "rgba(255,200,60,0.35)");
      hg.addColorStop(1, "rgba(255,150,0,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, 0, (c.r || 12) * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = fade;
      if (sheetReady) {
        ctx.drawImage(sheet, frame * fw, 0, fw, fw, -size / 2, -size / 2, size, size);
      } else {
        var squash = 0.55 + 0.45 * Math.abs(Math.cos(c.spin));
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
    }
  }
  window.updateHitCoins = updateHitCoins;
  window.drawHitCoins = drawHitCoins;

  function spawnGoldRing(optX) {
    var target = window.__airborneRingTotalTarget || 20;
    if ((window.__airborneRingSpawned || 0) >= target) return null;
    window.__airborneRingSpawned = (window.__airborneRingSpawned || 0) + 1;
    window.__airborneRingSerial = (window.__airborneRingSerial || 0) + 1;

    var Ww = (typeof W === "number" && W > 50) ? W : (window.innerWidth || 400);
    var Hh = (typeof H === "number" && H > 50) ? H : (window.innerHeight || 700);
    var r = Math.min(48, Ww * 0.115);
    if (!(r > 0)) r = 42;
    var groundY = Hh * 0.88;
    try { if (typeof groundLevelY === "function") groundY = groundLevelY(); } catch (e) {}
    // Full flyable band — top, high, mid, low, bottom lanes
    var minY = Hh * 0.12;
    var maxY = groundY - Hh * 0.14;
    if (!(maxY > minY + 40)) { minY = Hh * 0.14; maxY = Hh * 0.78; }
    var idx = window.__airborneRingSpawned; // 1..20 after increment
    // Deliberate path: climb / dive / weave so each ring is in a different zone
    var lanes = [
      0.18, 0.72, 0.35, 0.88, 0.50,
      0.12, 0.65, 0.42, 0.80, 0.28,
      0.55, 0.15, 0.90, 0.38, 0.70,
      0.22, 0.60, 0.85, 0.45, 0.32
    ];
    var t = lanes[(Math.max(1, idx) - 1) % lanes.length];
    // Small jitter so it never looks robotic
    t = Math.max(0.08, Math.min(0.92, t + (Math.random() - 0.5) * 0.06));
    var y = minY + (maxY - minY) * t;
    var spawnX = (typeof optX === "number") ? optX : (Ww + r * 2);
    var ring = {
      type: "gold_ring",
      x: spawnX,
      y: y,
      w: r * 2,
      h: r * 2,
      r: r,
      vx: 0,
      scored: false,
      collected: false,
      spin: Math.random() * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmount: 6,
      speedMult: 0.993, // rings another -5%
      isRing: true,
      ringNum: window.__airborneRingSerial || idx,
      animFrame: 0,
      animT: 0
    };
    obstacles.push(ring);
    window.__airborneObstacles = obstacles;
    return ring;
  }
  window.spawnGoldRing = spawnGoldRing;

  /** Pre-place all training rings so the lesson always gets exactly N. */
  function countTrainingRings() {
    var n = 0;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o && (o.isRing || o.type === "gold_ring")) n++;
    }
    return n;
  }
  window.__airborneCountTrainingRings = countTrainingRings;

  function spawnAllTrainingRings(n) {
    n = n || 20;
    window.__airborneRingTotalTarget = n;
    // Do NOT wipe spawned counter if rings already in play mid-stage
    // Only used for full reset at stage start
    window.__airborneRingSpawned = 0;
    window.__airborneRingSerial = 0;
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var oo = obstacles[i];
      if (oo && (oo.isRing || oo.type === "gold_ring")) obstacles.splice(i, 1);
    }
    var Ww = (typeof W === "number" && W > 50) ? W : (window.innerWidth || 400);
    var Hh = (typeof H === "number" && H > 50) ? H : (window.innerHeight || 700);
    var gap = Math.max(150, Ww * 0.34);
    var startX = Ww + 120;
    for (var k = 0; k < n; k++) {
      spawnGoldRing(startX + k * gap);
    }
    window.__airborneObstacles = obstacles;
    console.log("[Rings] pre-spawned", window.__airborneRingSpawned, "/", n, "live", countTrainingRings());
  }
  window.spawnAllTrainingRings = spawnAllTrainingRings;

  /** Spawn the next single ring in the 20-ring sequence (safe, one at a time). */
  function spawnNextTrainingRing() {
    var target = window.__airborneRingTotalTarget || 20;
    if ((window.__airborneRingSpawned || 0) >= target) return false;
    var Ww = (typeof W === "number" && W > 50) ? W : (window.innerWidth || 400);
    var gap = Math.max(150, Ww * 0.34);
    var lastX = Ww + 40;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o && (o.isRing || o.type === "gold_ring") && o.x > lastX) lastX = o.x;
    }
    var x = Math.max(Ww + 100, lastX + gap);
    spawnGoldRing(x);
    return true;
  }
  window.spawnNextTrainingRing = spawnNextTrainingRing;




  function spawnObstacle() {
    // Airfield training rings
    if (window.__airborneAirfield && window.__airborneAirfieldRings && !window.__airborneAirfieldObstacles) {
      spawnGoldRing();
      return;
    }
    if (window.__airborneAirfield && window.__airborneAirfieldRings && Math.random() < 0.45) {
      spawnGoldRing();
      return;
    }
    if (window.__airborneAirfield && !window.__airborneAirfieldObstacles && !window.__airborneAirfieldRings) {
      return;
    }
    const type = pickObstacleType();
    // Drone uses spritesheet — no OBSTACLE_ANIM_SETS frames
    if (type === "drone_scout") {
      var dw = Math.min(96, (typeof W !== "undefined" ? W : 400) * 0.20);
      var groundYd = (typeof groundLevelY === "function") ? groundLevelY() : ((typeof H !== "undefined" ? H : 600) * 0.85);
      var yD = (typeof H !== "undefined" ? H : 600) * (0.18 + Math.random() * 0.55);
      if (yD > groundYd - dw) yD = groundYd - dw - 10;
      obstacles.push({
        type: "drone_scout",
        x: (typeof W !== "undefined" ? W : 400) + dw,
        y: yD,
        w: dw,
        h: dw,
        scored: false,
        speedMult: 0.43,
        animFrame: Math.floor(Math.random() * 81),
        animT: 0,
        bobPhase: Math.random() * Math.PI * 2,
        bobAmount: 0,
        droneZig: Math.random() * Math.PI * 2,
        droneZigSpd: 1.6 + Math.random() * 1.2,
        droneZigAmp: 28 + Math.random() * 36,
        droneBaseY: yD,
        isDrone: true,
        droneTrail: []
      });
      return;
    }
    const frames = OBSTACLE_ANIM_SETS[type];
    if (!frames || !frames.length) return;
    const img = (typeof images !== "undefined" && images) ? images[frames[0]] : null;
    let aspect = imgAspect(img);
    let dispW;
    if (type === "balloon_anim") {
      dispW = Math.min(90, W * 0.18);
    } else if (type === "mini_blimp") {
      // mini blimps — 2x bigger for dramatic boss lead-in presence
      const playerImg = currentPlayerImage();
      const playerAspect = playerImg && playerImg.naturalWidth ? (playerImg.naturalHeight / playerImg.naturalWidth) : 0.6;
      dispW = Math.min(220, W * 0.44);
      // Force aspect to match player so height matches too
      aspect = playerAspect || aspect;
    } else if (type === "mini_tank") {
      // boss 3's mini — 2x bigger
      dispW = Math.min(220, W * 0.44);
    } else if (type === "mini_heli") {
      // boss 4's mini — 2x bigger
      dispW = Math.min(220, W * 0.44);
    } else if (type === "mini_ebomb") {
      // boss 5's mini — 2x bigger, matching the other bosses' minis
      dispW = Math.min(220, W * 0.44);
    } else {
      dispW = Math.min(70, W * 0.15);
    }
    const dispH = dispW * aspect;

    // Full screen vertical range during airfield training; city levels stay roof-safe
    const groundY = groundLevelY();
    const topMargin = H * 0.04;
    let minY = topMargin;
    let maxY;
    if (window.__airborneAirfield) {
      // Whole sky band — top to near bottom of playable area
      maxY = Math.max(minY + 40, H * 0.82 - dispH);
    } else {
      const tallestRoofY = groundY - H * 0.5;
      const bobBuffer = 20;
      maxY = Math.max(minY + 40, tallestRoofY - dispH - bobBuffer);
    }
    const y = minY + Math.random() * Math.max(20, (maxY - minY));

    var birdSpecies = null;
    var birdFrameCount = OBSTACLE_ANIM_FRAME_COUNT;
    if (type === "drone_scout") {
      dispW = Math.min(78, W * 0.16);
      aspect = 1;
      // force square-ish size after later assignments
    }
    if (type === "bird_a" || type === "bird_b") {
      // ORIGINAL two bird assets only (frame sequences bird_a / bird_b)
      birdSpecies = null;
      birdFrameCount = OBSTACLE_ANIM_FRAME_COUNT || 28;
      var fr0 = (typeof images !== "undefined" && images) ? images[type + "_01"] : null;
      if (fr0 && fr0.naturalWidth && fr0.naturalHeight) {
        aspect = fr0.naturalHeight / fr0.naturalWidth;
      } else {
        aspect = 0.85;
      }
      dispW = Math.min(86, W * 0.176);
    }
    const dispH2 = (type === "bird_a" || type === "bird_b") ? dispW * aspect : dispH;
    if (type === "bird_a" || type === "bird_b") {
      // use recomputed size (+10%)
    }
    if (type === "drone_scout") {
      dispW = Math.min(78, (typeof W !== "undefined" ? W : 400) * 0.16);
      aspect = 1;
    }
    obstacles.push({
      type,
      x: W + dispW,
      y,
      w: dispW,
      h: (type === "bird_a" || type === "bird_b") ? (dispW * aspect) : dispH,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 1.5 + Math.random() * 1.2,
      bobAmount: 8 + Math.random() * 10,
      speedMult: type === "balloon_anim" ? 0.72 : (type === "drone_scout" ? 0.43 : ((type === "bird_a" || type === "bird_b") ? 0.855 : 1)),
      animFrame: Math.floor(Math.random() * birdFrameCount),
      animTimer: Math.random() / OBSTACLE_ANIM_FPS,
      birdSpecies: birdSpecies,
      birdFrameCount: birdFrameCount,
      droneZig: type === "drone_scout" ? (Math.random() * Math.PI * 2) : 0,
      droneZigSpd: type === "drone_scout" ? (1.6 + Math.random() * 1.2) : 0,
      droneZigAmp: type === "drone_scout" ? (28 + Math.random() * 36) : 0,
      droneBaseY: 0,
      isDrone: type === "drone_scout",
      droneSparkT: 0,
      droneTrail: [],
      scored: false,
      // jet engine flame + smoke trail for mini blimps
      flameTimer: (type === "mini_blimp") ? 0 : null,
      smokeTimer: (type === "mini_blimp") ? 0 : null,
      flameParticles: (type === "mini_blimp") ? [] : null,
      smokeParticles: (type === "mini_blimp") ? [] : null
    });
  }

  
  // ---------- FIRE POWER-UP (window-scoped so it never ReferenceErrors) ----------
  (function initFirePowerSystem() {
    if (window.__airborneFireInited) return;
    window.__airborneFireInited = true;
    window.__airborneFirePowerActive = false;
    window.__airborneFirePowerUntil = 0;
    window.__airborneFirePickup = null;
    window.__airborneFireAura = [];
    window.__airborneFireTrail = [];

    window.__airborneSpawnFirePickup = function (x, y) {
      // Fire floating pickup removed
      window.__airborneFirePickup = null;
      return;
      window.__airborneFirePickup = {
        x: (typeof x === "number") ? x : ((typeof W !== "undefined" ? W : 400) + 60),
        y: (typeof y === "number") ? y : ((typeof H !== "undefined" ? H : 600) * (0.28 + Math.random() * 0.32)),
        r: 35, // +25% floating size
        bob: Math.random() * Math.PI * 2,
        pulse: 0,
        speed: 125,
        frame: 0,
        frameT: 0,
        embers: []
      };
    };

    window.__airborneEmitFireBurst = function (x, y) {
      for (let i = 0; i < 12; i++) {
        window.__airborneFireTrail.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 130,
          vy: -50 - Math.random() * 90,
          life: 0.4 + Math.random() * 0.3,
          age: 0,
          r: 4 + Math.random() * 6,
          smoke: false
        });
      }
    };

    window.__airborneEmitFireTrail = function (x, y, tint) {
      if (Math.random() > 0.65) return;
      window.__airborneFireTrail.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y,
        vx: (Math.random() - 0.5) * 25,
        vy: -15 - Math.random() * 35,
        life: 0.3 + Math.random() * 0.25,
        age: 0,
        r: 3 + Math.random() * 5,
        smoke: Math.random() < 0.4,
        tint: tint || "orange"
      });
    };

    window.__airborneUpdateFirePower = function (dt) {
      const pickup = window.__airborneFirePickup;
      if (pickup && !pickup.collected) {
        pickup.x -= (pickup.speed || 125) * dt;
        pickup.bob += dt * 2.4;
        pickup.pulse = (pickup.pulse || 0) + dt * 5;
        // 6x6 sheet = 36 frames
        pickup.frameT = (pickup.frameT || 0) + dt;
        const fd = 1 / 14;
        while (pickup.frameT >= fd) {
          pickup.frameT -= fd;
          pickup.frame = ((pickup.frame || 0) + 1) % 36;
        }
        // Spawn small embers
        if (!pickup.embers) pickup.embers = [];
        if (Math.random() < 0.7) {
          const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
          pickup.embers.push({
            x: pickup.x + (Math.random() - 0.5) * 16,
            y: pickup.y + Math.sin(pickup.bob) * 10 + 6,
            vx: Math.cos(ang) * (20 + Math.random() * 40),
            vy: Math.sin(ang) * (30 + Math.random() * 50) - 20,
            life: 0.35 + Math.random() * 0.35,
            age: 0,
            r: 1.5 + Math.random() * 2.5
          });
        }
        for (let ei = pickup.embers.length - 1; ei >= 0; ei--) {
          const e = pickup.embers[ei];
          e.age += dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.vy += 40 * dt;
          if (e.age >= e.life) pickup.embers.splice(ei, 1);
        }
        if (pickup.embers.length > 40) pickup.embers.splice(0, pickup.embers.length - 40);
        if (typeof player !== "undefined" && player) {
          const dx = Math.abs(player.x - pickup.x);
          const dy = Math.abs(player.y - (pickup.y + Math.sin(pickup.bob) * 10));
          if (dx < player.w * 0.45 + pickup.r && dy < player.h * 0.45 + pickup.r) {
            pickup.collected = true;
            pickup.collectAnim = 0; // 0→1 expand + bounce fade
            pickup.collectX = pickup.x;
            pickup.collectY = pickup.y + Math.sin(pickup.bob) * 10;
            window.__airborneFirePowerActive = true;
            window.__airborneFirePowerUntil = performance.now() + 9000;
            window.__airborneFireOrbiters = [];
            window.__airborneFireActivateT = 0;
            try {
              if (typeof sfxPowerup === "function") sfxPowerup();
            } catch (e) {}
          }
        }
        if (pickup.x < -70 && !pickup.collected) window.__airborneFirePickup = null;
      }
      // Collect expand animation continues after collect
      if (pickup && pickup.collected) {
        pickup.collectAnim = (pickup.collectAnim || 0) + dt / 0.85;
        // keep animating frames during expand
        pickup.frameT = (pickup.frameT || 0) + dt;
        const fd = 1 / 16;
        while (pickup.frameT >= fd) {
          pickup.frameT -= fd;
          pickup.frame = ((pickup.frame || 0) + 1) % 36;
        }
        // burst embers during expand
        if (!pickup.embers) pickup.embers = [];
        if (pickup.collectAnim < 0.7 && Math.random() < 0.85) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 60 + Math.random() * 140;
          pickup.embers.push({
            x: pickup.collectX || pickup.x,
            y: pickup.collectY || pickup.y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 30,
            life: 0.4 + Math.random() * 0.4,
            age: 0,
            r: 2 + Math.random() * 4
          });
        }
        for (let ei = (pickup.embers || []).length - 1; ei >= 0; ei--) {
          const e = pickup.embers[ei];
          e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 50 * dt;
          if (e.age >= e.life) pickup.embers.splice(ei, 1);
        }
        if (pickup.collectAnim >= 1) window.__airborneFirePickup = null;
      }
      if (window.__airborneFirePowerActive && performance.now() > window.__airborneFirePowerUntil) {
        if (window.__airborneFirePowerTint === "green") {
          // Final jade-gold flash as orbs merge into the blimp
          window.__airborneJadeFinaleFlash = { age: 0, life: 0.55 };
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(6, 280); } catch (e) {}
          try { if (typeof sfxExplosion === "function") sfxExplosion(0.4); } catch (e) {}
        }
        window.__airborneFirePowerActive = false;
        window.__airborneJadePhase = null;
        window.__airborneJadeMotes = [];
      }
      // Dense core + orbiting fireball system (Zeppelin Ace)
      if (window.__airborneFirePowerActive && typeof player !== "undefined" && player) {
        // Ensure orbiters exist
        var isJade = window.__airborneFirePowerTint === "green";
        if (!window.__airborneFireOrbiters || !window.__airborneFireOrbiters.length) {
          window.__airborneFireOrbiters = [];
          var nOrb = 6;
          for (var oi = 0; oi < nOrb; oi++) {
            window.__airborneFireOrbiters.push({
              phase: (oi / nOrb) * Math.PI * 2,
              speed: isJade ? (1.6 + Math.random() * 0.4) : (2.4 + Math.random() * 0.9),
              baseSpeed: isJade ? (3.2 + Math.random() * 0.6) : (2.4 + Math.random() * 0.9),
              radius: isJade ? (0.95 + Math.random() * 0.12) : ((0.52 + Math.random() * 0.18) * 1.15),
              targetRadius: isJade ? ((0.55 + Math.random() * 0.12) * 1.15) : ((0.52 + Math.random() * 0.18) * 1.15),
              tilt: 0.55 + Math.random() * 0.35,
              wobble: 0.15 + Math.random() * 0.2,
              wobbleSpd: 1.5 + Math.random() * 2,
              size: isJade ? (12 + Math.random() * 4) : (9 + Math.random() * 5),
              trail: [],
              hitIds: {},
              mode: "orbit"
            });
          }
          window.__airborneFireActivateT = 0;
        }
        // Ace only: one-shot radial volley (never orange during jade)
        if (window.__airborneFireLaunchBurst && !isJade) {
          window.__airborneFireLaunchBurst = false;
          if (!window.__airborneFireballs) window.__airborneFireballs = [];
          var nShot = 10;
          for (var si = 0; si < nShot; si++) {
            var sang = (si / nShot) * Math.PI * 2 + Math.random() * 0.12;
            var ssp = 240 + Math.random() * 90;
            window.__airborneFireballs.push({
              x: player.x + Math.cos(sang) * (player.w || 40) * 0.45,
              y: player.y + Math.sin(sang) * (player.h || 30) * 0.45,
              vx: Math.cos(sang) * ssp,
              vy: Math.sin(sang) * ssp,
              life: 3.2,
              age: 0,
              r: 20 + Math.random() * 8,
              size: 20 + Math.random() * 8,
              phase: sang,
              trails: [],
              colors: ["#fff7ed", "#ffd24a", "#ff8a1a", "#ff3b00"],
              smokeCol: "rgba(50,40,30,0.85)",
              kind: "aceOrb",
              pierce: 3,
              hitIds: {}
            });
          }
          try { if (typeof sfxShoot === "function") sfxShoot(); } catch (e) {}
        }
        // Jade: delayed radial launch of the 6 orbiters after sunburst peak
        if (isJade && window.__airborneJadePhase === "ignite" && performance.now() >= (window.__airborneJadeBurstAt || 0)) {
          window.__airborneJadePhase = "burst";
          var orbsL = window.__airborneFireOrbiters;
          for (var li = 0; li < orbsL.length; li++) {
            var lo = orbsL[li];
            lo.mode = "outbound";
            lo.outAge = 0;
            lo.outLife = 0.65 + Math.random() * 0.12;
            var la = lo.phase;
            var rad0 = (lo.radius || 0.7) * 1.32;
            lo.x = player.x + Math.cos(la) * player.w * rad0;
            lo.y = player.y + Math.sin(la) * player.h * rad0 * (lo.tilt || 0.7);
            lo.vx = Math.cos(la) * (300 + Math.random() * 50);
            lo.vy = Math.sin(la) * (300 + Math.random() * 50);
            lo.hitIds = {};
          }
          try { if (typeof sfxShoot === "function") sfxShoot(); } catch (e) {}
          try { if (typeof triggerScreenShake === "function") triggerScreenShake(5, 220); } catch (e) {}
        }
        // Jade: tighten orbit + ambient motes + finale trigger
        if (isJade) {
          window.__airborneFireActivateT = (window.__airborneFireActivateT || 0) + dt;
          var orbsJ = window.__airborneFireOrbiters || [];
          for (var ji = 0; ji < orbsJ.length; ji++) {
            var jo = orbsJ[ji];
            if (jo.mode === "orbit" || jo.mode === "return") {
              jo.radius += ((jo.targetRadius || jo.radius) - jo.radius) * Math.min(1, dt * 2.2);
              jo.speed += ((jo.baseSpeed || jo.speed) - jo.speed) * Math.min(1, dt * 1.8);
            }
          }
          if (!window.__airborneJadeMotes) window.__airborneJadeMotes = [];
          if (Math.random() < 0.55) {
            var ma = Math.random() * Math.PI * 2;
            window.__airborneJadeMotes.push({
              ang: ma, dist: 90 + Math.random() * 110,
              spin: 1.2 + Math.random() * 1.5,
              life: 1.1 + Math.random() * 0.6, age: 0,
              r: 2 + Math.random() * 3
            });
          }
          for (var mi = window.__airborneJadeMotes.length - 1; mi >= 0; mi--) {
            var m = window.__airborneJadeMotes[mi];
            m.age += dt; m.ang += m.spin * dt;
            m.dist = Math.max(8, m.dist - 55 * dt);
            if (m.age >= m.life || m.dist < 10) window.__airborneJadeMotes.splice(mi, 1);
          }
          var left = (window.__airborneFirePowerUntil || 0) - performance.now();
          if (!window.__airborneJadeFinale && left < 550 && left > 0) {
            window.__airborneJadeFinale = true;
            window.__airborneJadePhase = "finale";
            for (var fi = 0; fi < orbsJ.length; fi++) {
              orbsJ[fi].mode = "collapse";
              orbsJ[fi].hitIds = {};
            }
          }
        } else {
          window.__airborneFireActivateT = (window.__airborneFireActivateT || 0) + dt;
        }
        // Core heat embers
        for (let i = 0; i < 3; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = player.w * (0.15 + Math.random() * 0.28);
          window.__airborneFireAura.push({
            x: player.x + Math.cos(ang) * rad,
            y: player.y + Math.sin(ang) * rad * 0.7,
            vx: (Math.random() - 0.5) * 40,
            vy: -40 - Math.random() * 55,
            life: 0.25 + Math.random() * 0.3,
            age: 0,
            r: 4 + Math.random() * 6,
            tint: window.__airborneFirePowerTint === "green" ? "green" : "orange"
          });
        }
        // Update orbiters + trails
        var orbs = window.__airborneFireOrbiters;
        for (var oi = 0; oi < orbs.length; oi++) {
          var orb = orbs[oi];
          var act = Math.min(1, (window.__airborneFireActivateT || 0) / 0.45);
          var ox, oy;
          if (orb.mode === "outbound") {
            orb.outAge = (orb.outAge || 0) + dt;
            ox = (orb.x || player.x) + orb.vx * dt;
            oy = (orb.y || player.y) + orb.vy * dt;
            orb.x = ox; orb.y = oy;
            // after outward peak, curve back
            if (orb.outAge >= orb.outLife) {
              orb.mode = "return";
              orb.retAge = 0;
            }
          } else if (orb.mode === "return") {
            orb.retAge = (orb.retAge || 0) + dt;
            var targetR = orb.targetRadius || orb.radius || 0.6;
            var radMulR = targetR * (0.9 + 0.1 * Math.sin(orb.phase));
            var tx = player.x + Math.cos(orb.phase) * player.w * radMulR * 1.32;
            var ty = player.y + Math.sin(orb.phase) * player.h * radMulR * orb.tilt;
            var k = Math.min(1, 3.5 * dt);
            orb.x = (orb.x || tx) + (tx - (orb.x || tx)) * k;
            orb.y = (orb.y || ty) + (ty - (orb.y || ty)) * k;
            orb.phase += (orb.baseSpeed || orb.speed) * dt * 0.5;
            ox = orb.x; oy = orb.y;
            if (orb.retAge > 0.45 || Math.hypot(orb.x - tx, orb.y - ty) < 12) {
              orb.mode = "orbit";
              orb.radius = targetR;
              orb.speed = orb.baseSpeed || orb.speed;
              if (window.__airborneJadePhase === "burst") window.__airborneJadePhase = "orbit";
            }
          } else if (orb.mode === "collapse") {
            // spiral inward for finale
            orb.radius = Math.max(0.02, (orb.radius || 0.5) - dt * 1.6);
            orb.phase += (orb.baseSpeed || 4) * dt * 1.8;
            var radMulC = Math.max(0.02, orb.radius);
            ox = player.x + Math.cos(orb.phase) * player.w * radMulC * 1.1;
            oy = player.y + Math.sin(orb.phase) * player.h * radMulC * (orb.tilt || 0.7);
            orb.x = ox; orb.y = oy;
          } else {
            // normal orbit
            orb.phase += orb.speed * dt;
            var radMul = act * (orb.radius + Math.sin(orb.phase * orb.wobbleSpd) * orb.wobble * 0.12);
            // jade keeps visible orbit even early; ace expands from 0
            if (window.__airborneFirePowerTint === "green") radMul = Math.max(radMul, orb.radius * 0.85);
            ox = player.x + Math.cos(orb.phase) * player.w * radMul * 1.32;
            oy = player.y + Math.sin(orb.phase) * player.h * radMul * orb.tilt;
            orb.x = ox; orb.y = oy;
          }
          orb.z = Math.sin(orb.phase); // front/back depth
          // trail samples
          if (!orb.trail) orb.trail = [];
          orb.trail.push({ x: ox, y: oy, age: 0, life: 0.28 });
          if (orb.trail.length > 10) orb.trail.shift();
          for (var ti = orb.trail.length - 1; ti >= 0; ti--) {
            orb.trail[ti].age += dt;
            if (orb.trail[ti].age >= orb.trail[ti].life) orb.trail.splice(ti, 1);
          }
          // sparks off orbiter
          if (Math.random() < 0.35) {
            window.__airborneFireTrail.push({
              x: ox, y: oy,
              vx: (Math.random() - 0.5) * 60,
              vy: -20 - Math.random() * 50,
              life: 0.2 + Math.random() * 0.2,
              age: 0,
              r: 2 + Math.random() * 3,
              smoke: false,
              tint: window.__airborneFirePowerTint === "green" ? "green" : "orange"
            });
          }
        }
        // Orbiting fireballs damage nearby obstacles (protective ring)
        var orbsDmg = window.__airborneFireOrbiters || [];
        if (typeof obstacles !== "undefined" && obstacles) {
          for (var oi = 0; oi < orbsDmg.length; oi++) {
            var orb = orbsDmg[oi];
            if (!orb || orb.x == null) continue;
            if (!orb.hitIds) orb.hitIds = {};
            var hitR = (orb.size || 10) * ((orb.mode === "outbound") ? 2.8 : 1.6);
            for (var hi = 0; hi < obstacles.length; hi++) {
              var o = obstacles[hi];
              if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
              if (o.powerAffected && o.onFire) continue;
              var ox = o.x + (o.w || 0) * 0.5, oy = o.y + (o.h || 0) * 0.5;
              if (Math.hypot(orb.x - ox, orb.y - oy) > hitR + Math.max(o.w || 20, o.h || 20) * 0.35) continue;
              var oid = o._uid || (o._uid = "f" + Math.random().toString(36).slice(2));
              if (orb.hitIds[oid]) continue;
              orb.hitIds[oid] = true;
              o.onFire = true;
              o.powerAffected = true;
              o.spinDir = (Math.random() < 0.5 ? -1 : 1) * (4.5 + Math.random() * 3.5);
              o.rot = o.rot || 0;
              o.hitFlash = 0.7;
              o.vy = 70 + Math.random() * 40;
              o.vx = (Math.random() - 0.5) * 60;
              o.scored = true;
              try { if (typeof creditPowerKillScore === "function") creditPowerKillScore(1); } catch (e) {}
              if (window.__airborneFirePowerTint === "green") {
                o.greenFire = true;
                try {
                  if (window.PowerFX) window.PowerFX.burst(ox, oy, {
                    count: orb.mode === "outbound" ? 26 : 18,
                    colors: ["#fff", "#d1fae5", "#6ee7b7", "#10b981", "#047857"],
                    speed: orb.mode === "outbound" ? 160 : 130,
                    life: 0.55, glow: true
                  });
                } catch (e) {}
                try { if (typeof triggerScreenShake === "function") triggerScreenShake(orb.mode === "outbound" ? 5 : 3, 140); } catch (e) {}
              }
            }
          }
        }
        // Update launch-burst fireballs (same system as Ironworks projectiles)
        if (window.__airborneFireballs && window.__airborneFireballs.length) {
          var fbs = window.__airborneFireballs;
          for (var fi = fbs.length - 1; fi >= 0; fi--) {
            var fb = fbs[fi];
            fb.age += dt;
            fb.x += fb.vx * dt;
            fb.y += fb.vy * dt;
            if (fb.kind === "aceOrb" || fb.kind === "jadeOrb") {
              // keep radial flight so they leave the screen
              fb.vy += 12 * dt;
            } else {
              fb.vy += 70 * dt;
            }
            // despawn once clearly off-screen
            var W0 = (typeof W === "number") ? W : 400;
            var H0 = (typeof H === "number") ? H : 700;
            if (fb.x < -60 || fb.x > W0 + 60 || fb.y < -60 || fb.y > H0 + 60) {
              fb.age = fb.life;
            }
            if (!fb.trails) fb.trails = [];
            fb.trails.push({ x: fb.x, y: fb.y, age: 0, life: 0.3, r: (fb.r || 10) * 0.5 });
            if (fb.trails.length > 12) fb.trails.shift();
            for (var ti = fb.trails.length - 1; ti >= 0; ti--) {
              fb.trails[ti].age += dt;
              if (fb.trails[ti].age >= fb.trails[ti].life) fb.trails.splice(ti, 1);
            }
            if (typeof obstacles !== "undefined" && obstacles) {
              if (!fb.hitIds) fb.hitIds = {};
              for (var hi = 0; hi < obstacles.length; hi++) {
                var o = obstacles[hi];
                if (!o || o.isRing || o.type === "gold_ring" || o.type === "ring") continue;
                if (o.powerAffected && o.onFire) continue;
                var ox = o.x + (o.w || 0) * 0.5, oy = o.y + (o.h || 0) * 0.5;
                if (Math.hypot(fb.x - ox, fb.y - oy) > (fb.r || 10) + Math.max(o.w || 20, o.h || 20) * 0.35) continue;
                var oid = o._uid || (o._uid = "fb" + Math.random().toString(36).slice(2));
                if (fb.hitIds[oid]) continue;
                fb.hitIds[oid] = true;
                o.onFire = true;
                o.powerAffected = true;
                o.hitFlash = 0.75;
                o.vy = 80 + Math.random() * 50;
                o.vx = (Math.random() - 0.5) * 70;
                o.scored = true;
                try { if (typeof creditPowerKillScore === "function") creditPowerKillScore(1); } catch (e) {}
                if (!fb.pierce || fb.pierce <= 1) { fb.age = fb.life; break; }
                fb.pierce--;
              }
            }
            if (fb.age >= fb.life) fbs.splice(fi, 1);
          }
        }
      } else {
        window.__airborneFireOrbiters = [];
        window.__airborneFireActivateT = 0;
      }
      const aura = window.__airborneFireAura;
      for (let i = aura.length - 1; i >= 0; i--) {
        const p = aura[i];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.age >= p.life) aura.splice(i, 1);
      }
      if (aura.length > 80) aura.splice(0, aura.length - 80);
      const trail = window.__airborneFireTrail;
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 35 * dt;
        if (p.smoke) p.r += 16 * dt;
        if (p.age >= p.life) trail.splice(i, 1);
      }
      if (trail.length > 120) trail.splice(0, trail.length - 120);
    };

    window.__airborneDrawFirePower = function () {
      try { if (window.__airborneDrawActivePowerVisual) window.__airborneDrawActivePowerVisual(); } catch (e) {}

      if (typeof ctx === "undefined") return;
      const pickup = window.__airborneFirePickup;
      if (pickup) {
        const collecting = !!pickup.collected;
        const ca = Math.min(1, pickup.collectAnim || 0);
        // Motion: bob + slight orbit sway + spin scale
        const bobY = Math.sin(pickup.bob || 0) * 10;
        const swayX = Math.sin((pickup.pulse || 0) * 0.7) * 6;
        const baseX = collecting ? (pickup.collectX || pickup.x) : (pickup.x + swayX);
        const baseY = collecting ? (pickup.collectY || pickup.y) : (pickup.y + bobY);
        // Expand to ~half screen with bounce, then fade
        let scale = 1;
        let alpha = 1;
        if (collecting) {
          // bounce ease: overshoot then settle while fading
          const bounce = Math.sin(ca * Math.PI) * 0.18;
          scale = 1 + ca * ca * 9 + bounce; // grows toward ~half screen
          alpha = ca < 0.55 ? 1 : Math.max(0, 1 - (ca - 0.55) / 0.45);
        } else {
          scale = 1 + Math.sin(pickup.pulse || 0) * 0.08;
        }
        const R = (pickup.r || 28) * scale;
        // Collected expands to ~full half-screen * 2 (almost fills view), with bounce
        const halfTarget = Math.min(W, H) * 0.95;
        const dw = collecting ? Math.min(halfTarget * (0.12 + ca * 0.88), halfTarget) : R * 2.4;
        const dh = dw;
        ctx.save();
        ctx.globalAlpha = alpha;
        // Glow
        const glowR = dw * 0.7;
        const g = ctx.createRadialGradient(baseX, baseY, 2, baseX, baseY, glowR);
        g.addColorStop(0, "rgba(255,200,60," + (0.55 * alpha) + ")");
        g.addColorStop(0.45, "rgba(255,90,15," + (0.25 * alpha) + ")");
        g.addColorStop(1, "rgba(180,20,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(baseX, baseY, glowR, 0, Math.PI * 2);
        ctx.fill();
        // Sprite
        const sheet = (typeof images !== "undefined" && images) ? images.fireball_sheet : null;
        if (sheet && sheet.naturalWidth) {
          const cols = 6, rows = 6;
          const fw = sheet.naturalWidth / cols;
          const fh = sheet.naturalHeight / rows;
          const fr = (pickup.frame || 0) % 36;
          const col = fr % cols;
          const row = Math.floor(fr / cols) % rows;
          ctx.drawImage(sheet, col * fw, row * fh, fw, fh, baseX - dw / 2, baseY - dh / 2, dw, dh);
        } else {
          const g2 = ctx.createRadialGradient(baseX - 3, baseY - 4, 0, baseX, baseY, dw / 2);
          g2.addColorStop(0, "#fff6c8");
          g2.addColorStop(0.35, "#ffb030");
          g2.addColorStop(0.75, "#ff4a10");
          g2.addColorStop(1, "rgba(120,10,0,0.25)");
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(baseX, baseY, dw / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Embers
        (pickup.embers || []).forEach(function (e) {
          const u = 1 - e.age / e.life;
          if (u <= 0) return;
          ctx.globalAlpha = Math.max(0, u * alpha);
          const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
          eg.addColorStop(0, "rgba(255,240,160,1)");
          eg.addColorStop(0.5, "rgba(255,120,30,0.8)");
          eg.addColorStop(1, "rgba(200,40,0,0)");
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (collecting ? 1.4 : 1), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      // Jade finale flash (after power ends)
      if (window.__airborneJadeFinaleFlash) {
        var ff = window.__airborneJadeFinaleFlash;
        ff.age += 0.016;
        var ft = Math.max(0, 1 - ff.age / ff.life);
        if (ft <= 0) {
          window.__airborneJadeFinaleFlash = null;
        } else if (typeof player !== "undefined" && player) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          var fr = Math.max(player.w, player.h) * (0.8 + (1 - ft) * 2.2);
          var fg = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, fr);
          fg.addColorStop(0, "rgba(255,255,230," + (ft * 0.95) + ")");
          fg.addColorStop(0.3, "rgba(180,255,160," + (ft * 0.55) + ")");
          fg.addColorStop(0.65, "rgba(52,211,153," + (ft * 0.25) + ")");
          fg.addColorStop(1, "rgba(16,120,80,0)");
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(player.x, player.y, fr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if (window.__airborneFirePowerActive && typeof player !== "undefined" && player) {
        ctx.save();
        var act = Math.min(1, (window.__airborneFireActivateT || 0) / 0.45);
        var pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.012);
        // Heat shimmer / dense core aura around blimp
        var coreR = Math.max(player.w, player.h) * (0.55 + 0.25 * act) * pulse;
        var cg = ctx.createRadialGradient(player.x, player.y, coreR * 0.15, player.x, player.y, coreR);
        if (window.__airborneFirePowerTint === "green") {
          cg.addColorStop(0, "rgba(236,253,245," + (0.75 * act) + ")");
          cg.addColorStop(0.35, "rgba(52,211,153," + (0.45 * act) + ")");
          cg.addColorStop(0.7, "rgba(5,150,105," + (0.18 * act) + ")");
          cg.addColorStop(1, "rgba(4,80,50,0)");
        } else {
          cg.addColorStop(0, "rgba(255,245,180," + (0.75 * act) + ")");
          cg.addColorStop(0.35, "rgba(255,140,30," + (0.45 * act) + ")");
          cg.addColorStop(0.7, "rgba(255,50,0," + (0.18 * act) + ")");
          cg.addColorStop(1, "rgba(180,20,0,0)");
        }
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(player.x, player.y, coreR, 0, Math.PI * 2);
        ctx.fill();
        // subtle outer heat ring shimmer
        ctx.globalAlpha = 0.25 * act;
        ctx.strokeStyle = window.__airborneFirePowerTint === "green"
          ? "rgba(110,231,183,0.85)"
          : "rgba(255,200,80,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, coreR * (0.92 + 0.04 * Math.sin(performance.now() * 0.02)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Jade ambient motes spiraling inward
        if (window.__airborneFirePowerTint === "green" && window.__airborneJadeMotes) {
          ctx.globalCompositeOperation = "lighter";
          for (var mi = 0; mi < window.__airborneJadeMotes.length; mi++) {
            var mote = window.__airborneJadeMotes[mi];
            var mu = 1 - mote.age / mote.life;
            var mx = player.x + Math.cos(mote.ang) * mote.dist;
            var my = player.y + Math.sin(mote.ang) * mote.dist * 0.75;
            ctx.globalAlpha = mu * 0.85;
            var mg = ctx.createRadialGradient(mx, my, 0, mx, my, mote.r * 2);
            mg.addColorStop(0, "rgba(236,253,245,1)");
            mg.addColorStop(0.5, "rgba(52,211,153,0.7)");
            mg.addColorStop(1, "rgba(4,100,60,0)");
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.arc(mx, my, mote.r * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        // Draw orbiters: behind first (z < 0), then front (z >= 0)
        var orbs = window.__airborneFireOrbiters || [];
        function drawOrb(orb, front) {
          if (!orb || orb.x == null) return;
          var isFront = (orb.z || 0) >= 0;
          if (front !== isFront) return;
          var sc = front ? 1.15 : 0.75;
          var alpha = front ? 1 : 0.55;
          // trail
          if (orb.trail && orb.trail.length) {
            for (var ti = 0; ti < orb.trail.length; ti++) {
              var tp = orb.trail[ti];
              var tu = 1 - tp.age / tp.life;
              if (tu <= 0) continue;
              ctx.globalAlpha = tu * 0.55 * alpha * act;
              var tg = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, orb.size * 0.9 * sc);
              if (window.__airborneFirePowerTint === "green") {
                tg.addColorStop(0, "rgba(167,243,208,0.9)");
                tg.addColorStop(0.5, "rgba(16,185,129,0.5)");
                tg.addColorStop(1, "rgba(4,80,50,0)");
              } else {
                tg.addColorStop(0, "rgba(255,220,100,0.9)");
                tg.addColorStop(0.5, "rgba(255,100,20,0.5)");
                tg.addColorStop(1, "rgba(255,40,0,0)");
              }
              ctx.fillStyle = tg;
              ctx.beginPath();
              ctx.arc(tp.x, tp.y, orb.size * 0.7 * sc * tu, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // fireball body
          ctx.globalAlpha = alpha * act;
          var sz = orb.size * sc * (0.9 + 0.15 * Math.sin(performance.now() * 0.02 + orb.phase));
          var fg = ctx.createRadialGradient(orb.x - sz * 0.25, orb.y - sz * 0.3, 1, orb.x, orb.y, sz);
          if (window.__airborneFirePowerTint === "green") {
            fg.addColorStop(0, "rgba(236,253,245,1)");
            fg.addColorStop(0.3, "rgba(110,231,183,0.95)");
            fg.addColorStop(0.65, "rgba(16,185,129,0.85)");
            fg.addColorStop(1, "rgba(4,80,50,0)");
          } else {
            fg.addColorStop(0, "rgba(255,250,220,1)");
            fg.addColorStop(0.3, "rgba(255,200,60,0.95)");
            fg.addColorStop(0.65, "rgba(255,90,15,0.85)");
            fg.addColorStop(1, "rgba(180,20,0,0)");
          }
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, sz, 0, Math.PI * 2);
          ctx.fill();
          // bright core
          ctx.globalAlpha = alpha * act * 0.9;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.beginPath();
          ctx.arc(orb.x - sz * 0.15, orb.y - sz * 0.15, sz * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
        for (var oi = 0; oi < orbs.length; oi++) drawOrb(orbs[oi], false);
        for (var oi = 0; oi < orbs.length; oi++) drawOrb(orbs[oi], true);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }
      (window.__airborneFireAura || []).forEach(function (p) {
        const u = 1 - p.age / p.life;
        if (u <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, u);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        if (p.tint === "green" || window.__airborneFirePowerTint === "green") {
          gr.addColorStop(0, "rgba(236,253,245,0.95)");
          gr.addColorStop(0.5, "rgba(52,211,153,0.55)");
          gr.addColorStop(1, "rgba(4,80,50,0)");
        } else {
          gr.addColorStop(0, "rgba(255,230,120,0.9)");
          gr.addColorStop(0.5, "rgba(255,100,20,0.5)");
          gr.addColorStop(1, "rgba(200,30,0,0)");
        }
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      (window.__airborneFireTrail || []).forEach(function (p) {
        const u = 1 - p.age / p.life;
        if (u <= 0) return;
        ctx.save();
        if (p.smoke) {
          ctx.globalAlpha = u * 0.4;
          ctx.fillStyle = "rgba(40,35,30,1)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = u * 0.9;
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          if (p.tint === "blue") {
            gr.addColorStop(0, "rgba(230,250,255,1)");
            gr.addColorStop(0.4, "rgba(56,189,248,0.9)");
            gr.addColorStop(1, "rgba(2,80,180,0)");
          } else if (p.tint === "green") {
            gr.addColorStop(0, "rgba(230,255,240,1)");
            gr.addColorStop(0.4, "rgba(52,211,153,0.9)");
            gr.addColorStop(1, "rgba(4,100,60,0)");
          } else {
            gr.addColorStop(0, "rgba(255,240,160,1)");
            gr.addColorStop(0.4, "rgba(255,120,30,0.9)");
            gr.addColorStop(1, "rgba(180,30,0,0)");
          }
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    };
  })();

  function updateFirePower(dt) {
    try { if (window.__airborneUpdateFirePower) window.__airborneUpdateFirePower(dt); } catch (e) {}
  }
  function drawFirePower() {
    try { if (window.__airborneDrawFirePower) window.__airborneDrawFirePower(); } catch (e) {}
  }


  function updateObstacles_camGate(dt){ if(window.__airborneBossCamPause) return; return updateObstacles(dt); }
  function updateObstacles(dt) {
    try { updateFirePower(dt); } catch (e) {}
    try { updateHitCoins(dt); } catch (e) {}
    if (!bossActive && !bonusActive && !bonusPending && !(typeof isLevelEndActive === "function" && isLevelEndActive())) {
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnObstacle();
      }
    }

    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    obstacles.forEach(o => {
      if (o.shockFall) {
        // handled in bosses.js sonic fall update — skip normal scroll
      } else if (o.onFire || o.powerAffected) {
        o.vy = (typeof o.vy === "number" ? o.vy : 60) + 480 * dt;
        if (o.vy > 560) o.vy = 560;
        o.y += o.vy * dt;
        o.x -= Math.max(40, obstacleSpeed * 0.3) * dt;
        // Cartoon tumble while falling from power-up hit
        o.rot = (o.rot || 0) + dt * (o.spinDir || 5.5);
        if (o.spinDir == null) o.spinDir = (Math.random() < 0.5 ? -1 : 1) * (4.5 + Math.random() * 3);
        try {
          if (o.onFire && typeof window.__airborneEmitFireTrail === "function") {
            window.__airborneEmitFireTrail(o.x + o.w * 0.5, o.y + o.h * 0.3, o.blueFire ? "blue" : (o.greenFire ? "green" : "orange"));
          }
        } catch (e) {}
      } else {
        var birdSpdMul = 1;
        if (window.__airborneAirfield && window.__airborneAirfieldObstacles) {
          birdSpdMul = (window.__airborneRuffStage === "obstacles") ? 0.90 : 1.18; // -10% on first bird lesson
        }
        o.x -= obstacleSpeed * birdSpdMul * (o.speedMult || 1) * dt;
        if (o.bounceCool > 0) o.bounceCool = Math.max(0, o.bounceCool - dt);
        if (o.hitKnockT > 0) {
          o.hitKnockT -= dt;
          o.x += (o.knockVx || 0) * dt;
          o.y += (o.knockVy || 0) * dt;
          o.knockVx = (o.knockVx || 0) * (1 - 2.2 * dt);
          o.knockVy = (o.knockVy || 0) * (1 - 2.6 * dt);
          o.rot = 0;
          o.knockSpin = 0;
          if (o.hitKnockT <= 0) { o.knockVx = 0; o.knockVy = 0; }
        }
        if (o.squashT > 0) o.squashT = Math.max(0, o.squashT - dt);
        if (o.isDrone || o.type === "drone_scout") {
          if (!(o.droneBaseY > 0)) o.droneBaseY = (typeof o.y === "number" && o.y === o.y) ? o.y : 200;
          o.droneZig = (o.droneZig || 0) + (o.droneZigSpd || 2) * dt;
          var zig = Math.sin(o.droneZig) * (o.droneZigAmp || 32);
          var zig2 = Math.sin(o.droneZig * 0.5) * (o.droneZigAmp || 32) * 0.35;
          o.y = o.droneBaseY + zig + zig2;
          if (!(o.y === o.y)) o.y = o.droneBaseY;
          o.bobPhase = 0;
          o.bobAmount = 0;
          o.animT = (o.animT || 0) + dt;
          if (o.animT > 0.07) {
            o.animT = 0;
            o.animFrame = ((o.animFrame || 0) + 1) % 81;
          }
          // Trail samples for drone motion effect
          o.droneTrail = o.droneTrail || [];
          o.droneTrail.push({ x: o.x + o.w * 0.5, y: o.y + o.h * 0.5 });
          if (o.droneTrail.length > 8) o.droneTrail.shift();
          // Ensure size
          if (!o.w || o.w < 20) {
            o.w = Math.min(78, (typeof W !== "undefined" ? W : 400) * 0.16);
            o.h = o.w;
          }
        }
      }

      // Animation tick
      if (!o.shockFall) {
        o.animT = (o.animT || 0) + dt;
        var fd = frameDuration;
        if (o.isRing || o.type === "gold_ring") fd = 0.06;
        if (o.isDrone || o.type === "drone_scout") fd = 0.07;
        if (o.animT >= fd) {
          o.animT = 0;
          var maxF = 36;
          if (o.isRing || o.type === "gold_ring") maxF = 25;
          else if (o.birdFrameCount) maxF = o.birdFrameCount;
          else if (o.birdSpecies && o.birdSpecies.frames) maxF = o.birdSpecies.frames;
          o.animFrame = ((o.animFrame || 0) + 1) % maxF;
        }
      }
      // Ring bob + pass detection
      if (o.isRing || o.type === "gold_ring") {
        o.bobPhase = (o.bobPhase || 0) + dt * 2.2;
        o.spinT = (o.spinT || 0) + dt;
        o.pulseT = (o.pulseT || 0) + dt;
        if (o.passGlowT > 0) o.passGlowT = Math.max(0, o.passGlowT - dt);
        // Immersive FX timers
        o.sparkT = (o.sparkT || 0) + dt;
        if (o.sparkT > 0.12) {
          o.sparkT = 0;
          o.sparks = o.sparks || [];
          if (o.sparks.length < 12) {
            var sa = Math.random() * Math.PI * 2;
            o.sparks.push({
              a: sa,
              r: 0.55 + Math.random() * 0.35,
              life: 0.4 + Math.random() * 0.35,
              age: 0,
              spd: 0.4 + Math.random() * 0.6
            });
          }
        }
        if (o.sparks) {
          for (var si = o.sparks.length - 1; si >= 0; si--) {
            o.sparks[si].age += dt;
            o.sparks[si].r += o.sparks[si].spd * dt * 0.25;
            if (o.sparks[si].age >= o.sparks[si].life) o.sparks.splice(si, 1);
          }
        }

        if (typeof player !== "undefined" && player) {
          var rcx = o.x + o.w / 2;
          var rcy = o.y + o.h / 2 + Math.sin(o.bobPhase || 0) * (o.bobAmount || 8) + (o.dipY || 0);
          var pr = (o.r || o.w / 2) * 0.85;
          // Arcade ring tunnel — center-based, generous hole, soft rim
          var g = getRingGeom(o);
          o._dbg = {
            rcx: rcx, rcy: rcy,
            outerW: g.rimW, outerH: g.rimH,
            holeW: g.holeW, holeH: g.holeH,
            depth: g.depth, dw: g.dw, dh: g.dh
          };
          // Use blimp CENTER for gate tests (AABB was too tall → false rim hits)
          var px = player.x; // player drawn centered at x,y
          var py = player.y;
          var dx = px - rcx;
          var dy = py - rcy;
          var absDy = Math.abs(dy);
          var depth = g.depth;
          var approach = Math.abs(dx);

          // Funnel assist: when near and roughly aligned, gently guide into hole
          if (approach < depth * 4.5 && approach > depth * 0.15 && absDy < g.rimH * 1.05) {
            var align = 1 - Math.min(1, absDy / (g.rimH + 1));
            var strength = 0.55 * align * align;
            // stronger pull only when already inside the hole band
            if (absDy < g.holeH * 1.15) {
              player.y += (rcy - py) * Math.min(0.22, strength * 2.4 * dt);
              if (player.vy) player.vy *= (1 - Math.min(0.35, 2.2 * dt * align));
            } else if (absDy < g.rimH) {
              // mild nudge away from deep metal toward hole
              var toward = (dy > 0 ? -1 : 1);
              player.vy += toward * 40 * dt;
            }
          }

          o.rimCool = o.rimCool || 0;
          if (o.rimCool > 0) o.rimCool -= dt;

          // Active contact slab (thin hoop)
          if (approach < depth + 8) {
            var inHole = absDy <= g.holeH;
            var inRimBand = absDy > g.holeH && absDy <= g.rimH;

            if (inHole) {
              // Silky tunnel: damp vertical, light center lock
              player.y += (rcy - py) * Math.min(0.28, 3.0 * dt);
              if (player.vy) player.vy *= (1 - Math.min(0.65, 4.5 * dt));
              // One-time satisfying pass when crossing center plane
              if (!o.passed && dx <= 0 && (o._wasAhead !== false)) {
                // was on the right side of ring, now at/ past center
              }
              if (!o.passed) {
                o.passed = true;
                o.passGlowT = 0.95;
                o.passPulse = 1;
                o.passWhoosh = 1;
                // Center quality 1 = dead center
                var quality = 1 - Math.min(1, absDy / Math.max(8, g.holeH));
                o.passQuality = quality;
                var streakInfo = null;
                try {
                  if (typeof window.__airborneOnRingCollect === "function") {
                    streakInfo = window.__airborneOnRingCollect(quality);
                  }
                } catch (eR) {}
                if (streakInfo && streakInfo.colors) o.streakColors = streakInfo.colors;
                else if (window.__airborneRingStreakColor) {
                  o.streakColors = window.__airborneRingStreakColor((window.__airborneRingHud && window.__airborneRingHud.streak) || 1);
                }
                o.streakMult = (streakInfo && streakInfo.mult) || (window.__airborneRingMult || 1);
                try {
                  if (typeof sfxTrainingRing === "function") sfxTrainingRing();
                  else if (typeof sfxRing === "function") sfxRing();
                } catch (eS) {}
                try {
                  if (window.__airborneRuffOnEvent) window.__airborneRuffOnEvent("ring");
                } catch (e2) {}
              }
            } else if (inRimBand && o.rimCool <= 0) {
              // Soft trampoline off metal — only if clearly outside hole
              var impact = Math.max(30, Math.abs(player.vy || 0));
              var bounce = Math.min(160, Math.max(55, impact * 0.5 + 45));
              if (dy < 0) {
                player.vy = -bounce;
                // ease out of rim without teleport
                player.y += Math.min(0, (rcy - g.holeH - 2) - py) * Math.min(0.35, 5 * dt);
              } else {
                player.vy = bounce;
                player.y += Math.max(0, (rcy + g.holeH + 2) - py) * Math.min(0.35, 5 * dt);
              }
              o.rimHitT = 0.22;
              o.rimCool = 0.22;
              o.dipTarget = Math.min(14, 6 + impact * 0.02);
            }
          }

          // Track side of ring for whoosh (optional)
          o._wasAhead = dx > 0;

          // Ring visual dip
          o.dipY = o.dipY || 0;
          o.dipTarget = (o.dipTarget != null) ? o.dipTarget : 0;
          var dipSpd = 70;
          if (o.dipTarget > 0) {
            if (o.dipY < o.dipTarget) {
              o.dipY = Math.min(o.dipTarget, o.dipY + dipSpd * dt);
              if (o.dipY >= o.dipTarget - 0.5) o.dipTarget = 0;
            }
          } else if (o.dipY > 0) {
            o.dipY = Math.max(0, o.dipY - dipSpd * dt);
          }

          if (o.rimHitT > 0) o.rimHitT = Math.max(0, o.rimHitT - dt);
          if (o.passPulse > 0) o.passPulse = Math.max(0, o.passPulse - dt * 1.4);
          if (o.passWhoosh > 0) o.passWhoosh = Math.max(0, o.passWhoosh - dt * 2.2);
        }
      } else {
        o.bobPhase = (o.bobPhase || 0) + dt * 3;
      }
      if (o.hitFlash) o.hitFlash = Math.max(0, o.hitFlash - dt * 3);
    });


    // === Cartoon impact collision (readable bounce + funny effects) ===
    try {
      var obsList = obstacles;
      try {
        if (typeof window.__airborneGetObstacles === "function") {
          var gl = window.__airborneGetObstacles();
          if (gl && gl.length) obsList = gl;
        }
      } catch (eG) {}
      if (typeof player !== "undefined" && player && obsList && obsList.length &&
          !(typeof bossActive !== "undefined" && bossActive)) {
        var phase = window.__airborneAirfieldPhase || "";
        var block = (phase === "taxi" || phase === "accel" || phase === "climb" ||
                     phase === "land" || phase === "skid" || phase === "score" || phase === "done");
        if (!block) {
          var nowHit = performance.now();
          var px = player.x;
          var py = player.y;
          var shieldOn = !!(typeof shieldActive !== "undefined" && shieldActive) || !!window.__airborneShieldActive;
          var shieldR = (player.w || 84) * 0.72 * 1.28;
          var pHalfW = (player.w || 84) * 0.38;
          var pHalfH = (player.h || 50) * 0.38;

          for (var ci = 0; ci < obsList.length; ci++) {
            var co = obsList[ci];
            if (!co || co.scored) continue;
            if (co.isRing || co.type === "gold_ring" || co.type === "ring") continue;
            if (co.shockFall || co.onFire || co.powerAffected) continue;
            if (co.bounceCool && co.bounceCool > 0) continue;

            var bob = Math.sin(co.bobPhase || 0) * (co.bobAmount || 0);
            var ox = (co.x || 0) + (co.w || 40) * 0.5;
            var oy = (co.y || 0) + (co.h || 40) * 0.5 + bob;
            var oHalfW = (co.w || 40) * 0.34;
            var oHalfH = (co.h || 40) * 0.34;

            var dx = px - ox;
            var dy = py - oy;
            var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

            var hit = false;
            var useShield = false;
            if (shieldOn) {
              var need = shieldR + Math.max(oHalfW, oHalfH) * 0.9;
              if (dist < need) { hit = true; useShield = true; }
            } else {
              if (Math.abs(dx) < (pHalfW + oHalfW) && Math.abs(dy) < (pHalfH + oHalfH)) hit = true;
            }
            if (!hit) continue;

            var nx = dx / dist;
            var ny = dy / dist;
            // Prefer a clear up/down bounce if nearly horizontal
            if (Math.abs(ny) < 0.25) ny = (py < oy) ? -0.75 : 0.75;
            var nlen = Math.sqrt(nx * nx + ny * ny) || 1;
            nx /= nlen; ny /= nlen;

            // === Strong visual separation (stops glitchy overlap) ===
            var sep = useShield ? 18 : 14;
            player.x += nx * sep * 0.7;
            player.y += ny * sep;
            co.x -= nx * sep * 1.2;
            co.y -= ny * sep * 1.1;

            // === Blimp: cartoon bounce (believable spring) ===
            var pvy = player.vy || 0;
            var bounceVy = ny * -(useShield ? 520 : 280) - Math.abs(pvy) * (useShield ? 0.35 : 0.15);
            player.vy = bounceVy;
            if (useShield) {
              player.vx = (player.vx || 0) + nx * 120;
              try { if (typeof player.x === "number") player.x += nx * 8; } catch (eX) {}
            }
            if (player.vy > 360) player.vy = 360;
            if (player.vy < -420) player.vy = -420;
            // Tiny horizontal wobble
            player.x += (Math.random() - 0.5) * 4;

            // Squash/stretch personality on hit
            try {
              if (typeof blimpPersonality !== "undefined" && blimpPersonality) {
                blimpPersonality.squashX = 1.28;
                blimpPersonality.squashY = 0.72;
                blimpPersonality.squashTargetX = 1;
                blimpPersonality.squashTargetY = 1;
                blimpPersonality.finLag = (nx > 0 ? 1 : -1) * 0.35;
              }
            } catch (ePers) {}

            // === Bird: clear path deflection (no flip) ===
            co.hitKnockT = useShield ? 0.55 : 0.42;
            co.knockVx = -(useShield ? 220 : 55) - Math.abs(nx) * (useShield ? 140 : 40);
            co.knockVy = -ny * (useShield ? 380 : 160) + (Math.random() - 0.5) * (useShield ? 80 : 30);
            co.knockSpin = 0;
            if (useShield) co.hitKnockT = Math.max(co.hitKnockT || 0, 0.55);
            co.rot = 0;
            co.hitFlash = 0;
            co.squashT = 0;
            co.bounceCool = useShield ? 0.55 : 0.35;

            // === Funny impact FX: stars + feathers + puff ===
            try {
              var ix = (px + ox) * 0.5, iy = (py + oy) * 0.5;
              if (typeof particles !== "undefined" && particles) {
                var cols = useShield
                  ? ["#c8f0ff", "#ffffff", "#a0e0ff", "#ffe8b0"]
                  : ["#fff6d0", "#ffd24a", "#ffffff", "#c9a06a", "#ff9040"];
                // Burst ring (more on shield)
                var burstN = useShield ? 22 : 14;
                for (var pi = 0; pi < burstN; pi++) {
                  var ang = (pi / 14) * Math.PI * 2 + Math.random() * 0.2;
                  var spd = 90 + Math.random() * 160;
                  particles.push({
                    x: ix, y: iy,
                    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 40,
                    life: 0.4 + Math.random() * 0.35,
                    color: cols[pi % cols.length],
                    size: 2 + Math.random() * 3.5
                  });
                }
                // Cartoon stars
                for (var si = 0; si < (useShield ? 10 : 5); si++) {
                  var sa = Math.random() * Math.PI * 2;
                  particles.push({
                    x: ix, y: iy,
                    vx: Math.cos(sa) * (60 + Math.random() * 100),
                    vy: Math.sin(sa) * (60 + Math.random() * 100) - 50,
                    life: 0.5 + Math.random() * 0.3,
                    color: "#ffe566",
                    size: 3 + Math.random() * 3,
                    star: true
                  });
                }
              }
              // Impact stamp for one-frame punch
              window.__airborneImpactPop = {
                x: ix, y: iy, t: 0, life: 0.35, shield: useShield
              };
            } catch (eP) {}
            try { if (typeof triggerScreenShake === "function") triggerScreenShake(useShield ? 9 : 7, useShield ? 220 : 160); } catch (eS) {}
            try { if (typeof sfxHit === "function" && !useShield) sfxHit(); } catch (eH0) {}
            try { if (typeof sfxDeflect === "function" && useShield) sfxDeflect(); } catch (eD0) {}

            if (useShield) {
              co.scored = true;
              try { if (typeof shieldImpactTime !== "undefined") shieldImpactTime = nowHit; } catch (e) {}
              continue;
            }
            if (nowHit < (typeof invulnerableUntil === "number" ? invulnerableUntil : 0)) {
              // still bounced visually; skip damage if invuln
              co.scored = true;
              break;
            }

            try { if (typeof takeHit === "function") takeHit(); } catch (eH) { console.warn(eH); }
            co.scored = true;
            break;
          }
        }
      }
    } catch (eCol) { console.warn("collision impact", eCol); }

    // Cartoon impact pop (rings + "BONK" feel)
    try {
      if (window.__airborneImpactPop && typeof ctx !== "undefined" && ctx) {
        var ip = window.__airborneImpactPop;
        // advanced in draw path; mark for drawObstacles/main
      }
    } catch (eIP) {}

    // Score obstacles the player successfully passes (not only power-up kills)
    try {
      if (obstacles && obstacles.length && typeof player !== "undefined" && player) {
        for (var pi = 0; pi < obstacles.length; pi++) {
          var ob = obstacles[pi];
          if (!ob || ob.isRing || ob.type === "gold_ring") continue;
          if (ob.scored || ob.fromHitBurst) continue;
          // Passed when fully left of blimp nose
          if (ob.x + (ob.w || 40) < player.x - 6) {
            ob.scored = true;
            try {
              if (typeof score === "number") score += 10;
              if (typeof gameplayScore === "number") gameplayScore += 10;
              if (typeof scoreVal !== "undefined" && scoreVal) scoreVal.textContent = String(score);
            } catch (eSc) {}
            try {
              if (typeof ruffStats !== "undefined" && ruffStats) {
                ruffStats.obstaclesAvoided = (ruffStats.obstaclesAvoided || 0) + 1;
              }
            } catch (eRs) {}
            try {
              if (typeof dodgeStreak === "number") {
                dodgeStreak += 1;
                if (dodgeStreak > 1 && dodgeStreak % 5 === 0) {
                  score += 5;
                  if (scoreVal) scoreVal.textContent = String(score);
                }
              }
            } catch (eDs) {}
          }
        }
      }
    } catch (ePass) {}

    // In-place prune (never reassign obstacles — keeps shared references valid)
    for (var fi = obstacles.length - 1; fi >= 0; fi--) {
      var o = obstacles[fi];
      if (!o) { obstacles.splice(fi, 1); continue; }
      var drop = false;
      if (o.fromHitBurst) {
        drop = !(o.burstLife > 0 && o.x > -120 && o.x < (W || 400) + 120 && o.y > -120 && o.y < (H || 700) + 120);
      } else if (o.shockFall || o.electrified) {
        drop = !(o.y < (H || 700) + 100 && o.x > -80 && o.x < (W || 400) + 80);
      } else if ((o.isRing || o.type === "gold_ring") && o.x < -120) {
        if (!o.passed && !o._missed) {
          o._missed = true;
          try { if (window.__airborneOnRingMiss) window.__airborneOnRingMiss(); } catch (eM) {}
        }
        drop = true;
      } else {
        var Ww = (typeof W === "number") ? W : 400;
        var Hh = (typeof H === "number") ? H : 700;
        drop = !(o.x > -150 && o.x < Ww + 400 && o.y > -150 && o.y < Hh + 150);
      }
      if (drop) obstacles.splice(fi, 1);
    }
    window.__airborneObstacles = obstacles;
  }


  
  // Single source of truth for checkered-ring geometry (draw + collision)
  function getRingGeom(o) {
    var rad = (o.r || o.w / 2 || 40) * (o.expandScale || 1);
    var pulse = 1 + 0.025 * Math.sin((o.pulseT || 0) * 2.8);
    if (o.passPulse > 0) pulse += 0.06 * (o.passPulse || 0);
    var dw = rad * 0.575 * pulse;
    var dh = rad * 3.1875 * pulse;
    var halfH = dh * 0.5;
    var halfW = dw * 0.5;
    // Hole = open black center (generous for blimp). Rim = outer metal band only.
    // ~52% of visual half-height keeps a clear metal rim while staying flyable
    var holeH = halfH * 0.52;
    var holeW = Math.max(halfW * 0.85, 14);
    var rimH = halfH * 0.96;
    var rimW = halfW * 0.98;
    var depth = Math.max(12, halfW * 0.9); // contact near the thin hoop
    return {
      rad: rad, dw: dw, dh: dh,
      halfH: halfH, halfW: halfW,
      holeH: holeH, holeW: holeW,
      rimH: rimH, rimW: rimW,
      depth: depth
    };
  }

// Checkered flight ring asset
  window.__ringCheckeredImg = null;
  window.__ringCheckeredLoading = false;
  function ensureRingCheckered() {
    if (window.__ringCheckeredImg && window.__ringCheckeredImg.complete && window.__ringCheckeredImg.naturalWidth > 0) {
      return window.__ringCheckeredImg;
    }
    if (window.__ringCheckeredLoading) return window.__ringCheckeredImg;
    window.__ringCheckeredLoading = true;
    var paths = ["ring_checkered.png?v=ruff434", "ring_checkered.png"];
    var i = 0;
    function next() {
      if (i >= paths.length) { window.__ringCheckeredLoading = false; return; }
      var im = new Image();
      im.onload = function () {
        if (im.naturalWidth > 0) {
          window.__ringCheckeredImg = im;
          try { if (typeof images !== "undefined" && images) images.ring_checkered = im; } catch (e) {}
          window.__ringCheckeredLoading = false;
        } else next();
      };
      im.onerror = function () { next(); };
      im.src = paths[i++];
    }
    next();
    return null;
  }
  try { setTimeout(ensureRingCheckered, 200); } catch (e) {}

  function drawCheckeredRing(o, cx, cy, layer) {
    var img = ensureRingCheckered() || window.__ringCheckeredImg;
    var g = getRingGeom(o);
    var rad = g.rad;
    var dw = g.dw;
    var dh = g.dh;
    if (o.rimHitT > 0) {
      var p2 = 1 + 0.04 * Math.sin(o.rimHitT * 40);
      dw *= p2; dh *= p2;
    }
    var dx = cx - dw / 2;
    var dy = cy - dh / 2;
    var wobble = Math.sin((o.spinT || 0) * 1.5) * 0.04;

    // Ambient rivet sparks along rim
    if (o.sparks && o.sparks.length) {
      ctx.save();
      for (var si = 0; si < o.sparks.length; si++) {
        var sp = o.sparks[si];
        var t = 1 - sp.age / sp.life;
        if (t <= 0) continue;
        var sx = cx + Math.cos(sp.a + (o.spinT || 0) * 0.4) * (dw * 0.42 * sp.r);
        var sy = cy + Math.sin(sp.a + (o.spinT || 0) * 0.4) * (dh * 0.42 * sp.r);
        ctx.globalAlpha = t * 0.85;
        ctx.fillStyle = o.passed ? "#ff6a4a" : "#ffd4a0";
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2 + 2 * t, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Soft outer aura (always)
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.1 * Math.sin((o.pulseT || 0) * 2.5);
    var aura = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.35);
    aura.addColorStop(0, "rgba(255,200,160,0.15)");
    aura.addColorStop(0.6, "rgba(200,60,40,0.12)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(cx, cy, dw * 0.75, dh * 0.58, wobble, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Streak-colored pass celebration
    if (o.passed && o.passGlowT > 0) {
      var gLife = Math.min(1, o.passGlowT / 0.85);
      var sc = o.streakColors || { core: "#ffe8d0", mid: "#ff9040", outer: "#cc4010" };
      var mult = o.streakMult || 1;
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.5 * gLife;
      ctx.shadowColor = sc.mid;
      ctx.shadowBlur = (18 + mult * 6) * gLife;
      var grd = ctx.createRadialGradient(cx, cy, rad * 0.08, cx, cy, rad * (1.2 + mult * 0.08));
      grd.addColorStop(0, sc.core);
      grd.addColorStop(0.45, sc.mid);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, cy, dw * (0.65 + mult * 0.04), dh * (0.5 + mult * 0.03), 0, 0, Math.PI * 2);
      ctx.fill();
      // Extra shock rings at high streak
      var ringsN = Math.min(4, 1 + Math.floor(mult));
      for (var ri = 0; ri < ringsN; ri++) {
        var t = (o.passPulse || 0) - ri * 0.12;
        if (t <= 0) continue;
        ctx.globalAlpha = 0.55 * t * gLife;
        ctx.strokeStyle = sc.core;
        ctx.lineWidth = 2 + mult * 0.4;
        ctx.beginPath();
        var grow = 0.4 + (1 - t) * (0.55 + ri * 0.12);
        ctx.ellipse(cx, cy, dw * grow, dh * grow * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Spark bursts at high mult
      if (mult >= 3 && o.passWhoosh > 0) {
        ctx.globalAlpha = o.passWhoosh * 0.9;
        for (var si = 0; si < 6 + mult * 2; si++) {
          var ang = (si / 12) * Math.PI * 2 + (1 - o.passWhoosh) * 2;
          var rr = rad * (0.6 + (1 - o.passWhoosh) * 1.2);
          ctx.fillStyle = sc.core;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 1.2, 2 + mult * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Rim hit: subtle only (no red glow unless passed through hole)
    if (o.rimHitT > 0 && o.passed) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.4, o.rimHitT * 1.5);
      ctx.strokeStyle = "#ff6644";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, dw * 0.48, dh * 0.46, wobble, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wobble);
    ctx.globalAlpha = 1;
    if (img && img.complete && img.naturalWidth > 0) {
      if (o.passed && o.passGlowT > 0) {
        ctx.shadowColor = "rgba(255,50,40,0.9)";
        ctx.shadowBlur = 16;
      }
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.strokeStyle = o.passed ? "#e74c3c" : "#c0392b";
      ctx.lineWidth = Math.max(5, rad * 0.16);
      ctx.beginPath();
      ctx.ellipse(0, 0, dw * 0.35, dh * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#0c0c0c";
      ctx.beginPath();
      ctx.ellipse(0, 0, dw * 0.18, dh * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Black disc + number (+25% size)
    var num = o.ringNum || 1;
    var active = !!o.passed;
    var nSize = Math.max(9, Math.min(14, rad * 0.194)); // +25% vs prior
    var discR = Math.max(nSize * 0.85, rad * 0.22);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = active ? "rgba(255,180,120,0.5)" : "rgba(80,80,80,0.6)";
    ctx.stroke();
    ctx.font = "900 " + nSize + "px Rockwell, Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.fillStyle = active ? "#ffe8e0" : "#f5f0e6";
    if (active) {
      ctx.shadowColor = "rgba(255,80,40,0.85)";
      ctx.shadowBlur = 6;
    }
    ctx.strokeText(String(num), cx, cy);
    ctx.fillText(String(num), cx, cy);
    ctx.restore();

    // Debug collision boundaries (toggle: window.__airborneRingDebug = false to hide)
    if (window.__airborneRingDebug === true) { // off unless explicitly enabled
      var d = o._dbg;
      var pr = (o.r || o.w / 2 || 40) * 0.85;
      var g2 = (typeof getRingGeom === "function") ? getRingGeom(o) : null;
      var outerW = d ? d.outerW : (g2 ? g2.rimW : 30);
      var outerH = d ? d.outerH : (g2 ? g2.rimH : 60);
      var holeW = d ? d.holeW : (g2 ? g2.holeW : 24);
      var holeH = 49.5; // +10% from 45 // HOLE ±45 fixed
      var midY = cy;
      var topOuter = cy - outerH;
      var botOuter = cy + outerH;
      var topHole = cy - holeH;
      var botHole = cy + holeH;
      var left = cx - Math.max(outerW, holeW) - 20;
      var right = cx + Math.max(outerW, holeW) + 20;
      var span = right - left;

      ctx.save();
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.95;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // OUTER top (rim) — red
      ctx.strokeStyle = "#ff2244";
      ctx.fillStyle = "#ff2244";
      ctx.beginPath();
      ctx.moveTo(left, topOuter);
      ctx.lineTo(right, topOuter);
      ctx.stroke();
      ctx.fillText("TOP RIM " + Math.round(topOuter - midY), right + 4, topOuter);

      // HOLE top (inside boundary) — lime
      ctx.strokeStyle = "#44ff88";
      ctx.fillStyle = "#44ff88";
      ctx.beginPath();
      ctx.moveTo(left, topHole);
      ctx.lineTo(right, topHole);
      ctx.stroke();
      ctx.fillText("HOLE TOP " + Math.round(topHole - midY), right + 4, topHole);

      // CENTER zero — cyan
      ctx.strokeStyle = "#33ccff";
      ctx.fillStyle = "#33ccff";
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(left, midY);
      ctx.lineTo(right, midY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText("CENTER 0", right + 4, midY);

      // HOLE bottom — lime
      ctx.strokeStyle = "#44ff88";
      ctx.fillStyle = "#44ff88";
      ctx.beginPath();
      ctx.moveTo(left, botHole);
      ctx.lineTo(right, botHole);
      ctx.stroke();
      ctx.fillText("HOLE BOT +" + Math.round(botHole - midY), right + 4, botHole);

      // OUTER bottom (rim) — red
      ctx.strokeStyle = "#ff2244";
      ctx.fillStyle = "#ff2244";
      ctx.beginPath();
      ctx.moveTo(left, botOuter);
      ctx.lineTo(right, botOuter);
      ctx.stroke();
      ctx.fillText("BOT RIM +" + Math.round(botOuter - midY), right + 4, botOuter);

      // Vertical center line
      ctx.strokeStyle = "#33ccff";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, topOuter - 8);
      ctx.lineTo(cx, botOuter + 8);
      ctx.stroke();
      ctx.setLineDash([]);

      // Hole zone fill (green tint)
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#44ff88";
      ctx.fillRect(cx - holeW, topHole, holeW * 2, holeH * 2);

      // Rim zones fill (red tint) top + bottom
      ctx.fillStyle = "#ff2244";
      ctx.fillRect(cx - outerW, topOuter, outerW * 2, topHole - topOuter);
      ctx.fillRect(cx - outerW, botHole, outerW * 2, botOuter - botHole);

      // Vertical X depth lines (why collision fires before reaching the ring)
      var depth = (d && d.depth != null) ? d.depth : 15;
      var frontX = cx - depth;   // FRONT X = -15 from center
      var backX = cx + depth;
      var holeLeft = cx - holeW;
      var holeRight = cx + holeW;

      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2;

      // FRONT collision plane (magenta) — blimp hits this X first
      ctx.strokeStyle = "#ff44ff";
      ctx.fillStyle = "#ff44ff";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(frontX, topOuter - 12);
      ctx.lineTo(frontX, botOuter + 12);
      ctx.stroke();
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("FRONT X", frontX, topOuter - 18);
      ctx.fillText(String(Math.round(frontX - cx)), frontX, botOuter + 22);

      // BACK plane
      ctx.strokeStyle = "#cc66ff";
      ctx.beginPath();
      ctx.moveTo(backX, topOuter - 12);
      ctx.lineTo(backX, botOuter + 12);
      ctx.stroke();

      // Hole X bounds (green vertical)
      ctx.strokeStyle = "#44ff88";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(holeLeft, topHole);
      ctx.lineTo(holeLeft, botHole);
      ctx.moveTo(holeRight, topHole);
      ctx.lineTo(holeRight, botHole);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tint depth zone in front of ring center
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ff44ff";
      ctx.fillRect(frontX, topOuter, depth * 2, botOuter - topOuter);

      // Legend
      ctx.globalAlpha = 0.9;
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText("GREEN=pass  RED=bounce  CYAN=center  MAGENTA=front X depth", left, botOuter + 16);

      ctx.restore();
    }
    return true;
  }

  function drawObstacles() {
    try { drawFirePower(); } catch (e) {}
    try { drawHitCoins(); } catch (e) {}
    if (typeof obstacles === "undefined" || !obstacles) return;
    obstacles.forEach(function (o) {
      if (!o) return;
      if (o.isRing || o.type === "gold_ring") {
        // Full ring drawn in front of blimp (drawRingFronts)
        var cx = o.x + o.w / 2;
        var cy = o.y + o.h / 2 + Math.sin(o.bobPhase || 0) * (o.bobAmount || 8) + (o.dipY || 0);
        var baseR = (o.r || o.w / 2) * 1.0;
        var rad = baseR * (o.expandScale || 1);
        o._ringFront = { cx: cx, cy: cy, rad: rad, passed: !!o.passed, checkered: true };
        return;
      }
      var bobA = (typeof o.bobAmount === "number") ? o.bobAmount : 0;
      var bobP = (typeof o.bobPhase === "number") ? o.bobPhase : 0;
      var drawY = (typeof o.y === "number" ? o.y : 0) + Math.sin(bobP) * bobA;
      if (!(drawY === drawY)) drawY = o.y || 0;
      if (o.type === "drone_scout" || o.isDrone) {
        try { drawDroneScout(o, drawY); } catch (eDr) {}
        return;
      }
      // Classic bird_a / bird_b frame draw (no species sheets)
      if (o.type === "bird_a" || o.type === "bird_b") {
        var framesB = OBSTACLE_ANIM_SETS[o.type];
        var imgB = null;
        if (framesB && framesB.length && typeof images !== "undefined" && images) {
          imgB = images[framesB[(o.animFrame || 0) % framesB.length]];
        }
        if (!imgB || !imgB.naturalWidth) {
          // Fallback solid silhouette so birds are NEVER invisible
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle = o.type === "bird_b" ? "#c45c2a" : "#3a6ea5";
          ctx.beginPath();
          ctx.ellipse(o.x + o.w * 0.5, drawY + o.h * 0.5, o.w * 0.42, o.h * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#2a2a2a";
          ctx.beginPath();
          ctx.ellipse(o.x + o.w * 0.72, drawY + o.h * 0.42, o.w * 0.18, o.h * 0.12, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        try {
          if (o.onFire || o.powerAffected || o.rot) {
            var cxb = o.x + o.w * 0.5, cyb = drawY + o.h * 0.5;
            ctx.translate(cxb, cyb);
            ctx.rotate(o.rot || 0);
            ctx.drawImage(imgB, -o.w * 0.5, -o.h * 0.5, o.w, o.h);
          } else {
            ctx.drawImage(imgB, o.x, drawY, o.w, o.h);
          }
        } catch (eD) {}
        ctx.restore();
        return;
      }
      var frames = OBSTACLE_ANIM_SETS[o.type];
      if (!frames) return;
      var img = (typeof images !== "undefined" && images) ? images[frames[(o.animFrame || 0) % frames.length]] : null;
      if (!img || !img.naturalWidth) return;
      var speed = obstacleSpeed * (o.speedMult || 1);
      try {
        if (typeof drawMotionBlur === "function") {
          drawMotionBlur(img, o.x + o.w / 2, drawY + o.h / 2, o.w, o.h, 0, speed, 0);
        } else {
          ctx.drawImage(img, o.x, drawY, o.w, o.h);
        }
      } catch (eD) {
        try { ctx.drawImage(img, o.x, drawY, o.w, o.h); } catch (e2) {}
      }
    });
  }
  window.drawObstacles = drawObstacles;


  // ---------- Floating heal pickup — sporadic, restores 25% (1 heart) ----------
  let healPickup = null;
  let healSpawnTimer = 6 + Math.random() * 5; // first one arrives a little sooner

  
  
  // Glowing chevron path guiding blimp through rings (JS-drawn)
  function drawRingFronts() {
    try {
      if (typeof obstacles === "undefined" || !obstacles || !obstacles.length) return;
      obstacles.forEach(function (o) {
        if (!o || !(o.isRing || o.type === "gold_ring")) return;
        if (!o._ringFront) return;
        var rf = o._ringFront;
        if (rf.checkered) {
          drawCheckeredRing(o, rf.cx, rf.cy, "full");
        } else if (rf.gear && typeof drawGearRingFrame === "function") {
          drawGearRingFrame(o, rf.cx, rf.cy, "front");
        } else {
          var rad2 = rf.rad || 40;
          var rx2 = rad2 * 0.32, ry2 = rad2 * 1.12;
          ctx.save();
          ctx.translate(rf.cx, rf.cy);
          ctx.strokeStyle = rf.passed ? "#3dde8a" : "#e8c060";
          ctx.lineWidth = Math.max(5, rad2 * 0.14);
          ctx.beginPath();
          ctx.scale(rx2 / ry2, 1);
          ctx.arc(0, 0, ry2, -Math.PI * 0.5, Math.PI * 0.5, false);
          ctx.stroke();
          ctx.restore();
        }
      });
    } catch (e) {}
  }
  window.__airborneDrawRingFronts = drawRingFronts;



function spawnHealPickup() {
    if (window.__airborneAirfield) return; // no hearts during training
    const img = images.heartPickup;
    let aspect = imgAspect(img);
    const dispW = Math.min(50, W * 0.12);
    const dispH = dispW * aspect;

    const groundY = groundLevelY();
    const tallestRoofY = groundY - H * 0.5;
    const minY = H * 0.08;
    const maxY = Math.max(minY + 40, tallestRoofY - dispH - 20);

    healPickup = {
      x: W + dispW,
      y: minY + Math.random() * (maxY - minY),
      w: dispW,
      h: dispH,
      bobPhase: Math.random() * Math.PI * 2,
      speed: 150
    };
  }

  function updateHealPickup(dt) {
    if (!healPickup) {
      healSpawnTimer -= dt;
      if (healSpawnTimer <= 0) {
        spawnHealPickup();
        healSpawnTimer = 11 + Math.random() * 9; // next sporadic appearance
      }
      return;
    }

    healPickup.x -= healPickup.speed * dt;
    healPickup.bobPhase += dt * 2.2;

    if (healPickup.x < -healPickup.w - 20) {
      healPickup = null;
      return;
    }

    const drawY = healPickup.y + Math.sin(healPickup.bobPhase) * 8;
    const dx = Math.abs(player.x - (healPickup.x + healPickup.w / 2));
    const dy = Math.abs(player.y - (drawY + healPickup.h / 2));
    if (dx < player.w * 0.5 + healPickup.w * 0.45 && dy < player.h * 0.5 + healPickup.h * 0.45) {
      sfxHeart();
      if (health < MAX_HEALTH) {
        health = Math.min(MAX_HEALTH, health + 1);
        if (typeof pulseHealthMeter === "function") pulseHealthMeter();
        updateHealthDisplay();
        if (typeof pulseHealthMeter === "function") pulseHealthMeter();
        else if (healthMeter) {
          healthMeter.classList.remove("hit");
          void healthMeter.offsetWidth;
          healthMeter.classList.add("hit");
        }
      } else if (health < MAX_HEALTH + MAX_BONUS_HEARTS) {
        health++;
        updateHealthDisplay();
        if (typeof pulseHealthMeter === "function") pulseHealthMeter();
        else if (healthMeter) {
          healthMeter.classList.remove("hit");
          void healthMeter.offsetWidth;
          healthMeter.classList.add("hit");
        }
      }
      healPickup = null;
    }
  }

  function drawHealPickup() {
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    if (!healPickup) return;
    const img = images.heartPickup;
    if (!img.naturalWidth) return;
    const drawY = healPickup.y + Math.sin(healPickup.bobPhase) * 8;
    const t = performance.now() / 1000;

    ctx.save();
    ctx.translate(healPickup.x + healPickup.w / 2, drawY + healPickup.h / 2);
    const pulse = 1 + Math.sin(performance.now() / 160) * 0.06;
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, healPickup.w * 0.15, 0, 0, healPickup.w * 0.9);
    glow.addColorStop(0, "rgba(255,120,120,0.5)");
    glow.addColorStop(1, "rgba(255,120,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, healPickup.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
    drawMotionBlur(img, 0, 0, healPickup.w, healPickup.h, 0, 150, 0);
    ctx.drawImage(img, -healPickup.w / 2, -healPickup.h / 2, healPickup.w, healPickup.h);

    // orbiting sparkle motes for a little extra magic while it floats
    const orbitR = healPickup.w * 0.62;
    for (let i = 0; i < 5; i++) {
      const a = t * 1.6 + (i / 5) * Math.PI * 2;
      const sx = Math.cos(a) * orbitR;
      const sy = Math.sin(a) * orbitR * 0.6; // slightly flattened orbit for a nicer perspective feel
      const twinkle = Math.max(0, 0.55 + Math.sin(t * 6 + i * 1.9) * 0.45);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a);
      ctx.fillStyle = `rgba(255,235,240,${twinkle})`;
      ctx.beginPath();
      // simple 4-point sparkle/diamond shape
      const s = 3.2 + twinkle * 2.2;
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.35, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.35, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- Shield pickup — rare mid-flight invincibility, boss fights excluded ----------
  let shieldPickup = null;
  let shieldSpawnTimer = 25 + Math.random() * 15;
  let shieldActive = false;
  window.__airborneShieldActive = false;
  let shieldImpactTime = -9999; // performance.now() timestamp of the last shield block, drives the impact flash
  let shieldUntil = 0;
  const SHIELD_DURATION_MS = 6000;

  function spawnShieldPickup() {
    if (window.__airborneAirfield && !window.__airborneAirfieldAllowShield) return;
    const img = images.shieldPickup;
    const aspect = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    const dispW = Math.min(42, W * 0.0975); // 25% smaller
    const dispH = dispW * aspect;

    const groundY = groundLevelY();
    const tallestRoofY = groundY - H * 0.5;
    const minY = H * 0.08;
    const maxY = Math.max(minY + 40, tallestRoofY - dispH - 20);

    shieldPickup = {
      x: W + dispW,
      y: minY + Math.random() * (maxY - minY),
      w: dispW,
      h: dispH,
      bobPhase: Math.random() * Math.PI * 2,
      speed: 160
    };
  }

  function updateShieldPickup(dt) {
    if (shieldActive && performance.now() > shieldUntil) {
      shieldActive = false;
      window.__airborneShieldActive = false;
    }

    if ((bossActive || bonusActive) && !window.__airborneAirfield) return;

    // Training: shield pickup ONLY during shield + combined lessons
    if (window.__airborneAirfield || window.__airborneTrainingFlight) {
      const st = window.__airborneRuffStage || "";
      const allow = (st === "shield" || st === "combined");
      window.__airborneAirfieldAllowShield = allow;
      if (!allow) {
        shieldPickup = null;
        return;
      }
    }
    if (!shieldPickup) {
      // No random world spawns during training except allowed stages (handled above)
      if (window.__airborneAirfield || window.__airborneTrainingFlight) {
        return;
      }
      shieldSpawnTimer -= dt;
      if (shieldSpawnTimer <= 0) {
        spawnShieldPickup();
        shieldSpawnTimer = 55 + Math.random() * 35;
      }
      return;
    }

    // Animate 6x6 sheet
    shieldPickup.frameT = (shieldPickup.frameT || 0) + dt;
    const sfd = 1 / 14;
    while (shieldPickup.frameT >= sfd) {
      shieldPickup.frameT -= sfd;
      shieldPickup.frame = ((shieldPickup.frame || 0) + 1) % 36;
    }
    // Blue spark embers
    if (!shieldPickup.embers) shieldPickup.embers = [];
    if (!shieldPickup.collectAnim && Math.random() < 0.55) {
      const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.4;
      shieldPickup.embers.push({
        x: shieldPickup.x + shieldPickup.w / 2 + (Math.random() - 0.5) * 14,
        y: shieldPickup.y + shieldPickup.h / 2 + 4,
        vx: Math.cos(ang) * (15 + Math.random() * 35),
        vy: Math.sin(ang) * (25 + Math.random() * 40) - 15,
        life: 0.3 + Math.random() * 0.3,
        age: 0,
        r: 1.5 + Math.random() * 2.2
      });
    }
    for (let ei = shieldPickup.embers.length - 1; ei >= 0; ei--) {
      const e = shieldPickup.embers[ei];
      e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 35 * dt;
      if (e.age >= e.life) shieldPickup.embers.splice(ei, 1);
    }
    if (shieldPickup.embers.length > 24) shieldPickup.embers.splice(0, shieldPickup.embers.length - 24);

    // Collect expand animation
    if (shieldPickup.collectAnim != null && shieldPickup.collectAnim >= 0) {
      shieldPickup.collectAnim += dt / 0.85;
      if (Math.random() < 0.8 && shieldPickup.collectAnim < 0.7) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 50 + Math.random() * 120;
        shieldPickup.embers.push({
          x: shieldPickup.collectX, y: shieldPickup.collectY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 20,
          life: 0.35 + Math.random() * 0.35, age: 0, r: 2 + Math.random() * 3.5
        });
      }
      if (shieldPickup.collectAnim >= 1) {
        shieldPickup = null;
      }
      return;
    }

    // Always scroll — never freeze mid-air
    const shSpd = Math.max(120, shieldPickup.speed || 150);
    shieldPickup.speed = shSpd;
    shieldPickup.x -= shSpd * dt;
    shieldPickup.bobPhase = (shieldPickup.bobPhase || 0) + dt * 2.4;

    if (shieldPickup.x < -shieldPickup.w - 20) {
      shieldPickup = null;
      return;
    }

    const drawY = shieldPickup.y + Math.sin(shieldPickup.bobPhase) * 8;
    const dx = Math.abs(player.x - (shieldPickup.x + shieldPickup.w / 2));
    const dy = Math.abs(player.y - (drawY + shieldPickup.h / 2));
    if (dx < player.w * 0.5 + shieldPickup.w * 0.45 && dy < player.h * 0.5 + shieldPickup.h * 0.45) {
      shieldActive = true; window.__airborneShieldActive = true;
      shieldUntil = performance.now() + SHIELD_DURATION_MS;
      shieldPickup.collectAnim = 0.001;
      shieldPickup.collectX = shieldPickup.x + shieldPickup.w / 2;
      shieldPickup.collectY = drawY + shieldPickup.h / 2;
      try { sfxPowerup(); } catch (e) {}
    }
  }

  function drawShieldPickup() {
    if (typeof levelEndPhase === "string" && levelEndPhase === "fadeOut") return;
    if (!shieldPickup) return;
    const sp = shieldPickup;
    const bob = Math.sin(sp.bobPhase || 0) * 10;
    const sway = Math.sin((sp.bobPhase || 0) * 0.65) * 5;
    const collecting = (sp.collectAnim != null && sp.collectAnim > 0);
    const ca = Math.min(1, sp.collectAnim || 0);
    let cx = sp.x + (sp.w || 48) / 2 + (collecting ? 0 : sway);
    let cy = sp.y + (sp.h || 48) / 2 + (collecting ? 0 : bob);
    if (collecting && sp.collectX != null) { cx = sp.collectX; cy = sp.collectY; }
    let scale = 1 + Math.sin((sp.bobPhase || 0) * 2.2) * 0.1;
    let alpha = 1;
    if (collecting) {
      const bounce = Math.sin(ca * Math.PI) * 0.15;
      scale = 1 + ca * ca * 8 + bounce;
      alpha = ca < 0.55 ? 1 : Math.max(0, 1 - (ca - 0.55) / 0.45);
    }
    const base = Math.max(sp.w || 48, sp.h || 48) * 0.94; // 25% smaller overall
    const halfTarget = Math.min(W, H) * 0.9;
    const dw = collecting ? Math.min(halfTarget * (0.12 + ca * 0.88), halfTarget) : base * scale;
    const dh = dw;
    ctx.save();
    ctx.globalAlpha = alpha;
    const glowR = dw * 0.95;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
    g.addColorStop(0, "rgba(180,240,255," + (0.85 * alpha) + ")");
    g.addColorStop(0.3, "rgba(80,190,255," + (0.55 * alpha) + ")");
    g.addColorStop(0.65, "rgba(40,140,255," + (0.3 * alpha) + ")");
    g.addColorStop(1, "rgba(20,80,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
    // Outer blue halo ring
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = "rgba(120,210,255,0.85)";
    ctx.lineWidth = Math.max(2, dw * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, dw * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    // Prefer animated sheet; fallback to static
    const sheet = (typeof images !== "undefined" && images)
      ? (images.shield_sheet || images.shieldPickup || null) : null;
    if (sheet && sheet.naturalWidth && images.shield_sheet && sheet === images.shield_sheet) {
      const cols = 6, rows = 6;
      const fw = sheet.naturalWidth / cols;
      const fh = sheet.naturalHeight / rows;
      const fr = (sp.frame || 0) % 36;
      const col = fr % cols;
      const row = Math.floor(fr / cols) % rows;
      ctx.drawImage(sheet, col * fw, row * fh, fw, fh, cx - dw / 2, cy - dh / 2, dw, dh);
    } else if (sheet && sheet.naturalWidth) {
      ctx.drawImage(sheet, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      // procedural fallback so it is never invisible
      ctx.fillStyle = "rgba(100,200,255,0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, dw * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(200,240,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, dw * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    (sp.embers || []).forEach(function (e) {
      const u = 1 - e.age / e.life;
      if (u <= 0) return;
      ctx.globalAlpha = Math.max(0, u * alpha);
      const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
      eg.addColorStop(0, "rgba(220,250,255,1)");
      eg.addColorStop(0.5, "rgba(80,180,255,0.8)");
      eg.addColorStop(1, "rgba(30,80,200,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawShieldEffect() {
    if (!shieldActive) return;
    const t = performance.now() / 1000;
    const FADE_WINDOW_MS = 600;
    const msLeft = shieldUntil - performance.now();
    const fadeOutAlpha = Math.max(0, Math.min(1, msLeft / FADE_WINDOW_MS));
    if (fadeOutAlpha <= 0.02) return;
    const pulse = 1 + Math.sin(t * 3.2) * 0.05;
    const radius = player.w * 0.72 * 1.22 * pulse; // larger bubble — matches expanded collision
    const sinceImpact = performance.now() - shieldImpactTime;
    const impactActive = sinceImpact < 450;
    const impactT = impactActive ? sinceImpact / 450 : 1; // 0 (just hit) -> 1 (faded out)

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = fadeOutAlpha;

    // soft outer glow halo
    const glow = ctx.createRadialGradient(0, 0, radius * 0.55, 0, 0, radius * 1.2);
    glow.addColorStop(0, "rgba(140,215,255,0)");
    glow.addColorStop(0.75, "rgba(140,215,255,0.16)");
    glow.addColorStop(1, "rgba(140,215,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // faceted forcefield bubble — radial gradient instead of a flat tint
    const bubble = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
    bubble.addColorStop(0, "rgba(170,230,255,0.04)");
    bubble.addColorStop(0.78, "rgba(120,200,255,0.12)");
    bubble.addColorStop(1, "rgba(120,200,255,0.26)");
    ctx.fillStyle = bubble;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // slowly rotating hex-facet lines, for a sci-fi/steampunk forcefield look
    ctx.save();
    ctx.rotate(t * 0.5);
    ctx.strokeStyle = "rgba(205,240,255,0.32)";
    ctx.lineWidth = 1;
    const facetCount = 8;
    for (let i = 0; i < facetCount; i++) {
      const a = (i / facetCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32);
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // crisp double-ring outline
    ctx.strokeStyle = "rgba(185,235,255,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.93, 0, Math.PI * 2);
    ctx.stroke();

    // small orbiting sparkle motes drifting around the bubble
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + (i / 4) * Math.PI * 2;
      const sx = Math.cos(a) * radius * 0.97;
      const sy = Math.sin(a) * radius * 0.97;
      const sparkAlpha = Math.max(0, 0.5 + Math.sin(t * 5 + i * 1.7) * 0.35);
      ctx.fillStyle = `rgba(255,255,255,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // impact flash — a bright ring that expands outward and fades when something bounces off the shield
    if (impactActive) {
      const flashAlpha = 1 - impactT;
      ctx.fillStyle = `rgba(220,245,255,${flashAlpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      const ringR = radius * (0.75 + impactT * 0.6);
      ctx.strokeStyle = `rgba(255,255,255,${flashAlpha * 0.9})`;
      ctx.lineWidth = 3 * (1 - impactT) + 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }


  // R.U.F.F. ring tally
  function notifyRingCollect() {
    window.__airborneRingCollects = (window.__airborneRingCollects || 0) + 1;
    try {
      if (typeof sfxRingCollect === "function") sfxRingCollect();
      else if (typeof sfxStreak === "function") sfxStreak();
    } catch (e) {}
    if (typeof window.__airborneRuffReact === "function") window.__airborneRuffReact("ring");
  }


// Match menu power previews with a short in-game aura around the player
window.__airborneDrawActivePowerVisual = function () {
  try {
    if (typeof ctx === "undefined" || typeof player === "undefined" || !player) return;
    const kind = window.__airborneActivePowerVisual;
    const until = window.__airborneActivePowerUntil || 0;
    const now = performance.now();
    if (!kind || now > until) return;
    const fade = Math.max(0, Math.min(1, (until - now) / 5500));
    const t = now * 0.001;
    if (window.PowerFX) {
      window.PowerFX.drawAura(ctx, kind, player.x, player.y, t, fade);
    }
  } catch (e) {}
};


window.__airborneDrawImpactPop = function (ctx, dt) {
  var ip = window.__airborneImpactPop;
  if (!ip || !ctx) return;
  ip.t = (ip.t || 0) + (typeof dt === "number" ? dt : 0.016);
  if (ip.t >= (ip.life || 0.35)) { window.__airborneImpactPop = null; return; }
  var u = ip.t / (ip.life || 0.35);
  var a = 1 - u;
  var r = 12 + u * 42;
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.strokeStyle = ip.shield ? "rgba(180,230,255,0.9)" : "rgba(255,210,100,0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ip.x, ip.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = ip.shield ? "rgba(255,255,255,0.5)" : "rgba(255,240,180,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ip.x, ip.y, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  // little star bursts
  ctx.fillStyle = "#ffe566";
  for (var i = 0; i < 4; i++) {
    var ang = u * 6 + i * Math.PI * 0.5;
    var sx = ip.x + Math.cos(ang) * r * 0.85;
    var sy = ip.y + Math.sin(ang) * r * 0.85;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5 * (1 - u * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
