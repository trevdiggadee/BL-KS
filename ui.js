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
  function clearColorCache() { Object.keys(COLOR_CACHE).forEach((k) => delete COLOR_CACHE[k]); GRADIENT_CACHE = {}; }

  /** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb color by blending
   *  toward white/black. Used to build the glossy bevel gradient below. */
  function shade(hex, amt) {
    const h = hex.replace('#', '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c + c * amt)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  // CanvasGradient objects aren't tied to the context that created them —
  // safe to build once per color+size and reuse across boardCtx and the
  // small hold/next preview contexts.
  let GRADIENT_CACHE = {};
  function getCellGradient(color, size) {
    const key = color + '|' + Math.round(size);
    let g = GRADIENT_CACHE[key];
    if (g) return g;
    const scratch = (boardCtx || (el['board-canvas'] && el['board-canvas'].getContext('2d')));
    g = scratch.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, shade(color, 0.45));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, -0.35));
    GRADIENT_CACHE[key] = g;
    return g;
  }

  function drawCell(ctx, row, col, color, alpha = 1, glow = true) {
    const x = col * cellSize;
    const y = row * cellSize;
    const pad = Math.max(1, cellSize * 0.06);
    const size = cellSize - pad * 2;
    const r = cellSize * 0.2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + pad, y + pad);

    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = cellSize * 0.55;
    }

    ctx.fillStyle = getCellGradient(color, size);
    roundRect(ctx, 0, 0, size, size, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    // glossy top highlight band
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(ctx, size * 0.08, size * 0.07, size * 0.84, size * 0.3, r * 0.6);
    ctx.fill();

    // crisp bright edge
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = shade(color, 0.5);
    ctx.lineWidth = Math.max(1, cellSize * 0.045);
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, r);
    ctx.stroke();

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

  // --- Motion trail: a short fading afterimage of where the active
  // piece just was, so movement and falling read as fluid rather than
  // a piece silently teleporting cell-to-cell. ---
  let trail = [];
  let lastTrailKey = null, lastTrailCells = null, lastTrailColor = null;

  function recordTrail(cells, colorHex) {
    const key = cells.map((c) => c[0] + ',' + c[1]).join('|');
    if (key === lastTrailKey) return;
    if (lastTrailCells) {
      trail.push({ cells: lastTrailCells, color: lastTrailColor, age: 0 });
      if (trail.length > 24) trail.shift();
    }
    lastTrailKey = key;
    lastTrailCells = cells;
    lastTrailColor = colorHex;
  }
  function resetTrail() {
    trail = []; lastTrailKey = null; lastTrailCells = null; lastTrailColor = null;
  }
  function drawTrail(ctx) {
    const hiddenOffset = Board.HIDDEN_ROWS;
    trail.forEach((t) => {
      const alpha = (1 - t.age) * 0.28;
      if (alpha <= 0.01) return;
      t.cells.forEach(([r, c]) => {
        const rr = r - hiddenOffset;
        if (rr >= 0) drawCell(ctx, rr, c, t.color, alpha, false);
      });
    });
    trail.forEach((t) => { t.age += 0.22; });
    trail = trail.filter((t) => t.age < 1);
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
    drawTrail(fxCtx);
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

  let lastScoreText = null;
  function updateHud(score, level) {
    const scoreText = String(Math.floor(score)).padStart(6, '0');
    if (scoreText !== lastScoreText) {
      lastScoreText = scoreText;
      const scoreEl = el['hud-score'];
      scoreEl.textContent = scoreText;
      scoreEl.classList.remove('pop');
      void scoreEl.offsetWidth; // restart the animation
      scoreEl.classList.add('pop');
    }
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
    clearColorCache, recordTrail, resetTrail, resolveColor: colorFor,
    get holdCtx() { return holdCtx; },
    get nextCtx() { return nextCtx; },
    get cellSize() { return cellSize; },
    el,
  };
})();


