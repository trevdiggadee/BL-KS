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
  let mode = Modes.get('standard');
  let modeElapsed = 0, modeEventTimer = 0, bossHp = 0, bossMaxHp = 0, bossLevel = 1;
  let gravityIndex = 0;
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

  // Mind Bender + spin tracking
  let mb = null;                     // MindBender.createState()
  let lastMoveWasRotation = false;   // T-spin rule: last successful action must be a rotation
  let pendingEffect = null;          // effect id waiting for the line-clear animation to end
  let itemHintShown = false;
  let lastTSpin = 'none';         // teach the "?" block once per session

  function vibrate(ms) {
    if (saveData.settings.vibration && navigator.vibrate) navigator.vibrate(ms);
  }

  function gravityVector() {
    if (mode.id !== 'gravity') return [1, 0];
    return [[1,0],[0,1],[-1,0],[0,-1]][gravityIndex % 4];
  }

  function fitsGravity(piece) {
    if (!Collision.fits(grid, piece)) return false;
    const [dr] = gravityVector();
    // Unlike normal gravity, upward gravity has a real top boundary.
    if (dr < 0 && Pieces.getCells(piece).some(([r]) => r < 0)) return false;
    return true;
  }

  function moveGravity(piece) {
    const [dr, dc] = gravityVector();
    const candidate = { ...piece, row: piece.row + dr, col: piece.col + dc };
    return fitsGravity(candidate) ? candidate : null;
  }

  function dropDistanceGravity(piece) {
    const [dr, dc] = gravityVector();
    let distance = 0;
    while (fitsGravity({ ...piece, row: piece.row + dr * (distance + 1), col: piece.col + dc * (distance + 1) })) distance += 1;
    return distance;
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
    modeElapsed = 0; modeEventTimer = 0; gravityIndex = 0;
    bossLevel = 1; bossMaxHp = mode.bossHp || 0; bossHp = bossMaxHp;
    combo = -1; bestComboThisGame = 0; backToBack = 0;
    mb = MindBender.createState();
    lastMoveWasRotation = false; pendingEffect = null;
    UI.resetMindBenderHud(); UI.setMindBender(mb.multiplier, '');
    piecesPlaced = 0;
    softDropActive = false;
    gravityAcc = 0; lockTimer = 0; lockResets = 0; isLocking = false;
    pendingClearRows = null;
    UI.resetTrail();
    UI.setCombo('');
    UI.updateHud(score, level);
    UI.setModeHud(mode, { timeLeft: mode.timeLimit || 0, bossHp, bossMaxHp, gravityIndex });
    if (saveData && saveData.settings.musicOn) Audio_.playLevelMusic(level);
  }

  function spawnNext() {
    active = Pieces.createPiece(nextType);
    if (mode.id === 'gravity' && gravityIndex === 2) active.row = Math.max(0, active.row);
    nextType = bagNext();
    canHold = true;
    lastMoveWasRotation = false;
    lockResets = 0;
    isLocking = false;
    UI.resetTrail();
    UI.drawMiniPiece(UI.nextCtx, nextType);
    if (!Collision.fits(grid, active)) {
      triggerGameOver();
    }
  }

  function triggerGameOver(reason = 'GAME OVER') {
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
    UI.showGameOver({ score, level, lines, bestCombo: bestComboThisGame, isHighScore, title: reason });
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

  /** SRS three-corner rule. 'full' needs both corners the T points toward. */
  function detectTSpin() {
    if (mode.id === 'gravity' || active.type !== 'T' || !lastMoveWasRotation) return 'none';
    const cr = active.row + 1, cc = active.col + 1;      // centre of the T's 3x3 box
    const occ = (r, c) => !Board.cellFree(grid, r, c);   // walls and floor count as filled
    const tl = occ(cr - 1, cc - 1), tr = occ(cr - 1, cc + 1);
    const bl = occ(cr + 1, cc - 1), br = occ(cr + 1, cc + 1);
    if ([tl, tr, bl, br].filter(Boolean).length < 3) return 'none';
    const front = [[tl, tr], [tr, br], [bl, br], [tl, bl]][active.rotation];
    return front[0] && front[1] ? 'full' : 'mini';
  }

  function tspinLabel(tspin, n) {
    const names = tspin === 'mini' ? ['', ' SINGLE', ' DOUBLE'] : ['', ' SINGLE', ' DOUBLE', ' TRIPLE'];
    return (tspin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN') + (names[n] || '');
  }

  function refreshMbHud() {
    let label = '';
    if (mb.effect) {
      const info = MindBender.EFFECTS[mb.effect.id];
      label = `${info.name} ${Math.ceil(mb.effect.remainingMs / 1000)}`;
    }
    UI.setMindBender(mb.multiplier, label);
  }

  /** Called whenever a piece is placed or held. */
  function maybeSpawnItem() {
    if (MindBender.trySpawn(grid, mb, lines)) {
      Audio_.sfx.mbSpawn();
      if (!itemHintShown) {
        itemHintShown = true;
        Effects.toast('CLEAR THE ? ROW', 'levelup', 1300);
      }
    }
  }

  function lockActivePiece() {
    const tspin = detectTSpin();
    lastTSpin = tspin;
    Board.lockPiece(grid, Pieces.getCells(active), active.color);
    piecesPlaced += 1;
    saveData.stats.totalPieces += 1;
    Audio_.sfx.lock();

    const fullRows = Board.findFullRows(grid);
    if (fullRows.length > 0) {
      beginLineClear(fullRows);
    } else {
      if (tspin !== 'none') {
        const pts = Math.round(Scoring.tspinNoLinePoints(tspin, mb.multiplier) * mode.score);
        score += pts;
        UI.updateHud(score, level);
        Audio_.sfx.combo(4);
        Effects.toast(tspin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN', 'combo', 900);
      }
      combo = -1;
      UI.setCombo('');
      maybeSpawnItem();
      spawnNext();
    }
  }

  function beginLineClear(fullRows) {
    state = 'clearing';
    pendingClearRows = fullRows;
    clearTimer = LINE_CLEAR_FLASH_MS;

    // Mind Bender: did this clear take out the flashing item block?
    let itemBonus = 0;
    let itemCleared = false;
    if (MindBender.ENABLED && MindBender.rowsHaveItem(grid, fullRows)) {
      itemCleared = true;
      const won = MindBender.onItemCleared(mb);     // multiplier rises; bonus uses the old one
      itemBonus = won.bonus;
      pendingEffect = MindBender.pickEffect(grid, mb);
    }

    // perfect clear = nothing left once the full rows are gone
    const rowSet = new Set(fullRows);
    const allClear = grid.every((row, r) => rowSet.has(r) || row.every((cell) => cell === null));

    const result = Scoring.scoreLineClear({
      linesCleared: fullRows.length, level, multiplier: mb.multiplier, combo, backToBack,
      tspin: lastTSpin, allClear,
    });
    score += Math.round((result.points + itemBonus) * mode.score);

    if (mode.id === 'boss') {
      const damage = fullRows.length + (result.isTetris ? 2 : 0);
      bossHp -= damage;
      if (bossHp <= 0) {
        score += 2000 * bossLevel;
        bossLevel += 1;
        bossMaxHp = 12 + (bossLevel - 1) * 2;
        bossHp = bossMaxHp;
        modeEventTimer = 0;
        Effects.toast(`BOSS DEFEATED +${2000 * (bossLevel - 1)}`, 'tetris', 1400);
        Audio_.sfx.levelUp();
        Effects.shake(12);
      }
    }
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

    if (itemCleared) {
      const info = MindBender.EFFECTS[pendingEffect];
      Audio_.sfx.mbActivate();
      Effects.flash('255,212,91', 0.32);
      Effects.toast(`MIND BENDER \u00D7${mb.multiplier}`, 'combo', 1300);
      setTimeout(() => Effects.toast(info.name, 'tetris', 1300), 350);
    }
    if (result.allClear) {
      Effects.toast('ALL CLEAR!', 'highscore', 1400);
      Audio_.sfx.highScore();
    } else if (result.isTSpin) {
      Audio_.sfx.tetris();
      Effects.shake(7);
      Effects.toast(tspinLabel(result.tspin, fullRows.length) + (result.b2bApplied ? ' B2B' : ''), 'tetris', 1100);
      vibrate([40, 30, 40]);
    } else if (result.isTetris) {
      Audio_.sfx.tetris();
      Effects.shake(9);
      Effects.flash(getColorRgb('cyan'), 0.3);
      Effects.toast('TETRIS!', 'tetris');
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
    }
    if (leveledUp) {
      Audio_.sfx.levelUp();
      if (saveData.settings.musicOn) Audio_.playLevelMusic(level);
      Effects.toast(`LEVEL ${level}`, 'levelup');
    }

    const cellSize = UI.cellSize;
    Particles.spawnLineClearBurst(
      fullRows.map((r) => (r - Board.HIDDEN_ROWS) * cellSize),
      Board.COLS, cellSize,
      [getColorHex('cyan'), getColorHex('magenta'), getColorHex('amber'), getColorHex('green')],
      result.isTetris
    );
  }

  function applyMindBenderEffect(id) {
    const info = MindBender.EFFECTS[id];
    if (info.timed) {
      mb.effect = { id, remainingMs: info.ms, totalMs: info.ms };
    } else {
      grid = MindBender.applyInstant(id, grid);
      Effects.shake(8);
    }
    refreshMbHud();
  }

  function finishLineClear() {
    grid = Board.clearRows(grid, pendingClearRows);
    pendingClearRows = null;
    if (pendingEffect) applyMindBenderEffect(pendingEffect);
    pendingEffect = null;
    state = 'playing';
    maybeSpawnItem();
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
      lastMoveWasRotation = false;
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
      lastMoveWasRotation = true;
      Audio_.sfx.rotate();
      resetLockIfGrounded();
    }
  }

  function resetLockIfGrounded() {
    const [dr, dc] = gravityVector();
    const grounded = !fitsGravity({ ...active, row: active.row + dr, col: active.col + dc });
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
    const distance = dropDistanceGravity(active);
    if (distance > 0) lastMoveWasRotation = false;
    score += Math.round(Scoring.hardDropPoints(distance) * mode.score);

    if (distance > 0 && saveData.settings.animations && mode.id !== 'gravity') {
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

    const [gdr, gdc] = gravityVector();
    active = { ...active, row: active.row + gdr * distance, col: active.col + gdc * distance };
    Audio_.sfx.hardDrop();
    Effects.shake(4);
    UI.updateHud(score, level);
    lockActivePiece();
  }

  function holdPiece() {
    if (state !== 'playing' || !canHold) return;
    Audio_.sfx.hold();
    holdUsedThisGame = true;
    lastMoveWasRotation = false;
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
    maybeSpawnItem();
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
      if (saveData.settings.musicOn) Audio_.playLevelMusic(level);
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
  function updateModeTimers(dt) {
    modeElapsed += dt;
    modeEventTimer += dt;

    if (mode.timeLimit && modeElapsed >= mode.timeLimit) {
      triggerGameOver('TIME UP');
      return;
    }

    if (mode.id === 'inferno' && modeEventTimer >= mode.garbageEvery) {
      modeEventTimer = 0;
      addGarbageRows(1);
      Effects.toast('INFERNO RISE!', 'default', 700);
      Effects.shake(6);
    }

    if (mode.id === 'boss' && modeEventTimer >= mode.bossAttackEvery) {
      modeEventTimer = 0;
      addGarbageRows(bossLevel >= 3 ? 2 : 1);
      Effects.toast('BOSS ATTACK!', 'default', 800);
      Effects.shake(8);
    }

    if (mode.id === 'gravity' && modeEventTimer >= mode.gravityShiftEvery) {
      modeEventTimer = 0;
      gravityIndex = (gravityIndex + 1) % 4;
      const labels = ['DOWN','RIGHT','UP','LEFT'];
      Effects.toast(`GRAVITY: ${labels[gravityIndex]}`, 'levelup', 850);
      Effects.shake(5);
    }

    UI.setModeHud(mode, { timeLeft: Math.max(0, (mode.timeLimit || 0) - modeElapsed), bossHp, bossMaxHp, gravityIndex });
  }

  function addGarbageRows(count) {
    for (let n = 0; n < count; n++) {
      const hole = Math.floor(Math.random() * Board.COLS);
      grid.shift();
      const row = Array.from({length: Board.COLS}, (_, c) => c === hole ? null : 'danger');
      grid.push(row);
    }
    if (active && !fitsGravity(active)) triggerGameOver('STACK OVERLOAD');
  }

  function update(dt) {
    if (state === 'playing') {
      updateModeTimers(dt);
      if (state === 'gameover') return;
      const t = MindBender.tick(grid, mb, dt, lines);
      if (t.despawned) {
        Effects.toast('ITEM LOST  MB \u00D7' + mb.multiplier, 'default', 1000);
        Audio_.sfx.mbSpawn();
      }
      refreshMbHud();
    }
    if (state === 'clearing') {
      clearTimer -= dt;
      if (clearTimer <= 0) finishLineClear();
      return;
    }
    if (state !== 'playing') return;

    const fxFactor = MindBender.gravityFactor(mb);          // Slow Down x2, Speed Up x0.5
    const baseGravity = (Scoring.gravityMsForLevel(level) / mode.gravity) * fxFactor;
    const gravityMs = softDropActive && mode.id !== 'gravity'
      ? Math.min(baseGravity, 45 * fxFactor)
      : baseGravity;

    gravityAcc += dt;
    while (gravityAcc >= gravityMs) {
      gravityAcc -= gravityMs;
      const moved = moveGravity(active);
      if (moved) {
        active = moved;
        lastMoveWasRotation = false;
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
    const ghost = saveData.settings.ghostPiece && active ? (() => { const d = dropDistanceGravity(active); const [dr,dc] = gravityVector(); return { ...active, row: active.row + dr*d, col: active.col + dc*d }; })() : null;
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
      mb: mb ? {
        urgency: MindBender.urgency(mb),
        blurMs: mb.effect && mb.effect.id === 'blur' ? mb.effect.totalMs - mb.effect.remainingMs : null,
      } : null,
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

  function startCountdown(selectedMode = 'standard') {
    mode = Modes.get(selectedMode);
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
    if (saveData.settings.musicOn) Audio_.playLevelMusic(level);
    rafId = requestAnimationFrame(loop);
  }

  function restart() {
    stopLoop();
    Particles.clear();
    startCountdown(mode.id);
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
