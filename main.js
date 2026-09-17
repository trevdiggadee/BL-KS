/**
 * main.js
 * Single responsibility: bootstrap the app. Loads the save, wires screen
 * navigation and menu buttons, hands off to Game for actual play, and
 * registers the service worker. This is the only file that reaches into
 * more than one module to connect them — everything else stays focused.
 */

(function bootstrap() {
  let saveData = null;

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
      Game.startCountdown();
    });
    UI.el['btn-howto'].addEventListener('click', goToHowTo);
    UI.el['btn-stats'].addEventListener('click', goToStats);
    UI.el['btn-settings'].addEventListener('click', goToSettings);

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
    UI.initOrbit();

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
