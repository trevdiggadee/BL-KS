"use strict";


const BLIMP_DATA = {
  // Menu/static preview = first flight frame (no separate _main / .png stills needed)
  blimp1: { url: "player_blimp_01.webp?cb=3", key: "player_blimp_01", name: "Zeppelin Ace", effect: "propeller" },
  blimp2: { url: "blimp2_flight_01.webp", key: "blimp2_flight_01", name: "Deco Liner", effect: "smoke" },
  blimp3: { url: "blimp3_flight_01.webp", key: "blimp3_flight_01", name: "Aero Slicer", effect: null },
  blimp4: { url: "blimp4_flight_01.webp", key: "blimp4_flight_01", name: "Steampunk", effect: "steam" },
  blimp5: { url: "blimp5_flight_01.webp", key: "blimp5_flight_01", name: "Jade Voyager", effect: null },
  blimp6: { url: "ship_wood_01.webp", key: "ship_wood_01", name: "Little Spy", effect: null },
  blimp7: { url: "ship_lightning_01.webp", key: "ship_lightning_01", name: "Storm Chaser", effect: "flame" },
  blimp8: { url: "ship_cargo_01.webp", key: "ship_cargo_01", name: "Ironworks", effect: "blackSmoke" },
  blimp9: { url: "ship_pirate_01.webp", key: "ship_pirate_01", name: "Jolly Rogers", effect: null },
  blimp10: { url: "ship_ivory_01.webp", key: "ship_ivory_01", name: "Ivory Anchor", effect: null },
  blimp11: { url: "blimp11_flight_01.webp", key: "blimp11_flight_01", name: "War Shark", effect: "propeller" },
  blimp12: { url: "blimp12_flight_01.webp", key: "blimp12_flight_01", name: "Sky Rocket", effect: "dualFlame" },
  blimp13: { url: "blimp13_flight_01.webp", key: "blimp13_flight_01", name: "Iron Lattice", effect: null },
  blimp14: { url: "blimp14_flight_01.webp", key: "blimp14_flight_01", name: "Pirate Rocket", effect: "dualFlame" },
  blimp15: { url: "blimp15_flight_01.webp", key: "blimp15_flight_01", name: "Royal Stripe", effect: null }
};

