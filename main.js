/**
 * main.js
 * Single responsibility: bootstrap the app. Loads the save, wires screen
 * navigation and menu buttons, hands off to Game for actual play, and
 * registers the service worker. This is the only file that reaches into
 * more than one module to connect them — everything else stays focused.
 */

(function bootstrap() {
  let saveData = null;

  const VISUAL_KEY = 'neonblock-visuals-v2';
  const DEFAULT_VISUALS = { blockStyle: 'neon', theme: 'neon', gameMode: 'standard' };

  function loadVisuals() {
    try { return { ...DEFAULT_VISUALS, ...(JSON.parse(localStorage.getItem(VISUAL_KEY) || '{}')) }; }
    catch (_) { return { ...DEFAULT_VISUALS }; }
  }
  function saveVisuals(v) { try { localStorage.setItem(VISUAL_KEY, JSON.stringify(v)); } catch (_) {} }
  function applyVisuals(v) {
    document.documentElement.dataset.theme = v.theme;
    document.documentElement.dataset.blockStyle = v.blockStyle;
    UI.clearColorCache();
    document.querySelectorAll('[data-block-style]').forEach(b => b.classList.toggle('is-selected', b.dataset.blockStyle === v.blockStyle));
    document.querySelectorAll('[data-theme-choice]').forEach(b => b.classList.toggle('is-selected', b.dataset.themeChoice === v.theme));
    document.querySelectorAll('[data-game-mode]').forEach(b => b.classList.toggle('is-selected', b.dataset.gameMode === v.gameMode));
    const mode = typeof Modes !== 'undefined' ? Modes.get(v.gameMode) : null;
    const desc = document.getElementById('mode-description');
    if (desc && mode) desc.textContent = mode.desc;
    const readout = document.getElementById('menu-selection-readout');
    if (readout) {
      const styleName = (v.blockStyle || 'neon').toUpperCase();
      const modeName = (mode?.name || v.gameMode || 'standard').toUpperCase();
      readout.textContent = `${styleName} · ${modeName}`;
    }
    document.documentElement.dataset.gameMode = v.gameMode || 'standard';
    const themeLabel = document.getElementById('theme-current');
    const blockLabel = document.getElementById('blocks-current');
    const modeLabel = document.getElementById('mode-current');
    if (themeLabel) themeLabel.textContent = (v.theme || 'neon').toUpperCase();
    if (blockLabel) blockLabel.textContent = (v.blockStyle || 'neon').toUpperCase();
    if (modeLabel) modeLabel.textContent = (mode?.name || v.gameMode || 'standard').toUpperCase();
  }
  function bindVisualLab() {
    let visuals = loadVisuals();
    applyVisuals(visuals);
    document.querySelectorAll('[data-block-style]').forEach(btn => btn.addEventListener('click', () => {
      visuals.blockStyle = btn.dataset.blockStyle; saveVisuals(visuals); applyVisuals(visuals); Audio_.sfx.uiTap();
    }));
    document.querySelectorAll('[data-theme-choice]').forEach(btn => btn.addEventListener('click', () => {
      visuals.theme = btn.dataset.themeChoice; saveVisuals(visuals); applyVisuals(visuals); Audio_.sfx.uiTap();
    }));
    document.querySelectorAll('[data-game-mode]').forEach(btn => btn.addEventListener('click', () => {
      visuals.gameMode = btn.dataset.gameMode; saveVisuals(visuals); applyVisuals(visuals); Audio_.sfx.uiTap();
    }));
  }

  function applyControlLayout(layout) {
    document.body.classList.toggle('layout-left', layout === 'left');
  }

  function goToStats() {
    StatsScreen.render(saveData);
    UI.showScreen('stats');
    Audio_.sfx.uiTap();
  }

  function goToSettings() {
    UI.showScreen('settings');
    Audio_.sfx.uiTap();
  }

  function goToHowTo() {
    UI.showScreen('howto');
    Audio_.sfx.uiTap();
  }

  function goToStart() {
    UI.updateStartStats(saveData.stats);
    UI.showScreen('start');
  }

  function bindNav() {
    UI.el['btn-play'].addEventListener('click', () => {
      Audio_.sfx.uiTap();
      Game.startCountdown(loadVisuals().gameMode || 'standard');
    });
    UI.el['btn-howto'].addEventListener('click', goToHowTo);
    UI.el['btn-stats'].addEventListener('click', goToStats);
    document.getElementById('btn-settings').addEventListener('click', goToSettings);
    document.getElementById('btn-achievements').addEventListener('click', () => {
      goToStats();
      requestAnimationFrame(() => {
        const heading = document.getElementById('achievements-heading');
        if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    const openPopup = (name) => {
      document.querySelectorAll('.selector-popup').forEach(p => { p.hidden = p.id !== `popup-${name}`; });
      document.getElementById('selector-popups').classList.add('is-open');
      document.body.classList.add('has-selector-popup');
      const active = document.getElementById(`popup-${name}`);
      if (active) active.querySelector('.popup-close')?.focus({ preventScroll: true });
    };
    const closePopups = () => {
      document.querySelectorAll('.selector-popup').forEach(p => { p.hidden = true; });
      document.getElementById('selector-popups').classList.remove('is-open');
      document.body.classList.remove('has-selector-popup');
    };
    [['open-theme','theme'],['open-blocks','blocks'],['open-mode','mode']].forEach(([id,name]) => {
      document.getElementById(id)?.addEventListener('click', () => { Audio_.sfx.uiTap(); openPopup(name); });
    });
    document.querySelectorAll('[data-popup-close="all"]').forEach(btn => btn.addEventListener('click', closePopups));
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closePopups(); });
    document.querySelectorAll('.selector-popup [data-theme-choice], .selector-popup [data-block-style], .selector-popup [data-game-mode]').forEach(btn => {
      btn.addEventListener('click', () => closePopups());
    });

    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Audio_.sfx.uiTap();
        goToStart();
      });
    });

    UI.el['btn-pause'].addEventListener('click', () => Game.togglePause());
    UI.el['btn-resume'].addEventListener('click', () => Game.togglePause());
    UI.el['btn-restart-pause'].addEventListener('click', () => {
      UI.setOverlay('overlay-pause', false);
      Game.restart();
    });
    UI.el['btn-quit-pause'].addEventListener('click', () => Game.quitToMenu());
    UI.el['btn-retry'].addEventListener('click', () => {
      UI.setOverlay('overlay-gameover', false);
      Game.restart();
    });
    UI.el['btn-quit-gameover'].addEventListener('click', () => Game.quitToMenu());
  }

  /** Auto-pause if the player switches tabs/apps mid-game, so a stray
   *  background tick never eats a life or racks up a silent game over. */
  function bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Game.state === 'playing') {
        Game.togglePause();
      }
    });
    window.addEventListener('blur', () => {
      if (Game.state === 'playing') Game.togglePause();
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // Relative path so this still works if the game is hosted in a subfolder.
    const swUrl = new URL('service-worker.js', document.baseURI).toString();
    navigator.serviceWorker.register(swUrl).catch((e) => {
      console.warn('Service worker registration failed', e);
    });
  }

  /** iOS Safari and some Android browsers still trigger rubber-banding,
   *  double-tap zoom, or pull-to-refresh even with touch-action set on
   *  individual elements. Blocking these two events on #app is the most
   *  reliable belt-and-suspenders fix for a game that must feel native. */
  function preventUnwantedGestures() {
    const app = document.getElementById('app');
    let lastTouchEnd = 0;
    app.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault(); // pinch-zoom
    }, { passive: false });
    app.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault(); // double-tap zoom
      lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function init() {
    UI.cacheEls();
    bindVisualLab();
    Effects.initToasts(UI.el['toast-layer']);

    // Native-feeling micro-interactions: every tap gets a tiny energy ripple.
    document.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('pointerdown', (ev) => Effects.rippleFromEvent(ev), { passive: true });
    });

    saveData = Storage.load();

    applyControlLayout(saveData.settings.controlLayout);
    SettingsScreen.init(saveData, (reason) => {
      if (reason === 'layout') applyControlLayout(SettingsScreen.getData().settings.controlLayout);
      if (reason === 'reset-stats' || reason === 'clear-all') {
        saveData = SettingsScreen.getData();
        Game.setSaveData(saveData);
        UI.updateStartStats(saveData.stats);
        if (document.getElementById('screen-stats').classList.contains('screen--active')) {
          StatsScreen.render(saveData);
        }
      }
    });

    UI.updateStartStats(saveData.stats);
    Game.init(saveData);

    bindNav();
    bindVisibility();
    preventUnwantedGestures();
    registerServiceWorker();

    UI.showScreen('start');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
