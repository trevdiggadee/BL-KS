/**
 * main.js
 * Game initialization and UI screen navigation logic.
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btn-start');
  const btnNavStats = document.getElementById('btn-nav-stats');
  const btnNavSettings = document.getElementById('btn-nav-settings');
  const screenStart = document.getElementById('screen-start');

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      screenStart.classList.remove('active');
      // Trigger game start logic
    });
  }

  if (btnNavStats) {
    btnNavStats.addEventListener('click', () => {
      if (typeof UI !== 'undefined' && UI.showScreen) {
        UI.showScreen('screen-stats');
      }
      if (typeof StatsScreen !== 'undefined' && typeof Storage !== 'undefined') {
        StatsScreen.render(Storage.load());
      }
    });
  }

  if (btnNavSettings) {
    btnNavSettings.addEventListener('click', () => {
      if (typeof UI !== 'undefined' && UI.showScreen) {
        UI.showScreen('screen-settings');
      }
    });
  }
});
