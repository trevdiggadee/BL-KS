/**
 * scoring.js
 * Single responsibility: turn game events (lines cleared, drops) into
 * score, and own the level/speed curve. Pure functions — no DOM, no state
 * beyond what's passed in.
 */

const Scoring = (() => {
  const LINE_BASE = { 1: 100, 2: 300, 3: 500, 4: 800 };
  // T-spin and all-clear tables (same numbers tetris.com's Mind Bender uses;
  // the one exception is T-Spin Mini Double, which is a known bug there that
  // scores nothing — here it scores the guideline 400).
  const TSPIN_BASE = { 0: 400, 1: 800, 2: 1200, 3: 1600 };
  const TSPIN_MINI_BASE = { 0: 100, 1: 200, 2: 400 };
  const ALL_CLEAR_BASE = { 1: 900, 2: 1500, 3: 2300, 4: 2800 };
  const ALL_CLEAR_B2B_TETRIS = 4400;
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
   * `multiplier` replaces `level` in the base score (Mind Bender style); it
   * defaults to `level` so callers that don't care keep the old behaviour.
   * `tspin` is 'none' | 'mini' | 'full'. Tetrises and T-spins that clear lines
   * are "difficult" and chain back-to-back for a x1.5 bonus.
   */
  function scoreLineClear({ linesCleared, level, multiplier, combo, backToBack, tspin = 'none', allClear = false }) {
    if (linesCleared === 0) {
      return { points: 0, combo: 0, backToBack, isTetris: false, isTSpin: false, tspin: 'none', allClear: false, b2bApplied: false };
    }
    const mult = multiplier || level;
    const isTetris = linesCleared === 4;
    const isTSpin = tspin !== 'none';
    const isDifficult = isTetris || isTSpin;

    let base;
    if (allClear) base = ALL_CLEAR_BASE[linesCleared];
    else if (tspin === 'full') base = TSPIN_BASE[linesCleared];
    else if (tspin === 'mini') base = TSPIN_MINI_BASE[linesCleared] ?? TSPIN_BASE[linesCleared];
    else base = LINE_BASE[linesCleared];
    base *= mult;

    const b2bApplied = isDifficult && backToBack > 0;
    if (allClear && isTetris && b2bApplied) base = ALL_CLEAR_B2B_TETRIS * mult;
    else if (b2bApplied) base = Math.round(base * BACK_TO_BACK_MULTIPLIER);
    const newBackToBack = isDifficult ? backToBack + 1 : 0;

    const newCombo = combo + 1; // combo starts at -1 before first clear so first clear = 0
    const comboBonus = newCombo > 0 ? COMBO_BASE * newCombo * level : 0;

    return {
      points: base + comboBonus,
      combo: newCombo,
      backToBack: newBackToBack,
      isTetris, isTSpin, tspin, allClear, b2bApplied,
    };
  }

  /** A T-spin that clears nothing still scores (and does not break back-to-back). */
  function tspinNoLinePoints(tspin, multiplier) {
    const base = tspin === 'full' ? TSPIN_BASE[0] : tspin === 'mini' ? TSPIN_MINI_BASE[0] : 0;
    return base * multiplier;
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
    tspinNoLinePoints,
    softDropPoints,
    hardDropPoints,
  };
})();
