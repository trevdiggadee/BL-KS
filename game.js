/**
 * game.js
 * Single responsibility: the game loop and state machine. Owns the live
 * game state (grid, active piece, timers) and orchestrates the other
 * modules each frame. Persistence, rendering, and input all live
 * elsewhere and are called into from here.
 */

const Game = (() => {
  const LOCK_DELAY_MS = 500;
  const MAX_LOCK_RESETS = 15;
  const LINE_CLEAR_FLASH_MS = 180;

  let saveData = null;
  let bagNext = null;

  let state = 'start'; // start | countdown | playing | paused | clearing | gameover
  let grid = null;
  let active = null;
  let nextType = null;
  let heldType = null;
  let canHold = true;
  let holdUsedThisGame = false;

  let score = 0, lines = 0, level = 1;
  let combo = -1, bestComboThisGame = 0, backToBack = 0;
  let piecesPlaced = 0;
  let softDropActive = false;
  let gravityAcc = 0;
  let lockTimer = 0;
  let lockResets = 0;
  let isLocking = false;
  let pendingClearRows = null;
  let clearTimer = 0;
  let rafId = null;
  let lastTs = 0;
  let sessionStartTs = 0;
  let countdownValue = 3;
  let countdownTimer = null;
  let awaitingTopOutCheck = false;

  function vibrate(ms) {
    if (saveData.settings.vibration && navigator.vibrate) navigator.vibrate(ms);
  }

  function resetRunState() {
    grid = Board.create();
    bagNext = Pieces.randomBagGenerator();
    active = Pieces.createPiece(bagNext());
    nextType = bagNext();
    heldType = null;
    canHold = true;
    holdUsedThisGame = false;
    score = 0; lines = 0; level = 1;
    combo = -1; bestComboThisGame = 0; backToBack = 0;
    piecesPlaced = 0;
    softDropActive = false;
    gravityAcc = 0; lockTimer = 0; lockResets = 0; isLocking = false;
    pendingClearRows = null;
    UI.resetTrail();
    UI.setCombo('');
    UI.updateHud(score, level);
  }

  function spawnNext() {
    active = Pieces.createPiece(nextType);
    nextType = bagNext();
    canHold = true;
    lockResets = 0;
    isLocking = false;
    UI.resetTrail();
    UI.drawMiniPiece(UI.nextCtx, nextType);
    if (!Collision.fits(grid, active)) {
      triggerGameOver();
    }
  }

  function triggerGameOver() {
    state = 'gameover';
    stopLoop();
    Audio_.sfx.gameOver();
    Effects.shake(10);
    vibrate(200);

    const isHighScore = score > saveData.stats.highScore;
    saveData.stats.highScore = Math.max(saveData.stats.highScore, Math.floor(score));
    saveData.stats.highestLevel = Math.max(saveData.stats.highestLevel, level);
    saveData.stats.bestCombo = Math.max(saveData.stats.bestCombo, bestComboThisGame);
    saveData.stats.totalGames += 1;
    if (lines > 0 && !holdUsedThisGame) saveData.stats.perfectGames += 1;
    saveData.recentGames.unshift({ score: Math.floor(score), level, lines, date: Date.now() });
    saveData.recentGames = saveData.recentGames.slice(0, 20);
    Storage.save(saveData);

    checkAchievements();
    UI.showGameOver({ score, level, lines, bestCombo: bestComboThisGame, isHighScore });
    if (isHighScore && score > 0) Audio_.sfx.highScore();
  }

  function checkAchievements() {
    const newly = Achievements.checkNewUnlocks(saveData.stats, saveData.achievements);
    if (newly.length === 0) return;
    newly.forEach((a, i) => {
      saveData.achievements[a.id] = true;
      setTimeout(() => {
        UI.showAchievementPopup(a);
        Audio_.sfx.achievement();
      }, i * 900);
    });
    Storage.save(saveData);
  }

  function lockActivePiece() {
    Board.lockPiece(grid, Pieces.getCells(active), active.color);
    piecesPlaced += 1;
    saveData.stats.totalPieces += 1;
    Audio_.sfx.lock();

    const fullRows = Board.findFullRows(grid);
    if (fullRows.length > 0) {
      beginLineClear(fullRows);
    } else {
      combo = -1;
      UI.setCombo('');
      spawnNext();
    }
  }

  function beginLineClear(fullRows) {
    state = 'clearing';
    pendingClearRows = fullRows;
    clearTimer = LINE_CLEAR_FLASH_MS;

    const result = Scoring.scoreLineClear({ linesCleared: fullRows.length, level, combo, backToBack });
    score += result.points;
    combo = result.combo;
    backToBack = result.backToBack;
    bestComboThisGame = Math.max(bestComboThisGame, combo);
    lines += fullRows.length;
    const newLevel = Scoring.levelForLines(lines);
    const leveledUp = newLevel > level;
    level = newLevel;

    saveData.stats.totalLines += fullRows.length;
    if (result.isTetris) saveData.stats.totalTetrises += 1;

    UI.updateHud(score, level);

    if (result.isTetris) {
      Audio_.sfx.tetris();
      Effects.shake(9);
      Effects.flash(getColorRgb('cyan'), 0.3);
      Effects.toast('TETRIS!', 'tetris');
      Effects.pulse('#board-frame');
      vibrate([40, 30, 40, 30, 60]);
    } else {
      Audio_.sfx.lineClear(fullRows.length);
      Effects.shake(3 + fullRows.length);
      if (fullRows.length === 3) Effects.toast('TRIPLE!', 'default');
      else if (fullRows.length === 2) Effects.toast('DOUBLE!', 'default');
      vibrate(30);
    }
    if (combo >= 2) {
      Audio_.sfx.combo(combo);
      Effects.toast(`${combo}x COMBO`, 'combo', 800);
      Effects.pulse('#combo-banner');
    }
    if (leveledUp) {
      Audio_.sfx.levelUp();
      Effects.toast(`LEVEL ${level}`, 'levelup');
      Effects.pulse('#hud-level');
    }

    const cellSize = UI.cellSize;
    Particles.spawnLineClearBurst(
      fullRows.map((r) => (r - Board.HIDDEN_ROWS) * cellSize),
      Board.COLS, cellSize,
      [getColorHex('cyan'), getColorHex('magenta'), getColorHex('amber'), getColorHex('green')],
      result.isTetris
    );
  }

  function finishLineClear() {
    grid = Board.clearRows(grid, pendingClearRows);
    pendingClearRows = null;
    state = 'playing';
    spawnNext();
  }

  function getColorHex(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  }
  function getColorRgb(name) {
    return hexToRgbString(getColorHex(name)) || '255,255,255';
  }
  function hexToRgbString(hex) {
    const m = hex.replace('#', '');
    if (m.length !== 6) return null;
    const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
    return `${r},${g},${b}`;
  }

  // --- Player actions ---
  function tryMoveActive(dRow, dCol) {
    if (state !== 'playing') return;
    const moved = Collision.tryMove(grid, active, dRow, dCol);
    if (moved) {
      active = moved;
      if (dCol !== 0) Audio_.sfx.move();
      resetLockIfGrounded();
      return true;
    }
    return false;
  }

  function rotateActive(dir) {
    if (state !== 'playing') return;
    const rotated = Collision.tryRotate(grid, active, dir);
    if (rotated) {
      active = rotated;
      Audio_.sfx.rotate();
      resetLockIfGrounded();
    }
  }

  function resetLockIfGrounded() {
    const grounded = !Collision.fits(grid, { ...active, row: active.row + 1 });
    if (grounded) {
      if (lockResets < MAX_LOCK_RESETS) {
        lockTimer = 0;
        lockResets += 1;
      }
      isLocking = true;
    } else {
      isLocking = false;
      lockTimer = 0;
    }
  }

  function hardDrop() {
    if (state !== 'playing') return;
    const distance = Collision.dropDistance(grid, active);
    score += Scoring.hardDropPoints(distance);

    if (distance > 0 && saveData.settings.animations) {
      const cellSize = UI.cellSize;
      const hiddenOffset = Board.HIDDEN_ROWS;
      const color = UI.resolveColor(active.color);
      const cols = [...new Set(Pieces.getCells(active).map(([, c]) => c))];
      const yTop = (active.row - hiddenOffset) * cellSize;
      const yBottom = (active.row + distance - hiddenOffset) * cellSize + cellSize;
      cols.forEach((c) => {
        Particles.spawnDropBeam(c * cellSize + cellSize / 2, Math.max(0, yTop), yBottom, color, cellSize * 0.55);
      });
    }

    active = { ...active, row: active.row + distance };
    Audio_.sfx.hardDrop();
    Effects.shake(4);
    UI.updateHud(score, level);
    lockActivePiece();
  }

  function holdPiece() {
    if (state !== 'playing' || !canHold) return;
    Audio_.sfx.hold();
    holdUsedThisGame = true;
    if (heldType === null) {
      heldType = active.type;
      spawnNext();
    } else {
      const swap = heldType;
      heldType = active.type;
      active = Pieces.createPiece(swap);
      canHold = false;
      lockResets = 0;
      isLocking = false;
      lockTimer = 0;
      UI.resetTrail();
      if (!Collision.fits(grid, active)) triggerGameOver();
    }
    canHold = false;
    UI.drawMiniPiece(UI.holdCtx, heldType);
  }

  function softDropStart() { softDropActive = true; }
  function softDropEnd() { softDropActive = false; }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      UI.setOverlay('overlay-pause', true);
      Audio_.stopMusic();
      accumulatePlayTime();
    } else if (state === 'paused') {
      state = 'playing';
      UI.setOverlay('overlay-pause', false);
      if (saveData.settings.musicOn) Audio_.startMusic();
      sessionStartTs = performance.now();
      lastTs = performance.now();
    }
  }

  function accumulatePlayTime() {
    if (sessionStartTs) {
      saveData.stats.totalPlayTimeMs += performance.now() - sessionStartTs;
      sessionStartTs = 0;
    }
  }

  // --- Loop ---
  function update(dt) {
    if (state === 'clearing') {
      clearTimer -= dt;
      if (clearTimer <= 0) finishLineClear();
      return;
    }
    if (state !== 'playing') return;

    const gravityMs = softDropActive
      ? Math.min(Scoring.gravityMsForLevel(level), 45)
      : Scoring.gravityMsForLevel(level);

    gravityAcc += dt;
    while (gravityAcc >= gravityMs) {
      gravityAcc -= gravityMs;
      const moved = Collision.tryMove(grid, active, 1, 0);
      if (moved) {
        active = moved;
        if (softDropActive) score += Scoring.softDropPoints(1);
        isLocking = false;
        lockTimer = 0;
      } else {
        isLocking = true;
      }
    }

    if (isLocking) {
      lockTimer += dt;
      if (lockTimer >= LOCK_DELAY_MS) {
        lockActivePiece();
      }
    }
    UI.updateHud(score, level);
  }

  function render() {
    const ghost = saveData.settings.ghostPiece ? Collision.getGhost(grid, active) : null;
    const activeCells = state === 'playing' || state === 'clearing' ? Pieces.getCells(active) : null;
    if (state === 'playing' && activeCells && saveData.settings.animations) {
      UI.recordTrail(activeCells, UI.resolveColor(active.color));
    }
    UI.renderBoard({
      grid,
      activeCells,
      activeColor: active ? active.color : 'cyan',
      ghostCells: ghost ? Pieces.getCells(ghost) : null,
      ghostOn: !!ghost,
      lockFlashRows: state === 'clearing' ? pendingClearRows : null,
    });
    Particles.update();
    UI.renderFx();
    UI.applyShake();
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(50, ts - lastTs);
    lastTs = ts;
    update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = 0;
    accumulatePlayTime();
    Storage.save(saveData);
  }

  function startCountdown() {
    UI.showScreen('game');
    UI.resizeBoardCanvas();
    resetRunState();
    UI.drawMiniPiece(UI.holdCtx, null);
    UI.drawMiniPiece(UI.nextCtx, nextType);
    state = 'countdown';
    countdownValue = 3;
    UI.setCountdown(countdownValue);
    UI.setOverlay('overlay-countdown', true);
    UI.setOverlay('overlay-gameover', false);
    UI.setOverlay('overlay-pause', false);
    Audio_.resume();
    countdownTimer = setInterval(() => {
      countdownValue -= 1;
      if (countdownValue <= 0) {
        UI.setCountdown(0);
        Audio_.sfx.go();
        clearInterval(countdownTimer);
        setTimeout(() => {
          UI.setOverlay('overlay-countdown', false);
          beginPlaying();
        }, 260);
      } else {
        Audio_.sfx.countdown();
        UI.setCountdown(countdownValue);
      }
    }, 650);
  }

  function beginPlaying() {
    state = 'playing';
    sessionStartTs = performance.now();
    lastTs = 0;
    if (saveData.settings.musicOn) Audio_.startMusic();
    rafId = requestAnimationFrame(loop);
  }

  function restart() {
    stopLoop();
    Particles.clear();
    startCountdown();
  }

  function quitToMenu() {
    stopLoop();
    Audio_.stopMusic();
    Particles.clear();
    UI.setOverlay('overlay-pause', false);
    UI.setOverlay('overlay-gameover', false);
    UI.updateStartStats(saveData.stats);
    UI.showScreen('start');
  }

  function bindInput() {
    Input.on({
      left: () => tryMoveActive(0, -1),
      right: () => tryMoveActive(0, 1),
      rotateCW: () => rotateActive(1),
      rotateCCW: () => rotateActive(-1),
      softDropStart, softDropEnd,
      hardDrop,
      hold: holdPiece,
      pause: togglePause,
    });
    Input.initKeyboard();
    Input.initButtons({
      left: UI.el['btn-left'], right: UI.el['btn-right'],
      softDrop: UI.el['btn-softdrop'], rotate: UI.el['btn-rotate'],
      hardDrop: UI.el['btn-harddrop'], hold: UI.el['btn-hold'],
    });
    Input.initSwipe(UI.el['board-frame']);
  }

  function init(data) {
    saveData = data;
    bindInput();
    window.addEventListener('resize', () => { if (state !== 'start') UI.resizeBoardCanvas(); });
  }

  /** Repoints the live game state at a fresh save object — needed after
   *  Settings replaces its own copy wholesale (reset stats / clear data),
   *  since otherwise the next game-over would resurrect the old numbers. */
  function setSaveData(data) {
    saveData = data;
  }

  return {
    init, setSaveData, startCountdown, restart, quitToMenu, togglePause,
    get state() { return state; },
  };
})();
