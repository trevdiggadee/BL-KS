"use strict";

  // ---------- Buildings — now continuous panoramic street-row strips (one
  // per level, cycling through until more level-specific art is provided),
  // scrolling in sync with the rest of the ground plane. Replaces the old
  // discrete per-building-sprite system. ----------
  const BUILDING_ROW_KEYS = ['streetrow1', 'streetrow2'];

  // Height profiles — measured directly from each image's alpha channel (60
  // samples across the width, each giving the fraction of the way down from
  // the top where solid content actually starts). Used so collision follows
  // the real building silhouette instead of a flat rectangle across the
  // whole strip — otherwise the player takes damage over open sky above a
  // short building just because it's within the same tile as a tall one.
  const STREETROW1_PROFILE = [0.302, 0.302, 0.302, 0.302, 0.24, 0.252, 0.406, 0.348, 0.348, 0.346, 0.365, 0.61, 0.61, 0.61, 0.431, 0.177, 0.15, 0.177, 0.177, 0.177, 0.542, 0.35, 0.35, 0.342, 0.342, 0.35, 0.431, 0.431, 0.431, 0.45, 0.142, 0.012, 0.104, 0.535, 0.448, 0.392, 0.404, 0.419, 0.621, 0.621, 0.625, 0.662, 0.683, 0.302, 0.233, 0.206, 0.202, 0.208, 0.223, 0.198, 0.219, 0.229, 0.433, 0.446, 0.456, 0.46, 0.492, 0.488, 0.452, 0.44];
  // Regenerated for the new level2_buildings_strip.png artwork (62 stitched
  // industrial buildings) — the old profile was measured against the
  // previous streetrow2.webp art and no longer matches this silhouette.
  // Sample columns that land in a transparent gap between buildings read as
  // 1.0 (solid starts at the very bottom), so open sky above a gap never
  // falsely triggers a hit.
  const STREETROW2_PROFILE = [0.802, 0.365, 0.497, 0.234, 0.581, 0.575, 0.593, 0.659, 0.323, 0.503, 0.018, 0.281, 0.551, 0.317, 0.695, 0.653, 0.425, 0.683, 0.491, 0.377, 0.581, 0.683, 0.647, 0.503, 1.0, 0.629, 0.467, 0.581, 1.0, 0.216, 0.647, 0.611, 0.713, 0.311, 0.581, 0.611, 0.653, 0.455, 0.623, 0.707, 0.701, 0.677, 0.587, 1.0, 0.683, 0.509, 0.557, 0.407, 0.772, 0.192, 0.689, 0.551, 0.587, 0.719, 0.665, 0.629, 0.341, 0.599, 0.281, 0.587];
  const BUILDING_ROW_PROFILES = { streetrow1: STREETROW1_PROFILE, streetrow2: STREETROW2_PROFILE };

  function buildingProfileTopFrac(b, sampleX) {
    const profile = BUILDING_ROW_PROFILES[buildingRowKey];
    if (!profile) return 0;
    const localFrac = Math.max(0, Math.min(0.9999, (sampleX - b.x) / b.w));
    const idx = Math.floor(localFrac * profile.length);
    return profile[idx];
  }
  let buildings = []; // tiles of the current strip: { x, w, h }
  let buildingRowKey = null;
  // When true, ground layers (buildings, street, lamps, powerlines) scroll off
  // and do NOT respawn — used for the level-1 landing sequence.
  let worldWindDown = false;
  let worldWindDownSpeedMult = 1.6;

  // True only after the blimp has landed — approach still scrolls the world
  function worldScrollFrozen() {
    if (window.__airborneWorldFrozen) return true;
    if (typeof levelEndPad !== "undefined" && levelEndPad && levelEndPad.docked) return true;
    if (typeof levelEndPhase === "string" &&
        (levelEndPhase === "victory" || levelEndPhase === "stats" || levelEndPhase === "fadeOut")) {
      return true;
    }
    return false;
  }

  function currentBuildingRowKey() {
    // Keep level-1 buildings through boss-1 defeat, bonus round, and landing.
    if (bossesDefeatedCount === 1) {
      const holdL1 =
        (typeof bonusActive !== "undefined" && bonusActive) ||
        (typeof bonusPending !== "undefined" && bonusPending) ||
        (typeof levelEndActive !== "undefined" && levelEndActive) ||
        worldWindDown;
      if (holdL1) return BUILDING_ROW_KEYS[0];
    }
    let key = BUILDING_ROW_KEYS[bossesDefeatedCount % BUILDING_ROW_KEYS.length];
    // Fall back to level-1 strip if level-2 art is missing
    const img = (typeof images !== "undefined") ? images[key] : null;
    if (!img || !img.naturalWidth) key = BUILDING_ROW_KEYS[0];
    return key;
  }

  function makeBuildingRowTile(xStart, key) {
    const img = images[key];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 3.2;
    const h = H * 0.396; // was 0.33, +20%
    const w = h * aspect;
    return { x: xStart, w, h };
  }

  function initBuildings() {
    buildingRowKey = currentBuildingRowKey();
    buildings = [];
    let x = 0;
    while (x < W + 200) {
      const b = makeBuildingRowTile(x, buildingRowKey);
      buildings.push(b);
      x += b.w; // edge-to-edge — pre-blended to tile seamlessly
    }
    initStreetlamps();
    initPowerlines();
    initSketchSkyline();
    initStreetTiles();
  }

  function updateBuildings(dtScale) {
    if (airfieldMode) return;
    // Keep scrolling during approach; freeze only once the blimp has landed
    if (worldScrollFrozen()) {
      return;
    }
    const targetKey = currentBuildingRowKey();
    if (targetKey !== buildingRowKey) {
      // Don't swap strips during bonus / pre-landing; wait for wind-down or resume
      if ((typeof bonusActive !== "undefined" && bonusActive) ||
          (typeof bonusPending !== "undefined" && bonusPending) ||
          (typeof levelEndActive !== "undefined" && levelEndActive)) {
        // keep scrolling current strip
      } else {
        initBuildings(); // level changed — rebuild with that level's strip
        return;
      }
    }
    const speed = 0.8 * dtScale * (obstacleSpeedScale());
    buildings.forEach(b => (b.x -= speed));
    while (buildings.length && buildings[0].x + buildings[0].w < -10) {
      buildings.shift();
    }
    const last = buildings[buildings.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w : 0;
      buildings.push(makeBuildingRowTile(startX, buildingRowKey));
    }
  }

  function groundLayersCleared() {
    // City freezes in place now; ready as soon as freeze/wind-down is active
    return worldWindDown;
  }

  function startWorldWindDown(speedMult) {
    worldWindDown = true;
    worldWindDownSpeedMult = speedMult || 1.8;
  }

  function stopWorldWindDown() {
    worldWindDown = false;
    worldWindDownSpeedMult = 1.6;
  }

  function obstacleSpeedScale() {
    // keep the ground scroll speed in step with the flying-obstacle speed ramp
    // Guard against NaN/0 so retry never leaves the world crawling
    const base = (typeof obstacleSpeed === "number" && isFinite(obstacleSpeed) && obstacleSpeed > 0)
      ? obstacleSpeed
      : 220;
    return base / 220;
  }

  // shared ground line — raised up from the very bottom edge so there's room
  // for a proper street/sidewalk band beneath the buildings instead of just
  // a flat color strip
  function groundLevelY() {
    return H - Math.max(58, H * 0.088);
  }

  // ---------- Pre–Level-1 Airfield training strip ----------
  let airfieldMode = false;
  let airfieldPhase = null; // taxi | accel | climb | lesson | done
  let airfieldTiles = [];
  let airfieldFlags = [];
  let airfieldLights = [];
  let airfieldWindT = 0;
  let airfieldLightT = 0;
  let airfieldTip = "";
  let airfieldTipAge = 0;
  let airfieldPhaseT = 0;
  let airfieldTakeoffSpeed = 0;
  let airfieldLesson = 0;
  let airfieldLessonT = 0;
  let airfieldSub = "tip";
  let airfieldLandT = 0;
  let airfieldScoreT = 0;
  let airfieldDidLand = false;
  let airfieldLandContact = 0;
  let airfieldStartScore = 0;
  let airfieldClimbStartY = 0;
  let airfieldRunwayT = 0;
  let airfieldAltFrac = 0;
  let airfieldStripY = 0;
  let airfieldStripGone = false;
  let airfieldUseLandingArt = false;
  // Previously undeclared (strict mode -> ReferenceError on training start)
  let airfieldSkidT = 0;
  let airfieldDriveDist = 0;
  let airfieldSkidDriveDist = 0;
  let airfieldSkidStartX = 0;
  let airfieldHoldTime = 0;
  let airfieldFireworkT = 0;
  let airfieldFireworks = [];

  function isAirfieldMode() { return !!airfieldMode; }

  window.__airborneForceLandingSkid = function () {
    try {
      if (airfieldPhase === "skid" || airfieldPhase === "score" || airfieldPhase === "done") return;
      if (airfieldPhase !== "land") return;
      airfieldPhase = "skid";
      airfieldSkidT = 0;
      airfieldSkidDriveDist = 0;
      airfieldDidLand = true;
      window.__airborneAirfieldDidLand = true;
      window.__airborneLandTouchAt = performance.now();
      airfieldStripY = 0;
      airfieldSkidT = 0;
      try { ensureTaxiRunwayStrip(); } catch (e) {
        try { ensureAirfieldStripVisible(); } catch (e2) {}
      }
      window.__airborneTaxiUntil = performance.now() + 5000; // score after 5s
      if (typeof player !== "undefined" && player && typeof H !== "undefined") {
        var th = (airfieldTiles[0] && airfieldTiles[0].h) ? airfieldTiles[0].h : 90;
        var landY = H - Math.max(40, th * 0.28) - (player.h ? player.h * 0.22 : 10);
        // Smooth settle — store start Y for lerp (no teleport jump)
        window.__airborneSkidLerpFrom = player.y;
        window.__airborneSkidLerpT = 0;
        player.x = (typeof W !== "undefined" ? W : 400) * 0.25;
        player.vy = 0;
        // Do NOT snap player.y here — skid update lerps to landY
        airfieldSkidStartX = player.x;
      }
      airfieldTip = "Taxiing…";
      window.__airborneSkidLerpT = 1;
      syncAirfieldGlobals();
    } catch (e) {}
  };
  
  // Force flight report only after full landing drive (never cut skid short)
  function forceTrainingReportIfDue() {
    if (window.__airborneTrainingReportShown) return;
    // Never interrupt active land/skid drive
    if (airfieldPhase === "land" || airfieldPhase === "skid") return;
    const t0 = window.__airborneLandTouchAt;
    if (!t0) return;
    // Only after short taxi buffer
    if (performance.now() - t0 < 3640) return; // +30% before report
    window.__airborneTrainingReportShown = true;
    window.__airborneTrainingReportReady = true;
    window.__airborneAirfieldDidLand = true;
    airfieldPhase = "done";
    try { syncAirfieldGlobals(); } catch (e) {}
    try {
      if (typeof window.__airborneShowRuffReport === "function") window.__airborneShowRuffReport();
    } catch (e) {}
    try {
      if (typeof showFlightReport === "function") showFlightReport();
    } catch (e) {}
    try {
      var el = document.getElementById("ruffReport");
      if (el) {
        el.classList.add("visible");
        el.style.display = "flex";
        el.style.visibility = "visible";
        el.style.opacity = "1";
        el.style.zIndex = "90";
      }
    } catch (e) {}
  }

  function syncAirfieldGlobals() {
    window.__airborneAirfield = !!airfieldMode;
    window.__airborneAirfieldPhase = airfieldPhase;
    window.__airborneAirfieldPaused = !!window.__airborneAirfieldPaused;
    // Only freeze parallax during intro — runway drive should scroll the world
    window.__airborneAirfieldPreLift = !!(airfieldMode && window.__airborneRuffStage === "intro");
  }

  window.__airborneAirfieldBoost = function () {
    if (!airfieldMode) return;
    if (airfieldPhase !== "taxi" && airfieldPhase !== "accel") return;
    airfieldTakeoffSpeed = Math.min(215, (airfieldTakeoffSpeed || 28) + 28);
    window.__airborneAirfieldHold = true;
  };

  function initAirfieldStrip() {
    airfieldTiles = [];
    airfieldStripY = 0;
    airfieldStripGone = false;
    airfieldUseLandingArt = false;
    const img = (typeof images !== "undefined" && images) ? images.airfield_strip : null;
    const aspect = (img && img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 5;
    // Size: fit bottom band, then +3%
    let hh = Math.max(50, Math.min(H * 0.38, H * 0.46));
    hh = hh * 1.07; // +~4% larger
    let ww = Math.max(120, hh * aspect);
    // Single image, no loop — start slightly left so runway is under blimp
    const startX = (W || 300) * 0.05 - ww * 0.08;
    const tile = { x: startX, w: ww, h: hh, startX: startX };
    airfieldTiles.push(tile);
    airfieldFlags = [];
    airfieldLights = []; // lights disabled
    seedAirfieldFlagsForTile(tile, false);
    // seedAirfieldLightsForTile(tile, false);
  }

  function ensureAirfieldStripVisible() {
    // Landing field — approaches from right; runway section ends under player
    airfieldUseLandingArt = true;
    airfieldStripGone = false;
    airfieldStripY = H * 0.35; // start slightly low, rise up
    const img = (typeof images !== "undefined" && images)
      ? (images.landing_field || images.airfield_strip)
      : null;
    const aspect = (img && img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 5.3;
    // Fit height so strip is clearly on screen
    let h = Math.max(70, Math.min(H * 0.36, 160));
    let w = h * aspect;
    // Start further right so approach travels ~30% more distance
    const startX = W * 0.55;
    const landTile = { x: startX, w: w, h: h, startX: startX };
    airfieldTiles = [landTile];
    airfieldFlags = [];
    airfieldLights = []; // lights disabled
    seedAirfieldFlagsForTile(landTile, true);
    // seedAirfieldLightsForTile(landTile, true);
  }

  // Post-landing taxi: looping runway strip (airfield_strip) so scroll is obvious
  function ensureTaxiRunwayStrip() {
    // Keep LANDING field art for whole post-touchdown taxi (no takeoff strip swap)
    airfieldUseLandingArt = true;
    airfieldStripGone = false;
    airfieldStripY = 0;
    const img = (typeof images !== "undefined" && images)
      ? (images.landing_field || images.airfield_strip) : null;
    const aspect = (img && img.naturalWidth && img.naturalHeight)
      ? (img.naturalWidth / img.naturalHeight) : 5.3;
    let h = Math.max(70, Math.min(H * 0.36, 160));
    let w = Math.max(W * 0.85, h * aspect);
    airfieldTiles = [];
    for (var i = 0; i < 3; i++) {
      airfieldTiles.push({ x: i * w * 0.98 - w * 0.2, w: w, h: h, startX: 0 });
    }
  }

  function beginAirfieldTraining() {
    try { if (window.resetUnifiedProgress) window.resetUnifiedProgress(); } catch (e) {}
    try {
      window.__airborneFlightTitleShown = false;
      if (typeof window.__airborneShowLessonBanner === "function") {
        window.__airborneShowLessonBanner("Flight Training");
        window.__airborneFlightTitleShown = true;
      }
    } catch (eBan) {}

    try {
      if (window.__airborneClearAllGameplay) window.__airborneClearAllGameplay();
    } catch (e) {}
    try {
      if (window.__airborneHardResetTraining) window.__airborneHardResetTraining({ keepAirfield: true });
    } catch (e) {}
    airfieldMode = true;
    window.__airborneAirfield = true;
    window.__airborneTrainingFlight = true;
    window.__airborneAirfieldPaused = false;
    window.__airborneBossCamPause = false;
    window.__airborneTaxiUntil = 0;
    window.__airborneRuffStage = "intro";
    window.__airborneRuffActive = true;
    window.__airborneRuffLandArmed = false;
    window.__airborneRuffRequestLand = false;
    try { if (typeof state !== "undefined") state = "playing"; } catch (eSt) {}
    try { if (typeof lastTime !== "undefined") lastTime = null; } catch (eLt) {}
    try {
      window.__airborneBossCamPause = false;
      window.__airborneAirfieldPaused = false;
      window.__airborneWorldFrozen = false;
      if (window.__airborneCam) {
        window.__airborneCam.phase = "idle";
        window.__airborneCam.z = 1;
        window.__airborneCam.paused = false;
      }
      var po = document.getElementById("pauseOverlay");
      if (po) { po.classList.add("hidden"); po.setAttribute("aria-hidden", "true"); }
      document.body.classList.remove("pause-open");
      var gsEl = document.getElementById("gameScreen");
      if (gsEl) {
        gsEl.style.display = "block";
        gsEl.style.visibility = "visible";
        gsEl.style.opacity = "1";
      }
    } catch (eUnfreeze) {}
    try {
      var po = document.getElementById("pauseOverlay");
      if (po) { po.classList.add("hidden"); po.setAttribute("aria-hidden", "true"); }
      var gsEl = document.getElementById("gameScreen");
      if (gsEl) { gsEl.style.display = "block"; gsEl.style.visibility = "visible"; gsEl.style.opacity = "1"; }
    } catch (eUi) {}
    try {
      if (window.__airborneClearAllGameplay) window.__airborneClearAllGameplay();
      if (typeof obstacles !== "undefined") obstacles = [];
      if (typeof birdFlocks !== "undefined") birdFlocks = [];
    } catch (eCl) {}
    try { if (window.__airborneResetBackClouds) window.__airborneResetBackClouds(); } catch (e) {};
    airfieldPhase = "taxi";
    airfieldLesson = 0;
    airfieldLessonT = 0;
    airfieldSub = "tip";
    airfieldLandT = 0;
    airfieldScoreT = 0;
    airfieldDidLand = false;
    airfieldSkidT = 0;
    airfieldSkidDriveDist = 0;
    // Full reset so re-entry always starts at the beginning
    airfieldPhaseT = 0;
    airfieldRunwayT = 0;
    airfieldClimbStartY = 0;
    airfieldAltFrac = 0;
    airfieldDriveDist = 0;
    airfieldHoldTime = 0;
    airfieldTakeoffSpeed = 50;
    airfieldStripGone = false;
    airfieldUseLandingArt = false;
    airfieldFlags = [];
    airfieldLights = [];
    window.__airborneAirfield = true;
    window.__airborneTrainingFlight = true;
    window.__airborneAirfieldPhase = "taxi";
    window.__airborneForceTrainRestart = false;
    window.__airborneAirfieldHoldUntil = 0;
    window.__airborneResetRunway = false;
    airfieldStripGone = false;
    airfieldUseLandingArt = false;
    airfieldStripY = 0;
    // Rebuild runway immediately so background is never blank
    try {
      initAirfieldStrip();
      // If image wasn't ready, keep trying next frames
      if (!airfieldTiles || !airfieldTiles.length) {
        window.__airborneResetRunway = true;
      }
    } catch (e) {
      airfieldTiles = [];
      window.__airborneResetRunway = true;
    }
    // Ensure draw path is active
    airfieldMode = true;
    window.__airborneAirfield = true;
    try {
      if (typeof player !== "undefined" && player && typeof W !== "undefined") {
        player.x = W * 0.22;
        player.y = (typeof H !== "undefined" ? H : 600) * 0.72;
        player.vy = 0;
        player.rotation = 0;
        if (player.maxHealth) player.health = player.maxHealth;
      }
    } catch (e) {}
    try {
      var gs = document.getElementById("gameScreen");
      if (gs) gs.style.display = "block";
      var menu = document.getElementById("menuScreen");
      if (menu) menu.style.display = "none";
      var map = document.getElementById("worldMapScreen");
      if (map) { map.style.display = "none"; map.classList.add("hidden"); }
    } catch (e) {}
    window.__airborneRuffLandArmed = false;
    window.__airborneRuffRequestLand = false;
    window.__airborneTrainingBoss = false;
    window.__airborneTrainingBossDone = false;
    window.__airborneTrainingBossTried = false;
    window.__airborneTrainingReportReady = false;
    window.__airborneTrainingReportShown = false;
    // Hard reset training systems so re-entry never resumes mid-lesson
    try {
      window.__airborneFireballs = [];
      window.__airborneHeatseekers = [];
      window.__airborneWarBullets = [];
      window.__airborneActivePowerVisual = null;
      if (typeof stormActive !== "undefined") stormActive = false;
      if (typeof stormCharge !== "undefined") stormCharge = 0;
      if (typeof stormTimer !== "undefined") stormTimer = 0;
      // (refilled after Ruff starts)
      if (typeof bombs !== "undefined") bombs = [];
      if (typeof powerup !== "undefined") powerup = null;
      if (typeof hearts !== "undefined") hearts = [];
      if (typeof bossActive !== "undefined") bossActive = false;
      if (typeof boss !== "undefined") boss = null;
      window.__airborneTrainingBoss = false;
      window.__airborneTrainingBossDone = false;
      window.__airborneTrainingBossTried = false;
      window.__airborneRuffStage = "intro";
      window.__airborneRuffActive = true;
    } catch (e) {}

    try { if (typeof obstacles !== "undefined") obstacles = []; } catch (e) {}
    try { if (typeof score === "number") score = 0; } catch (e) {}
    try {
      if (typeof player !== "undefined" && player) {
        player.health = player.maxHealth || 3;
        player.vy = 0;
      }
    } catch (e) {}
    // Start R.U.F.F. FIRST so he appears before any runway motion
    window.__airborneRuffStage = "intro";
    window.__airborneRuffActive = true;
    window.__airborneAirfield = true;
    window.__airborneTrainingFlight = true;
    window.__airborneAirfieldPhase = "taxi";
    if (typeof window.__airborneBeginRuff === "function") {
      try { window.__airborneBeginRuff(); } catch (e) { console.warn(e); }
      try { if (window.showFlightTraceBanner) window.showFlightTraceBanner(); } catch (e) {}
    }
    // Ensure training BGM starts on the same user-gesture stack as Take Flight
    try {
      if (typeof window.__airbornePlayTrainingMusic === "function") {
        window.__airbornePlayTrainingMusic();
        setTimeout(function () {
          try { window.__airbornePlayTrainingMusic(); } catch (e2) {}
        }, 500);
      }
    } catch (eMus) { console.warn("train bgm kick", eMus); }
    // Re-assert after begin (hardReset soft may have toggled)
    window.__airborneRuffActive = true;
    window.__airborneRuffStage = "intro";
    window.__airborneAirfield = true;
    window.__airborneTrainingFlight = true;
    window.__airborneAirfieldPhase = "taxi";
    window.__airborneAirfieldAllowPowerup = true;
    try {
      if (typeof STORM_MAX === "number" && typeof stormCharge !== "undefined") stormCharge = STORM_MAX;
      else if (typeof stormCharge !== "undefined") stormCharge = 100;
      if (typeof updateStormMeterDisplay === "function") updateStormMeterDisplay(false);
      if (typeof window.placeTrainingPowerIcon === "function") window.placeTrainingPowerIcon();
      else if (typeof placeTrainingPowerIcon === "function") placeTrainingPowerIcon();
    } catch (ePow) {}
    airfieldMode = true;
    airfieldPhase = "taxi";
    if (!airfieldTiles || !airfieldTiles.length) {
      try { initAirfieldStrip(); } catch (e) {}
    }
    airfieldPhaseT = 0;
    airfieldRunwayT = 0;
    airfieldClimbStartY = 0;
    airfieldAltFrac = 0;
    airfieldDriveDist = 0;
    airfieldHoldTime = 0;
    airfieldTakeoffSpeed = 50;
    airfieldStripGone = false;
    airfieldUseLandingArt = false;
    airfieldStripY = 0;
    airfieldLesson = 0;
    airfieldLessonT = 0;
    airfieldSub = "practice";
    airfieldDidLand = false;
    airfieldLandContact = 0;
    airfieldScoreT = 0;
    airfieldLandT = 0;
    airfieldFireworks = [];
    window.__airborneAirfieldHold = false;
    window.__airborneAirfieldBoostPending = false;
    window.__airborneScriptedPose = null;
    window.__airborneAirfieldInvuln = true;
    window.__airborneAirfieldPaused = true; // locked until intro done
    window.__airborneTrainingFlight = true;
    window.__airborneClimbAlmostDone = false;
    window.__airborneAirfieldBlockBoss = true;
    window.__airborneAirfieldAllowPowerup = true;
    window.__airborneAirfieldObstacles = false;
    window.__airborneAirfieldRings = false;
    if (typeof levelEndPad !== "undefined") levelEndPad = null;
    if (typeof levelEndActive !== "undefined") levelEndActive = false;

    airfieldTip = "";
    syncAirfieldGlobals();
    initAirfieldStrip();
    buildings = [];
    if (typeof sketchSkylineTiles !== "undefined") sketchSkylineTiles = [];
    if (typeof powerlineTiles !== "undefined") powerlineTiles = [];
    if (typeof streetTiles !== "undefined") streetTiles = [];
    if (typeof initClouds === "function") initClouds();
    if (typeof applyPlayerBlimpSize === "function") applyPlayerBlimpSize();
    // Pin blimp to runway
    if (typeof player !== "undefined" && player) {
      const gy = (typeof groundLevelY === "function") ? groundLevelY() : (H - 40);
      const ph = player.h > 0 ? player.h : 40;
      player.x = W * 0.22;
      player.y = gy - ph * 0.15;
      player.vy = 0;
      player.rotation = 0;
    }
    if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 0;
    if (typeof spawnInterval !== "undefined") spawnInterval = 999;
    if (typeof obstacles !== "undefined") obstacles = [];
    if (typeof powerup !== "undefined") powerup = null;
    if (typeof bombs !== "undefined") bombs = [];
    if (typeof rockets !== "undefined") rockets = [];
    const sm = document.getElementById("stormMeter");
    if (sm && !window.__airborneAirfield) {
      sm.style.visibility = "hidden";
      sm.style.display = "none";
      sm.classList.add("trainingHidden");
    }
    // Start R.U.F.F. — only mark active if begin succeeds
    window.__airborneRuffStage = "intro";
    function startRuffNow() {
      if (typeof window.__airborneBeginRuff !== "function") {
        console.error("[Airborne] __airborneBeginRuff missing");
        window.__airborneRuffActive = false;
        return;
      }
      try {
        window.__airborneBeginRuff();
        console.log("[Airborne] Ruff started", window.__airborneRuffActive, window.__airborneRuffStage);
      } catch (e) {
        console.warn("[Airborne] R.U.F.F. error", e);
        window.__airborneRuffActive = false;
      }
    }
    window.__airborneRuffIntroT = 0;
    window.__airborneRuffIntroFly = true;
    window.__airborneRuffFollowBlend = 0;
    window.__airborneTrainT = 0;
    window.__airborneRuffStage = "intro";
    // Retry only if the first begin didn't take (re-beginning resets dialogue/timers)
    function retryRuffIfNeeded() {
      var st = window.__airborneRuffStage;
      if (window.__airborneAirfield && (!window.__airborneRuffActive || !st || st === "idle")) startRuffNow();
    }
    if (!window.__airborneRuffActive) startRuffNow();
    setTimeout(retryRuffIfNeeded, 100);
    setTimeout(retryRuffIfNeeded, 400);
    syncAirfieldGlobals();
  }

  function endAirfieldTrainingToMap() {
    airfieldMode = false;
    airfieldPhase = "done";
    airfieldTip = "";
    airfieldTiles = [];
    window.__airborneAirfieldInvuln = false;
    window.__airborneAirfieldHold = false;
    window.__airborneAirfieldPaused = false;
    window.__airborneAirfieldBlockBoss = false;
    window.__airborneTrainingFlight = false;
    window.__airborneRuffRequestLand = false;
    window.__airborneAirfield = false;
    window.__airborneAirfieldPhase = "done";
    syncAirfieldGlobals();
    const sm = document.getElementById("stormMeter");
    if (sm) {
      sm.style.visibility = "";
      sm.style.display = "";
      sm.classList.remove("trainingHidden");
    }
    if (typeof obstacles !== "undefined") obstacles = [];
    if (typeof powerup !== "undefined") powerup = null;
    if (typeof spawnInterval !== "undefined") spawnInterval = 1.7;
    try {
      if (typeof sfxAirfieldEngineStop === "function") sfxAirfieldEngineStop();
      if (typeof sfxAirfieldWindStop === "function") sfxAirfieldWindStop();
    } catch (e) {}
    // Hide any leftover report overlay
    try {
      const rep = document.getElementById("ruffReport");
      if (rep) rep.classList.remove("visible");
      const rad = document.getElementById("ruffRadio");
      if (rad) rad.classList.remove("visible");
    } catch (e) {}
    if (typeof state !== "undefined") state = "start";
    try {
      const gs = document.getElementById("gameScreen");
      if (gs) gs.style.display = "none";
    } catch (e) {}
    if (window.__airborneReturnToHangar) {
      try {
        if (typeof state !== "undefined") state = "menu";
        var map = document.getElementById("worldMapScreen");
        if (map) {
          map.style.display = "none";
          map.style.visibility = "hidden";
          map.classList.add("hidden");
          map.setAttribute("aria-hidden", "true");
        }
        var menu = document.getElementById("menuScreen");
        if (menu) {
          menu.style.display = "flex";
          menu.style.visibility = "visible";
          menu.classList.remove("hidden");
        }
        if (window.__airborneShowHangar) window.__airborneShowHangar();
        else if (window.__airborneShowMenu) window.__airborneShowMenu();
      } catch (e) {}
    } else if (!window.__airborneReturnToHangar && window.__airborneShowWorldMap) {
      window.__airborneShowWorldMap({ mode: "start" });
    } else if (window.__airborneShowMenu) {
      window.__airborneShowMenu();
    }
  }

  // Each lesson: fly/practice first (~20s), THEN pause for explanation tip
  const AIRFIELD_LESSONS = [
    { tip: "Fly through the GOLD RINGS for bonus points!", practice: 20, spawn: 1.6, obstacles: false, rings: true },
    { tip: "Dodge obstacles — fly through the gaps!", practice: 22, spawn: 2.4, obstacles: true, rings: true },
    { tip: "Collect HEARTS to restore health.", practice: 20, spawn: 2.2, obstacles: true, rings: false },
    { tip: "Fill the POWER meter — then use your special!", practice: 22, spawn: 2.1, obstacles: true, rings: false }
  ];

  function updateAirfield(dt) {
    // rebuild strip if missing during taxi/intro (restart safety)
    if (airfieldMode && !airfieldUseLandingArt &&
        (airfieldPhase === "taxi" || airfieldPhase === "accel" || window.__airborneRuffStage === "intro") &&
        (!airfieldTiles || !airfieldTiles.length || airfieldStripGone)) {
      airfieldStripGone = false;
      try { initAirfieldStrip(); } catch (e) {}
    }

    if (!airfieldMode) return;
    try {
    if (!(dt > 0) || !isFinite(dt)) dt = 0.016;

    airfieldPhaseT = (airfieldPhaseT || 0) + dt;
    updateAirfieldFlags(dt);

    // ========== INDEPENDENT TAXI SCROLL (does not rely on phase branch) ==========
    // Started on touchdown via __airborneTaxiUntil. Scrolls runway for ~4s then score.
    try {
      var taxiUntil = window.__airborneTaxiUntil || 0;
      if (taxiUntil > 0) {
        var nowT = performance.now();
        airfieldMode = true;
        window.__airborneAirfield = true;
        window.__airborneAirfieldInvuln = true;
        airfieldStripGone = false;
        airfieldStripY = 0;
        // Keep landing_field tiles (loop for scroll) — never swap to takeoff strip
        if (!airfieldTiles || airfieldTiles.length < 2) {
          try { ensureTaxiRunwayStrip(); } catch (eT) {}
        }
        airfieldUseLandingArt = true;
        if (nowT < taxiUntil) {
          airfieldPhase = "skid";
          airfieldSkidT = (airfieldSkidT || 0) + dt;
          var spd = 260;
          (airfieldTiles || []).forEach(function (tile) {
            if (!tile) return;
            tile.x -= spd * dt;
            var tw = tile.w || (W || 400);
            if (tile.x + tw < -30) {
              var right = -Infinity;
              for (var j = 0; j < airfieldTiles.length; j++) {
                if (airfieldTiles[j]) right = Math.max(right, airfieldTiles[j].x + (airfieldTiles[j].w || tw));
              }
              tile.x = (isFinite(right) ? right : (W || 400)) - 4;
            }
          });
          airfieldTip = "Taxiing…";
          if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 80;
          // Pin blimp
          var thPin = (airfieldTiles[0] && airfieldTiles[0].h) ? airfieldTiles[0].h : 90;
          var landY = (H || 600) - Math.max(36, thPin * 0.22) - ((typeof player !== "undefined" && player && player.h) ? player.h * 0.22 : 10);
          if (typeof player !== "undefined" && player) {
            player.x = (W || 400) * 0.25;
            player.y = landY;
            player.vy = 0;
            player.rotation = -0.04;
          }
          syncAirfieldGlobals();
          // Skip rest of phase machine while taxi is driving
          return;
        } else {
          // Taxi finished → score immediately
          window.__airborneTaxiUntil = 0;
          airfieldTip = "";
          airfieldPhase = "score";
          airfieldScoreT = 0.05;
          window.__airborneTrainingReportReady = true;
          airfieldFireworkT = 0;
          syncAirfieldGlobals();
        }
      }
    } catch (eTaxi) {}
    // ========== END INDEPENDENT TAXI ==========


    // ===== LAND REQUEST (any phase) — must not depend on lesson branch =====
    if (window.__airborneRuffRequestLand) {
      window.__airborneRuffRequestLand = false;
      if (airfieldPhase !== "land" && airfieldPhase !== "skid" &&
          airfieldPhase !== "score" && airfieldPhase !== "done") {
        airfieldMode = true;
        window.__airborneAirfield = true;
        airfieldPhase = "land";
        airfieldPhaseT = 0;
        airfieldLandT = 0;
        airfieldDidLand = false;
        airfieldLandContact = 0;
        airfieldSkidT = 0;
        airfieldSkidDriveDist = 0;
        window.__airborneAirfieldDidLand = false;
        window.__airborneTrainingReportShown = false;
        window.__airborneTrainingReportReady = false;
        window.__airborneAirfieldPaused = false;
        window.__airborneAirfieldInvuln = true;
        airfieldUseLandingArt = true;
        airfieldStripGone = false;
        try { ensureAirfieldStripVisible(); } catch (e) {}
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        try {
          if (typeof obstacles !== "undefined") obstacles = [];
          if (typeof bombs !== "undefined") bombs = [];
        } catch (e2) {}
        airfieldTip = "Tap to flare — land on the strip!";
        syncAirfieldGlobals();
      }
    }
    // updateAirfieldLights(dt); // lights disabled
    syncAirfieldGlobals();
    window.__airborneAirfieldBlockBoss = true;

    // Power icon off unless power-up lesson
    if (false && !window.__airborneAirfieldAllowPowerup) {
      const smHide = document.getElementById("stormMeter");
      if (smHide) {
        smHide.style.display = "none";
        smHide.style.visibility = "hidden";
        smHide.classList.add("trainingHidden");
      }
    }

    if (window.__airborneResetRunway) {
      window.__airborneResetRunway = false;
      airfieldPhase = "taxi";
      airfieldPhaseT = 0;
      airfieldDriveDist = 0;
      airfieldTakeoffSpeed = 50;
    }

    airfieldRunwayT = (airfieldRunwayT || 0) + dt;
    const holding = !!window.__airborneAirfieldHold || performance.now() < (window.__airborneAirfieldHoldUntil || 0);
    if (!(airfieldTakeoffSpeed > 0)) airfieldTakeoffSpeed = 50;

    // Give Ruff time to appear; only unlock if intro hangs too long
    if (window.__airborneRuffStage === "intro" && airfieldRunwayT > 18) {
      window.__airborneRuffStage = "takeoff";
      window.__airborneAirfieldPaused = false;
      console.log("[Airborne] intro timeout → takeoff");
    }
    if ((!window.__airborneRuffStage || window.__airborneRuffStage === "idle") && airfieldRunwayT > 8) {
      window.__airborneRuffStage = "takeoff";
      window.__airborneAirfieldPaused = false;
    }

    // Scroll strip LEFT only (single image, no loop).
    // Sink gradually only toward the END of the image.
    if (airfieldPhase === "taxi" || airfieldPhase === "accel" || airfieldPhase === "climb" ||
        airfieldPhase === "lesson") {
      // Freeze strip only during active intro (not forever if Ruff fails)
      const ruffSt = window.__airborneRuffStage || "intro";
      const introActive = (ruffSt === "intro" || ruffSt === "idle");
      // Safety: never freeze strip more than ~14s from training start
      const introTimedOut = (airfieldRunwayT || 0) > 16;
      const introStill = introActive && !introTimedOut;
      let scrollSpd = 0;
      if (!introStill) {
        if (airfieldPhase === "taxi" || airfieldPhase === "accel") {
          // Only scroll while player is actively holding
          scrollSpd = holding
            ? Math.max(airfieldTakeoffSpeed || 50, 40) : 0;
        } else {
          scrollSpd = Math.max(airfieldTakeoffSpeed || 210, (airfieldPhase === "lesson" ? 210 : 0));
        }
      }
      if (scrollSpd > 0) {
        (airfieldTiles || []).forEach(function(tile) {
          if (!tile) return;
          tile.x -= scrollSpd * dt;
        });
        // Remove only when fully off-screen left — never re-add / loop
        airfieldTiles = (airfieldTiles || []).filter(function(tile) {
          return tile && tile.x + (tile.w || 0) > -20;
        });
        if (!airfieldTiles.length) { airfieldStripGone = true; airfieldFlags = []; airfieldLights = []; }
      }

      // Progress through the one image (0 = start, 1 = fully scrolled past)
      let progress = 0;
      if (airfieldTiles && airfieldTiles.length) {
        const tile = airfieldTiles[0];
        const startX = (typeof tile.startX === "number") ? tile.startX : 0;
        const w = tile.w || 1;
        progress = Math.max(0, Math.min(1, (startX - tile.x) / w));
      } else {
        progress = 1;
      }

      // Sink gradually in the last half of the strip image (no early sink)
      if (progress < 0.50) {
        airfieldStripY = 0;
      } else {
        const sinkU = (progress - 0.50) / 0.50; // 0→1 over last 50%
        const ease = sinkU * sinkU * (3 - 2 * sinkU); // smooth
        airfieldStripY = ease * (H * 0.48 + 30);
      }
      airfieldAltFrac = progress;
    }

    // ---- RUNWAY ----
    if (airfieldPhase === "taxi" || airfieldPhase === "accel") {
      window.__airborneAirfieldInvuln = true;

      const ruffSt = window.__airborneRuffStage || "intro";
      // Lock runway until intro is finished (do not require RuffActive flag)
      const introLock = (ruffSt === "intro" || ruffSt === "idle" || !ruffSt) && (airfieldRunwayT || 0) < 16;

      if (introLock) {
        // Wait for R.U.F.F. intro — strip frozen, blimp on deck
        window.__airborneAirfieldPaused = true;
        window.__airborneAirfieldHold = false;
        window.__airborneAirfieldHoldUntil = 0;
        window.__airborneAirfieldBoostPending = false;
        airfieldTakeoffSpeed = 50;
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 0;
        if (typeof player !== "undefined" && player) {
          const gy = groundLevelY();
          const ph = player.h > 0 ? player.h : 40;
          player.x = W * 0.22;
          player.y = gy - ph * 0.15;
          player.vy = 0;
          player.rotation = 0;
        }
        airfieldTip = "";
        syncAirfieldGlobals();
      } else {
        // Drive + liftoff
        window.__airborneAirfieldPaused = false;
        window.__airborneTrainingFlight = true; // keep training systems alive

        if (window.__airborneAirfieldBoostPending) {
          window.__airborneAirfieldBoostPending = false;
          airfieldTakeoffSpeed += 40;
        }
        // Longer runway (~+30% more) with a bit more top speed while holding
        if (holding) {
          airfieldTakeoffSpeed += 62 * dt;
        } else {
          airfieldTakeoffSpeed = Math.max(50, airfieldTakeoffSpeed - 40 * dt);
        }
        if (airfieldTakeoffSpeed > 340) airfieldTakeoffSpeed = 340;
        if (typeof obstacleSpeed !== "undefined") {
          obstacleSpeed = holding ? airfieldTakeoffSpeed : 0;
        }

        if (typeof player !== "undefined" && player) {
          const gy = groundLevelY();
          const ph = player.h > 0 ? player.h : 40;
          player.x = W * 0.22;
          player.y = gy - ph * 0.15;
          player.vy = 0;
          player.rotation = holding ? -0.1 : 0;
        }

        airfieldTip = holding ? "Accelerating…" : "HOLD or TAP to accelerate!";
        if (airfieldPhase === "taxi") {
          airfieldPhase = "accel";
        }

        // Must be holding — longer run (~+30%) before liftoff
        if (holding && (airfieldTakeoffSpeed >= 320 || airfieldPhaseT > 6.2)) {
          airfieldPhase = "climb";
          airfieldPhaseT = 0;
          if (typeof player !== "undefined" && player) airfieldClimbStartY = player.y;
          try { if (typeof sfxAirfieldTakeoff === "function") sfxAirfieldTakeoff(); } catch (e) {}
          console.log("[Airborne] LIFTOFF", Math.round(airfieldTakeoffSpeed));
          syncAirfieldGlobals();
        }
      }

    // ---- CLIMB ----
    } else if (airfieldPhase === "climb") {
      window.__airborneAirfieldInvuln = true;
      window.__airborneAirfieldPaused = false;
      window.__airborneTrainingFlight = true;

      const dur = 2.0;
      const tClimb = Math.min(1, airfieldPhaseT / dur);
      const e = tClimb * tClimb * (3 - 2 * tClimb);

      const gy = groundLevelY();
      const startY = airfieldClimbStartY > 0 ? airfieldClimbStartY : gy - 30;
      const endY = H * 0.4;

      if (typeof player !== "undefined" && player) {
        player.y = startY + (endY - startY) * e;
        player.x = W * 0.20 + (W * 0.22 - W * 0.20) * e;
        player.vy = 0;
        player.rotation = -0.2 * Math.sin(tClimb * Math.PI);
      }

      airfieldTakeoffSpeed = Math.max(180, 160 + e * 60);
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = airfieldTakeoffSpeed;
      airfieldTip = "Liftoff!";

      if (tClimb >= 1) {
        airfieldPhase = "lesson";
        airfieldPhaseT = 0;
        airfieldLesson = 0;
        airfieldLessonT = 0;
        airfieldSub = "practice";
        window.__airborneTrainingFlight = true;
        window.__airborneRuffActive = true;
        // Hand off to Ruff lesson chain
        window.__airborneForceRuffCruise = true;
        if (window.__airborneRuffStage === "intro" || window.__airborneRuffStage === "takeoff") {
          window.__airborneRuffStage = "cruise";
        }
        if (typeof player !== "undefined" && player) {
          player.x = W * 0.22;
          player.y = H * 0.4;
          player.vy = 0;
          player.rotation = 0;
          // Finger still down from the hold-to-takeoff, or tapped during the climb:
          // give an immediate flap so the blimp doesn't sag while the player re-taps
          if (window.__airborneClimbTapBuffered || window.__airbornePointerDown) {
            player.vy = (typeof FLAP_VELOCITY === "number") ? FLAP_VELOCITY : -430;
          }
        }
        // Finger carried over from hold-to-takeoff: auto-flap until it is lifted (see updatePlayer)
        window.__airborneCarryHold = !!window.__airbornePointerDown;
        window.__airborneCarryHoldT = 0;
        window.__airborneClimbTapBuffered = false;
        if (typeof obstacles !== "undefined") obstacles = [];
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        window.__airborneAirfieldRings = false;
        window.__airborneAirfieldObstacles = false;
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 210;
        const sm = document.getElementById("stormMeter");
        if (sm) {
          sm.style.visibility = window.__airborneAirfieldAllowPowerup ? "" : "hidden";
          if (!window.__airborneAirfieldAllowPowerup) sm.style.display = "none";
        }
        airfieldTip = "You're flying!";
        window.__airborneAirfieldPaused = false;
        window.__airborneAirfieldInvuln = false;
        window.__airborneTrainingFlight = true;
        // Move Ruff into altitude lesson
        if (window.__airborneRuffStage === "takeoff" || window.__airborneRuffStage === "intro") {
          window.__airborneRuffStage = "cruise";
          try {
            if (typeof window.__airborneForceRuffCruise === "function") window.__airborneForceRuffCruise();
            else if (typeof window.__airborneBeginRuff === "function") { /* nextStage handles */ }
          } catch (e) {}
        }
        syncAirfieldGlobals();
      }

    // ---- LESSON ----
    } else if (airfieldPhase === "lesson") {
      // Always keep free-flight controls enabled during lessons
      window.__airborneAirfieldPaused = false;
      window.__airborneAirfieldInvuln = false;
      window.__airborneTrainingFlight = true;
      if (typeof obstacleSpeed !== "undefined" && (obstacleSpeed || 0) < 220) {
        obstacleSpeed = 240;
      }
      // R.U.F.F. may request landing
      if (window.__airborneRuffRequestLand) {
        window.__airborneRuffRequestLand = false;
        // Never interrupt an active skid/score drive
        if (airfieldPhase !== "land" && airfieldPhase !== "skid" && airfieldPhase !== "score" && airfieldPhase !== "done") {
          airfieldPhase = "land";
          airfieldPhaseT = 0;
          airfieldLandT = 0;
          airfieldDidLand = false;
          airfieldLandContact = 0;
          window.__airborneAirfieldDidLand = false;
          window.__airborneTrainingReportShown = false;
          window.__airborneTrainingReportReady = false;
          window.__airborneAirfieldPaused = false;
          window.__airborneAirfieldInvuln = true;
          // Always training landing strip art
          airfieldUseLandingArt = true;
          airfieldStripGone = false;
          try { ensureAirfieldStripVisible(); } catch (e) {}
          // Keep live objects on screen — only stop new spawns
          if (typeof spawnInterval !== "undefined") spawnInterval = 999;
          ensureAirfieldStripVisible();
          airfieldTip = "Tap to flare — land on the strip!";
          syncAirfieldGlobals();
        }
        // Do not return early when already landing — let land/skid/score run
        if (airfieldPhase === "land" || airfieldPhase === "skid" || airfieldPhase === "score") {
          /* fall through below by not returning */
        } else {
          return;
        }
      }
      // R.U.F.F. drives stages only when companion is really running
      if (window.__airborneRuffActive) {
        window.__airborneAirfieldPaused = false;
        // Stay invuln during early training so death can't dump to checkpoint
        const st = window.__airborneRuffStage || "";
        // Invuln only for first two lessons; later hits soft-respawn without glitch
        window.__airborneAirfieldInvuln = (st === "altitude" || st === "crystals");
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = Math.max(210, obstacleSpeed || 210);
        const sm = document.getElementById("stormMeter");
        if (sm) {
          // Keep element in layout so CSS opacity can fade in/out
          sm.style.display = "";
          sm.style.visibility = "";
          if (window.__airborneAirfieldAllowPowerup) {
            sm.classList.remove("trainingHidden");
          } else {
            sm.classList.add("trainingHidden");
          }
        }
        if (typeof spawnInterval !== "undefined") {
          const needSpawn = window.__airborneAirfieldRings || window.__airborneAirfieldObstacles;
          spawnInterval = needSpawn
            ? (window.__airborneAirfieldObstacles ? 1.35 : 1.55)
            : 999;
        }
        // Spawn flags only — never null out live pickups mid-frame
        airfieldTip = "";
        syncAirfieldGlobals();
        // Critical: while landing/skid/score, do NOT return — land physics must run
        if (airfieldPhase === "land" || airfieldPhase === "skid" || airfieldPhase === "score" || airfieldPhase === "done") {
          // fall through to land/skid/score handlers below
        } else {
          return;
        }
      }
      if (airfieldPhase === "land" || airfieldPhase === "skid" || airfieldPhase === "score" || airfieldPhase === "done") {
        // skip legacy lesson timer while landing
      } else {
      const lessons = AIRFIELD_LESSONS;
      if (airfieldLesson >= lessons.length) {
        airfieldPhase = "land";
        airfieldPhaseT = 0;
        airfieldLandT = 0;
        airfieldDidLand = false;
        airfieldLandContact = 0;
        window.__airborneAirfieldPaused = false;
        window.__airborneAirfieldInvuln = true;
        if (false && typeof obstacles !== "undefined") obstacles = [];
        if (typeof spawnInterval !== "undefined") spawnInterval = 999;
        ensureAirfieldStripVisible();
        airfieldTip = "Prepare to land…";
        syncAirfieldGlobals();
        return;
      }
      const L = lessons[airfieldLesson];
      airfieldLessonT = (airfieldLessonT || 0) + dt;

      // Continuous practice — no freeze pauses; tips show as overlay only
      window.__airborneAirfieldPaused = false;
      window.__airborneAirfieldInvuln = false;
      if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 210;
      if (typeof spawnInterval !== "undefined") spawnInterval = (L.rings || L.obstacles) ? L.spawn : 999;
      window.__airborneAirfieldRings = !!L.rings;
      window.__airborneAirfieldObstacles = !!L.obstacles;

      // Show tip for last ~4s of each practice segment
      const showTipAt = Math.max(0, L.practice - 4);
      if (airfieldLessonT >= showTipAt) {
        airfieldTip = L.tip;
      } else {
        const left = Math.max(0, Math.ceil(L.practice - airfieldLessonT));
        airfieldTip = left > 0 ? ("Flying… " + left + "s") : L.tip;
      }

      if (airfieldLessonT >= L.practice) {
        airfieldLesson++;
        airfieldLessonT = 0;
        if (airfieldLesson < lessons.length) {
          const Ln = lessons[airfieldLesson];
          if (typeof spawnInterval !== "undefined") spawnInterval = (Ln.rings || Ln.obstacles) ? Ln.spawn : 999;
          window.__airborneAirfieldRings = !!Ln.rings;
          window.__airborneAirfieldObstacles = !!Ln.obstacles;
          airfieldTip = "Flying…";
        }
      }
      syncAirfieldGlobals();
      } // end non-landing lesson branch

    forceTrainingReportIfDue();
    // ---- LAND ----
    } else if (airfieldPhase === "land") {
      window.__airborneAirfieldInvuln = true;
      airfieldLandT = (airfieldLandT || 0) + dt;
      // Stop new spawns only — let live items scroll off naturally (no pop-disappear)
      if (typeof spawnInterval !== "undefined") spawnInterval = 999;
      window.__airborneAirfieldObstacles = false;
      window.__airborneAirfieldRings = false;
      // Spawn landing field once — starts BELOW screen, rises while scrolling left
      if (!airfieldUseLandingArt || !airfieldTiles.length) {
        ensureAirfieldStripVisible();
        airfieldStripY = H * 0.55; // deeper start so top edge stays off-screen longer
      }
      // Rise into place, then HARD STOP — extended so landing art is visible longer
      const riseDur = 2.0; // strip rises into view
      const riseU = Math.min(1, airfieldLandT / riseDur);
      const riseE = 1 - Math.pow(1 - riseU, 2.4);
      // Raised another ~3%
      const restSink = H * 0.0;
      const startSink = H * 0.50;
      airfieldStripY = startSink + (restSink - startSink) * riseE;
      if (riseU >= 1) airfieldStripY = restSink;

      // Slower approach so you can see flags/windsock longer
      const approachSpd = 210; // match takeoff scroll speed
      (airfieldTiles || []).forEach(function(tile) {
        if (!tile) return;
        // Stop earlier so the runway stays fully under the blimp with margin
        const targetX = W * 0.08 - (tile.w || 0) * 0.48;
        if (tile.x > targetX) {
          tile.x -= approachSpd * dt;
          if (tile.x < targetX) tile.x = targetX;
        }
      });
      // Player controls flare; hard deck floor so we never fall through
      window.__airborneAirfieldPaused = false;
      window.__airborneAirfieldInvuln = true;
      const th = (airfieldTiles[0] && airfieldTiles[0].h) ? airfieldTiles[0].h : 90;
      const sink = (typeof airfieldStripY === "number") ? airfieldStripY : 0;
      // Deck sits on the runway band of the bottom-anchored strip
      // landY follows strip height (sink raises strip → lower landY)
      const landY = H - Math.max(40, th * 0.28) - ((typeof player !== "undefined" && player && player.h) ? player.h * 0.22 : 10) + (sink || 0);
      if (typeof player !== "undefined" && player) {
        const ph = player.h > 0 ? player.h : 40;
        // Player-controlled landing: mild gravity so taps (flap) have clear effect
        player.vy += 680 * dt;
        if (player.vy > 420) player.vy = 420;
        const fieldReady = airfieldLandT > 1.2; // strip must rise into view first
        // assist toward deck once strip is ready
        if (fieldReady && player.y < landY - 70) {
          player.vy += 160 * dt;
        }
        player.y += player.vy * dt;
        player.x = W * 0.25;
        // Keep blimp on-screen during descent
        if (player.y < ph * 0.4) { player.y = ph * 0.4; player.vy = Math.min(0, player.vy); }
        if (typeof H !== "undefined" && player.y > H * 0.92) {
          player.y = H * 0.92;
          player.vy = Math.min(player.vy, 0);
        }
        // HARD FLOOR — never fall through the strip
        if (player.y > landY) {
          player.y = landY;
          if (player.vy > 0) player.vy = 0;
        }
        player.rotation = Math.max(-0.25, Math.min(0.28, player.vy / 500));

        if (fieldReady && player.y >= landY - 8) {
          airfieldLandContact = (airfieldLandContact || 0) + dt;
        } else {
          airfieldLandContact = 0;
        }

        // Touchdown only when on deck — hard failsafe after 5s of land phase
        if (!airfieldDidLand && ((fieldReady && airfieldLandContact >= 0.08) || airfieldLandT > 5.0)) {
          airfieldDidLand = true;
          window.__airborneAirfieldDidLand = true;
          window.__airborneLandTouchAt = performance.now();
          player.y = landY;
          player.vy = 0;
          player.rotation = 0;
          // Touchdown → auto runway drive (3.5–4.5s), then score
          airfieldPhase = "skid";
          airfieldSkidT = 0;
          airfieldSkidDriveDist = 0;
          airfieldTakeoffSpeed = 240;
          airfieldSkidStartX = player.x;
          window.__airborneSkidLerpFrom = landY;
          window.__airborneSkidLerpT = 1; // already on deck — no lerp jump
          player.y = landY;
          player.vy = 0;
          player.rotation = 0;
          airfieldTip = "Taxiing…";
          airfieldTiles = [];
          try { ensureTaxiRunwayStrip(); } catch (eTr) {}
          window.__airborneTaxiUntil = performance.now() + 5000; // score after 5s
          try { syncAirfieldGlobals(); } catch (eSync) {}
          try {
            if (typeof sfxAirfieldLand === "function") sfxAirfieldLand();
            if (typeof sfxAirfieldScreech === "function") sfxAirfieldScreech();
            if (typeof sfxAirfieldEngineStop === "function") sfxAirfieldEngineStop();
            if (typeof spawnLandingDust === "function") {
              // Big smoke pop on touchdown
              for (var si = 0; si < 8; si++) {
                spawnLandingDust(player.x + (Math.random() - 0.5) * 50, landY + ph * 0.25 + Math.random() * 12);
              }
              spawnLandingDust(player.x - 25, landY + ph * 0.3);
              spawnLandingDust(player.x + 20, landY + ph * 0.28);
            }
            // Extra particle puff if available
            try {
              if (typeof particles !== "undefined" && particles) {
                for (var pi = 0; pi < 24; pi++) {
                  var ang = -Math.PI * 0.15 + Math.random() * Math.PI * 0.3;
                  var sp = 40 + Math.random() * 120;
                  particles.push({
                    x: player.x, y: landY,
                    vx: Math.cos(ang) * sp * (Math.random() < 0.5 ? -1 : 1),
                    vy: -Math.abs(Math.sin(ang)) * sp - 20,
                    life: 0.7 + Math.random() * 0.6,
                    color: ["#c8c0b0", "#a09080", "#ddd8d0", "#8a8070"][pi % 4],
                    size: 4 + Math.random() * 8
                  });
                }
              }
            } catch (eP) {}
          } catch (e) {}
        }
      }
      syncAirfieldGlobals();

    
    forceTrainingReportIfDue();
    // ---- SKID (drive like takeoff: strip scrolls under blimp + blimp rolls forward) ----
    } else if (airfieldPhase === "skid") {
      // ONLY effect: scroll the runway image under the blimp for ~3.75s
      airfieldMode = true;
      window.__airborneAirfield = true;
      window.__airborneAirfieldInvuln = true;
      window.__airborneAirfieldPaused = false;
      airfieldPhase = "skid";
      airfieldStripGone = false;
      airfieldStripY = 0;
      airfieldSkidT = (airfieldSkidT || 0) + dt;

      // Keep landing_field looping tiles for scroll
      if (airfieldSkidT < 0.05 || !airfieldTiles || airfieldTiles.length < 2) {
        try { ensureTaxiRunwayStrip(); } catch (eTr) {
          try { ensureAirfieldStripVisible(); } catch (e2) {}
        }
      }
      airfieldUseLandingArt = true;

      var scrollSec = 4.875; // +30% landing drive
      var spd = 240;
      if (airfieldSkidT < scrollSec) {
        (airfieldTiles || []).forEach(function (tile) {
          if (!tile) return;
          tile.x -= spd * dt;
          var tw = tile.w || W;
          if (tile.x + tw < -20) {
            var right = -Infinity;
            for (var j = 0; j < airfieldTiles.length; j++) {
              if (airfieldTiles[j]) {
                right = Math.max(right, airfieldTiles[j].x + (airfieldTiles[j].w || tw));
              }
            }
            if (!isFinite(right)) right = W;
            tile.x = right - 2;
          }
        });
        airfieldTip = "Taxiing…";
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = spd * 0.35;
      } else {
        airfieldTip = "";
        if (typeof obstacleSpeed !== "undefined") obstacleSpeed = 0;
      }

      // Pin blimp on runway
      var thPin = (airfieldTiles[0] && airfieldTiles[0].h) ? airfieldTiles[0].h : 90;
      var landY = H - Math.max(36, thPin * 0.22) - ((typeof player !== "undefined" && player && player.h) ? player.h * 0.22 : 10);
      if (typeof player !== "undefined" && player) {
        player.x = W * 0.25;
        player.y = landY;
        player.vy = 0;
        player.rotation = -0.04;
      }
      syncAirfieldGlobals();

      if (airfieldSkidT >= scrollSec) {
        airfieldPhase = "score";
        airfieldScoreT = 0;
        airfieldFireworkT = 0;
      }

    // ---- SCORE ----
    } else if (airfieldPhase === "score") {
      window.__airborneAirfieldPaused = true;
      window.__airborneAirfieldInvuln = true;
      airfieldScoreT = (airfieldScoreT || 0) + dt;
      airfieldFireworkT = (airfieldFireworkT || 0) + dt;
      // Keep strip at rest height (don't jump stripY to 0)
      if (typeof player !== "undefined" && player) {
        const th = (airfieldTiles[0] && airfieldTiles[0].h) ? airfieldTiles[0].h : 90;
        const sinkS = (typeof airfieldStripY === "number") ? airfieldStripY : -H * 0.02;
        const landY = H - Math.max(40, th * 0.28) - (player.h > 0 ? player.h * 0.22 : 10) + sinkS;
        player.y = landY;
        player.vy = 0;
        player.rotation = 0;
        if (typeof blimpPersonality !== "undefined" && blimpPersonality) {
          blimpPersonality.squashX = 1;
          blimpPersonality.squashY = 1;
        }
      }
      // Burst fireworks like level victory
      if (airfieldFireworkT > 0.55) {
        airfieldFireworkT = 0;
        const bx = W * (0.2 + Math.random() * 0.6);
        const by = H * (0.18 + Math.random() * 0.28);
        if (typeof spawnVictoryFirework === "function") {
          try { spawnVictoryFirework(bx, by); } catch (e) {}
        } else {
          const colors = ["#ffd700", "#ff6b35", "#7ec8ff", "#ff4d6d", "#b8f2e6", "#c9a66b"];
          for (let i = 0; i < 16; i++) {
            const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
            const spd = 80 + Math.random() * 150;
            airfieldFireworks.push({
              x: bx, y: by,
              vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 40,
              life: 0.7 + Math.random() * 0.5, age: 0,
              color: colors[i % colors.length], r: 2 + Math.random() * 3
            });
          }
        }
      }
      // Update local fireworks
      if (airfieldFireworks && airfieldFireworks.length) {
        airfieldFireworks.forEach(function(fw) {
          fw.age += dt; fw.x += fw.vx * dt; fw.y += fw.vy * dt; fw.vy += 220 * dt;
        });
        airfieldFireworks = airfieldFireworks.filter(function(fw) { return fw.age < fw.life; });
      }
      // Score pops immediately after taxi
      if (!window.__airborneTrainingReportShown) {
        window.__airborneTrainingReportShown = true;
        window.__airborneTrainingReportReady = true;
        window.__airborneAirfieldDidLand = true;
        try {
          if (typeof window.__airborneShowRuffReport === "function") {
            window.__airborneShowRuffReport();
          }
        } catch (e) {}
        try {
          if (typeof showFlightReport === "function") showFlightReport();
        } catch (e2) {}
        try {
          var el = document.getElementById("ruffReport");
          if (el) {
            el.classList.add("visible");
            el.style.display = "flex";
            el.style.visibility = "visible";
            el.style.opacity = "1";
            el.style.zIndex = "80";
          }
        } catch (e3) {}
        try {
          // noop catch align with original structure
          if (false) {
          }
        } catch (e) {
          console.warn("score handoff", e);
        }
        airfieldPhase = "done";
        syncAirfieldGlobals();
      }
      // Stay in score phase until report fires (do NOT set done every frame)
      syncAirfieldGlobals();
    }
      // Final runway pin each frame while on ground phases
      if ((airfieldPhase === "taxi" || airfieldPhase === "accel") &&
          typeof player !== "undefined" && player) {
        const gy = groundLevelY();
        const ph = player.h > 0 ? player.h : 40;
        player.y = gy - ph * 0.15;
        player.x = W * 0.22;
        player.vy = 0;
      }
    } catch (err) {
      console.warn("updateAirfield", err);
    }
  }

  function uComplete(t, dur) {
    return t >= dur;
  }


  function drawAirfieldRollSmoke() {
    const list = window.__airborneRollSmoke;
    if (!list || !list.length) return;
    list.forEach(function (p) {
      const tLife = 1 - p.age / p.life;
      const alpha = (p.a || 0.3) * tLife;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, "rgba(180,180,180," + (alpha * 0.85) + ")");
      g.addColorStop(0.45, "rgba(120,120,120," + (alpha * 0.45) + ")");
      g.addColorStop(1, "rgba(80,80,80,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }



  // ---------- Runway edge lights (soft sequential blink L→R) ----------
  function seedAirfieldLightsForTile(tile, isLanding) {
    if (!tile || !tile.w) return;
    airfieldLights = [];
    // Align to painted edge-light rows on strip art (1500×~245 source)
    // Upper row sits on near-side edge of runway surface; lower on far edge.
    // Tuned as fractions of drawn tile so they track scroll/scale with the image.
    const upperY = isLanding ? 0.40 : 0.38;
    const lowerY = isLanding ? 0.76 : 0.74;
    const count = isLanding ? 14 : 16; // lights per edge
    const x0 = 0.06;
    const x1 = 0.94;
    for (let row = 0; row < 2; row++) {
      const fy = row === 0 ? upperY : lowerY;
      for (let i = 0; i < count; i++) {
        const fx = x0 + (x1 - x0) * (i / (count - 1));
        airfieldLights.push({
          tile: tile,
          fx: fx,
          fy: fy,
          index: i,          // for left→right chase
          row: row,
          phaseBias: i * 0.22 + row * 0.08
        });
      }
    }
  }

  function updateAirfieldLights(dt) {
    if (!airfieldMode) return;
    airfieldLightT += dt;
  }

  function drawAirfieldLightsLayer(sink) {
    if (!airfieldLights || !airfieldLights.length) return;
    const t = airfieldLightT || 0;
    // Chase speed: full L→R cycle ~2.4s
    const chaseSpeed = 2.6;
    airfieldLights.forEach(function(L) {
      const tile = L.tile;
      if (!tile) return;
      const tw = tile.w, th = tile.h, tx = tile.x;
      if (!(tw > 0) || !(th > 0)) return;
      const y0 = H - th + (sink || 0);
      const lx = tx + L.fx * tw;
      const ly = y0 + L.fy * th;
      // Soft sequential pulse traveling left → right
      // Each light peaks when the wave reaches its index
      const wave = (t * chaseSpeed - L.phaseBias);
      // Smooth raised-cosine blink (soft, not harsh strobe)
      const s = 0.5 + 0.5 * Math.sin(wave);
      const soft = s * s; // bias toward dimmer base, soft peaks
      const glow = 0.22 + 0.78 * soft;
      const radius = Math.max(2.2, Math.min(5.5, th * 0.028));

      ctx.save();
      // Outer bloom
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 3.2);
      g.addColorStop(0, "rgba(255, 220, 140," + (0.55 * glow) + ")");
      g.addColorStop(0.35, "rgba(255, 180, 60," + (0.28 * glow) + ")");
      g.addColorStop(1, "rgba(255, 140, 40, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
      // Core lamp
      const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
      g2.addColorStop(0, "rgba(255, 250, 220," + (0.95 * glow) + ")");
      g2.addColorStop(0.45, "rgba(255, 200, 90," + (0.75 * glow) + ")");
      g2.addColorStop(1, "rgba(220, 140, 40," + (0.15 * glow) + ")");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(lx, ly, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function seedAirfieldFlagsForTile(tile, isLanding) {
    if (!tile || !tile.w) return;
    if (isLanding) {
      // Finish flag on LEFT side of landing strip (+50% size)
      airfieldFlags.push({
        tile: tile,
        fx: 0.12,
        fy: 0.55,
        frame: 0,
        frameT: 0,
        fps: 12,
        sheet: "finish_flag",
        cols: 5,
        rows: 5,
        scaleMul: 1.5
      });
      // Windsock shifted RIGHT by 25% of strip (+50% size)
      airfieldFlags.push({
        tile: tile,
        fx: 0.75,
        fy: 0.69,
        frame: 0,
        frameT: 0,
        fps: 14,
        sheet: "wind_sock",
        cols: 6,
        rows: 6,
        scaleMul: 1.5
      });
      return;
    }
    // Windsock on takeoff strip
    airfieldFlags.push({
      tile: tile,
      fx: 0.22,
      fy: 0.69,
      frame: 0,
      frameT: 0,
      fps: 14,
      sheet: "wind_flag_left",
      cols: 6,
      rows: 6
    });
  }


  function updateAirfieldFlags(dt) {
    if (!airfieldMode) return;
    airfieldWindT += dt;
    if (!airfieldFlags || !airfieldFlags.length) return;
    airfieldFlags.forEach(function(f) {
      f.frameT = (f.frameT || 0) + dt;
      const fps = f.fps || 14;
      if (f.frameT >= 1 / fps) {
        const steps = Math.floor(f.frameT * fps);
        const total = (f.cols || 6) * (f.rows || 6);
        f.frame = ((f.frame || 0) + steps) % total;
        f.frameT -= steps / fps;
      }
    });
  }

  function drawAirfieldFlag(f, tileX, tileY, tileW, tileH) {
    if (!f || !ctx) return;
    const key = f.sheet || "wind_flag_left";
    const sheet = (typeof images !== "undefined" && images) ? images[key] : null;
    if (!sheet || !sheet.naturalWidth || !sheet.naturalHeight) return;

    const cols = f.cols || 6, rows = f.rows || 6, total = cols * rows;
    const fw = sheet.naturalWidth / cols;
    const fh = sheet.naturalHeight / rows;
    const frame = ((f.frame | 0) % total + total) % total;
    const col = frame % cols;
    const row = Math.floor(frame / cols);
    const sx = col * fw;
    const sy = row * fh;

    // Scale: pole sits on dirt; scaleMul for landing props (+50%)
    const targetH = Math.max(24, tileH * 0.42) * (f.scaleMul || 1);
    const scale = targetH / fh;
    const dw = fw * scale;
    const dh = fh * scale;

    // Anchor: bottom of pole base on dirt at (fx, fy)
    const baseX = tileX + f.fx * tileW;
    const baseY = tileY + f.fy * tileH;
    const dx = baseX - dw * 0.28; // pole column is left-of-center in frame
    const dy = baseY - dh * 0.98; // pole foot on the dirt

    try {
      ctx.save();
      // Draw BEHIND strip content visually by drawing before strip; layer call order handles it
      ctx.drawImage(sheet, sx, sy, fw, fh, dx, dy, dw, dh);
      ctx.restore();
    } catch (e) {}
  }

  function drawAirfieldFlagsLayer(sink) {
    if (!airfieldFlags || !airfieldFlags.length) return;
    airfieldFlags.forEach(function(f) {
      const tile = f.tile;
      if (!tile) return;
      const tw = tile.w, th = tile.h, tx = tile.x;
      if (!(tw > 0) || !(th > 0)) return;
      const y = H - th + (sink || 0);
      drawAirfieldFlag(f, tx, y, tw, th);
    });
  }

  function drawAirfieldStrip() {
    if (!airfieldMode && !window.__airborneAirfield) return;
    if (typeof images === "undefined" || !images) return;
    // Landing / taxi always use landing_field (never glitch to takeoff strip)
    var taxiOn = (window.__airborneTaxiUntil && performance.now() < window.__airborneTaxiUntil);
    var landingPhase = (airfieldPhase === "land" || airfieldPhase === "skid" ||
                        airfieldPhase === "score" || taxiOn || airfieldUseLandingArt);
    if (airfieldStripGone && !landingPhase) return;
    const imgKey = landingPhase ? "landing_field" : "airfield_strip";
    const img = images[imgKey] || images.landing_field || images.airfield_strip;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    if (!airfieldTiles || !airfieldTiles.length) {
      if (airfieldStripGone && !airfieldUseLandingArt) return;
      try { initAirfieldStrip(); } catch (e) { return; }
      if (!airfieldTiles || !airfieldTiles.length) return;
    }
    const sink = (typeof airfieldStripY === "number" && isFinite(airfieldStripY)) ? airfieldStripY : 0;
    airfieldTiles.forEach(function(tile) {
      if (!tile) return;
      let tw = tile.w, th = tile.h, tx = tile.x;
      if (!(tw > 0) || !(th > 0) || !isFinite(tx)) {
        const aspect = img.naturalWidth / img.naturalHeight;
        th = Math.max(50, Math.min(H * 0.38, H * 0.45)) * 1.07;
        tw = th * aspect;
        tile.w = tw; tile.h = th;
        if (!isFinite(tx)) { tx = 0; tile.x = 0; }
      }
      // Anchor firmly to bottom of canvas
      const y = H - th + sink;
      if (!isFinite(y) || y > H + 40) return;
      try { ctx.drawImage(img, tx, y, tw, th); } catch (e) {}
    });
    // Windsock IN FRONT of strip, on dirt above runway
    drawAirfieldFlagsLayer(sink);
    // Runway edge lights disabled
    // drawAirfieldLightsLayer(sink);
  }

  function drawAirfieldShadow() {
    try {
      if (!airfieldMode || typeof player === "undefined" || !player) return;
      if (airfieldPhase === "score" || airfieldPhase === "lesson") return;
      const gy = groundLevelY();
      const frac = Math.max(0, Math.min(1, airfieldAltFrac || 0));
      const scale = 1 - frac * 0.75;
      const alpha = 0.35 * (1 - frac * 0.65);
      if (scale < 0.15 || alpha < 0.05) return;
      const pw = player.w > 0 ? player.w : 50;
      const sw = pw * 0.8 * scale;
      const sh = Math.max(4, sw * 0.18);
      const sx = player.x || W * 0.22;
      const sy = gy - 2;
      if (!isFinite(sx) || !isFinite(sy) || !isFinite(sw)) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(20,16,10,1)";
      ctx.translate(sx, sy);
      ctx.scale(1, Math.max(0.2, sh / Math.max(1, sw)));
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, sw / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } catch (e) {}
  }

  function drawAirfieldTip() {
    try {
      if (!airfieldMode || airfieldPhase !== "score") return;
      const list = Array.isArray(airfieldFireworks) ? airfieldFireworks : [];
      for (let i = 0; i < list.length; i++) {
        const fw = list[i];
        if (!fw) continue;
        const life = fw.life || 1;
        const tt = 1 - (fw.age || 0) / life;
        if (tt <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, tt);
        ctx.fillStyle = fw.color || "#ffd700";
        ctx.beginPath();
        ctx.arc(fw.x || 0, fw.y || 0, (fw.r || 3) * tt, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if ((airfieldScoreT || 0) < 0.15) {
        ctx.save();
        ctx.textAlign = "center";
        const fs = Math.floor((typeof W !== "undefined" ? W : 400) * 0.065);
        ctx.font = "bold " + fs + "px Rockwell, Georgia, serif";
        const cx = (typeof W !== "undefined" ? W : 400) / 2;
        const cy = (typeof H !== "undefined" ? H : 600) * 0.2;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillText("TRAINING COMPLETE!", cx + 2, cy + 2);
        ctx.fillStyle = "#ffe9a8";
        ctx.fillText("TRAINING COMPLETE!", cx, cy);
        ctx.restore();
      }
    } catch (e) { /* never break the game loop */ }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = String(text).split(" ");
    let line = "";
    let ly = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, ly);
        line = words[i];
        ly += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, ly);
  }



  function drawBuildings() {
    if (airfieldMode) return;
    const groundY = groundLevelY();
    const img = images[buildingRowKey];
    if (!img || !img.naturalWidth) return;
    buildings.forEach(b => {
      ctx.drawImage(img, b.x, groundY - b.h, b.w, b.h);
    });
  }

  // ---------- Distant sketch-skyline layer — sits behind the power lines,
  // positioned twice as high up (twice the vertical offset from the ground)
  // so it reads as further back/taller in the distance. Same tiling/scroll
  // approach as the power lines, just slower since it's further away. ----------
  let sketchSkylineTiles = [];

  function initSketchSkyline() {
    sketchSkylineTiles = [];
    const img = images.sketchSkyline;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 1.5;
    const h = H * 0.495; // was 0.33, +50% (now anchored at ground, same base as power lines)
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      sketchSkylineTiles.push({ x: x, w: w, h: h });
      x += w - 1;
    }
  }

  function updateSketchSkyline(dtScale) {
    // Hold the skyline still only after touchdown
    if (worldScrollFrozen()) return;
    const speed = 0.35 * dtScale * obstacleSpeedScale(); // between parallax layer 3 (0.28) and power lines (0.4) — matches its position in the draw order
    sketchSkylineTiles.forEach(t => (t.x -= speed));
    while (sketchSkylineTiles.length && sketchSkylineTiles[0].x + sketchSkylineTiles[0].w < -10) {
      sketchSkylineTiles.shift();
    }
    const last = sketchSkylineTiles[sketchSkylineTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w - 1 : 0;
      const h = last ? last.h : H * 0.495;
      const aspect = last ? last.w / last.h : 1.5;
      sketchSkylineTiles.push({ x: startX, w: h * aspect, h: h });
    }
  }

  function drawSketchSkyline() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    const img = images.sketchSkyline;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    // Anchored to the same ground base as the power lines (not floating above
    // them) — taller now, so it still reaches well above where it used to.
    const bottomY = groundY;
    ctx.save();
    ctx.globalAlpha = 0.8; // darker/more visible while still reading as distant (was 0.5)
    sketchSkylineTiles.forEach(t => {
      ctx.drawImage(img, t.x, bottomY - t.h, t.w, t.h);
    });
    ctx.restore();
  }

  // ---------- Power line silhouette layer — a background parallax strip that
  // sits behind the buildings and drifts at half their scroll speed (a bit
  // further back = a bit slower). The art has a transparent top half — that
  // comes through automatically via drawImage's alpha, nothing special
  // needed here as long as the source PNG keeps its alpha channel intact
  // (a JPEG re-export of it would flatten the transparent area to white). ----------
  let powerlineTiles = [];

  function initPowerlines() {
    powerlineTiles = [];
    const img = images.powerlines;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 3;
    const h = H * 0.2904; // was 0.242, +20%
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      powerlineTiles.push({ x: x, w: w, h: h });
      x += w - 1; // slight overlap so the seam never shows
    }
  }

  function updatePowerlines(dtScale) {
    if (worldScrollFrozen()) return;
    const speed = 0.4 * dtScale * obstacleSpeedScale();
    powerlineTiles.forEach(t => (t.x -= speed));
    while (powerlineTiles.length && powerlineTiles[0].x + powerlineTiles[0].w < -10) {
      powerlineTiles.shift();
    }
    const last = powerlineTiles[powerlineTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const startX = last ? last.x + last.w - 1 : 0;
      const h = last ? last.h : H * 0.2904;
      const img = images.powerlines;
      const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
      powerlineTiles.push({ x: startX, w: h * aspect, h: h });
    }
  }

  function drawPowerlines() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    const img = images.powerlines;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    ctx.save();
    powerlineTiles.forEach(t => {
      ctx.drawImage(img, t.x, groundY - t.h, t.w, t.h);
    });
    ctx.restore();
  }

  // ---------- Street — a single tiled texture image replacing the old
  // procedural sidewalk+road strip, anchored to the very bottom of the
  // screen. Scrolls in sync with the buildings so it reads as one
  // continuous street, and is drawn after (in front of/above) the
  // buildings layer. ----------
  let streetTiles = [];

  function streetTileHeight() {
    return H - groundLevelY();
  }

  function initStreetTiles() {
    streetTiles = [];
    const img = images.streetTexture;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
    const h = streetTileHeight();
    const w = h * aspect;
    let x = 0;
    while (x < W + w) {
      streetTiles.push({ x, w, h });
      x += w - 1;
    }
  }

  function updateStreet(dtScale) {
    if (worldScrollFrozen()) return;
    const speed = 0.8 * dtScale * obstacleSpeedScale();
    if (!streetTiles.length) initStreetTiles();
    streetTiles.forEach(t => (t.x -= speed));
    while (streetTiles.length && streetTiles[0].x + streetTiles[0].w < -10) {
      streetTiles.shift();
    }
    const last = streetTiles[streetTiles.length - 1];
    if (!last || last.x + last.w < W + 200) {
      const img = images.streetTexture;
      const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 4;
      const h = last ? last.h : Math.max(58, H * 0.088);
      const startX = last ? last.x + last.w : 0;
      streetTiles.push({ x: startX, w: h * aspect, h });
    }
  }

  function drawStreet() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    const img = images.streetTexture;
    if (!img || !img.naturalWidth) return;
    streetTiles.forEach(t => {
      ctx.drawImage(img, t.x, H - t.h, t.w, t.h);
    });
  }

  // ---------- Smokestack smoke (decorative) — level 3 factory buildings puff
  // smoke from their chimneys as they scroll by. Chimney x-positions below
  // were measured directly from each building's art (tallest opaque column
  // near the top edge of the image). ----------
  const BUILDING_SMOKESTACKS = {
    bldg_l3_factoryrow:   [0.07, 0.234],
    bldg_l3_smokestacks:  [0.296, 0.723],
    bldg_l3_furnacehouse: [0.389],
    bldg_l3_minetower:    [0.544],
    bldg_l3_clocktower:   [0.31]
  };
  let buildingSmokeParticles = [];

  function updateBuildingSmoke(dt) {
    const groundY = groundLevelY();
    const worldSpeedPxPerSec = 48 * obstacleSpeedScale(); // matches the buildings' own scroll speed
    buildings.forEach(b => {
      const stacks = BUILDING_SMOKESTACKS[b.key];
      if (!stacks) return;
      if (b.smokeTimer == null) b.smokeTimer = Math.random() * 0.6;
      b.smokeTimer -= dt;
      if (b.smokeTimer <= 0) {
        b.smokeTimer = 0.4 + Math.random() * 0.4;
        const top = groundY - b.h;
        stacks.forEach(frac => {
          buildingSmokeParticles.push({
            x: b.x + b.w * frac + (Math.random() - 0.5) * 4,
            y: top + (Math.random() - 0.5) * 3,
            vx: -worldSpeedPxPerSec + (Math.random() - 0.5) * 10,
            vy: -20 - Math.random() * 12,
            size: 5 + Math.random() * 4,
            life: 2.4 + Math.random() * 1.4,
            age: 0
          });
        });
      }
    });

    buildingSmokeParticles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.992;
      p.vx *= 0.995;
      p.size += dt * 5.5; // smoke expands as it rises and disperses
    });
    buildingSmokeParticles = buildingSmokeParticles.filter(p => p.age < p.life);
  }

  function drawBuildingSmoke() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    buildingSmokeParticles.forEach(p => {
      const t = p.age / p.life;
      const alpha = (1 - t) * 0.32;
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, "rgba(175,170,162,0.85)");
      grad.addColorStop(1, "rgba(175,170,162,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ---------- Street lamps (decorative, no collision) — level 1 only. A
  // single lamp image, spaced out along the sidewalk, sized to never exceed
  // 25% of the (now fixed) building height. Drawn after the buildings so
  // they sit in front of the building facades. ----------
  let streetlamps = [];
  const STREETLAMP_GAP_MIN = 260;
  const STREETLAMP_GAP_MAX = 420;

  function isStreetlampLevel() {
    return gameplayScore < BOSSES[0].threshold; // level 1 = before the first boss
  }

  function makeStreetlamp(xStart) {
    const img = images.streetlamp1;
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 0.3;
    const h = (H * 0.396) * 0.25; // matches the fixed building height (now +20%), capped at 25% of it
    const w = h * aspect;
    return { x: xStart, w, h };
  }

  function initStreetlamps() {
    streetlamps = [];
    if (!isStreetlampLevel()) return;
    let x = 150;
    while (x < W + 400) {
      streetlamps.push(makeStreetlamp(x));
      x += STREETLAMP_GAP_MIN + Math.random() * (STREETLAMP_GAP_MAX - STREETLAMP_GAP_MIN);
    }
  }

  function updateStreetlamps(dtScale) {
    if (!isStreetlampLevel()) {
      if (streetlamps.length) streetlamps = [];
      return;
    }
    if (worldScrollFrozen()) return;
    const speed = 0.8 * dtScale * (obstacleSpeedScale()); // same speed as buildings — same ground plane
    streetlamps.forEach(l => (l.x -= speed));
    while (streetlamps.length && streetlamps[0].x + streetlamps[0].w < -10) {
      streetlamps.shift();
    }
    const last = streetlamps[streetlamps.length - 1];
    if (!last || last.x < W + 400) {
      const gap = STREETLAMP_GAP_MIN + Math.random() * (STREETLAMP_GAP_MAX - STREETLAMP_GAP_MIN);
      const startX = last ? last.x + gap : W + 200;
      streetlamps.push(makeStreetlamp(startX));
    }
  }

  function drawStreetlamps() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    if (!isStreetlampLevel()) return;
    const img = images.streetlamp1;
    if (!img || !img.naturalWidth) return;
    const groundY = groundLevelY();
    streetlamps.forEach(l => {
      const top = groundY - l.h;
      ctx.drawImage(img, l.x, top, l.w, l.h);
    });
  }

  // ---------- Ground vehicles (decorative, no collision) — real art, two
  // types driving each direction (matching each image's natural facing, so
  // nothing needs to be mirrored). ----------
  let groundVehicles = [];
  let vehicleSpawnTimer = 3 + Math.random() * 4;
  // dir: 1 = drives left-to-right (art faces right), -1 = right-to-left (art faces left)
  const VEHICLE_DEFS = [
    { key: "vehicle_towtruck", dir: 1 },
    { key: "vehicle_tanker", dir: 1 },
    { key: "vehicle_transit", dir: -1 },
    { key: "vehicle_roadster", dir: -1 }
  ];

  function spawnGroundVehicle() {
    const def = VEHICLE_DEFS[Math.floor(Math.random() * VEHICLE_DEFS.length)];
    const img = images[def.key];
    const aspect = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : 2.4;
    const scale = Math.min(1.6, W / 500);
    const h = 46 * scale;
    const w = h * aspect;
    groundVehicles.push({
      key: def.key,
      x: def.dir === 1 ? -w - 20 : W + 20,
      w, h,
      dir: def.dir,
      speed: (26 + Math.random() * 22) * scale
    });
  }

  function updateGroundVehicles(dt, dtScale) {
    if (worldScrollFrozen()) return;
    vehicleSpawnTimer -= dt;
    if (vehicleSpawnTimer <= 0) {
      vehicleSpawnTimer = 4.5 + Math.random() * 6;
      if (groundVehicles.length < 3) spawnGroundVehicle();
    }
    const worldScroll = 0.8 * dtScale * obstacleSpeedScale(); // same ground-plane speed as buildings
    groundVehicles.forEach(v => {
      v.x += v.dir * v.speed * dt - worldScroll;
    });
    groundVehicles = groundVehicles.filter(v => v.x > -160 && v.x < W + 160);
  }

  function drawGroundVehicles() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    // anchored toward the bottom of the street band (where the road portion
    // of the texture is expected to be) rather than the top edge, which
    // sits right against the buildings/sidewalk
    const vehicleBottomY = H - streetTileHeight() * 0.18;
    groundVehicles.forEach(v => {
      const img = images[v.key];
      if (!img || !img.naturalWidth) return;
      const y = vehicleBottomY - v.h;
      ctx.drawImage(img, v.x, y, v.w, v.h);
    });
  }

  function checkBuildingCollision() {
    if (bonusActive) return; // invincible during the bonus round
    if (window.__airborneAirfield || (typeof airfieldMode !== "undefined" && airfieldMode)) return;
    if (window.__airborneAirfieldInvuln) return;
    const groundY = groundLevelY();
    const px1 = player.x - (player.w / 2) * 0.7;
    const px2 = player.x + (player.w / 2) * 0.7;
    const pBottom = player.y + (player.h / 2) * 0.7;

    for (const b of buildings) {
      const overlapsX = px2 > b.x && px1 < b.x + b.w;
      if (!overlapsX) continue;
      // sample the real silhouette height at the player's own position, rather
      // than treating the whole tile as one flat-topped block
      const sampleX = Math.max(b.x, Math.min(b.x + b.w, player.x));
      const topFrac = buildingProfileTopFrac(b, sampleX);
      const solidTop = (groundY - b.h) + topFrac * b.h;
      if (pBottom > solidTop) {
        takeHit();
        return;
      }
    }
  }

  // ---------- Far backdrop (decorative, no collision) — the farthest-back
  // image layer, sitting behind the skyline parallax layer and everything
  // else. Drawn at partial opacity so the procedural sky gradient still
  // shows/tints through it. ----------
  let skylineX = 0;
  function updateSkyline(dtScale) {
    const speed = 0.05 * dtScale * obstacleSpeedScale(); // very slow — reads as far away, but still moving with the scene
    skylineX -= speed;
  }
  function drawSkyline() {
    if (typeof airfieldMode !== "undefined" && airfieldMode) return;
    // The Far_Bg.jpg asset was shipping with its transparent areas baked in
    // as a literal checkerboard (instead of being flattened onto a solid/sky
    // color before export), so drawing it here was punching a checkerboard
    // hole straight through the sky. Rather than depend on that external
    // image at all, paint a soft procedural haze band using the SAME colors
    // as the live sky gradient (getSkyColors) — it always matches the
    // current day/dusk/night/dawn tint exactly, and can never fail to load,
    // 404, or show through as broken/transparent.
    const sky = getSkyColors(gameplayScore);
    ctx.save();
    ctx.globalAlpha = 0.35;
    const haze = ctx.createLinearGradient(0, 0, 0, H);
    haze.addColorStop(0, sky.top);
    haze.addColorStop(1, sky.bottom);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---------- Clouds (decorative soft art, 50% transparent + fly-through mist) ----------
  let clouds = [];
  function pickCloudImg() {
    if (typeof images === "undefined" || !images) return null;
    const a = images.cloud_soft_a;
    const b = images.cloud_soft_b;
    const legacy = images.cloud;
    if (a && a.naturalWidth && b && b.naturalWidth) {
      return Math.random() < 0.5 ? a : b;
    }
    if (a && a.naturalWidth) return a;
    if (b && b.naturalWidth) return b;
    return (legacy && legacy.naturalWidth) ? legacy : null;
  }
  function initClouds() {
    clouds = [];
    for (let i = 0; i < 4; i++) {
      const img = pickCloudImg();
      clouds.push({
        x: Math.random() * W,
        y: 30 + Math.random() * (H * 0.38),
        scale: 0.11 + Math.random() * 0.14, // ~100% smaller than prior soft clouds
        speed: 0.12 + Math.random() * 0.18,
        alpha: 0.5, // 50% transparent
        imgKey: (img === images.cloud_soft_b) ? "cloud_soft_b"
              : (img === images.cloud_soft_a) ? "cloud_soft_a" : "cloud"
      });
    }
  }
  function updateClouds(dtScale) {
    window.__airborneInCloud = false;
    // Clouds always drift — even during intro, landing, or frozen world scroll
    clouds.forEach(c => {
      const img = (images && images[c.imgKey]) || pickCloudImg() || images.cloud;
      const baseW = (img && img.naturalWidth) ? img.naturalWidth : 256;
      c.x -= c.speed * dtScale;
      const drawnW = baseW * c.scale;
      const drawnH = ((img && img.naturalHeight) ? img.naturalHeight : 128) * c.scale;
      // Level-3 style mist when blimp flies through
      if (typeof player !== "undefined" && player && typeof maybeEmitCloudWisp === "function") {
        const cx = c.x, cy = c.y, cw = drawnW, ch = drawnH;
        const px = player.x - player.w / 2, py = player.y - player.h / 2;
        const dx = Math.abs((px + player.w / 2) - (cx + cw / 2));
        const dy = Math.abs((py + player.h / 2) - (cy + ch / 2));
        if (dx < (cw / 2 + player.w / 2) * 0.78 && dy < (ch / 2 + player.h / 2) * 0.78) {
          window.__airborneInCloud = true;
          const dt = Math.max(0.008, Math.min(0.05, dtScale / 60));
          if (typeof maybeEmitCloudWisp === "function") maybeEmitCloudWisp(player.x, player.y, dt, 42);
        }
      }
      if (c.x + drawnW < 0) {
        const ni = pickCloudImg();
        c.x = W + 20 + Math.random() * 120;
        c.y = 30 + Math.random() * (H * 0.38);
        c.scale = 0.11 + Math.random() * 0.14;
        c.speed = 0.12 + Math.random() * 0.18;
        c.alpha = 0.5;
        c.imgKey = (ni === images.cloud_soft_b) ? "cloud_soft_b"
                 : (ni === images.cloud_soft_a) ? "cloud_soft_a" : "cloud";
      }
    });
  }
  function drawClouds() {
    clouds.forEach(c => {
      const img = (images && images[c.imgKey]) || images.cloud;
      if (!img || !img.naturalWidth) return;
      const w = img.naturalWidth * c.scale;
      const h = img.naturalHeight * c.scale;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, c.x, c.y, w, h);
      ctx.globalAlpha = 1;
    });
  }

  // ---------- Distant bird flock (decorative, no collision) — a small V-shaped
  // group that periodically drifts across the far background, part of the
  // same parallax feel as the clouds/skyline, using the existing bird sprites
  // scaled down and faded for distance ----------
  let birdFlocks = [];
  let birdFlockTimer = 6 + Math.random() * 8; // first flock arrives fairly soon

  function spawnBirdFlock() {
    const useB = Math.random() < 0.5;
    const keys = useB ? BIRD_B_KEYS : BIRD_A_KEYS;
    const count = 4 + Math.floor(Math.random() * 4); // 4-7 birds
    const members = [{ ox: 0, oy: 0, phase: Math.random() * Math.PI * 2 }];
    for (let i = 1; i < count; i++) {
      const side = i % 2 === 1 ? -1 : 1;
      const rank = Math.ceil(i / 2);
      members.push({
        ox: rank * (10 + Math.random() * 4),
        oy: rank * (5 + Math.random() * 3) * side,
        phase: Math.random() * Math.PI * 2
      });
    }
    birdFlocks.push({
      x: W + 60,
      y: H * (0.08 + Math.random() * 0.32),
      size: 16 + Math.random() * 8, // small — reads as distant
      speed: 26 + Math.random() * 18, // slow parallax drift, much slower than gameplay obstacles
      alpha: 0.4 + Math.random() * 0.22,
      keys,
      members,
      animFrame: Math.floor(Math.random() * OBSTACLE_ANIM_FRAME_COUNT),
      animTimer: Math.random() / OBSTACLE_ANIM_FPS,
      bobPhase: Math.random() * Math.PI * 2
    });
  }

  function updateBirdFlocks(dt) {
    if (window.__airborneRuffStage === "intro") return;
    if (worldScrollFrozen()) return;
    birdFlockTimer -= dt;
    if (birdFlockTimer <= 0) {
      birdFlockTimer = 22 + Math.random() * 26; // periodic — not a constant presence
      spawnBirdFlock();
    }
    const frameDuration = 1 / OBSTACLE_ANIM_FPS;
    birdFlocks.forEach(f => {
      f.x -= f.speed * dt;
      f.bobPhase += dt * 0.8;
      f.animTimer += dt;
      while (f.animTimer >= frameDuration) {
        f.animTimer -= frameDuration;
        f.animFrame = (f.animFrame + 1) % OBSTACLE_ANIM_FRAME_COUNT;
      }
    });
    birdFlocks = birdFlocks.filter(f => f.x > -80);
  }

  function drawBirdFlocks() {
    birdFlocks.forEach(f => {
      const img = images[f.keys[f.animFrame]];
      if (!img || !img.naturalWidth) return;
      const aspect = img.naturalHeight / img.naturalWidth;
      const w = f.size;
      const h = w * aspect;
      const baseY = f.y + Math.sin(f.bobPhase) * 5;
      ctx.globalAlpha = f.alpha;
      f.members.forEach(m => {
        const bob = Math.sin(f.bobPhase * 1.3 + m.phase) * 3;
        // +10% right, slightly calmer motion (-5% wind feel)
        ctx.drawImage(img, f.x + m.ox * 0.95 + w * 0.1 - w / 2, baseY + m.oy * 0.95 + bob * 0.95 - h / 2, w, h);
      });
      ctx.globalAlpha = 1;
    });
  }

  window.beginAirfieldTraining = beginAirfieldTraining;
  window.endAirfieldTrainingToMap = endAirfieldTrainingToMap;
  window.isAirfieldMode = isAirfieldMode;
  window.updateAirfield = updateAirfield;
  window.drawAirfieldStrip = drawAirfieldStrip;
  window.drawAirfieldTip = drawAirfieldTip;
  window.drawAirfieldShadow = drawAirfieldShadow;
