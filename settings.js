/**
 * settings.js
 * Single responsibility: wire the Settings screen's controls to the saved
 * settings object, applying changes live (theme, audio, animations) and
 * persisting them via Storage. Also owns the destructive data actions.
 */

const SettingsScreen = (() => {
  let data = null;
  let onChange = () => {};

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    UI.clearColorCache();
  }

  function applyAnimations(on) {
    Effects.setAnimationsEnabled(on);
    document.body.classList.toggle('no-anim', !on);
  }

  function applyShowControls(on) {
    document.body.classList.toggle('controls-visible', on);
    if (typeof Game !== 'undefined' && Game.state !== 'start') UI.resizeBoardCanvas();
  }

  function refreshUI() {
    const s = data.settings;
    document.getElementById('set-music').checked = s.musicOn;
    document.getElementById('set-music-vol').value = s.musicVolume;
    document.getElementById('set-sfx').checked = s.sfxOn;
    document.getElementById('set-sfx-vol').value = s.sfxVolume;
    document.getElementById('set-ghost').checked = s.ghostPiece;
    document.getElementById('set-animations').checked = s.animations;
    document.getElementById('set-vibration').checked = s.vibration;
    document.getElementById('set-layout').checked = s.controlLayout === 'left';
    document.getElementById('set-controls').checked = s.showControls;
    document.querySelectorAll('.theme-swatch').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeChoice === s.theme);
    });
  }

  function persist() {
    Storage.save(data);
  }

  function init(initialData, changeCallback) {
    data = initialData;
    onChange = changeCallback || (() => {});
    applyTheme(data.settings.theme);
    applyAnimations(data.settings.animations);
    applyShowControls(data.settings.showControls);
    Audio_.setMusicOn(data.settings.musicOn);
    Audio_.setSfxOn(data.settings.sfxOn);
    Audio_.setMusicVolume(data.settings.musicVolume);
    Audio_.setSfxVolume(data.settings.sfxVolume);
    refreshUI();

    document.getElementById('set-music').addEventListener('change', (e) => {
      data.settings.musicOn = e.target.checked;
      Audio_.setMusicOn(e.target.checked);
      if (e.target.checked) Audio_.startMusic();
      persist();
    });
    document.getElementById('set-music-vol').addEventListener('input', (e) => {
      data.settings.musicVolume = parseFloat(e.target.value);
      Audio_.setMusicVolume(data.settings.musicVolume);
      persist();
    });
    document.getElementById('set-sfx').addEventListener('change', (e) => {
      data.settings.sfxOn = e.target.checked;
      Audio_.setSfxOn(e.target.checked);
      persist();
    });
    document.getElementById('set-sfx-vol').addEventListener('input', (e) => {
      data.settings.sfxVolume = parseFloat(e.target.value);
      Audio_.setSfxVolume(data.settings.sfxVolume);
      persist();
    });
    document.getElementById('set-ghost').addEventListener('change', (e) => {
      data.settings.ghostPiece = e.target.checked;
      persist();
    });
    document.getElementById('set-animations').addEventListener('change', (e) => {
      data.settings.animations = e.target.checked;
      applyAnimations(e.target.checked);
      persist();
    });
    document.getElementById('set-vibration').addEventListener('change', (e) => {
      data.settings.vibration = e.target.checked;
      persist();
    });
    document.getElementById('set-layout').addEventListener('change', (e) => {
      data.settings.controlLayout = e.target.checked ? 'left' : 'right';
      persist();
      onChange('layout');
    });
    document.getElementById('set-controls').addEventListener('change', (e) => {
      data.settings.showControls = e.target.checked;
      applyShowControls(e.target.checked);
      persist();
    });

    document.querySelectorAll('.theme-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.themeChoice;
        data.settings.theme = theme;
        applyTheme(theme);
        refreshUI();
        persist();
        Audio_.sfx.uiTap();
      });
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      const json = Storage.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neonblock-save-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    document.getElementById('btn-reset-stats').addEventListener('click', () => {
      if (!confirm('Reset all statistics? Your settings and theme will be kept. This cannot be undone.')) return;
      const settings = data.settings;
      data = Storage.DEFAULTS();
      data.settings = settings;
      Storage.save(data);
      onChange('reset-stats');
    });

    document.getElementById('btn-clear-data').addEventListener('click', () => {
      if (!confirm('Clear ALL saved data, including settings and achievements? This cannot be undone.')) return;
      data = Storage.clearAll();
      applyTheme(data.settings.theme);
      applyAnimations(data.settings.animations);
      applyShowControls(data.settings.showControls);
      refreshUI();
      onChange('clear-all');
    });
  }

  function getData() { return data; }
  function setData(d) { data = d; refreshUI(); }

  return { init, getData, setData };
})();
