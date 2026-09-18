/**
 * storage.js
 * Single responsibility: persist and load player data on-device.
 * Defensive by design — a corrupt or old save must never crash the game
 * or wipe stats. Every read is validated; every write is versioned.
 */

const Storage = (() => {
  const KEY = 'neonblock.save.v1';
  const SCHEMA_VERSION = 1;

  const DEFAULTS = () => ({
    version: SCHEMA_VERSION,
    stats: {
      highScore: 0,
      highestLevel: 1,
      totalLines: 0,
      totalGames: 0,
      totalTetrises: 0,
      bestCombo: 0,
      totalPieces: 0,
      totalPlayTimeMs: 0,
      perfectGames: 0,
    },
    achievements: {},
    recentGames: [],
    settings: {
      musicOn: true,
      sfxOn: true,
      musicVolume: 0.55,
      sfxVolume: 0.8,
      vibration: true,
      theme: 'neon',
      ghostPiece: true,
      animations: true,
      controlLayout: 'right', // 'right' | 'left'
      showControls: false, // on-screen buttons; swipe/tap/keyboard always work regardless
    },
  });

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /** Deep-merge `loaded` onto `base`, keeping base's shape/defaults for
   *  anything missing or malformed in `loaded`. Never trusts loaded's types. */
  function safeMerge(base, loaded) {
    if (!isPlainObject(loaded)) return clone(base);
    const out = clone(base);
    for (const key of Object.keys(base)) {
      const baseVal = base[key];
      const loadedVal = loaded[key];
      if (loadedVal === undefined) continue;
      if (isPlainObject(baseVal)) {
        out[key] = safeMerge(baseVal, loadedVal);
      } else if (Array.isArray(baseVal)) {
        out[key] = Array.isArray(loadedVal) ? loadedVal.slice(0, 20) : baseVal;
      } else if (typeof baseVal === 'number') {
        out[key] = typeof loadedVal === 'number' && isFinite(loadedVal) ? loadedVal : baseVal;
      } else if (typeof baseVal === 'boolean') {
        out[key] = typeof loadedVal === 'boolean' ? loadedVal : baseVal;
      } else if (typeof baseVal === 'string') {
        out[key] = typeof loadedVal === 'string' ? loadedVal : baseVal;
      } else {
        out[key] = loadedVal;
      }
    }
    return out;
  }

  /** Migration chain. Each function takes the raw parsed object at its
   *  version and returns the object upgraded to the next version. */
  const migrations = {
    // 0 -> 1: initial schema, nothing to migrate from (placeholder for future use)
  };

  function migrate(data) {
    let version = typeof data.version === 'number' ? data.version : 0;
    while (version < SCHEMA_VERSION && migrations[version]) {
      data = migrations[version](data);
      version += 1;
    }
    data.version = SCHEMA_VERSION;
    return data;
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      console.warn('Storage unavailable, using in-memory defaults', e);
      return DEFAULTS();
    }
    if (!raw) return DEFAULTS();
    try {
      let parsed = JSON.parse(raw);
      parsed = migrate(parsed);
      return safeMerge(DEFAULTS(), parsed);
    } catch (e) {
      console.warn('Save data corrupt, resetting to defaults', e);
      return DEFAULTS();
    }
  }

  function save(data) {
    try {
      const toSave = safeMerge(DEFAULTS(), data);
      localStorage.setItem(KEY, JSON.stringify(toSave));
      return true;
    } catch (e) {
      console.warn('Could not save game data', e);
      return false;
    }
  }

  function exportData() {
    try {
      return localStorage.getItem(KEY) || JSON.stringify(DEFAULTS());
    } catch (e) {
      return JSON.stringify(DEFAULTS());
    }
  }

  function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const merged = safeMerge(DEFAULTS(), migrate(parsed));
      save(merged);
      return merged;
    } catch (e) {
      console.warn('Import failed: invalid data', e);
      return null;
    }
  }

  function clearAll() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      /* ignore */
    }
    return DEFAULTS();
  }

  return { load, save, exportData, importData, clearAll, DEFAULTS };
})();