// ---------- Blimp Profile Panel data ----------
// NOTE: these stat pips (0-5), abilities, and XP values are placeholder/
// starter numbers I picked to get the panel working end-to-end — not
// balanced or approved game data. Swap in real numbers whenever ready.
const SHIP_STATS = {
  blimp1: {
    name: "Zeppelin Ace", mk: "Mk I", cls: "Scout Airship", call: "ACE-1",
    stats: { Speed: 4, Lift: 4, Durability: 3, Maneuverability: 3, Boost: 4 },
    ability: { icon: "☄", name: "Meteor Strike", desc: "Calls down several burning meteors from above. Great for destroying large clusters." },
    upgrade: "Next Rank", xp: 320, xpMax: 500, locked: false
  },
  blimp2: {
    name: "Deco Liner", mk: "Mk I", cls: "Luxury Cruiser", call: "DECO-2",
    stats: { Speed: 3, Lift: 4, Durability: 4, Maneuverability: 3, Boost: 3 },
    ability: { icon: "☁", name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." },
    upgrade: "Next Rank", xp: 150, xpMax: 400, locked: false
  },
  blimp3: {
    name: "Aero Slicer", mk: "Mk I", cls: "Speed Cutter", call: "SLICE-3",
    stats: { Speed: 5, Lift: 3, Durability: 2, Maneuverability: 5, Boost: 3 },
    ability: { icon: "🚀", name: "Missile Slice", desc: "Fires a fast missile volley that punches through obstacles." },
    upgrade: "Next Rank", xp: 90, xpMax: 400, locked: false
  },
  blimp4: {
    name: "Steampunk", mk: "Mk I", cls: "Armored Hauler", call: "IRON-4",
    stats: { Speed: 2, Lift: 3, Durability: 5, Maneuverability: 2, Boost: 5 },
    ability: { icon: "⚙", name: "Steam Overload", desc: "Releases a high-pressure steam blast that pushes hazards away." },
    upgrade: "Next Rank", xp: 60, xpMax: 400, locked: false
  },
  blimp5: {
    name: "Jade Voyager", mk: "Mk I", cls: "Tanker", call: "JADE-5",
    stats: { Speed: 3, Lift: 5, Durability: 4, Maneuverability: 2, Boost: 3 },
    ability: { icon: "💎", name: "Jade Ward", desc: "Forms a crystal ward that shields the ship for a short time." },
    upgrade: "Next Rank", xp: 0, xpMax: 450, locked: false
  },
  blimp6: {
    name: "Little Spy", mk: "Mk I", cls: "Recon Scout", call: "SPY-06",
    stats: { Speed: 3, Lift: 3, Durability: 4, Maneuverability: 3, Boost: 4 },
    ability: { icon: "👁", name: "Ghost Veil", desc: "A recon cloak pulse that makes the next few hits glance off." },
    upgrade: "Next Rank", xp: 0, xpMax: 450, locked: false
  },
  blimp7: {
    name: "Storm Chaser", mk: "Mk I", cls: "Interceptor", call: "STORM-7",
    stats: { Speed: 5, Lift: 3, Durability: 2, Maneuverability: 4, Boost: 5 },
    ability: { icon: "⚡", name: "Thunder Lance", desc: "Calls lightning that chains across nearby threats." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp8: {
    name: "Ironworks", mk: "Mk I", cls: "Heavy Freighter", call: "IRON-8",
    stats: { Speed: 2, Lift: 5, Durability: 5, Maneuverability: 2, Boost: 2 },
    ability: { icon: "🏗", name: "Iron Hail", desc: "Drops a cluster of scrap charges that shred obstacles." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp9: {
    name: "Jolly Rogers", mk: "Mk I", cls: "Raider", call: "ROGER-9",
    stats: { Speed: 4, Lift: 3, Durability: 3, Maneuverability: 4, Boost: 3 },
    ability: { icon: "☠", name: "Black Flag Bomb", desc: "Drops a pirate bomb that detonates and wipes the screen." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp10: {
    name: "Ivory Anchor", mk: "Mk I", cls: "Flagship", call: "IVORY-10",
    stats: { Speed: 3, Lift: 4, Durability: 4, Maneuverability: 3, Boost: 3 },
    ability: { icon: "⚓", name: "Anchor Barrier", desc: "Raises a radiant barrier that absorbs damage." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp11: {
    name: "War Shark", mk: "Mk I", cls: "Military Attack", call: "SHARK-11",
    stats: { Speed: 5, Lift: 2, Durability: 3, Maneuverability: 4, Boost: 5 },
    ability: { icon: "🦈", name: "Depth Charge", desc: "Launches a shark-torpedo that hunts the nearest threat." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp12: {
    name: "Sky Rocket", mk: "Mk I", cls: "Navy Rocket", call: "SKY-12",
    stats: { Speed: 4, Lift: 3, Durability: 4, Maneuverability: 3, Boost: 4 },
    ability: { icon: "💨", name: "Afterburner", desc: "A rocket burst that clears the lane ahead in a fiery streak." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp13: {
    name: "Iron Lattice", mk: "Mk I", cls: "Industrial", call: "FORGE-13",
    stats: { Speed: 2, Lift: 4, Durability: 5, Maneuverability: 2, Boost: 2 },
    ability: { icon: "🔧", name: "Gear Tempest", desc: "Spins a mechanical storm of gears that chews through hazards." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp14: {
    name: "Pirate Rocket", mk: "Mk I", cls: "Raider Rocket", call: "SKULL-14",
    stats: { Speed: 3, Lift: 4, Durability: 3, Maneuverability: 3, Boost: 3 },
    ability: { icon: "💣", name: "Powder Rocket", desc: "Fires a powder rocket that explodes in a wide blast." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  },
  blimp15: {
    name: "Royal Stripe", mk: "Mk I", cls: "Luxury Liner", call: "CROWN-15",
    stats: { Speed: 5, Lift: 2, Durability: 3, Maneuverability: 4, Boost: 5 },
    ability: { icon: "👑", name: "Royal Guard", desc: "Summons a royal escort aura that destroys nearby threats." },
    upgrade: "Next Rank", xp: 0, xpMax: 500, locked: false
  }
};

const STAT_ORDER = ['Speed', 'Lift', 'Durability', 'Maneuverability', 'Boost'];
const STAT_LABELS = {
  Speed: 'Speed',
  Lift: 'Lift',
  Durability: 'Durability',
  Maneuverability: 'Maneuverability',
  Boost: 'Boost Power'
};
const STAT_ICONS = { Speed: '', Lift: '', Durability: '', Maneuverability: '', Boost: '' };

function updateProfile(key) {
  const s = SHIP_STATS[key];
  if (!s) return;

  // Name sits under the animated hero blimp (not in the profile card)
  const heroName = document.getElementById('heroBlimpName');
  if (heroName) heroName.textContent = s.name;
  const legacyName = document.getElementById('heroName');
  if (legacyName) {
    legacyName.classList.remove('show');
    setTimeout(function() {
      legacyName.textContent = s.name;
      legacyName.classList.add('show');
    }, 80);
  }

  const heroWrap = document.querySelector('.heroBlimpWrap');
  if (heroWrap) {
    if (s.locked) heroWrap.classList.add('locked');
    else heroWrap.classList.remove('locked');
  }

  const mk = document.getElementById('bpMk');
  if (mk) mk.textContent = s.mk || 'Mk I';

  // Power-up block (formerly special ability) — all ships share Storm for now
  const powerName = document.getElementById('bpAbilityName');
  const powerDesc = document.getElementById('bpAbilityDesc');
  const SWARM_ABILITY = {
    blimp3: { name: "Pulse Missiles", desc: "Fires a volley of spinning energy missiles." },
    blimp4: { name: "Scout Drones", desc: "Launches steampunk drones that streak like missiles." },
    blimp5: { name: "Fuel Barrage", desc: "Spins out volatile fuel tanks that clear the sky." },
    blimp7: { name: "Thunder Orbs", desc: "Launches spinning lightning orbs from the hull." },
    blimp8: { name: "Oil Barrels", desc: "Hurls spinning oil barrels that wipe out threats." },
    blimp9: { name: "Pirate Bombs", desc: "Unleashes a swarm of spinning skull bombs." }
  };
  const ab = SWARM_ABILITY[key] || s.ability || { name: "Storm Cloud", desc: "Drops a storm cloud that clears every threat on screen." };
  if (powerName) powerName.textContent = ab.name;
  if (powerDesc) powerDesc.textContent = ab.desc;

  // Per-blimp power icon in profile
  const powerIcon = document.getElementById('bpPowerIcon');
  if (powerIcon) {
    const POWER_ICON_BY_SHIP = {
      blimp1: "01_flame_ring.webp",
      blimp2: "02_spike_burst.webp",
      blimp3: "03_frost_trail.webp",
      blimp4: "04_steam_engine.webp",
      blimp5: "05_solar_flare.webp",
      blimp6: "06_void_vortex.webp",
      blimp7: "07_storm_lightning.webp",
      blimp8: "08_meteor_trail.webp",
      blimp9: "09_bomb_skull.webp",
      blimp10: "10_storm_cloud.webp",
      blimp11: "11_shark_torpedo.webp",
      blimp12: "12_rocket_missile.webp",
      blimp13: "13_bomb_cluster.webp",
      blimp14: "14_powder_keg.webp",
      blimp15: "15_meteor_shower.webp"
    };
    const iconSrc = (s.powerIcon) || POWER_ICON_BY_SHIP[key] || "storm_icon_5.webp";
    if (powerIcon.getAttribute("src") !== iconSrc) {
      powerIcon.src = iconSrc;
    }
    powerIcon.alt = ab.name || "Power up";
  }

  const up = document.getElementById('bpUpgrade');
  if (up) up.textContent = s.upgrade || '—';
  const pct = s.xpMax ? Math.min(100, (s.xp / s.xpMax) * 100) : 0;
  const fill = document.getElementById('bpXpFill');
  if (fill) fill.style.width = pct + '%';
  const xpLab = document.getElementById('bpXpLabel');
  if (xpLab) xpLab.textContent = (s.xp || 0) + ' / ' + (s.xpMax || 0) + ' XP';
}

// blimps with a real in-game flight animation get that same animation on the
// menu hero card too; anything not listed here just shows its static image
const AA_ASSET_BASE = "";

// ---------- Flight-tutor cutscene assets — 36-frame idle/talk loop baked into a 6x6 sheet ----------
const TUTOR_SHEET_URL = AA_ASSET_BASE + "tutor_dialogue_sheet.webp?cb=2";
const TUTOR_COLS = 6, TUTOR_ROWS = 6, TUTOR_FRAMES = 36, TUTOR_FPS = 20;
function heroFramesFor(count, prefix) {
  return Array.from({ length: count }, (_, i) => AA_ASSET_BASE + prefix + String(i + 1).padStart(2, "0") + ".webp?cb=2");
}
const HERO_ANIM = {
  blimp1: { urls: heroFramesFor(36, "player_blimp_"), fps: 20 },
  blimp2: { urls: heroFramesFor(25, "blimp2_flight_"), fps: 18 },
  blimp3: { urls: heroFramesFor(25, "blimp3_flight_"), fps: 18 },
  blimp4: { urls: heroFramesFor(25, "blimp4_flight_"), fps: 18 },
  blimp5: { urls: heroFramesFor(36, "blimp5_flight_"), fps: 20 },
  blimp6: { urls: heroFramesFor(36, "ship_wood_"), fps: 20 },
  blimp7: { urls: heroFramesFor(25, "ship_lightning_"), fps: 20 },
  blimp8: { urls: heroFramesFor(36, "ship_cargo_"), fps: 20 },
  blimp9: { urls: heroFramesFor(36, "ship_pirate_"), fps: 20 },
  blimp10: { urls: heroFramesFor(36, "ship_ivory_"), fps: 20 },
  blimp11: { urls: heroFramesFor(36, "blimp11_flight_"), fps: 20 },
  blimp12: { urls: heroFramesFor(36, "blimp12_flight_"), fps: 20 },
  blimp13: { urls: heroFramesFor(36, "blimp13_flight_"), fps: 20 },
  blimp14: { urls: heroFramesFor(36, "blimp14_flight_"), fps: 20 },
  blimp15: { urls: heroFramesFor(36, "blimp15_flight_"), fps: 20 }
};

function blimpSrc(data) {
  return (typeof PLACEHOLDER_MODE !== "undefined" && PLACEHOLDER_MODE) ? renderPlaceholder(data.key) : data.url;
}

let selectedBlimp = "blimp1";

function selectBlimp(key, btn) {
  try {
    if (!key || typeof key !== "string") return;
    if (typeof BLIMP_DATA !== "undefined" && BLIMP_DATA && !BLIMP_DATA[key]) {
      console.warn("[selectBlimp] unknown key", key);
      return;
    }
    selectedBlimp = key;
    window.selectedBlimp = key;
    try { localStorage.setItem("aa_selected_blimp", key); } catch (e) {}

    // Active button state
    try {
      var buttons = document.querySelectorAll(".numBtn");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("active");
      }
      if (btn && btn.classList) btn.classList.add("active");
      else {
        var match = document.querySelector('.numBtn[onclick*="' + key + '"]');
        if (match) match.classList.add("active");
      }
    } catch (eBtn) {}

    try { startHeroAnimation(key); } catch (eAnim) { console.warn("hero anim", eAnim); }
    try { updateProfile(key); } catch (eProf) {}
    try { stopHeroFireAura(); } catch (eFx) {}
    try {
      if (typeof window.__airborneApplyShipPowerIcon === "function") {
        window.__airborneApplyShipPowerIcon();
      }
    } catch (eIcon) {}
    try { if (typeof sfxClick === "function") sfxClick(); } catch (eSfx) {}
  } catch (e) {
    console.warn("selectBlimp", e);
  }
}
window.selectBlimp = selectBlimp;

// ---------- Take Flight button → world map ----------
var __takeFlightLock = 0;
function onTakeFlightClick(e) {
  try {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  } catch (err) {}
  // Debounce double-fire (click + touchend)
  var now = Date.now();
  if (now - __takeFlightLock < 600) return;
  __takeFlightLock = now;

  console.log("[Take Flight] pressed");
  try { if (typeof sfxClick === "function") sfxClick(); } catch (e) {}
  try { if (typeof ensureAudio === "function") ensureAudio(); } catch (e) {}
  try {
    if (typeof window.closePowerPreviewModal === "function") window.closePowerPreviewModal();
  } catch (e) {}

  // Clear hangar-return latch so map can open
  window.__airborneReturnToHangar = false;

  try {
    if (typeof window.__airborneShowWorldMap === "function") {
      window.__airborneShowWorldMap({ mode: "start", fromHangar: true, force: true });
      return;
    }
  } catch (err) {
    console.warn("Take Flight map error", err);
  }
  // Fallback: jump straight into training level 1
  try {
    window.__airbornePendingMapLevel = 1;
    window.__airborneForceTrainRestart = true;
    var menu = document.getElementById("menuScreen");
    var game = document.getElementById("gameScreen");
    if (menu) menu.style.display = "none";
    if (game) game.style.display = "";
    if (typeof window.__airborneHardResetTraining === "function") window.__airborneHardResetTraining();
    if (typeof window.__airborneBeginRuff === "function") window.__airborneBeginRuff();
    else if (typeof startGame === "function") startGame();
  } catch (e2) {
    console.warn("Take Flight fallback", e2);
  }
}
window.onTakeFlightClick = onTakeFlightClick;

function bindTakeFlightButton() {
  var btn = document.getElementById("flyBtn");
  if (!btn) return;
  btn.style.pointerEvents = "auto";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "40";
  btn.style.position = "absolute";
  if (!btn.__takeFlightBound) {
    btn.__takeFlightBound = true;
    btn.addEventListener("click", onTakeFlightClick, true);
    btn.addEventListener("pointerup", function (e) {
      if (e.pointerType === "touch" || e.pointerType === "pen") onTakeFlightClick(e);
    }, true);
  }
}
// Capture-phase document delegation (survives re-renders)
if (!window.__takeFlightDocBound) {
  window.__takeFlightDocBound = true;
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "flyBtn" || (t.closest && t.closest("#flyBtn"))) {
      onTakeFlightClick(e);
    }
  }, true);
}
try {
  document.addEventListener("DOMContentLoaded", bindTakeFlightButton);
  setTimeout(bindTakeFlightButton, 50);
  setTimeout(bindTakeFlightButton, 500);
  setTimeout(bindTakeFlightButton, 1500);
} catch (e) {}



// Restore last selection
try {
  var saved = localStorage.getItem("aa_selected_blimp");
  if (saved && BLIMP_DATA && BLIMP_DATA[saved]) selectedBlimp = saved;
} catch (e) {}


const heroBlimpLayers = [
  document.getElementById("heroBlimpImgA"),
  document.getElementById("heroBlimpImgB")
];
const propBlur = document.getElementById("propBlur");
const smokeParticles = document.getElementById("smokeParticles");

let heroAnimRaf = null;
let heroAnimFrame = 0;
let heroAnimGen = 0;
let heroLastTick = 0;
let heroActiveLayer = 0; // 0 = layerA visible, 1 = layerB visible (only for ship switches)

function preloadImages(sources) {
  return Promise.all(sources.map(src => new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => (img.decode ? img.decode().then(resolve).catch(resolve) : resolve());
    img.onerror = resolve;
    img.src = src;
  })));
}

const heroAnimPrimed = {};
function primeHeroAnimation(key) {
  const anim = HERO_ANIM[key];
  if (!anim) return Promise.resolve();
  if (heroAnimPrimed[key]) return Promise.resolve();
  return preloadImages(anim.urls).then(() => { heroAnimPrimed[key] = true; });
}

function stopHeroAnimation() {
  if (heroAnimRaf) {
    cancelAnimationFrame(heroAnimRaf);
    heroAnimRaf = null;
  }
}


  function resetHeroPreviewSlot() {
    var wrap = document.querySelector(".heroBlimpWrap");
    if (wrap) {
      wrap.classList.remove("hero-small");
      wrap.style.cssText = "";
    }
    ["heroBlimpImgA", "heroBlimpImgB"].forEach(function (id) {
      var img = document.getElementById(id);
      if (!img) return;
      img.style.position = "absolute";
      img.style.left = "0";
      img.style.right = "0";
      img.style.top = "0";
      img.style.bottom = "0";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.margin = "0";
      img.style.padding = "0";
      img.style.transform = "none";
      img.style.objectFit = "contain";
      img.style.objectPosition = "center center";
    });
  }

function startHeroAnimation(key) {
  const gen = ++heroAnimGen;
  stopHeroAnimation();
  try { resetHeroPreviewSlot(); } catch (e) {}
  const [layerA, layerB] = heroBlimpLayers;
  if (!layerA || !layerB) return;
  const anim = (typeof PLACEHOLDER_MODE !== "undefined" && PLACEHOLDER_MODE) ? null : HERO_ANIM[key];

  // Visible layer for hard frame swaps (no per-frame opacity crossfade — that caused glitches)
  function visibleLayer() {
    return heroActiveLayer === 0 ? layerA : layerB;
  }
  function hiddenLayer() {
    return heroActiveLayer === 0 ? layerB : layerA;
  }

  // Soft crossfade ONLY when switching ships (not every frame)
  function crossfadeTo(url, done) {
    const front = visibleLayer();
    const back = hiddenLayer();
    back.style.transition = "none";
    back.style.opacity = "0";
    back.src = url;
    const finish = () => {
      void back.offsetWidth;
      back.style.transition = "opacity 0.18s ease-out";
      front.style.transition = "opacity 0.18s ease-out";
      back.style.opacity = "1";
      front.style.opacity = "0";
      heroActiveLayer = heroActiveLayer === 0 ? 1 : 0;
      setTimeout(() => { if (done) done(); }, 190);
    };
    if (back.decode) {
      back.decode().then(finish).catch(finish);
    } else {
      finish();
    }
  }

  if (!anim) {
    crossfadeTo(blimpSrc(BLIMP_DATA[key]));
    return;
  }

  heroAnimFrame = 0;
  const urls = anim.urls;
  const fps = Math.max(12, Math.min(24, anim.fps || 20));
  const frameMs = 1000 / fps;

  // Crossfade to first frame of the new ship, then hard-swap frames on the visible layer
  crossfadeTo(urls[0], () => {
    if (gen !== heroAnimGen) return;
    primeHeroAnimation(key).then(() => {
      if (gen !== heroAnimGen) return;
      heroLastTick = performance.now();
      const layer = visibleLayer();
      // Ensure hidden layer stays invisible during loop
      const hid = hiddenLayer();
      hid.style.transition = "none";
      hid.style.opacity = "0";
      layer.style.transition = "none";
      layer.style.opacity = "1";

      function tick(now) {
        // Shared aura (matches in-game PowerFX)
        try {
          if (window.PowerFX && __heroFxKind) {
            var fadeM = Math.max(0, Math.min(1, (__heroFxUntil - now) / 5000));
            var tM = now * 0.001;
            [document.getElementById("heroFireCanvasBack"), document.getElementById("heroFireCanvas")].forEach(function (cv) {
              if (!cv) return;
              var c = cv.getContext("2d");
              if (!c) return;
              window.PowerFX.drawAura(c, __heroFxKind === "saws" ? "missile" : __heroFxKind, cv.width * 0.5, cv.height * 0.52, tM, fadeM);
            });
          }
        } catch (e) {}

        if (gen !== heroAnimGen) return;
        if (now - heroLastTick >= frameMs) {
          heroLastTick = now;
          heroAnimFrame = (heroAnimFrame + 1) % urls.length;
          const url = urls[heroAnimFrame];
          // Hard swap on the already-visible layer — frames are pre-decoded
          if (layer.getAttribute("src") !== url) {
            layer.src = url;
          }
        }
        heroAnimRaf = requestAnimationFrame(tick);
      }
      heroAnimRaf = requestAnimationFrame(tick);
    });
  });
}

// Set the default hero image right away (placeholder mode skips the network round trip)
// Sync hangar to last selected ship (preview + profile + active chip)
(function syncHangarSelection() {
  var key = selectedBlimp || "blimp1";
  if (typeof BLIMP_DATA !== "undefined" && BLIMP_DATA && !BLIMP_DATA[key]) key = "blimp1";
  selectedBlimp = key;
  window.selectedBlimp = key;
  try { startHeroAnimation(key); } catch (e) {}
  try { updateProfile(key); } catch (e) {}
  try {
    var buttons = document.querySelectorAll(".numBtn");
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");
    var match = document.querySelector('.numBtn[onclick*="' + key + '"]');
    if (match) match.classList.add("active");
  } catch (e) {}
})();


// Preload every blimp asset (static hero images + full animation sets) once
// up front so switching, and the animation itself, never stutters. This also
// warms the browser's image cache for primeHeroAnimation() above.
preloadImages(Object.values(BLIMP_DATA).map(b => blimpSrc(b)));
if (!(typeof PLACEHOLDER_MODE !== "undefined" && PLACEHOLDER_MODE)) {
  preloadImages(Object.values(HERO_ANIM).flatMap(a => a.urls));
}
preloadImages([TUTOR_SHEET_URL]);

// ---------- Centralized volume preferences — music and SFX independently
// adjustable from the menu control panel, persisted, and applied to every
// sound source: menu music, gameplay MP3, the procedural music synth, and SFX. ----------
let musicVolumePref = 0.20; // menu default 20%
let sfxVolumePref = 1.0;
try {
  const savedMusicVol = localStorage.getItem("aa_music_vol");
  const savedSfxVol = localStorage.getItem("aa_sfx_vol");
  if (savedMusicVol !== null) musicVolumePref = Math.max(0, Math.min(1, parseFloat(savedMusicVol)));
  else musicVolumePref = 0.20;
  if (savedSfxVol !== null) sfxVolumePref = Math.max(0, Math.min(1, parseFloat(savedSfxVol)));
} catch (e) {}

function getGameplayMusicEl() {
  return document.getElementById("gameplayMusic");
}

let gameplayMusicFadeRaf = null;
function cancelGameplayMusicFade() {
  if (gameplayMusicFadeRaf != null) {
    cancelAnimationFrame(gameplayMusicFadeRaf);
    gameplayMusicFadeRaf = null;
  }
}

let gameplayMusicMuted = false;
try { gameplayMusicMuted = localStorage.getItem("aa_muted") === "1"; } catch (e) {}

function applyGameplayMusicVolumeNow() {
  const el = getGameplayMusicEl();
  // Gameplay MP3 still optional / disabled by default
  if (el && !window.__airborneGameplayMusicEnabled) {
    try { el.volume = 0; } catch (e) {}
  } else if (el) {
    try {
      el.volume = (gameplayMusicMuted || (typeof muted !== "undefined" && muted))
        ? 0
        : Math.max(0, Math.min(1, musicVolumePref));
    } catch (e) {}
  }
  const menuEl = document.getElementById("menuMusic");
  if (menuEl) {
    try {
      const isMuted = gameplayMusicMuted || (typeof muted !== "undefined" && muted);
      if (isMuted) menuEl.volume = 0;
      else if (!menuEl.paused) {
        var mv = Math.max(0, Math.min(1, musicVolumePref));
        if (window.__airborneMenuMusicDuck) mv *= 0.5;
        menuEl.volume = mv;
      }
    } catch (e) {}
  }
}


function setMusicVolumePref(v) {
  musicVolumePref = Math.max(0, Math.min(1, Number(v) || 0));
  try { localStorage.setItem("aa_music_vol", String(musicVolumePref)); } catch (e) {}
  cancelGameplayMusicFade();
  try { if (typeof menuMusicFadeStep === "function") menuMusicFadeStep(); } catch (e) {}
  applyGameplayMusicVolumeNow();
  if (window.__airborneSetSynthMusicVolume) window.__airborneSetSynthMusicVolume(musicVolumePref);
}
function setSfxVolumePref(v) {
  sfxVolumePref = Math.max(0, Math.min(1, v));
  try { localStorage.setItem("aa_sfx_vol", String(sfxVolumePref)); } catch (e) {}
  if (window.__airborneSetSfxVolume) window.__airborneSetSfxVolume(sfxVolumePref);
}

// wire up the actual slider UI on the menu screen
(function initVolumeControls() {
  const musicSlider = document.getElementById("musicVolumeSlider");
  const sfxSlider = document.getElementById("sfxVolumeSlider");
  const musicValueEl = document.getElementById("musicVolumeValue");
  const sfxValueEl = document.getElementById("sfxVolumeValue");
  if (musicSlider) {
    musicSlider.value = Math.round(musicVolumePref * 100);
    if (musicValueEl) musicValueEl.textContent = musicSlider.value + "%";
    musicSlider.addEventListener("input", () => {
      const v = parseInt(musicSlider.value, 10) / 100;
      setMusicVolumePref(v);
      if (musicValueEl) musicValueEl.textContent = musicSlider.value + "%";
    });
  }
  if (sfxSlider) {
    sfxSlider.value = Math.round(sfxVolumePref * 100);
    if (sfxValueEl) sfxValueEl.textContent = sfxSlider.value + "%";
    sfxSlider.addEventListener("input", () => {
      const v = parseInt(sfxSlider.value, 10) / 100;
      setSfxVolumePref(v);
      if (sfxValueEl) sfxValueEl.textContent = sfxSlider.value + "%";
    });
  }
})();


// ---------- Splash page music (banking_into_the_blue.mp3) — stops/fades on Enter Hangar ----------
const splashMusic = document.getElementById("splashMusic");
let splashMusicUnlocked = false;
const SPLASH_MUSIC_VOL = 0.20; // 20%

function startSplashMusic() {
  if (!splashMusic) return;
  if (window.__airborneLeftSplash) {
    try { stopSplashMusicImmediately(); } catch (e) {}
    return;
  }
  try {
    const isMuted = (typeof gameplayMusicMuted !== "undefined" && gameplayMusicMuted)
      || (typeof muted !== "undefined" && muted);
    splashMusic.loop = true;
    splashMusic.volume = isMuted ? 0 : SPLASH_MUSIC_VOL;
    const p = splashMusic.play();
    if (p && typeof p.then === "function") {
      p.then(function () { splashMusicUnlocked = true; }).catch(function () {});
    } else {
      splashMusicUnlocked = true;
    }
  } catch (e) {}
}

function fadeOutSplashMusic(done) {
  if (!splashMusic || splashMusic.paused) {
    if (typeof done === "function") done();
    return;
  }
  const fadeMs = 480;
  const startVol = splashMusic.volume;
  const t0 = performance.now();
  (function step() {
    const p = Math.min(1, (performance.now() - t0) / fadeMs);
    try { splashMusic.volume = startVol * (1 - p); } catch (e) {}
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      try { splashMusic.pause(); splashMusic.currentTime = 0; splashMusic.volume = 0; } catch (e) {}
      if (typeof done === "function") done();
    }
  })();
}

function stopSplashMusicImmediately() {
  if (!splashMusic) return;
  try { splashMusic.pause(); splashMusic.currentTime = 0; splashMusic.volume = 0; } catch (e) {}
}

// Pause all page music when the tab/app is backgrounded
document.addEventListener("visibilitychange", function () {
  try {
    if (document.hidden) {
      if (splashMusic && !splashMusic.paused) {
        splashMusic.dataset.wasPlaying = "1";
        splashMusic.pause();
      }
      if (menuMusic && !menuMusic.paused) {
        menuMusic.dataset.wasPlaying = "1";
        menuMusic.pause();
      }
      var gm = document.getElementById("gameplayMusic");
      if (gm && !gm.paused) {
        gm.dataset.wasPlaying = "1";
        gm.pause();
      }
      ["trainingMusic", "trainingBossMusic"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.paused) {
          el.dataset.wasPlaying = "1";
          el.pause();
        }
      });
      try {
        if (typeof window.__airborneStopTrainingMusic === "function") window.__airborneStopTrainingMusic(true);
        if (typeof stopTrainingBossMusic === "function") stopTrainingBossMusic(true);
      } catch (e) {}
    } else {
      // Resume only if we were playing before hide
      if (!window.__airborneLeftSplash && splashMusic && splashMusic.dataset.wasPlaying === "1") {
        splashMusic.dataset.wasPlaying = "";
        startSplashMusic();
      }
      if (window.__airborneLeftSplash && menuMusic && menuMusic.dataset.wasPlaying === "1") {
        menuMusic.dataset.wasPlaying = "";
        startMenuMusic();
      }
      var gm2 = document.getElementById("gameplayMusic");
      if (gm2 && gm2.dataset.wasPlaying === "1" && window.__airborneGameplayMusicEnabled) {
        gm2.dataset.wasPlaying = "";
        try { gm2.play(); } catch (e) {}
      }
    }
  } catch (e) {}
});


// ---------- Menu background music — a real audio file, faded in/out at the
// loop seam so restarting the track doesn't sound like a hard cut ----------
const menuMusic = document.getElementById("menuMusic");
const MENU_MUSIC_FADE_SEC = 1.5; // fade in at the start / fade out near the end of each loop
let menuMusicUnlocked = false;   // becomes true once a user gesture lets audio actually play

try {
  menuMusicUnlocked = false;
  const wasMuted = localStorage.getItem("aa_muted") === "1";
  if (menuMusic) menuMusic.volume = 0; // always start silent; timeupdate ramps it up
  if (wasMuted && menuMusic) menuMusic.dataset.userMuted = "1";
} catch (e) {}

function menuMusicFadeStep() {
  if (!menuMusic || menuMusic.paused || !menuMusic.duration) return;
  if (menuMusic.dataset.userMuted === "1") { menuMusic.volume = 0; return; }
  const t = menuMusic.currentTime;
  const d = menuMusic.duration;
  let vol = musicVolumePref;
  if (t < MENU_MUSIC_FADE_SEC) {
    vol = musicVolumePref * (t / MENU_MUSIC_FADE_SEC);
  } else if (t > d - MENU_MUSIC_FADE_SEC) {
    vol = musicVolumePref * Math.max(0, (d - t) / MENU_MUSIC_FADE_SEC);
  }
  // Duck 50% while power-up preview is open
  if (window.__airborneMenuMusicDuck) vol *= 0.5;
  menuMusic.volume = Math.max(0, Math.min(musicVolumePref, vol));
}
if (menuMusic) menuMusic.addEventListener("timeupdate", menuMusicFadeStep);

function setMenuMusicVolumeNow() {
  if (!menuMusic) return;
  try {
    if (menuMusic.dataset.userMuted === "1") { menuMusic.volume = 0; return; }
    var isMuted = gameplayMusicMuted || (typeof muted !== "undefined" && muted);
    var vol = isMuted ? 0 : Math.max(0, Math.min(1, typeof musicVolumePref === "number" ? musicVolumePref : 0.20));
    if (window.__airborneMenuMusicDuck) vol *= 0.5;
    menuMusic.volume = vol;
  } catch (e) {}
}

function startMenuMusic() {

  if (!menuMusic) return;
  // Never play menu track while splash is still up
  try {
    var splash = document.getElementById("splashScreen");
    if (splash && !splash.classList.contains("hidden") && splash.style.display !== "none") {
      return;
    }
  } catch (e) {}
  try {
    const isMuted = gameplayMusicMuted || (typeof muted !== "undefined" && muted);
    menuMusic.loop = true;
    const vol = isMuted ? 0 : Math.max(0, Math.min(1, (typeof musicVolumePref === "number" ? musicVolumePref : 0.20)));
    menuMusic.volume = vol;
    const p = menuMusic.play();
    if (p && typeof p.then === "function") {
      p.then(function () {
        menuMusicUnlocked = true;
        try {
          var _mv = isMuted ? 0 : Math.max(0, Math.min(1, musicVolumePref));
          if (window.__airborneMenuMusicDuck) _mv *= 0.5;
          menuMusic.volume = _mv;
        } catch (e) {}
      }).catch(function () {});
    } else {
      menuMusicUnlocked = true;
    }
  } catch (e) {}
}

function stopMenuMusicImmediately() {
  if (!menuMusic || menuMusic.paused) return;
  menuMusic.pause();
  menuMusic.currentTime = 0;
}
window.stopSplashMusicImmediately = stopSplashMusicImmediately;
window.startSplashMusic = startSplashMusic;
window.startMenuMusic = startMenuMusic;
window.stopMenuMusicImmediately = stopMenuMusicImmediately;

// Splash music: OTG loading/poster counts as splash (legacy #splashScreen is hidden)
function __aaIsSplashPhase() {
  if (window.__airborneLeftSplash) return false;
  try {
    var load = document.getElementById("otg-loading");
    if (load && !load.classList.contains("otg-hidden") && load.style.display !== "none") return true;
    var otg = document.getElementById("otg-splash");
    if (otg && otg.classList.contains("otg-visible")) return true;
    var splash = document.getElementById("splashScreen");
    if (splash && !splash.classList.contains("hidden") && splash.style.display !== "none") {
      var vis = window.getComputedStyle(splash).visibility;
      if (vis !== "hidden") return true;
    }
  } catch (e) {}
  return false;
}
window.__aaIsSplashPhase = __aaIsSplashPhase;

startSplashMusic();
document.addEventListener("pointerdown", function unlockSplashOrMenu() {
  if (window.__airborneLeftSplash) {
    try { stopSplashMusicImmediately(); } catch (e) {}
    if (!menuMusicUnlocked) startMenuMusic();
    return;
  }
  if (__aaIsSplashPhase()) {
    startSplashMusic();
  } else {
    try { stopSplashMusicImmediately(); } catch (e) {}
    if (!menuMusicUnlocked) startMenuMusic();
  }
}, { passive: true });
// Also unlock on first touch/click anywhere during load
document.addEventListener("touchstart", function () {
  if (!window.__airborneLeftSplash && __aaIsSplashPhase()) startSplashMusic();
}, { passive: true, once: false });

window.__airborneShowMenu = () => {
  var key = selectedBlimp || "blimp1";
  try {
    var saved = localStorage.getItem("aa_selected_blimp");
    if (saved && typeof BLIMP_DATA !== "undefined" && BLIMP_DATA[saved]) key = saved;
  } catch (e) {}
  selectedBlimp = key;
  window.selectedBlimp = key;
  try { startHeroAnimation(key); } catch (e) {}
  try {
    var buttons = document.querySelectorAll(".numBtn");
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");
    var match = document.querySelector('.numBtn[onclick*="' + key + '"]');
    if (match) match.classList.add("active");
  } catch (e) {}
  try {
    var splash = document.getElementById("splashScreen");
    var onSplash = splash && !splash.classList.contains("hidden") && splash.style.display !== "none";
    if (!onSplash) startMenuMusic();
  } catch (e) { startMenuMusic(); }
  try { stopHeroFireAura(); } catch (e) {}
  try { updateProfile(key); } catch (e) {}
};

window.__airborneLeftSplash = false;

const splashEnterBtn = document.getElementById("splashEnterBtn");
if (splashEnterBtn) {
  splashEnterBtn.addEventListener("click", () => {
    if (window.__airborneStopSplashRadar) window.__airborneStopSplashRadar();
    window.__airborneLeftSplash = true;
    const s = document.getElementById("splashScreen");
    if (s) s.classList.add("fade-out");
    // Hard-stop splash audio immediately, then fade leftover volume if any
    try { stopSplashMusicImmediately(); } catch (e) {}
    fadeOutSplashMusic(function () {
      try { stopSplashMusicImmediately(); } catch (e) {}
      try {
        if (s) {
          s.classList.add("hidden");
          s.style.display = "none";
        }
      } catch (e) {}
      startMenuMusic();
    });
    // Safety: force-stop splash again after fade window
    setTimeout(function () {
      try { stopSplashMusicImmediately(); } catch (e) {}
      try {
        if (s) {
          s.classList.add("hidden");
          s.style.display = "none";
        }
      } catch (e) {}
    }, 600);
  });
}

// ---------- Gameplay background music — a real audio file (skyward-march 2.mp3)
// that plays during actual flight. Controlled from the inner game IIFE via the
// window bridge below, hooked into its existing startMusic()/stopMusic()/
// setMuted() calls — so every place that already turns the procedural music
// on or off (game start, retry, checkpoint resume, crash) automatically drives
// this track too, with no extra call sites needed. ----------
const gameplayMusic = document.getElementById("gameplayMusic");
const GAMEPLAY_MUSIC_FADE_MS = 900;
// gameplayMusicMuted declared above with volume helpers
if (gameplayMusic) gameplayMusic.volume = 0;

function fadeGameplayMusicVolume(target, thenPause) {
  const el = getGameplayMusicEl();
  if (!el) return;
  cancelGameplayMusicFade();
  const startVol = el.volume;
  const startedAt = performance.now();
  (function step() {
    const p = Math.min(1, (performance.now() - startedAt) / GAMEPLAY_MUSIC_FADE_MS);
    el.volume = startVol + (target - startVol) * p;
    if (p < 1) {
      gameplayMusicFadeRaf = requestAnimationFrame(step);
    } else {
      gameplayMusicFadeRaf = null;
      if (thenPause) {
        el.pause();
      } else {
        applyGameplayMusicVolumeNow();
      }
    }
  })();
}

function startGameplayMusic() {
  // MP3 gameplay music disabled — SFX only
  const el = getGameplayMusicEl();
  if (el) { try { el.volume = 0; el.pause(); } catch (e) {} }
  cancelGameplayMusicFade();
}

function stopGameplayMusic() {
  const el = getGameplayMusicEl();
  if (!el || el.paused) return;
  fadeGameplayMusicVolume(0, true);
}

function setGameplayMusicMuted(m) {
  gameplayMusicMuted = !!m;
  cancelGameplayMusicFade();
  applyGameplayMusicVolumeNow();
}

window.__airborneStartGameplayMusic = startGameplayMusic;
window.__airborneStopGameplayMusic = stopGameplayMusic;
window.__airborneSetGameplayMusicMuted = setGameplayMusicMuted;
window.__airborneSetMusicVolume = setMusicVolumePref;
window.__airborneApplyGameplayMusicVolume = applyGameplayMusicVolumeNow;

function setEffect(effect) {
  if (!propBlur || !smokeParticles) return;
  propBlur.style.display = effect === "propeller" ? "block" : "none";
  // Exhaust modes: smoke | steam | flame | blackSmoke
  const exhaustModes = ["smoke", "steam", "flame", "blackSmoke"];
  if (exhaustModes.indexOf(effect) >= 0) {
    smokeParticles.style.display = "block";
    smokeParticles.dataset.mode = effect;
  } else {
    smokeParticles.style.display = "none";
    smokeParticles.dataset.mode = "";
  }
}


  
  
  
  // ----- Zeppelin Ace: flames-only aura (profile icon click, 5s) -----
  var __heroFireRaf = 0;
  var __heroFireLast = 0;
  var __heroFireEmbers = [];
  var __heroFireFlames = [];
  var __heroFireUntil = 0;

  /* removed */



  /* removed */



function powerPreviewKindFor(key) {
    return ((typeof POWER_PREVIEW_KIND !== "undefined" && POWER_PREVIEW_KIND) ? POWER_PREVIEW_KIND[key] : null) || "storm";
  }

  /* removed */



  /* removed */


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMenuPowerPreview);
  } else {
    bindMenuPowerPreview();
  }
  setTimeout(bindMenuPowerPreview, 500);


  var __heroFireRaf = 0;
  var __heroFireSheet = null;
  var __heroFireFrame = 0;
  var __heroFireFrameT = 0;
  var __heroFireEmbers = [];
  var __heroFireLast = 0;
  var __heroFireUntil = 0;

  /* rm loadHeroFireSheet */


  /* rm stopHeroFireAura */


  /* rm startHeroFireAura */


  /* rm playMenuPowerPreview */


  /* rm bindMenuPowerPreview */



  var __heroFxRaf = 0;
  var __heroFxLast = 0;
  var __heroFxUntil = 0;
  var __heroFxKind = "";
  var __heroFxParticles = [];

  
  function stopHeroFireAura() {
    if (__heroFxRaf) {
      cancelAnimationFrame(__heroFxRaf);
      __heroFxRaf = 0;
    }
    __heroFxUntil = 0;
    __heroFxKind = "";
    __heroFxParticles = [];
    ["heroFireCanvas", "heroFireCanvasBack"].forEach(function (id) {
      var c = document.getElementById(id);
      if (!c) return;
      c.classList.remove("active");
      try {
        var ctx2 = c.getContext("2d");
        if (ctx2) ctx2.clearRect(0, 0, c.width, c.height);
      } catch (e) {}
    });
  }

  // alias
  function stopHeroPowerFx() { stopHeroFireAura(); }


  
  
  
  function startHeroPowerFx(kind) {
    var cFront = document.getElementById("heroFireCanvas");
    var cBack = document.getElementById("heroFireCanvasBack");
    if (!cFront) return;
    if (!cBack) cBack = cFront;

    var wrap = document.querySelector(".heroBlimpWrap");
    var rect = (wrap || cFront).getBoundingClientRect();
    var w = Math.max(300, Math.floor(rect.width * 1.75) || 440);
    var h = Math.max(240, Math.floor(rect.height * 1.75) || 340);

    [cFront, cBack].forEach(function (c) {
      if (!c) return;
      c.classList.add("active");
      c.width = w;
      c.height = h;
      c.style.display = "block";
      c.style.visibility = "visible";
      c.style.opacity = "1";
    });

    __heroFxKind = kind || "fire";
    __heroFxParticles = [];
    __heroFxLast = performance.now();
    __heroFxUntil = performance.now() + 5500;
    if (__heroFxRaf) cancelAnimationFrame(__heroFxRaf);

    var cores = [];
    var orbKinds = { fire: 1, bluefireball: 1, greenfireball: 1, fireball: 1, royal: 1, warshark: 1 };
    if (orbKinds[__heroFxKind]) {
      var nCore = (__heroFxKind === "fire") ? 12 : (__heroFxKind === "warshark" ? 5 : 8);
      for (var ci = 0; ci < nCore; ci++) {
        cores.push({
          ang: (ci / nCore) * Math.PI * 2,
          elev: (Math.random() - 0.5) * 0.35,
          speed: 1.35 + Math.random() * 1.1,
          size: 0.7 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function drawFlameAt(ctx2, ox, oy, baseR, fade) {
      ctx2.globalCompositeOperation = "lighter";
      var g3 = ctx2.createRadialGradient(ox, oy + baseR * 0.3, 0, ox, oy, baseR * 2.4);
      g3.addColorStop(0, "rgba(255,80,10," + (0.35 * fade) + ")");
      g3.addColorStop(0.45, "rgba(180,30,0," + (0.15 * fade) + ")");
      g3.addColorStop(1, "rgba(40,0,0,0)");
      ctx2.fillStyle = g3;
      ctx2.beginPath();
      ctx2.arc(ox, oy, baseR * 2.4, 0, Math.PI * 2);
      ctx2.fill();
      var g2 = ctx2.createRadialGradient(ox - baseR * 0.15, oy - baseR * 0.2, 0, ox, oy, baseR * 1.4);
      g2.addColorStop(0, "rgba(255,170,40," + (0.75 * fade) + ")");
      g2.addColorStop(0.5, "rgba(255,90,10," + (0.45 * fade) + ")");
      g2.addColorStop(1, "rgba(200,40,0,0)");
      ctx2.fillStyle = g2;
      ctx2.beginPath();
      ctx2.arc(ox, oy, baseR * 1.4, 0, Math.PI * 2);
      ctx2.fill();
      var g1 = ctx2.createRadialGradient(ox - baseR * 0.1, oy - baseR * 0.25, 0, ox, oy, baseR * 0.7);
      g1.addColorStop(0, "rgba(255,255,230," + (0.95 * fade) + ")");
      g1.addColorStop(0.35, "rgba(255,220,100," + (0.7 * fade) + ")");
      g1.addColorStop(1, "rgba(255,120,0,0)");
      ctx2.fillStyle = g1;
      ctx2.beginPath();
      ctx2.arc(ox, oy, baseR * 0.7, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalCompositeOperation = "source-over";
    }

    function tick(now) {
        // Shared aura (matches in-game PowerFX)
        try {
          if (window.PowerFX && __heroFxKind) {
            var fadeM = Math.max(0, Math.min(1, (__heroFxUntil - now) / 5000));
            var tM = now * 0.001;
            [cBack, cFront].forEach(function (cv) {
              if (!cv) return;
              var c = cv.getContext("2d");
              if (!c) return;
              window.PowerFX.drawAura(c, __heroFxKind === "saws" ? "missile" : __heroFxKind, cv.width * 0.5, cv.height * 0.52, tM, fadeM);
            });
          }
        } catch (e) {}

      var key = (typeof selectedBlimp !== "undefined") ? selectedBlimp : "blimp1";
      var needMap = {
        fire: "blimp1", shockwave: "blimp2", saws: "blimp3", steam: "blimp4",
        sunblade: "blimp5", vortex: "blimp6", chain: "blimp7", electric: "blimp7",
        crystalbeam: "blimp8", rockets: "blimp12", meteors: "blimp15"
      };
      var need = needMap[__heroFxKind] || key;
      if (key !== need) { stopHeroFireAura(); return; }
      if (now >= __heroFxUntil) { stopHeroFireAura(); return; }

      var dt = Math.min(0.05, (now - __heroFxLast) / 1000);
      __heroFxLast = now;
      var lifeLeft = Math.max(0, (__heroFxUntil - now) / 5000);
      var fade = lifeLeft < 0.2 ? lifeLeft / 0.2 : 1;
      var ctxF = cFront.getContext("2d");
      var ctxB = cBack.getContext("2d");
      ctxF.clearRect(0, 0, w, h);
      ctxB.clearRect(0, 0, w, h);
      var cx = w * 0.5;
      var cy = h * 0.52;
      var tnow = now * 0.001;
      var bw = Math.min(w, h) * 0.4;
      var bh = Math.min(w, h) * 0.3;

      
      // Gameplay PowerFX aura on menu blimp (matches in-game drawAura)
      try {
        if (window.PowerFX && window.__menuPowerFxUntil && performance.now() < window.__menuPowerFxUntil) {
          window.PowerFX.update(dt);
          window.PowerFX.drawAura(ctxF, __heroFxKind, cx, cy, tnow, fade);
          window.PowerFX.draw(ctxF);
        }
      } catch (ePF) {}

      if (__heroFxKind === "fire") {
        // Haze on both layers lightly
        [ctxB, ctxF].forEach(function (ctx2, li) {
          var haze = ctx2.createRadialGradient(cx, cy, bw * 0.1, cx, cy, bw * 0.75);
          haze.addColorStop(0, "rgba(255,120,20," + ((li === 0 ? 0.1 : 0.06) * fade) + ")");
          haze.addColorStop(1, "rgba(0,0,0,0)");
          ctx2.fillStyle = haze;
          ctx2.beginPath();
          ctx2.arc(cx, cy, bw * 0.75, 0, Math.PI * 2);
          ctx2.fill();
        });

        for (var i = 0; i < cores.length; i++) {
          var core = cores[i];
          core.ang += core.speed * dt;
          // depth: sin of angle → behind when sin > 0 (going "away"), front when sin < 0
          // Use cos for left-right; depth from sin so half orbit is behind
          var depth = Math.sin(core.ang); // -1 front, +1 back
          var ox = cx + Math.cos(core.ang) * bw * 0.58;
          var oy = cy + Math.sin(core.ang * 1.05 + core.elev) * bh * 0.5;
          var flicker = 0.85 + 0.15 * Math.sin(tnow * 12 + core.phase);
          var baseR = Math.min(w, h) * 0.055 * core.size * flicker;
          // Scale slightly smaller when behind for depth
          if (depth > 0) baseR *= 0.82;

          var ctx2 = depth > 0 ? ctxB : ctxF;
          drawFlameAt(ctx2, ox, oy, baseR, fade * (depth > 0 ? 0.75 : 1));

          if (Math.random() < 0.4) {
            __heroFxParticles.push({
              x: ox, y: oy,
              vx: -Math.sin(core.ang) * 28 + (Math.random() - 0.5) * 36,
              vy: -40 - Math.random() * 55,
              life: 0.25 + Math.random() * 0.3,
              age: 0,
              r: 1.2 + Math.random() * 2.6,
              depth: depth
            });
          }
        }

        for (var pi = __heroFxParticles.length - 1; pi >= 0; pi--) {
          var p = __heroFxParticles[pi];
          p.age += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 50 * dt;
          if (p.age >= p.life) { __heroFxParticles.splice(pi, 1); continue; }
          var u = 1 - p.age / p.life;
          var ctxP = (p.depth > 0) ? ctxB : ctxF;
          ctxP.globalCompositeOperation = "lighter";
          ctxP.globalAlpha = u * u * 0.9 * fade;
          var eg = ctxP.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.5);
          eg.addColorStop(0, "rgba(255,240,160,1)");
          eg.addColorStop(0.4, "rgba(255,140,30,0.7)");
          eg.addColorStop(1, "rgba(255,40,0,0)");
          ctxP.fillStyle = eg;
          ctxP.beginPath();
          ctxP.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
          ctxP.fill();
          ctxP.globalAlpha = 1;
          ctxP.globalCompositeOperation = "source-over";
        }
        if (__heroFxParticles.length > 60) __heroFxParticles.splice(0, __heroFxParticles.length - 60);

      } else if (__heroFxKind === "shockwave") {
        var elapsed = (5000 - (__heroFxUntil - now)) / 1000;
        // Draw expanding rings on BOTH layers with different alpha so blimp sits "inside"
        for (var ring = 0; ring < 4; ring++) {
          var phase = elapsed * 1.1 - ring * 0.35;
          if (phase < 0) continue;
          var rr = (phase % 1.4) / 1.4;
          var radR = Math.min(w, h) * (0.12 + rr * 0.48);
          var alphaR = (1 - rr) * 0.7 * fade;
          // Back: full ring slightly dimmer
          ctxB.beginPath();
          ctxB.arc(cx, cy, radR, 0, Math.PI * 2);
          ctxB.strokeStyle = "rgba(160, 220, 255," + (alphaR * 0.55) + ")";
          ctxB.lineWidth = 5 + (1 - rr) * 7;
          ctxB.stroke();
          // Front: only the "near" arc (bottom half-ish) brighter
          ctxF.beginPath();
          ctxF.arc(cx, cy, radR, 0.15 * Math.PI, 0.85 * Math.PI);
          ctxF.strokeStyle = "rgba(200, 240, 255," + alphaR + ")";
          ctxF.lineWidth = 4 + (1 - rr) * 8;
          ctxF.shadowColor = "rgba(120, 200, 255, 0.85)";
          ctxF.shadowBlur = 12;
          ctxF.stroke();
          ctxF.shadowBlur = 0;
        }

      } else if (__heroFxKind === "saws") {
        // Crossing rings: back layer draws rear arcs, front draws near arcs — blimp in middle
        var spin = tnow * 1.8;
        var R = Math.min(w, h) * 0.38;

        function drawRingLayer(ctx2, tilt, rear) {
          ctx2.save();
          ctx2.translate(cx, cy);
          ctx2.rotate(tilt);
          ctx2.scale(1, 0.42);
          ctx2.lineCap = "round";
          ctx2.globalCompositeOperation = "lighter";
          // Full dim ring on back; front only bright arcs
          if (rear) {
            ctx2.beginPath();
            ctx2.arc(0, 0, R, 0, Math.PI * 2);
            ctx2.strokeStyle = "rgba(70, 150, 255," + (0.22 * fade) + ")";
            ctx2.lineWidth = 16;
            ctx2.stroke();
            ctx2.beginPath();
            ctx2.arc(0, 0, R, 0, Math.PI * 2);
            ctx2.strokeStyle = "rgba(130, 200, 255," + (0.55 * fade) + ")";
            ctx2.lineWidth = 5;
            ctx2.stroke();
            // rear half brighter on back canvas
            ctx2.beginPath();
            ctx2.arc(0, 0, R, Math.PI * 0.15, Math.PI * 0.85);
            ctx2.strokeStyle = "rgba(180, 230, 255," + (0.5 * fade) + ")";
            ctx2.lineWidth = 4;
            ctx2.stroke();
          } else {
            ctx2.beginPath();
            ctx2.arc(0, 0, R, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx2.strokeStyle = "rgba(100, 180, 255," + (0.35 * fade) + ")";
            ctx2.lineWidth = 14;
            ctx2.stroke();
            ctx2.beginPath();
            ctx2.arc(0, 0, R, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx2.strokeStyle = "rgba(200, 240, 255," + (0.95 * fade) + ")";
            ctx2.lineWidth = 5;
            ctx2.shadowColor = "rgba(120, 200, 255, 0.9)";
            ctx2.shadowBlur = 14;
            ctx2.stroke();
            // traveling highlight
            ctx2.beginPath();
            ctx2.arc(0, 0, R, spin, spin + Math.PI * 0.45);
            ctx2.strokeStyle = "rgba(240, 250, 255," + (0.95 * fade) + ")";
            ctx2.lineWidth = 3;
            ctx2.stroke();
            ctx2.shadowBlur = 0;
          }
          ctx2.restore();
          ctx2.globalCompositeOperation = "source-over";
        }

        var tiltA = Math.PI / 4 + Math.sin(spin * 0.3) * 0.08;
        var tiltB = -Math.PI / 4 - Math.sin(spin * 0.3) * 0.08;
        drawRingLayer(ctxB, tiltA, true);
        drawRingLayer(ctxB, tiltB, true);
        drawRingLayer(ctxF, tiltA, false);
        drawRingLayer(ctxF, tiltB, false);

        // Center crossing sparks on front
        ctxF.globalCompositeOperation = "lighter";
        for (var s = 0; s < 5; s++) {
          var sa = spin * 2 + s * (Math.PI * 2 / 5);
          var sx = cx + Math.cos(sa) * R * 0.2;
          var sy = cy + Math.sin(sa * 1.3) * R * 0.1;
          var sg = ctxF.createRadialGradient(sx, sy, 0, sx, sy, 7);
          sg.addColorStop(0, "rgba(220,245,255," + (0.65 * fade) + ")");
          sg.addColorStop(1, "rgba(80,160,255,0)");
          ctxF.fillStyle = sg;
          ctxF.beginPath();
          ctxF.arc(sx, sy, 7, 0, Math.PI * 2);
          ctxF.fill();
        }

        ctxF.globalCompositeOperation = "source-over";
      } else if (__heroFxKind === "steam") {
        // Steampunk — billowing steam jets orbiting / venting around the ship
        for (var si = 0; si < 3; si++) {
          if (Math.random() < 0.7) {
            var sang = Math.random() * Math.PI * 2;
            var side = Math.sin(sang);
            __heroFxParticles.push({
              x: cx + Math.cos(sang) * bw * 0.35,
              y: cy + Math.sin(sang) * bh * 0.25 + bh * 0.15,
              vx: (Math.random() - 0.5) * 25,
              vy: -30 - Math.random() * 50,
              life: 0.7 + Math.random() * 0.6,
              age: 0,
              r: 8 + Math.random() * 14,
              depth: side,
              type: "steam"
            });
          }
        }
        for (var spi = __heroFxParticles.length - 1; spi >= 0; spi--) {
          var sp = __heroFxParticles[spi];
          sp.age += dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vx *= 0.99;
          sp.r += 18 * dt;
          if (sp.age >= sp.life) { __heroFxParticles.splice(spi, 1); continue; }
          var su = 1 - sp.age / sp.life;
          var ctxS = sp.depth > 0 ? ctxB : ctxF;
          ctxS.globalCompositeOperation = "source-over";
          var sg = ctxS.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r);
          sg.addColorStop(0, "rgba(245,245,250," + (0.55 * su * fade) + ")");
          sg.addColorStop(0.4, "rgba(200,205,215," + (0.28 * su * fade) + ")");
          sg.addColorStop(1, "rgba(160,165,175,0)");
          ctxS.fillStyle = sg;
          ctxS.beginPath();
          ctxS.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctxS.fill();
        }
        // Brass-tinted vent rings behind / in front
        for (var vr = 0; vr < 2; vr++) {
          var ctxV = vr === 0 ? ctxB : ctxF;
          var vspin = tnow * (0.8 + vr * 0.4);
          ctxV.strokeStyle = "rgba(200, 170, 120," + ((vr === 0 ? 0.25 : 0.4) * fade) + ")";
          ctxV.lineWidth = 2;
          ctxV.beginPath();
          ctxV.ellipse(cx, cy + bh * 0.1, bw * (0.45 + vr * 0.08), bh * 0.22, vspin * 0.2, 0, Math.PI * 2);
          ctxV.stroke();
        }
        if (__heroFxParticles.length > 70) __heroFxParticles.splice(0, __heroFxParticles.length - 70);

      } else if (__heroFxKind === "sunblade") {
        // Jade Voyager — sun behind ship with rotating fire blades
        var sunSpin = tnow * 1.4;
        var sunR = Math.min(w, h) * 0.22;
        // BACK: sun disc + rear blades
        ctxB.save();
        ctxB.translate(cx, cy - bh * 0.05);
        // Sun core
        var sunG = ctxB.createRadialGradient(0, 0, 0, 0, 0, sunR * 1.6);
        sunG.addColorStop(0, "rgba(255,245,180," + (0.95 * fade) + ")");
        sunG.addColorStop(0.35, "rgba(255,180,40," + (0.7 * fade) + ")");
        sunG.addColorStop(0.7, "rgba(255,90,10," + (0.35 * fade) + ")");
        sunG.addColorStop(1, "rgba(255,40,0,0)");
        ctxB.fillStyle = sunG;
        ctxB.beginPath();
        ctxB.arc(0, 0, sunR * 1.6, 0, Math.PI * 2);
        ctxB.fill();
        // Fire blades (rear half emphasis)
        ctxB.globalCompositeOperation = "lighter";
        for (var bi = 0; bi < 8; bi++) {
          var ba = sunSpin + bi * (Math.PI * 2 / 8);
          // blades that are "behind" (cos > 0 roughly)
          var bladeLen = sunR * (1.6 + 0.25 * Math.sin(tnow * 6 + bi));
          ctxB.save();
          ctxB.rotate(ba);
          var bg = ctxB.createLinearGradient(0, 0, bladeLen, 0);
          bg.addColorStop(0, "rgba(255,240,150," + (0.85 * fade) + ")");
          bg.addColorStop(0.4, "rgba(255,140,20," + (0.55 * fade) + ")");
          bg.addColorStop(1, "rgba(255,40,0,0)");
          ctxB.fillStyle = bg;
          ctxB.beginPath();
          ctxB.moveTo(sunR * 0.35, -sunR * 0.08);
          ctxB.lineTo(bladeLen, 0);
          ctxB.lineTo(sunR * 0.35, sunR * 0.08);
          ctxB.closePath();
          ctxB.fill();
          ctxB.restore();
        }
        ctxB.restore();
        ctxB.globalCompositeOperation = "source-over";

        // FRONT: nearer blades + edge glow so sun sits behind blimp with blades wrapping
        ctxF.save();
        ctxF.translate(cx, cy - bh * 0.05);
        ctxF.globalCompositeOperation = "lighter";
        for (var fi = 0; fi < 8; fi++) {
          var fa = sunSpin + fi * (Math.PI * 2 / 8) + Math.PI / 8;
          var depthF = Math.cos(fa); // front when cos < 0
          if (depthF > 0.15) continue; // skip rear-facing for front canvas
          var flen = sunR * (1.5 + 0.2 * Math.sin(tnow * 6 + fi));
          ctxF.save();
          ctxF.rotate(fa);
          var fg = ctxF.createLinearGradient(0, 0, flen, 0);
          fg.addColorStop(0, "rgba(255,250,200," + (0.9 * fade) + ")");
          fg.addColorStop(0.35, "rgba(255,160,30," + (0.6 * fade) + ")");
          fg.addColorStop(1, "rgba(255,50,0,0)");
          ctxF.fillStyle = fg;
          ctxF.beginPath();
          ctxF.moveTo(sunR * 0.3, -sunR * 0.07);
          ctxF.lineTo(flen, 0);
          ctxF.lineTo(sunR * 0.3, sunR * 0.07);
          ctxF.closePath();
          ctxF.fill();
          ctxF.restore();
        }
        ctxF.restore();
        ctxF.globalCompositeOperation = "source-over";

      } else if (__heroFxKind === "electric") {
        // Storm Chaser — electricity surrounds the blimp (front + back)
        function bolt(ctx2, x0, y0, x1, y1, segs, jag, alpha) {
          ctx2.beginPath();
          ctx2.moveTo(x0, y0);
          for (var s = 1; s < segs; s++) {
            var t = s / segs;
            var nx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * jag;
            var ny = y0 + (y1 - y0) * t + (Math.random() - 0.5) * jag;
            ctx2.lineTo(nx, ny);
          }
          ctx2.lineTo(x1, y1);
          ctx2.strokeStyle = "rgba(180, 220, 255," + alpha + ")";
          ctx2.lineWidth = 2;
          ctx2.shadowColor = "rgba(120, 180, 255, 0.9)";
          ctx2.shadowBlur = 8;
          ctx2.stroke();
          ctx2.strokeStyle = "rgba(255, 255, 255," + (alpha * 0.85) + ")";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          ctx2.shadowBlur = 0;
        }
        // Arc ring of points around ship
        var pts = 10;
        for (var ei = 0; ei < pts; ei++) {
          var ea = tnow * 2.2 + ei * (Math.PI * 2 / pts);
          var ex = cx + Math.cos(ea) * bw * 0.7;
          var ey = cy + Math.sin(ea * 1.1) * bh * 0.65;
          var depthE = Math.sin(ea);
          var ctxE = depthE > 0 ? ctxB : ctxF;
          // bolt toward near-center rim
          var ix = cx + Math.cos(ea) * bw * 0.28;
          var iy = cy + Math.sin(ea) * bh * 0.22;
          if (Math.random() < 0.55) {
            bolt(ctxE, ix, iy, ex, ey, 5, 10, 0.7 * fade);
          }
          // glow node
          ctxE.globalCompositeOperation = "lighter";
          var ng = ctxE.createRadialGradient(ex, ey, 0, ex, ey, 8);
          ng.addColorStop(0, "rgba(220,240,255," + (0.7 * fade) + ")");
          ng.addColorStop(1, "rgba(80,140,255,0)");
          ctxE.fillStyle = ng;
          ctxE.beginPath();
          ctxE.arc(ex, ey, 8, 0, Math.PI * 2);
          ctxE.fill();
          ctxE.globalCompositeOperation = "source-over";
        }
        // Occasional cross-ship lightning on front
        if (Math.random() < 0.2) {
          var a1 = Math.random() * Math.PI * 2;
          var a2 = a1 + Math.PI * (0.6 + Math.random() * 0.8);
          bolt(
            ctxF,
            cx + Math.cos(a1) * bw * 0.5,
            cy + Math.sin(a1) * bh * 0.4,
            cx + Math.cos(a2) * bw * 0.5,
            cy + Math.sin(a2) * bh * 0.4,
            6, 14, 0.85 * fade
          );
        }
        // Soft electric shell
        ctxB.strokeStyle = "rgba(140, 190, 255," + (0.2 * fade) + ")";
        ctxB.lineWidth = 3;
        ctxB.beginPath();
        ctxB.ellipse(cx, cy, bw * 0.55, bh * 0.48, 0, 0, Math.PI * 2);
        ctxB.stroke();

        ctxF.strokeStyle = "rgba(180, 220, 255," + (0.25 * fade) + ")";
        ctxF.lineWidth = 2;
        ctxF.beginPath();
        ctxF.ellipse(cx, cy, bw * 0.5, bh * 0.42, 0, 0, Math.PI * 2);
        ctxF.stroke();

      } else if (__heroFxKind === "chain") {
        // Storm Chaser — Chain Lightning: bolt jumps outward through "obstacle" nodes
        function chainBolt(ctx2, points, alpha) {
          if (points.length < 2) return;
          ctx2.beginPath();
          ctx2.moveTo(points[0].x, points[0].y);
          for (var i = 1; i < points.length; i++) {
            var p0 = points[i - 1], p1 = points[i];
            var mx = (p0.x + p1.x) * 0.5 + (Math.random() - 0.5) * 18;
            var my = (p0.y + p1.y) * 0.5 + (Math.random() - 0.5) * 14;
            ctx2.lineTo(mx, my);
            ctx2.lineTo(p1.x, p1.y);
          }
          ctx2.strokeStyle = "rgba(160, 210, 255," + alpha + ")";
          ctx2.lineWidth = 2.5;
          ctx2.shadowColor = "rgba(100, 180, 255, 0.95)";
          ctx2.shadowBlur = 10;
          ctx2.stroke();
          ctx2.strokeStyle = "rgba(255,255,255," + (alpha * 0.9) + ")";
          ctx2.lineWidth = 1;
          ctx2.stroke();
          ctx2.shadowBlur = 0;
        }
        // Nodes: ship → outward chain
        var nodes = [{ x: cx + bw * 0.35, y: cy }];
        for (var ni = 0; ni < 5; ni++) {
          var na = -0.4 + ni * 0.25 + Math.sin(tnow * 3 + ni) * 0.08;
          nodes.push({
            x: cx + bw * (0.55 + ni * 0.22) + Math.sin(tnow * 4 + ni) * 8,
            y: cy + Math.sin(na * 3 + tnow) * bh * 0.55
          });
        }
        // Alternate front/back segments for depth
        if (Math.random() < 0.85) {
          chainBolt(ctxF, nodes, 0.85 * fade);
          // branch secondary chains
          for (var br = 1; br < nodes.length - 1; br++) {
            if (Math.random() < 0.4) {
              var branch = [
                nodes[br],
                {
                  x: nodes[br].x + 20 + Math.random() * 30,
                  y: nodes[br].y + (Math.random() - 0.5) * 40
                }
              ];
              chainBolt(br % 2 ? ctxB : ctxF, branch, 0.55 * fade);
            }
          }
        }
        // Impact flashes on nodes
        for (var nf = 1; nf < nodes.length; nf++) {
          var ctxN = nf % 2 ? ctxB : ctxF;
          ctxN.globalCompositeOperation = "lighter";
          var ng = ctxN.createRadialGradient(nodes[nf].x, nodes[nf].y, 0, nodes[nf].x, nodes[nf].y, 12);
          ng.addColorStop(0, "rgba(230,245,255," + (0.8 * fade) + ")");
          ng.addColorStop(1, "rgba(80,140,255,0)");
          ctxN.fillStyle = ng;
          ctxN.beginPath();
          ctxN.arc(nodes[nf].x, nodes[nf].y, 12, 0, Math.PI * 2);
          ctxN.fill();
          ctxN.globalCompositeOperation = "source-over";
        }

      } else if (__heroFxKind === "vortex") {
        // Little Spy — Obliteration Vortex in front of blimp
        var vx = cx + bw * 0.55;
        var vy = cy;
        var vspin = tnow * 4;
        for (var layer = 0; layer < 2; layer++) {
          var ctxV = layer === 0 ? ctxB : ctxF;
          ctxV.save();
          ctxV.translate(vx, vy);
          ctxV.globalCompositeOperation = "lighter";
          for (var arm = 0; arm < 5; arm++) {
            var aa = vspin + arm * (Math.PI * 2 / 5) + layer * 0.3;
            ctxV.rotate(0); // draw each arm
            ctxV.beginPath();
            for (var t = 0; t < 18; t++) {
              var tt = t / 18;
              var rr = 8 + tt * Math.min(w, h) * 0.2;
              var ang = aa + tt * 2.8;
              var px = Math.cos(ang) * rr;
              var py = Math.sin(ang) * rr * 0.85;
              if (t === 0) ctxV.moveTo(px, py);
              else ctxV.lineTo(px, py);
            }
            ctxV.strokeStyle = "rgba(160, 100, 255," + ((layer ? 0.55 : 0.35) * fade) + ")";
            ctxV.lineWidth = 3;
            ctxV.stroke();
          }
          // core
          var cg = ctxV.createRadialGradient(0, 0, 0, 0, 0, 22);
          cg.addColorStop(0, "rgba(255,255,255," + (0.7 * fade) + ")");
          cg.addColorStop(0.4, "rgba(180,80,255," + (0.45 * fade) + ")");
          cg.addColorStop(1, "rgba(40,0,80,0)");
          ctxV.fillStyle = cg;
          ctxV.beginPath();
          ctxV.arc(0, 0, 22, 0, Math.PI * 2);
          ctxV.fill();
          ctxV.restore();
        }
        // Debris sucked inward
        if (Math.random() < 0.5) {
          var dang = Math.random() * Math.PI * 2;
          var dr = 40 + Math.random() * 50;
          __heroFxParticles.push({
            x: vx + Math.cos(dang) * dr,
            y: vy + Math.sin(dang) * dr,
            life: 0.5,
            age: 0,
            ang: dang,
            dist: dr,
            type: "debris"
          });
        }
        for (var di = __heroFxParticles.length - 1; di >= 0; di--) {
          var d = __heroFxParticles[di];
          if (d.type !== "debris") continue;
          d.age += dt;
          d.ang += 6 * dt;
          d.dist *= (1 - 2.2 * dt);
          if (d.age >= d.life || d.dist < 4) { __heroFxParticles.splice(di, 1); continue; }
          var dx = vx + Math.cos(d.ang) * d.dist;
          var dy = vy + Math.sin(d.ang) * d.dist;
          ctxF.fillStyle = "rgba(200,160,255," + ((1 - d.age / d.life) * 0.8 * fade) + ")";
          ctxF.fillRect(dx - 2, dy - 2, 4, 4);
        }

      } else if (__heroFxKind === "rockets") {
        // Sky Rocket — Rocket Barrage forward
        if (Math.random() < 0.35) {
          __heroFxParticles.push({
            x: cx + bw * 0.3,
            y: cy + (Math.random() - 0.5) * bh * 0.5,
            vx: 180 + Math.random() * 80,
            vy: (Math.random() - 0.5) * 40,
            life: 0.7 + Math.random() * 0.4,
            age: 0,
            type: "rocket"
          });
        }
        for (var ri = __heroFxParticles.length - 1; ri >= 0; ri--) {
          var rk = __heroFxParticles[ri];
          if (rk.type !== "rocket") continue;
          rk.age += dt;
          rk.x += rk.vx * dt;
          rk.y += rk.vy * dt;
          if (rk.age >= rk.life || rk.x > w + 20) { __heroFxParticles.splice(ri, 1); continue; }
          var ru = 1 - rk.age / rk.life;
          // trail on back, body on front
          ctxB.globalCompositeOperation = "lighter";
          var tg = ctxB.createRadialGradient(rk.x - 12, rk.y, 0, rk.x - 12, rk.y, 16);
          tg.addColorStop(0, "rgba(255,180,60," + (0.5 * ru * fade) + ")");
          tg.addColorStop(1, "rgba(255,40,0,0)");
          ctxB.fillStyle = tg;
          ctxB.beginPath();
          ctxB.arc(rk.x - 10, rk.y, 14, 0, Math.PI * 2);
          ctxB.fill();
          ctxB.globalCompositeOperation = "source-over";
          ctxF.fillStyle = "rgba(230,230,240," + (0.95 * ru * fade) + ")";
          ctxF.beginPath();
          ctxF.ellipse(rk.x, rk.y, 9, 3.5, 0, 0, Math.PI * 2);
          ctxF.fill();
          ctxF.fillStyle = "rgba(255,100,40," + (0.9 * ru * fade) + ")";
          ctxF.beginPath();
          ctxF.arc(rk.x - 8, rk.y, 3, 0, Math.PI * 2);
          ctxF.fill();
        }

      } else if (__heroFxKind === "meteors") {
        // Royal Stripe — Meteor Strike from above
        if (Math.random() < 0.28) {
          __heroFxParticles.push({
            x: cx + (Math.random() - 0.5) * bw * 1.6,
            y: -10,
            vx: (Math.random() - 0.5) * 40,
            vy: 160 + Math.random() * 100,
            life: 1.1,
            age: 0,
            r: 5 + Math.random() * 6,
            type: "meteor"
          });
        }
        for (var mi2 = __heroFxParticles.length - 1; mi2 >= 0; mi2--) {
          var m = __heroFxParticles[mi2];
          if (m.type !== "meteor") continue;
          m.age += dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.age >= m.life || m.y > h + 20) { __heroFxParticles.splice(mi2, 1); continue; }
          var mu = 1 - m.age / m.life;
          // trail behind
          ctxB.globalCompositeOperation = "lighter";
          var mt = ctxB.createLinearGradient(m.x, m.y - 30, m.x, m.y);
          mt.addColorStop(0, "rgba(255,80,0,0)");
          mt.addColorStop(1, "rgba(255,160,40," + (0.55 * mu * fade) + ")");
          ctxB.fillStyle = mt;
          ctxB.beginPath();
          ctxB.moveTo(m.x - 3, m.y);
          ctxB.lineTo(m.x, m.y - 35);
          ctxB.lineTo(m.x + 3, m.y);
          ctxB.fill();
          ctxB.globalCompositeOperation = "source-over";
          // meteor head front
          ctxF.globalCompositeOperation = "lighter";
          var mg = ctxF.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 2);
          mg.addColorStop(0, "rgba(255,255,220," + (0.95 * mu * fade) + ")");
          mg.addColorStop(0.4, "rgba(255,140,30," + (0.7 * mu * fade) + ")");
          mg.addColorStop(1, "rgba(180,20,0,0)");
          ctxF.fillStyle = mg;
          ctxF.beginPath();
          ctxF.arc(m.x, m.y, m.r * 2, 0, Math.PI * 2);
          ctxF.fill();
          ctxF.globalCompositeOperation = "source-over";
        }


      } else if (__heroFxKind === "bluefireball") {
        // Aero Slicer — azure orbiting plasma + forward barrage feel
        for (var bi = 0; bi < cores.length; bi++) {
          var bc = cores[bi];
          bc.ang += bc.speed * dt * 1.15;
          var depth = Math.sin(bc.ang);
          var ox = cx + Math.cos(bc.ang) * bw * 0.62;
          var oy = cy + Math.sin(bc.ang * 1.05 + bc.elev) * bh * 0.52;
          var br = Math.min(w, h) * 0.048 * bc.size * (depth > 0 ? 0.8 : 1);
          var ctx2 = depth > 0 ? ctxB : ctxF;
          ctx2.globalCompositeOperation = "lighter";
          var bg = ctx2.createRadialGradient(ox, oy, 0, ox, oy, br * 2.2);
          bg.addColorStop(0, "rgba(220,250,255," + (0.95 * fade) + ")");
          bg.addColorStop(0.35, "rgba(60,180,255," + (0.7 * fade) + ")");
          bg.addColorStop(0.7, "rgba(20,80,220," + (0.35 * fade) + ")");
          bg.addColorStop(1, "rgba(0,20,80,0)");
          ctx2.fillStyle = bg;
          ctx2.beginPath(); ctx2.arc(ox, oy, br * 2.2, 0, Math.PI * 2); ctx2.fill();
          ctx2.globalCompositeOperation = "source-over";
        }
        // Forward plasma streaks
        if (Math.random() < 0.55) {
          __heroFxParticles.push({
            x: cx + bw * 0.4, y: cy + (Math.random() - 0.5) * bh * 0.5,
            vx: 180 + Math.random() * 120, vy: (Math.random() - 0.5) * 40,
            life: 0.35 + Math.random() * 0.2, age: 0, r: 4 + Math.random() * 4, type: "bluebolt"
          });
        }
        for (var bpi = __heroFxParticles.length - 1; bpi >= 0; bpi--) {
          var bp = __heroFxParticles[bpi];
          if (bp.type !== "bluebolt") continue;
          bp.age += dt; bp.x += bp.vx * dt; bp.y += bp.vy * dt;
          if (bp.age >= bp.life) { __heroFxParticles.splice(bpi, 1); continue; }
          var bu = 1 - bp.age / bp.life;
          ctxF.globalCompositeOperation = "lighter";
          var bpg = ctxF.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, bp.r * 2);
          bpg.addColorStop(0, "rgba(200,240,255," + (bu * fade) + ")");
          bpg.addColorStop(1, "rgba(40,100,255,0)");
          ctxF.fillStyle = bpg;
          ctxF.beginPath(); ctxF.arc(bp.x, bp.y, bp.r * 2, 0, Math.PI * 2); ctxF.fill();
          ctxF.globalCompositeOperation = "source-over";
        }

      } else if (__heroFxKind === "greenfireball") {
        // Jade Voyager — green orbiters + sunburst feel
        var sunR = Math.min(w, h) * 0.2;
        var sunG = ctxB.createRadialGradient(cx, cy, 0, cx, cy, sunR * 1.5);
        sunG.addColorStop(0, "rgba(200,255,160," + (0.55 * fade) + ")");
        sunG.addColorStop(0.4, "rgba(80,200,60," + (0.3 * fade) + ")");
        sunG.addColorStop(1, "rgba(0,60,20,0)");
        ctxB.fillStyle = sunG;
        ctxB.beginPath(); ctxB.arc(cx, cy, sunR * 1.5, 0, Math.PI * 2); ctxB.fill();
        for (var gi = 0; gi < cores.length; gi++) {
          var gc = cores[gi];
          gc.ang += gc.speed * dt;
          var gd = Math.sin(gc.ang);
          var gox = cx + Math.cos(gc.ang) * bw * 0.6;
          var goy = cy + Math.sin(gc.ang * 1.08 + gc.elev) * bh * 0.5;
          var gr = Math.min(w, h) * 0.052 * gc.size * (gd > 0 ? 0.82 : 1);
          var gctx = gd > 0 ? ctxB : ctxF;
          gctx.globalCompositeOperation = "lighter";
          var gg = gctx.createRadialGradient(gox, goy, 0, gox, goy, gr * 2.3);
          gg.addColorStop(0, "rgba(240,255,200," + (0.95 * fade) + ")");
          gg.addColorStop(0.35, "rgba(100,230,80," + (0.7 * fade) + ")");
          gg.addColorStop(0.7, "rgba(20,140,40," + (0.35 * fade) + ")");
          gg.addColorStop(1, "rgba(0,40,10,0)");
          gctx.fillStyle = gg;
          gctx.beginPath(); gctx.arc(gox, goy, gr * 2.3, 0, Math.PI * 2); gctx.fill();
          gctx.globalCompositeOperation = "source-over";
        }

      } else if (__heroFxKind === "fireball") {
        // Ironworks — molten orbs
        for (var fi = 0; fi < cores.length; fi++) {
          var fc = cores[fi];
          fc.ang += fc.speed * dt * 0.95;
          var fd = Math.sin(fc.ang);
          var fox = cx + Math.cos(fc.ang) * bw * 0.58;
          var foy = cy + Math.sin(fc.ang * 1.1 + fc.elev) * bh * 0.48;
          var fr = Math.min(w, h) * 0.05 * fc.size * (fd > 0 ? 0.8 : 1);
          var fctx = fd > 0 ? ctxB : ctxF;
          fctx.globalCompositeOperation = "lighter";
          var fg = fctx.createRadialGradient(fox, foy, 0, fox, foy, fr * 2.4);
          fg.addColorStop(0, "rgba(255,250,220," + (0.95 * fade) + ")");
          fg.addColorStop(0.3, "rgba(255,140,30," + (0.75 * fade) + ")");
          fg.addColorStop(0.65, "rgba(180,40,0," + (0.4 * fade) + ")");
          fg.addColorStop(1, "rgba(40,0,0,0)");
          fctx.fillStyle = fg;
          fctx.beginPath(); fctx.arc(fox, foy, fr * 2.4, 0, Math.PI * 2); fctx.fill();
          // dark metal core
          fctx.globalCompositeOperation = "source-over";
          fctx.fillStyle = "rgba(40,20,10," + (0.55 * fade) + ")";
          fctx.beginPath(); fctx.arc(fox, foy, fr * 0.35, 0, Math.PI * 2); fctx.fill();
        }
        if (Math.random() < 0.4) {
          __heroFxParticles.push({
            x: cx + (Math.random() - 0.5) * bw, y: cy + bh * 0.2,
            vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40,
            life: 0.5, age: 0, r: 3 + Math.random() * 4, type: "ember"
          });
        }
        for (var epi = __heroFxParticles.length - 1; epi >= 0; epi--) {
          var ep = __heroFxParticles[epi];
          if (ep.type !== "ember") continue;
          ep.age += dt; ep.x += ep.vx * dt; ep.y += ep.vy * dt;
          if (ep.age >= ep.life) { __heroFxParticles.splice(epi, 1); continue; }
          var eu = 1 - ep.age / ep.life;
          ctxF.globalCompositeOperation = "lighter";
          ctxF.fillStyle = "rgba(255,160,40," + (eu * fade) + ")";
          ctxF.beginPath(); ctxF.arc(ep.x, ep.y, ep.r * eu, 0, Math.PI * 2); ctxF.fill();
          ctxF.globalCompositeOperation = "source-over";
        }

      } else if (__heroFxKind === "jollybomb" || __heroFxKind === "barrelbomb") {
        // Pirate broadside — cannonball arcs
        if (Math.random() < 0.45) {
          var side = Math.random() < 0.5 ? -1 : 1;
          __heroFxParticles.push({
            x: cx + side * bw * 0.35, y: cy,
            vx: side * (90 + Math.random() * 80), vy: -40 - Math.random() * 60,
            life: 0.7, age: 0, r: 5 + Math.random() * 3, type: "cannon", side: side
          });
        }
        // Smoke cloud
        ctxB.globalCompositeOperation = "source-over";
        var sm = ctxB.createRadialGradient(cx, cy, 0, cx, cy, bw * 0.7);
        sm.addColorStop(0, "rgba(40,30,25," + (0.35 * fade) + ")");
        sm.addColorStop(1, "rgba(0,0,0,0)");
        ctxB.fillStyle = sm;
        ctxB.beginPath(); ctxB.arc(cx, cy, bw * 0.7, 0, Math.PI * 2); ctxB.fill();
        for (var cpi = __heroFxParticles.length - 1; cpi >= 0; cpi--) {
          var cp = __heroFxParticles[cpi];
          if (cp.type !== "cannon") continue;
          cp.age += dt; cp.x += cp.vx * dt; cp.y += cp.vy * dt; cp.vy += 180 * dt;
          if (cp.age >= cp.life) { __heroFxParticles.splice(cpi, 1); continue; }
          var cu = 1 - cp.age / cp.life;
          ctxF.fillStyle = "rgba(30,25,20," + (0.9 * cu * fade) + ")";
          ctxF.beginPath(); ctxF.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2); ctxF.fill();
          // hot seam
          ctxF.strokeStyle = "rgba(255,100,40," + (0.7 * cu * fade) + ")";
          ctxF.lineWidth = 1.5;
          ctxF.beginPath(); ctxF.arc(cp.x, cp.y, cp.r * 0.7, 0, Math.PI * 2); ctxF.stroke();
        }

      } else if (__heroFxKind === "royal") {
        // Ivory Anchor / Royal — gold orbiters + crown flash
        for (var ri = 0; ri < cores.length; ri++) {
          var rc = cores[ri];
          rc.ang += rc.speed * dt;
          var rd = Math.sin(rc.ang);
          var rox = cx + Math.cos(rc.ang) * bw * 0.6;
          var roy = cy + Math.sin(rc.ang * 1.05 + rc.elev) * bh * 0.5;
          var rr = Math.min(w, h) * 0.05 * rc.size * (rd > 0 ? 0.82 : 1);
          var rctx = rd > 0 ? ctxB : ctxF;
          rctx.globalCompositeOperation = "lighter";
          var rg = rctx.createRadialGradient(rox, roy, 0, rox, roy, rr * 2.2);
          rg.addColorStop(0, "rgba(255,250,220," + (0.95 * fade) + ")");
          rg.addColorStop(0.35, "rgba(255,200,80," + (0.7 * fade) + ")");
          rg.addColorStop(1, "rgba(180,100,20,0)");
          rctx.fillStyle = rg;
          rctx.beginPath(); rctx.arc(rox, roy, rr * 2.2, 0, Math.PI * 2); rctx.fill();
          rctx.globalCompositeOperation = "source-over";
        }
        // Crown above
        ctxF.fillStyle = "rgba(255,220,100," + (0.85 * fade) + ")";
        ctxF.beginPath();
        ctxF.moveTo(cx - 14, cy - bh * 0.55);
        ctxF.lineTo(cx - 10, cy - bh * 0.72);
        ctxF.lineTo(cx - 4, cy - bh * 0.58);
        ctxF.lineTo(cx, cy - bh * 0.78);
        ctxF.lineTo(cx + 4, cy - bh * 0.58);
        ctxF.lineTo(cx + 10, cy - bh * 0.72);
        ctxF.lineTo(cx + 14, cy - bh * 0.55);
        ctxF.closePath();
        ctxF.fill();

      } else if (__heroFxKind === "warshark") {
        // Predator missiles circling then darting
        for (var wi = 0; wi < cores.length; wi++) {
          var wc = cores[wi];
          wc.ang += wc.speed * dt * 1.2;
          var wox = cx + Math.cos(wc.ang) * bw * 0.7;
          var woy = cy + Math.sin(wc.ang) * bh * 0.55;
          ctxF.fillStyle = "rgba(40,60,90," + (0.9 * fade) + ")";
          ctxF.beginPath();
          ctxF.ellipse(wox, woy, 10, 4, wc.ang, 0, Math.PI * 2);
          ctxF.fill();
          ctxF.fillStyle = "rgba(80,220,255," + (0.9 * fade) + ")";
          ctxF.beginPath(); ctxF.arc(wox + Math.cos(wc.ang) * 8, woy + Math.sin(wc.ang) * 3, 2.5, 0, Math.PI * 2); ctxF.fill();
        }
        // Sonar rings
        var sonarT = (tnow % 1.2) / 1.2;
        ctxF.strokeStyle = "rgba(100,255,180," + ((1 - sonarT) * 0.45 * fade) + ")";
        ctxF.lineWidth = 2;
        ctxF.beginPath(); ctxF.arc(cx, cy, 20 + sonarT * Math.min(w, h) * 0.35, 0, Math.PI * 2); ctxF.stroke();

      } else if (__heroFxKind === "heatseek" || __heroFxKind === "swarm" || __heroFxKind === "lattice") {
        // Missile grid / heatseekers
        if (Math.random() < 0.5) {
          var ma = -0.4 + Math.random() * 0.8;
          __heroFxParticles.push({
            x: cx + bw * 0.3, y: cy + (Math.random() - 0.5) * bh,
            vx: 160 + Math.random() * 100, vy: Math.sin(ma) * 80,
            life: 0.55, age: 0, r: 3, type: "missile"
          });
        }
        for (var mpi = __heroFxParticles.length - 1; mpi >= 0; mpi--) {
          var mp = __heroFxParticles[mpi];
          if (mp.type !== "missile") continue;
          mp.age += dt; mp.x += mp.vx * dt; mp.y += mp.vy * dt;
          if (mp.age >= mp.life) { __heroFxParticles.splice(mpi, 1); continue; }
          var mu = 1 - mp.age / mp.life;
          ctxF.globalCompositeOperation = "lighter";
          // trail
          ctxF.strokeStyle = "rgba(255,180,60," + (0.5 * mu * fade) + ")";
          ctxF.lineWidth = 2;
          ctxF.beginPath(); ctxF.moveTo(mp.x, mp.y); ctxF.lineTo(mp.x - 18, mp.y); ctxF.stroke();
          ctxF.fillStyle = "rgba(255,220,120," + (mu * fade) + ")";
          ctxF.beginPath(); ctxF.arc(mp.x, mp.y, 4, 0, Math.PI * 2); ctxF.fill();
          ctxF.globalCompositeOperation = "source-over";
        }


      } else if (__heroFxKind === "crystalbeam") {
        // Ironworks — Sky Crystal Beam straight ahead
        var beamX0 = cx + bw * 0.25;
        var beamY = cy;
        var beamX1 = w + 10;
        var pulse = 0.7 + 0.3 * Math.sin(tnow * 10);
        // Back glow
        ctxB.globalCompositeOperation = "lighter";
        var bgb = ctxB.createLinearGradient(beamX0, beamY, beamX1, beamY);
        bgb.addColorStop(0, "rgba(120, 220, 255," + (0.25 * pulse * fade) + ")");
        bgb.addColorStop(1, "rgba(40, 120, 255, 0)");
        ctxB.fillStyle = bgb;
        ctxB.fillRect(beamX0, beamY - 14, beamX1 - beamX0, 28);
        ctxB.globalCompositeOperation = "source-over";
        // Front core beam
        ctxF.globalCompositeOperation = "lighter";
        var bgf = ctxF.createLinearGradient(beamX0, beamY, beamX1, beamY);
        bgf.addColorStop(0, "rgba(220, 250, 255," + (0.95 * pulse * fade) + ")");
        bgf.addColorStop(0.3, "rgba(100, 200, 255," + (0.7 * pulse * fade) + ")");
        bgf.addColorStop(1, "rgba(40, 100, 255, 0)");
        ctxF.fillStyle = bgf;
        ctxF.fillRect(beamX0, beamY - 4, beamX1 - beamX0, 8);
        // Crystal shards at muzzle
        for (var sh = 0; sh < 4; sh++) {
          var sy = beamY + (sh - 1.5) * 6;
          ctxF.fillStyle = "rgba(180, 240, 255," + (0.8 * fade) + ")";
          ctxF.beginPath();
          ctxF.moveTo(beamX0 - 4, sy);
          ctxF.lineTo(beamX0 + 10, beamY);
          ctxF.lineTo(beamX0 - 4, sy + 4);
          ctxF.fill();
        }
        ctxF.globalCompositeOperation = "source-over";
      }

      __heroFxRaf = requestAnimationFrame(tick);
    }
    __heroFxRaf = requestAnimationFrame(tick);
  }







  function startHeroFireAura() {
    startHeroPowerFx("fire");
  }

  
  
  // Shared placeholder video for all ships until individual clips are uploaded
  var POWER_PREVIEW_VIDEO_SRC = "power_preview_zeppelin_ace.mp4?v=ruff496";
  var POWER_PREVIEW_VIDEO_FALLBACK = "power_preview_zeppelin_ace.webm?v=ruff496";

  // Fallback power names if SHIP_DATA is missing an ability
  var POWER_NAME_BY_SHIP = {
    blimp1: "Meteor Strike",
    blimp2: "Storm Cloud",
    blimp3: "Missile Slice",
    blimp4: "Steam Overload",
    blimp5: "Jade Ward",
    blimp6: "Ghost Veil",
    blimp7: "Thunder Lance",
    blimp8: "Iron Hail",
    blimp9: "Black Flag Bomb",
    blimp10: "Anchor Barrier",
    blimp11: "Depth Charge",
    blimp12: "Afterburner",
    blimp13: "Lattice Barrage",
    blimp14: "Pirate Broadside",
    blimp15: "Royal Meteor"
  };

  function getPowerPreviewName(key) {
    try {
      var data = (typeof SHIP_DATA !== "undefined" && SHIP_DATA[key]) ? SHIP_DATA[key]
        : ((typeof BLIMP_DATA !== "undefined" && BLIMP_DATA[key]) ? BLIMP_DATA[key] : null);
      if (data && data.ability && data.ability.name) return data.ability.name;
    } catch (e) {}
    return POWER_NAME_BY_SHIP[key] || "Power Up";
  }

  function getShipDisplayName(key) {
    try {
      var data = (typeof SHIP_DATA !== "undefined" && SHIP_DATA[key]) ? SHIP_DATA[key]
        : ((typeof BLIMP_DATA !== "undefined" && BLIMP_DATA[key]) ? BLIMP_DATA[key] : null);
      if (data && data.name) return data.name;
    } catch (e) {}
    return key;
  }

  function closePowerPreviewModal() {
    var modal = document.getElementById("powerPreviewModal");
    var vid = document.getElementById("powerPreviewVideo");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
    if (vid) {
      try { vid.pause(); vid.removeAttribute("src"); vid.load(); } catch (e) {}
    }
    try { stopHeroFireAura(); } catch (e) {}
    // Restore menu music volume
    try {
      window.__airborneMenuMusicDuck = false;
      if (typeof setMenuMusicVolumeNow === "function") setMenuMusicVolumeNow();
      else if (typeof menuMusicFadeStep === "function") menuMusicFadeStep();
      else if (menuMusic && !menuMusic.paused) {
        menuMusic.volume = Math.max(0, Math.min(1, musicVolumePref || 0.2));
      }
    } catch (eUnduck) {}
  }

  function openPowerPreviewModal(optKey) {
    var key = optKey || ((typeof selectedBlimp !== "undefined") ? selectedBlimp : "blimp1");
    var modal = document.getElementById("powerPreviewModal");
    var vid = document.getElementById("powerPreviewVideo");
    var titleEl = document.getElementById("powerPreviewTitle");
    var capEl = document.getElementById("powerPreviewCaption");
    if (!modal || !vid) return;

    // Keep menu music playing; duck 50%
    try {
      window.__airborneMenuMusicDuck = true;
      if (typeof setMenuMusicVolumeNow === "function") setMenuMusicVolumeNow();
      else if (typeof menuMusicFadeStep === "function") menuMusicFadeStep();
      else if (menuMusic && !menuMusic.paused) {
        menuMusic.volume = Math.max(0, Math.min(1, (musicVolumePref || 0.2) * 0.5));
      }
    } catch (eDuck) {}

    var shipName = getShipDisplayName(key);
    var powerName = getPowerPreviewName(key);
    if (titleEl) titleEl.textContent = String(shipName).toUpperCase();
    if (capEl) capEl.textContent = String(powerName).toUpperCase();

    try { stopHeroFireAura(); } catch (e) {}
    vid.loop = true;
    // User tapped power icon — allow audio
    vid.muted = false;
    try { vid.volume = 0.85; } catch (eV) {}
    vid.playsInline = true;
    vid.setAttribute("playsinline", "");
    vid.setAttribute("webkit-playsinline", "");
    vid.src = POWER_PREVIEW_VIDEO_SRC;
    vid.onerror = function () {
      try {
        if (vid.src.indexOf(".mp4") >= 0 && typeof POWER_PREVIEW_VIDEO_FALLBACK === "string") {
          vid.onerror = null;
          vid.src = POWER_PREVIEW_VIDEO_FALLBACK;
          vid.load();
          var p2 = vid.play();
          if (p2 && p2.catch) p2.catch(function () {});
        }
      } catch (eFb) {}
    };
    vid.load();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    var playP = vid.play();
    if (playP && playP.catch) {
      playP.catch(function () {
        // Autoplay with sound blocked — retry muted then unmute attempt
        try {
          vid.muted = true;
          vid.play().then(function () {
            vid.muted = false;
          }).catch(function () {});
        } catch (e2) {}
      });
    }
    try { if (typeof sfxClick === "function") sfxClick(); } catch (e) {}
  }

  function playMenuPowerPreview(optKey) {
    openPowerPreviewModal(optKey);
  }

  function bindMenuPowerPreview() {
    var icon = document.getElementById("bpPowerIcon");
    if (icon && !icon.__powerPreviewBound) {
      icon.__powerPreviewBound = true;
      icon.addEventListener("click", function (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
        openPowerPreviewModal();
      });
    }
    var modal = document.getElementById("powerPreviewModal");
    if (modal && !modal.__outsideCloseBound) {
      modal.__outsideCloseBound = true;
      modal.addEventListener("click", function (e) {
        var stage = modal.querySelector(".powerPreviewStage");
        if (stage && stage.contains(e.target)) return;
        closePowerPreviewModal();
      });
    }
  }
  window.__airborneBindPowerPreview = bindMenuPowerPreview;
  window.openPowerPreviewModal = openPowerPreviewModal;
  window.closePowerPreviewModal = closePowerPreviewModal;
  try {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bindMenuPowerPreview, 300);
      setTimeout(bindMenuPowerPreview, 1200);
    });
    setTimeout(bindMenuPowerPreview, 500);
  } catch (eBind) {}


(function splashRadarBeep() {
  var ctx = null;
  var active = false;
  var started = false;
  var timer = null;
  var PERIOD = 1.25;
  var HITS = [0.05, 0.42, 0.78];

  function splashVisible() {
    var s = document.getElementById("splashScreen");
    if (!s) return false;
    if (s.classList.contains("hidden")) return false;
    if (s.style.display === "none") return false;
    if (s.classList.contains("splashOut") || s.classList.contains("fadeOut")) return false;
    return true;
  }

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep() {
    if (!active || !splashVisible()) return;
    if (document.hidden) return;
    if (typeof muted !== "undefined" && muted) return;
    var ac = ensureCtx();
    if (!ac) return;
    var t = ac.currentTime + 0.01;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(980, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.18);
    var vol = (typeof sfxVolumePref === "number") ? (0.25 * sfxVolumePref) : 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + 0.22);
  }

  function tick() {
    if (!started || !active) return;
    if (!splashVisible()) {
      active = false;
      if (timer) { cancelAnimationFrame(timer); timer = null; }
      if (ctx && ctx.state === "running") {
        try { ctx.suspend(); } catch (e) {}
      }
      return;
    }
    if (!document.hidden) {
      var now = performance.now() / 1000;
      var phase = now % PERIOD;
      HITS.forEach(function (hit) {
        var delta = phase - hit;
        if (delta >= 0 && delta < 0.08) {
          var key = Math.floor(now / PERIOD) + ":" + hit;
          if (tick._last !== key) {
            tick._last = key;
            beep();
          }
        }
      });
    }
    timer = requestAnimationFrame(tick);
  }

  function start() {
    if (!splashVisible()) return;
    if (started) {
      ensureCtx();
      return;
    }
    started = true;
    active = true;
    ensureCtx();
    if (!timer) timer = requestAnimationFrame(tick);
  }

  function stopRadar() {
    active = false;
    if (timer) { cancelAnimationFrame(timer); timer = null; }
    if (ctx && ctx.state === "running") {
      try { ctx.suspend(); } catch (e) {}
    }
  }

  window.__airborneStopSplashRadar = stopRadar;
  document.addEventListener("click", start);
  document.addEventListener("touchstart", start, { passive: true });
  document.addEventListener("keydown", start);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && ctx && ctx.state === "running") {
      try { ctx.suspend(); } catch (e) {}
    }
  });
})();