/*
 * NeonBlock — Prism Forge visual layer
 * Additive visual polish: dimensional blocks, edge highlights, glass UI,
 * scanlines, chromatic bloom, micro-particles and adaptive glow.
 */
(() => {
  "use strict";

  const V = {
    enabled: true,
    pulse: 0,
    last: performance.now(),
    dpr: Math.min(2, window.devicePixelRatio || 1),
    hue: 145,
    flashes: [],
    sparks: [],
    resizeObserver: null
  };

  const root = document.documentElement;

  function themeHue() {
    const raw = getComputedStyle(root).getPropertyValue("--accent").trim();
    const m = raw.match(/hsl\(\s*([-\d.]+)/i);
    if (m) return Number(m[1]);
    const vars = ["--primary", "--neon", "--accent-color"];
    for (const k of vars) {
      const v = getComputedStyle(root).getPropertyValue(k).trim();
      const mm = v.match(/hsl\(\s*([-\d.]+)/i);
      if (mm) return Number(mm[1]);
    }
    return V.hue;
  }

  function addStyle() {
    if (document.getElementById("prism-forge-style")) return;
    const s = document.createElement("style");
    s.id = "prism-forge-style";
    s.textContent = `
      :root {
        --prism-hue: 145;
        --prism-glow: 0 0 18px hsl(var(--prism-hue) 100% 60% / .24),
                      0 0 42px hsl(var(--prism-hue) 100% 60% / .12);
      }
      body::before {
        content:"";
        position:fixed; inset:0; pointer-events:none; z-index:9997;
        background:
          radial-gradient(circle at 50% -10%, hsl(var(--prism-hue) 100% 65% / .10), transparent 38%),
          radial-gradient(circle at 100% 100%, hsl(calc(var(--prism-hue) + 80) 100% 60% / .06), transparent 34%);
        mix-blend-mode:screen;
      }
      body::after {
        content:""; position:fixed; inset:0; pointer-events:none; z-index:9998;
        background:repeating-linear-gradient(to bottom, transparent 0, transparent 3px,
          rgba(255,255,255,.018) 4px);
        opacity:.35;
      }
      canvas {
        filter: drop-shadow(0 0 8px hsl(var(--prism-hue) 100% 60% / .13));
      }
      button, input, select, .panel, .card, .modal, .settings, .stat, .score,
      .game-over, .overlay, [class*="panel"], [class*="card"] {
        transition: transform .18s cubic-bezier(.2,.8,.2,1),
                    box-shadow .22s ease, border-color .22s ease,
                    background-color .22s ease, filter .22s ease;
      }
      button:active { transform: translateY(1px) scale(.975); }
      button:hover { filter: brightness(1.12) saturate(1.15); }
      .prism-surface {
        position:relative; overflow:hidden;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08), var(--prism-glow);
      }
      .prism-surface::before {
        content:""; position:absolute; inset:-100% -40%;
        background:linear-gradient(105deg, transparent 42%, rgba(255,255,255,.065) 49%,
          rgba(255,255,255,.015) 54%, transparent 61%);
        transform:translateX(-35%);
        animation:prismSweep 7s linear infinite;
        pointer-events:none;
      }
      @keyframes prismSweep { to { transform:translateX(35%); } }
      .prism-pop { animation: prismPop .28s cubic-bezier(.16,1,.3,1); }
      @keyframes prismPop {
        0% { transform:scale(.92); filter:brightness(1.8); }
        65% { transform:scale(1.025); }
        100% { transform:scale(1); filter:brightness(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .prism-surface::before { animation:none; }
        .prism-pop { animation:none; }
      }
    `;
    document.head.appendChild(s);
  }

  function decorateUI() {
    const selectors = [
      "button", ".panel", ".card", ".modal", ".settings", ".stat",
      ".score", ".game-over", ".overlay", ".controls", ".next", ".hold"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(el => {
      el.classList.add("prism-surface");
    });
  }

  function installCanvasFX() {
    document.querySelectorAll("canvas").forEach(canvas => {
      if (canvas.dataset.prismReady) return;
      canvas.dataset.prismReady = "1";
      const parent = canvas.parentElement;
      if (parent) parent.classList.add("prism-canvas-shell");
    });
  }

  function loop(now) {
    const dt = Math.min(32, now - V.last);
    V.last = now;
    V.pulse += dt * .001;
    const h = themeHue();
    if (Number.isFinite(h)) V.hue = h;
    root.style.setProperty("--prism-hue", String(V.hue));
    if (Math.floor(now / 500) % 2 === 0) {
      decorateUI();
      installCanvasFX();
    }
    requestAnimationFrame(loop);
  }

  function expose() {
    window.NeonBlockPrism = {
      flash(x = innerWidth / 2, y = innerHeight / 2, power = 1) {
        V.flashes.push({x, y, p: power, t: performance.now()});
      },
      sparkle(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 20 + Math.random() * 90;
          V.sparks.push({
            x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
            t:performance.now(), life:350+Math.random()*450
          });
        }
      }
    };
  }

  addStyle();
  decorateUI();
  installCanvasFX();
  expose();
  requestAnimationFrame(loop);
})();



/* Prism Forge block renderer enhancement */
(() => {
  const Ctx = window.CanvasRenderingContext2D;
  if (!Ctx || Ctx.prototype.__prismBlocks) return;
  Ctx.prototype.__prismBlocks = true;

  const originalFillRect = Ctx.prototype.fillRect;
  const originalStrokeRect = Ctx.prototype.strokeRect;

  Ctx.prototype.fillRect = function(x, y, w, h) {
    // Only enhance reasonably block-like rectangles; preserve tiny UI rectangles.
    const blockLike = w >= 8 && h >= 8 && Math.abs(w - h) <= Math.max(w,h) * .18;
    if (!blockLike || this.__prismInternal) {
      return originalFillRect.call(this, x, y, w, h);
    }

    const oldFill = this.fillStyle;
    const oldAlpha = this.globalAlpha;
    const oldComp = this.globalCompositeOperation;

    try {
      const g = this.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "rgba(255,255,255,.22)");
      g.addColorStop(.08, oldFill);
      g.addColorStop(.72, oldFill);
      g.addColorStop(1, "rgba(0,0,0,.28)");

      this.__prismInternal = true;
      this.fillStyle = g;
      originalFillRect.call(this, x, y, w, h);

      // Crisp inner highlight along the upper/left faces.
      this.fillStyle = "rgba(255,255,255,.12)";
      originalFillRect.call(this, x + 1, y + 1, Math.max(1,w - 2), Math.max(1,h * .075));

      this.fillStyle = "rgba(255,255,255,.075)";
      originalFillRect.call(this, x + 1, y + 1, Math.max(1,w * .075), Math.max(1,h - 2));

      // Lower edge adds a subtle inset depth.
      this.fillStyle = "rgba(0,0,0,.18)";
      originalFillRect.call(this, x + 1, y + h - Math.max(2,h*.07),
                            Math.max(1,w - 2), Math.max(1,h*.05));

      this.fillStyle = oldFill;
      this.globalAlpha = oldAlpha;
      this.globalCompositeOperation = oldComp;
    } finally {
      this.__prismInternal = false;
    }
  };

  // Give outlines a cleaner glass-metal edge without replacing existing colors.
  Ctx.prototype.strokeRect = function(x,y,w,h) {
    const old = this.globalAlpha;
    if (w >= 8 && h >= 8) {
      this.globalAlpha = Math.min(1, old * .72);
      originalStrokeRect.call(this, x,y,w,h);
      this.globalAlpha = old;
    } else {
      originalStrokeRect.call(this, x,y,w,h);
    }
  };
})();
