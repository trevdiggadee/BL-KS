/**
 * ui.js
 * Single responsibility: everything visual that isn't game rules —
 * screen switching, drawing the board/pieces/ghost to canvas, HUD text,
 * and the small hold/next previews. game.js calls into this; this file
 * never mutates game state.
 */

const UI = (() => {
  const el = {};
  let boardCtx, fxCtx, holdCtx, nextCtx;
  let cellSize = 24;
  let dpr = 1;

  function cacheEls() {
    [
      'screen-start', 'screen-game', 'screen-stats', 'screen-settings', 'screen-howto',
      'board-canvas', 'fx-canvas', 'hold-canvas', 'next-canvas', 'board-frame',
      'hud-score', 'hud-level', 'combo-banner',
      'overlay-pause', 'overlay-gameover', 'overlay-countdown', 'countdown-num',
      'go-score', 'go-level', 'go-lines', 'go-combo', 'gameover-title',
      'stat-highscore', 'stat-highlevel', 'stat-totallines', 'stat-gamesplayed',
      'toast-layer', 'achievement-layer',
      'btn-play', 'btn-howto', 'btn-stats', 'btn-settings',
      'btn-pause', 'btn-resume', 'btn-restart-pause', 'btn-quit-pause',
      'btn-retry', 'btn-quit-gameover',
      'btn-left', 'btn-right', 'btn-softdrop', 'btn-harddrop', 'btn-rotate', 'btn-hold',
    ].forEach((id) => { el[id] = document.getElementById(id); });

    boardCtx = el['board-canvas'].getContext('2d');
    fxCtx = el['fx-canvas'].getContext('2d');
    holdCtx = el['hold-canvas'].getContext('2d');
    nextCtx = el['next-canvas'].getContext('2d');
    Effects.initToasts(el['toast-layer']);
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('screen--active'));
    const target = document.getElementById(`screen-${name}`);
    if (target) target.classList.add('screen--active');
  }

  // --- Canvas sizing ---
  function resizeBoardCanvas() {
    const frame = el['board-frame'];
    const parent = frame.parentElement;
    const availW = parent.clientWidth;
    const availH = parent.clientHeight;
    const cols = Board.COLS, rows = Board.ROWS;

    let size = Math.min(availW / cols, availH / rows);
    size = Math.max(12, Math.floor(size));
    cellSize = size;

    const width = size * cols;
    const height = size * rows;
    dpr = window.devicePixelRatio || 1;

    [el['board-canvas'], el['fx-canvas']].forEach((c) => {
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    });
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;

    boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function themeColorVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  }

  const COLOR_CACHE = {};
  function colorFor(name) {
    if (!COLOR_CACHE[name]) COLOR_CACHE[name] = themeColorVar(name);
    return COLOR_CACHE[name];
  }
  function clearColorCache() { Object.keys(COLOR_CACHE).forEach((k) => delete COLOR_CACHE[k]); }

  function drawCell(ctx, row, col, color, alpha = 1, glow = true) {
    const x = col * cellSize;
    const y = row * cellSize;
    const pad = Math.max(1, cellSize * 0.06);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = cellSize * 0.5;
    }
    ctx.fillStyle = color;
    const r = cellSize * 0.18;
    roundRect(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, r);
    ctx.fill();
    ctx.restore();

    // inner highlight for a subtle glassy bevel
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(ctx, x + pad + 2, y + pad + 2, cellSize - pad * 2 - 4, (cellSize - pad * 2) * 0.35, r * 0.6);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGhost(ctx, row, col, color) {
    const x = col * cellSize;
    const y = row * cellSize;
    const pad = Math.max(1, cellSize * 0.06);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, cellSize * 0.06);
    const r = cellSize * 0.18;
    roundRect(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, r);
    ctx.stroke();
    ctx.restore();
  }

  /** Renders the locked grid + active piece + ghost onto the board canvas. */
  function renderBoard({ grid, activeCells, activeColor, ghostCells, ghostOn, lockFlashRows }) {
    const w = el['board-canvas'].width / dpr;
    const h = el['board-canvas'].height / dpr;
    boardCtx.clearRect(0, 0, w, h);

    // subtle grid lines
    boardCtx.save();
    boardCtx.strokeStyle = 'rgba(255,255,255,0.045)';
    boardCtx.lineWidth = 1;
    for (let c = 1; c < Board.COLS; c++) {
      boardCtx.beginPath();
      boardCtx.moveTo(c * cellSize, 0);
      boardCtx.lineTo(c * cellSize, Board.ROWS * cellSize);
      boardCtx.stroke();
    }
    for (let r = 1; r < Board.ROWS; r++) {
      boardCtx.beginPath();
      boardCtx.moveTo(0, r * cellSize);
      boardCtx.lineTo(Board.COLS * cellSize, r * cellSize);
      boardCtx.stroke();
    }
    boardCtx.restore();

    const hiddenOffset = Board.HIDDEN_ROWS;
    for (let r = hiddenOffset; r < Board.TOTAL_ROWS; r++) {
      for (let c = 0; c < Board.COLS; c++) {
        const cell = grid[r][c];
        if (cell) {
          const flashing = lockFlashRows && lockFlashRows.includes(r);
          drawCell(boardCtx, r - hiddenOffset, c, colorFor(cell), flashing ? 1 : 1, true);
          if (flashing) {
            boardCtx.save();
            boardCtx.globalAlpha = 0.7;
            boardCtx.fillStyle = '#ffffff';
            roundRect(boardCtx, c * cellSize + 2, (r - hiddenOffset) * cellSize + 2, cellSize - 4, cellSize - 4, cellSize * 0.18);
            boardCtx.fill();
            boardCtx.restore();
          }
        }
      }
    }

    if (ghostOn && ghostCells) {
      ghostCells.forEach(([r, c]) => {
        if (r - hiddenOffset >= 0) drawGhost(boardCtx, r - hiddenOffset, c, colorFor(activeColor));
      });
    }

    if (activeCells) {
      activeCells.forEach(([r, c]) => {
        if (r - hiddenOffset >= 0) drawCell(boardCtx, r - hiddenOffset, c, colorFor(activeColor), 1, true);
      });
    }
  }

  function applyShake() {
    const { x, y } = Effects.getShakeOffset();
    el['board-frame'].style.transform = (x || y) ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` : '';
  }

  function renderFx() {
    const w = el['fx-canvas'].width / dpr;
    const h = el['fx-canvas'].height / dpr;
    fxCtx.clearRect(0, 0, w, h);
    Particles.draw(fxCtx);
    const flashStyle = Effects.getFlashOverlayStyle();
    if (flashStyle) {
      fxCtx.save();
      fxCtx.fillStyle = flashStyle;
      fxCtx.fillRect(0, 0, w, h);
      fxCtx.restore();
    }
  }

  function drawMiniPiece(ctx, type) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!type) return;
    const shape = Pieces.SHAPES[type];
    const cells = shape.states[0];
    const minC = Math.min(...cells.map((c) => c[1]));
    const maxC = Math.max(...cells.map((c) => c[1]));
    const minR = Math.min(...cells.map((c) => c[0]));
    const maxR = Math.max(...cells.map((c) => c[0]));
    const w = maxC - minC + 1;
    const h = maxR - minR + 1;
    const size = Math.min(ctx.canvas.width / 4.4, ctx.canvas.height / 2.4);
    const totalW = w * size, totalH = h * size;
    const offX = (ctx.canvas.width - totalW) / 2;
    const offY = (ctx.canvas.height - totalH) / 2;
    const color = colorFor(shape.color);
    cells.forEach(([r, c]) => {
      const x = offX + (c - minC) * size;
      const y = offY + (r - minR) * size;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.4;
      ctx.fillStyle = color;
      roundRect(ctx, x + 2, y + 2, size - 4, size - 4, size * 0.18);
      ctx.fill();
      ctx.restore();
    });
  }

  function updateHud(score, level) {
    el['hud-score'].textContent = String(Math.floor(score)).padStart(6, '0');
    el['hud-level'].textContent = String(level).padStart(2, '0');
  }

  function setCombo(text) {
    el['combo-banner'].textContent = text || '\u00A0';
  }

  function setOverlay(id, active) {
    el[id].classList.toggle('overlay--active', active);
  }

  function setCountdown(n) {
    el['countdown-num'].textContent = n > 0 ? String(n) : 'GO!';
  }

  function showGameOver({ score, level, lines, bestCombo, isHighScore }) {
    el['go-score'].textContent = Math.floor(score);
    el['go-level'].textContent = level;
    el['go-lines'].textContent = lines;
    el['go-combo'].textContent = bestCombo;
    el['gameover-title'].textContent = isHighScore ? 'NEW HIGH SCORE!' : 'GAME OVER';
    el['gameover-title'].className = `overlay-title ${isHighScore ? 'overlay-title--accent' : 'overlay-title--danger'}`;
    setOverlay('overlay-gameover', true);
  }

  function updateStartStats(stats) {
    el['stat-highscore'].textContent = stats.highScore;
    el['stat-highlevel'].textContent = stats.highestLevel;
    el['stat-totallines'].textContent = stats.totalLines;
    el['stat-gamesplayed'].textContent = stats.totalGames;
  }

  function showAchievementPopup(achievement) {
    const layer = el['achievement-layer'];
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
      <div class="achievement-popup__icon">\u2605</div>
      <div class="achievement-popup__text">
        <div class="achievement-popup__title">ACHIEVEMENT UNLOCKED</div>
        <div class="achievement-popup__name">${achievement.name}</div>
      </div>`;
    layer.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }, 2600);
  }

  function initOrbit() {
    const g = document.getElementById('orbit-pieces');
    if (!g) return;
    const specs = [
      { color: 'cyan', cx: 50, cy: 20, size: 14 },
      { color: 'magenta', cx: 78, cy: 50, size: 14 },
      { color: 'amber', cx: 50, cy: 80, size: 14 },
      { color: 'violet', cx: 22, cy: 50, size: 14 },
    ];
    g.innerHTML = specs.map((s) => `
      <rect x="${s.cx - s.size / 2}" y="${s.cy - s.size / 2}" width="${s.size}" height="${s.size}"
        rx="3" fill="var(--${s.color})" opacity="0.9" />
    `).join('');
    g.style.transformOrigin = '50px 50px';
    g.style.animation = 'orbit-spin 12s linear infinite';
    if (!document.getElementById('orbit-style')) {
      const style = document.createElement('style');
      style.id = 'orbit-style';
      style.textContent = `
        @keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        #orbit-pieces rect { animation: orbit-pulse 1.6s ease-in-out infinite; }
        #orbit-pieces rect:nth-child(2) { animation-delay: 0.4s; }
        #orbit-pieces rect:nth-child(3) { animation-delay: 0.8s; }
        #orbit-pieces rect:nth-child(4) { animation-delay: 1.2s; }
        @keyframes orbit-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `;
      document.head.appendChild(style);
    }
  }

  return {
    cacheEls, showScreen, resizeBoardCanvas, renderBoard, renderFx, applyShake,
    drawMiniPiece, updateHud, setCombo, setOverlay, setCountdown,
    showGameOver, updateStartStats, showAchievementPopup, initOrbit,
    clearColorCache,
    get holdCtx() { return holdCtx; },
    get nextCtx() { return nextCtx; },
    get cellSize() { return cellSize; },
    el,
  };
})();