(function bindDockVisibility() {
  function hideDock() {
    var d = document.getElementById("unifiedDock");
    if (!d) return;
    d.classList.add("menuHidden");
    d.classList.remove("gameActive");
    d.classList.remove("trainingShow");
  }
  function showDock() {
    var d = document.getElementById("unifiedDock");
    if (!d) return;
    d.classList.remove("menuHidden");
    d.classList.add("gameActive");
  }
  window.__airborneHideUnifiedDock = hideDock;
  window.__airborneShowUnifiedDock = showDock;
  document.addEventListener("DOMContentLoaded", hideDock);
  setTimeout(hideDock, 0);
  // Hide when menu is displayed
  try {
    var ms = document.getElementById("menuScreen");
    if (ms) {
      var obs = new MutationObserver(function () {
        if (ms.style.display !== "none") hideDock();
      });
      obs.observe(ms, { attributes: true, attributeFilter: ["style", "class"] });
    }
  } catch (e) {}
})();

(function forceHideStartOverlayOnMenu() {
  function hideStart() {
    var o = document.getElementById("startOverlay");
    if (!o) return;
    o.classList.add("hidden");
    o.style.display = "none";
    o.setAttribute("aria-hidden", "true");
  }
  document.addEventListener("DOMContentLoaded", hideStart);
  setTimeout(hideStart, 0);
  setTimeout(hideStart, 200);
  // When hangar is visible
  try {
    var menu = document.getElementById("menuScreen");
    if (menu) {
      var mo = new MutationObserver(function () {
        if (menu.style.display !== "none") hideStart();
      });
      mo.observe(menu, { attributes: true, attributeFilter: ["style"] });
    }
  } catch (e) {}
  window.__airborneHideStartOverlay = hideStart;
})();

(function () {
  try {
    var orig = window.selectBlimp || null;
    // Re-apply icon whenever selection changes
    document.addEventListener("click", function () {
      setTimeout(function () {
        if (typeof window.__airborneApplyShipPowerIcon === "function") window.__airborneApplyShipPowerIcon();
      }, 50);
    }, true);
  } catch (e) {}
})();
