/**
 * scoring.js
 * Single responsibility: turn game events (lines cleared, drops) into
 * score, and own the level/speed curve. Pure functions — no DOM, no state
 * beyond what's passed in.
 */

const Scoring = (() => {
  const LINE_BASE = { 1: 100, 2: 300, 3: 500, 4: 800 };
  const COMBO_BASE = 50;
  const BACK_TO_BACK_MULTIPLIER = 1.5;
  const LINES_PER_LEVEL = 10;

  function levelForLines(totalLines) {
    return Math.floor(totalLines / LINES_PER_LEVEL) + 1;
  }

  /** Gravity in ms per row, decreasing (faster) as level rises. Floors at 60ms. */
  function gravityMsForLevel(level) {
    const base = 800;
    const ms = base * Math.pow(0.86, level - 1);
    return Math.max(60, Math.round(ms));
  }

  /**
   * Computes score/state deltas for a line-clear event.
   * `isDifficult` = tetris (4 lines) or a T-spin (not modeled here, so tetris only)
   * used for the back-to-back bonus, per modern guideline scoring.
   */
  function scoreLineClear({ linesCleared, level, combo, backToBack }) {
    if (linesCleared === 0) {
      return { points: 0, combo: 0, backToBack, isTetris: false };
    }
    const isTetris = linesCleared === 4;
    let base = LINE_BASE[linesCleared] * level;

    const newBackToBack = isTetris ? backToBack + 1 : 0;
    if (isTetris && backToBack > 0) {
      base = Math.round(base * BACK_TO_BACK_MULTIPLIER);
    }

    const newCombo = combo + 1; // combo starts at -1 before first clear so first clear = 0
    const comboBonus = newCombo > 0 ? COMBO_BASE * newCombo * level : 0;

    return {
      points: base + comboBonus,
      combo: newCombo,
      backToBack: newBackToBack,
      isTetris,
    };
  }

  function softDropPoints(cells) {
    return cells * 1;
  }

  function hardDropPoints(cells) {
    return cells * 2;
  }

  return {
    LINES_PER_LEVEL,
    levelForLines,
    gravityMsForLevel,
    scoreLineClear,
    softDropPoints,
    hardDropPoints,
  };
})();
