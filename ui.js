/**
 * ui.js
 * Single responsibility: everything visual that isn't game rules —
 * screen switching, drawing the board/pieces/ghost to canvas, HUD text,
 * and the small hold/next previews. game.js calls into this; this file
 * never mutates game state.
 */

const UI = (() => {
  const el = {};
  let boardCtx, fxCtx, holdCtx, nextCtx, ambientCtx;
  let ambientRaf = 0;
  let ambientStars = [];
  let cellSize = 24;
  let dpr = 1;
  let visualTime = 0;


  function cacheEls() {
    [
      'screen-start', 'screen-game', 'screen-stats', 'screen-settings', 'screen-howto',
      'board-canvas', 'fx-canvas', 'ambient-canvas', 'hold-canvas', 'next-canvas', 'board-frame',
      'hud-score', 'hud-level', 'combo-banner',
      'overlay-pause', 'overlay-gameover', 'overlay-countdown', 'countdown-num',
      'go-score', 'go-level', 'go-lines', 'go-combo', 'gameover-title',
      'corner-highscore',
      'toast-layer', 'achievement-layer', 'hud-mb', 'hud-mb-effect', 'hud-mode-name', 'hud-mode-status', 'boss-meter', 'boss-meter-fill',
      'btn-play', 'btn-howto', 'btn-stats', 'btn-settings',
      'btn-pause', 'btn-resume', 'btn-restart-pause', 'btn-quit-pause',
      'btn-retry', 'btn-quit-gameover',
      'btn-left', 'btn-right', 'btn-softdrop', 'btn-harddrop', 'btn-rotate', 'btn-hold',
    ].forEach((id) => { el[id] = document.getElementById(id); });

    boardCtx = el['board-canvas'].getContext('2d');
    fxCtx = el['fx-canvas'].getContext('2d');
    ambientCtx = el['ambient-canvas'].getContext('2d');
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

    dpr = window.devicePixelRatio || 1;
    let size = Math.min(availW / cols, availH / rows);
    // Snap to whole DEVICE pixels (not whole CSS pixels) so the board uses
    // nearly all of the available space instead of leaving a leftover strip.
    size = Math.max(12, Math.floor(size * dpr) / dpr);
    cellSize = size;

    const width = size * cols;
    const height = size * rows;

    const wrap = parent;
    const ambient = el['ambient-canvas'];
    ambient.style.width = `${wrap.clientWidth}px`;
    ambient.style.height = `${wrap.clientHeight}px`;
    ambient.width = Math.round(wrap.clientWidth * dpr);
    ambient.height = Math.round(wrap.clientHeight * dpr);
    ambientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    [el['board-canvas'], el['fx-canvas']].forEach((c) => {
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    });
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    startAmbientBackground();

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
    const pad = Math.max(1, cellSize * 0.055);
    const size = cellSize - pad * 2;
    const r = cellSize * 0.19;
    const style = document.documentElement.dataset.blockStyle || 'neon';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + pad, y + pad);

    if (style === 'fire') {
      const pulse = .78 + .22 * Math.sin(visualTime * 7 + row * .8 + col * .5);
      ctx.shadowColor = '#ff4b16'; ctx.shadowBlur = glow ? size * (.48 + .12 * pulse) : 0;
      const fire = ctx.createLinearGradient(0,size,0,0);
      fire.addColorStop(0,'#9e1010'); fire.addColorStop(.38,'#ff3b18'); fire.addColorStop(.72,'#ff9d22'); fire.addColorStop(1,'#fff0a0');
      ctx.fillStyle=fire; roundRect(ctx,0,0,size,size,r); ctx.fill(); ctx.shadowBlur=0;
      ctx.save(); roundRect(ctx,0,0,size,size,r); ctx.clip();
      for(let k=0;k<3;k++){
        const fx=size*(.12+.76*((Math.sin(row*2.1+col*3.7+k)+1)/2));
        const fy=size*(.72-.2*k + .08*Math.sin(visualTime*8+k+col));
        ctx.globalAlpha=alpha*(.25+.12*Math.sin(visualTime*9+k)); ctx.fillStyle=k===0?'#fff2a6':'#ff6b1f';
        ctx.beginPath(); ctx.arc(fx,fy,size*(.035+.02*k),0,Math.PI*2); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha=alpha*.9; ctx.strokeStyle='#ffd56a'; ctx.lineWidth=Math.max(1,size*.035); roundRect(ctx,1,1,size-2,size-2,r); ctx.stroke();
      ctx.restore(); return;
    }

    if (style === 'crystal') {
      const breathe=.5+.5*Math.sin(visualTime*3.2+row+col);
      ctx.shadowColor='#66eaff'; ctx.shadowBlur=glow ? size*(.28+.18*breathe) : 0;
      const cr=ctx.createLinearGradient(0,0,size,size); cr.addColorStop(0,'#ffffff'); cr.addColorStop(.18,'#75f1ff'); cr.addColorStop(.55,'#6d75ff'); cr.addColorStop(1,'#3425a8');
      ctx.fillStyle=cr; roundRect(ctx,0,0,size,size,r*.72); ctx.fill(); ctx.shadowBlur=0;
      ctx.save(); roundRect(ctx,0,0,size,size,r*.72); ctx.clip();
      const sx=((visualTime*size*.7+col*size)%(size*2.5))-size;
      const sg=ctx.createLinearGradient(sx,0,sx+size*.24,size); sg.addColorStop(0,'rgba(255,255,255,0)'); sg.addColorStop(.5,'rgba(255,255,255,.8)'); sg.addColorStop(1,'rgba(255,255,255,0)'); ctx.globalAlpha=alpha*.55; ctx.fillStyle=sg; ctx.fillRect(-size,0,size*3,size);
      ctx.globalAlpha=alpha*(.3+.25*breathe); ctx.fillStyle='#fff'; for(let k=0;k<2;k++){const px=size*(.25+.5*((Math.sin(row*4+col*3+k)+1)/2)), py=size*(.25+.5*((Math.cos(col*5+row*2+k)+1)/2)); ctx.fillRect(px,py,Math.max(1,size*.035),Math.max(1,size*.035));}
      ctx.restore(); ctx.globalAlpha=alpha*.75; ctx.strokeStyle='#dffcff'; ctx.lineWidth=Math.max(1,size*.035); roundRect(ctx,1,1,size-2,size-2,r*.72); ctx.stroke(); ctx.restore(); return;
    }

    if (style === 'voxel') {
      const bob = Math.sin(visualTime * 2.1 + row * .7 + col * .45) * size * .012;
      ctx.translate(0, bob);
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = glow ? size * .2 : 0;
      ctx.fillStyle = color; ctx.fillRect(1, 1, size - 2, size - 2);
      ctx.shadowBlur = 0;
      // Minecraft-like pixel bevel + animated dust motes.
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(2, 2, size - 4, Math.max(2, size * .16));
      ctx.fillStyle = 'rgba(0,0,0,.24)'; ctx.fillRect(2, size * .78, size - 4, Math.max(2, size * .18));
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      for (let q = 0; q < 3; q++) {
        const px = ((visualTime * (5 + q * 2) + row * 11 + col * 7) % (size - 8)) + 4;
        const py = ((q * size * .31) + size * .2) % (size - 6);
        ctx.fillRect(px, py, Math.max(1, size * .035), Math.max(1, size * .035));
      }
      ctx.strokeStyle = 'rgba(0,0,0,.48)'; ctx.lineWidth = Math.max(1, size*.055); ctx.strokeRect(1,1,size-2,size-2);
      ctx.restore(); return;
    }

    if (style === 'glass') {
      ctx.shadowColor = color; ctx.shadowBlur = glow ? size * (.24 + .06 * Math.sin(visualTime * 2 + row + col)) : 0;
      const glass = ctx.createLinearGradient(0,0,size,size);
      glass.addColorStop(0, 'rgba(255,255,255,.64)'); glass.addColorStop(.18, shade(color,.25)); glass.addColorStop(.55, 'rgba(255,255,255,.13)'); glass.addColorStop(1, shade(color,-.28));
      ctx.fillStyle = glass; roundRect(ctx,0,0,size,size,r); ctx.fill(); ctx.shadowBlur=0;
      ctx.globalAlpha=alpha*.72; ctx.strokeStyle='rgba(255,255,255,.82)'; ctx.lineWidth=Math.max(1,size*.035); roundRect(ctx,1,1,size-2,size-2,r); ctx.stroke();
      ctx.globalAlpha=alpha*.35; ctx.fillStyle='rgba(255,255,255,.45)'; roundRect(ctx,size*.08,size*.08,size*.84,size*.12,r*.45); ctx.fill();
      // Moving caustic/refraction band.
      ctx.save(); roundRect(ctx,0,0,size,size,r); ctx.clip();
      const sweep = ((visualTime * size * .65 + (row + col) * size * .7) % (size * 2.4)) - size * .7;
      const rg = ctx.createLinearGradient(sweep, 0, sweep + size * .35, size);
      rg.addColorStop(0,'rgba(255,255,255,0)'); rg.addColorStop(.5,'rgba(255,255,255,.38)'); rg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalAlpha=alpha*.7; ctx.fillStyle=rg; ctx.fillRect(-size,0,size*3,size);
      ctx.restore();
      // Tiny trapped sparkles.
      ctx.globalAlpha=alpha*(.22+.12*Math.sin(visualTime*3+row+col)); ctx.fillStyle='#fff';
      const sx=(size*(.22+.56*((Math.sin(row*7.3+col*2.1)+1)/2))), sy=size*(.25+.5*((Math.cos(col*5.1+row*1.7)+1)/2));
      ctx.beginPath(); ctx.arc(sx,sy,Math.max(1,size*.025),0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=alpha*.18; ctx.strokeStyle=color; ctx.lineWidth=Math.max(1,size*.04); roundRect(ctx,size*.13,size*.13,size*.74,size*.74,r*.72); ctx.stroke();
      ctx.restore(); return;
    }

    if (style === 'chrome') {
      ctx.shadowColor=color; ctx.shadowBlur=glow?size*.2:0;
      const chrome=ctx.createLinearGradient(0,0,0,size);
      chrome.addColorStop(0,'#ffffff'); chrome.addColorStop(.14,shade(color,.45)); chrome.addColorStop(.34,'#ffffff'); chrome.addColorStop(.49,shade(color,-.2)); chrome.addColorStop(.62,shade(color,.35)); chrome.addColorStop(.82,shade(color,-.4)); chrome.addColorStop(1,'#ffffff');
      ctx.fillStyle=chrome; roundRect(ctx,0,0,size,size,r); ctx.fill(); ctx.shadowBlur=0;
      // Polished-metal scanner sweep.
      ctx.save(); roundRect(ctx,0,0,size,size,r); ctx.clip();
      const sx=((visualTime*size*.9 + (row*13+col*9))%(size*2.8))-size;
      const sg=ctx.createLinearGradient(sx,0,sx+size*.3,size); sg.addColorStop(0,'rgba(255,255,255,0)'); sg.addColorStop(.5,'rgba(255,255,255,.75)'); sg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.globalAlpha=alpha*.7; ctx.fillStyle=sg; ctx.fillRect(-size,0,size*4,size); ctx.restore();
      ctx.globalAlpha=alpha*.7; ctx.strokeStyle=shade(color,.6); ctx.lineWidth=Math.max(1,size*.045); roundRect(ctx,1,1,size-2,size-2,r); ctx.stroke();
      ctx.restore(); return;
    }

    if (style === 'holo') {
      const jitter = Math.sin(visualTime*8 + row*2.3 + col*1.7) > .96 ? size*.018 : 0;
      ctx.translate(jitter, 0);
      ctx.shadowColor=color; ctx.shadowBlur=glow?size*(.44+.12*Math.sin(visualTime*4+row)):0;
      const holo=ctx.createLinearGradient(0,0,size,size);
      holo.addColorStop(0,shade(color,.4)); holo.addColorStop(.32,'rgba(255,255,255,.48)'); holo.addColorStop(.5,shade(color,-.05)); holo.addColorStop(.68,'rgba(255,80,220,.48)'); holo.addColorStop(1,shade(color,-.3));
      ctx.fillStyle=holo; roundRect(ctx,0,0,size,size,r); ctx.fill(); ctx.shadowBlur=0;
      // Animated scanlines + spectral glitch bars.
      ctx.save(); roundRect(ctx,0,0,size,size,r); ctx.clip();
      ctx.globalAlpha=alpha*.18; ctx.fillStyle='#fff';
      const lineY=(visualTime*size*1.8 + row*size*.37)%(size+3); ctx.fillRect(0,lineY,size,Math.max(1,size*.025));
      ctx.globalAlpha=alpha*.22; ctx.fillStyle='rgba(0,240,255,.9)'; const barY=(visualTime*size*.7+col*17)%(size+4); ctx.fillRect(0,barY,size*(.25+.35*((row+col)%3)/2),Math.max(1,size*.035));
      ctx.restore();
      ctx.globalAlpha=alpha*.45; ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=Math.max(1,size*.04); roundRect(ctx,1,1,size-2,size-2,r); ctx.stroke();
      ctx.globalAlpha=alpha*.2; ctx.strokeStyle='rgba(0,240,255,.9)'; ctx.lineWidth=Math.max(1,size*.025); roundRect(ctx,size*.08,size*.08,size*.84,size*.84,r*.75); ctx.stroke();
      ctx.restore(); return;
    }

    // Outer energy aura — kept tighter for a crisp, premium block silhouette.
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = cellSize * 0.42;
    }

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, shade(color, 0.42));
    grad.addColorStop(0.22, color);
    grad.addColorStop(0.72, shade(color, -0.08));
    grad.addColorStop(1, shade(color, -0.34));
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, size, size, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Deep inner bevel.
    ctx.globalAlpha = alpha * 0.48;
    ctx.strokeStyle = shade(color, -0.42);
    ctx.lineWidth = Math.max(1, cellSize * 0.055);
    roundRect(ctx, 1.3, 1.3, size - 2.6, size - 2.6, r * 0.82);
    ctx.stroke();

    // Glassy top plane.
    ctx.globalAlpha = alpha * 0.36;
    const shine = ctx.createLinearGradient(0, 0, 0, size * 0.52);
    shine.addColorStop(0, 'rgba(255,255,255,0.9)');
    shine.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    roundRect(ctx, size * 0.07, size * 0.065, size * 0.86, size * 0.34, r * 0.56);
    ctx.fill();

    // Signature diagonal specular glint.
    ctx.globalAlpha = alpha * 0.2;
    ctx.save();
    roundRect(ctx, 0, 0, size, size, r);
    ctx.clip();
    const glint = ctx.createLinearGradient(0, size, size, 0);
    glint.addColorStop(0.28, 'rgba(255,255,255,0)');
    glint.addColorStop(0.48, 'rgba(255,255,255,.62)');
    glint.addColorStop(0.58, 'rgba(255,255,255,0)');
    ctx.fillStyle = glint;
    ctx.fillRect(-size, -size, size * 3, size * 3);
    ctx.restore();

    // Crisp luminous rim.
    ctx.globalAlpha = alpha * 0.86;
    ctx.strokeStyle = shade(color, 0.5);
    ctx.lineWidth = Math.max(1, cellSize * 0.038);
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, r);
    ctx.stroke();

    // Tiny corner "machine cut" highlight.
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    roundRect(ctx, size * .16, size * .12, size * .18, Math.max(1.2, size * .035), size * .02);
    ctx.fill();

    // Neon signature: breathing aura + tiny electrical arc.
    ctx.globalAlpha = alpha * (.16 + .08 * Math.sin(visualTime * 5.5 + row * .8 + col));
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, size*.025);
    ctx.beginPath();
    ctx.moveTo(size*.08, size*(.25 + .18*Math.sin(visualTime*3+col)));
    ctx.lineTo(size*.24, size*.18); ctx.lineTo(size*.38, size*.27); ctx.lineTo(size*.52, size*.14);
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

  /** Flashing "?" overlay for a Mind Bender item block. Flashes faster as it runs out. */
  function drawItemMark(ctx, row, col, urgency, alpha = 1) {
    const x = col * cellSize;
    const y = row * cellSize;
    const pad = Math.max(1, cellSize * 0.055);
    const size = cellSize - pad * 2;
    const rate = 1.6 + urgency * 5.5;                       // flashes per second
    const pulse = 0.5 + 0.5 * Math.sin(visualTime * rate * Math.PI * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    // white-hot flash over the block
    ctx.globalAlpha = alpha * (0.25 + 0.6 * pulse);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x + pad, y + pad, size, size, cellSize * 0.19);
    ctx.fill();
    // gold rim so it reads as special even mid-flash
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffd45b';
    ctx.shadowBlur = cellSize * (0.25 + 0.4 * pulse);
    ctx.lineWidth = Math.max(1.5, cellSize * 0.08);
    ctx.strokeStyle = '#ffd45b';
    roundRect(ctx, x + pad, y + pad, size, size, cellSize * 0.19);
    ctx.stroke();
    // the question mark
    ctx.shadowBlur = 0;
    ctx.fillStyle = pulse > 0.5 ? '#3a2500' : '#ffffff';
    ctx.font = `900 ${Math.round(cellSize * 0.66)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + cellSize / 2, y + cellSize / 2 + cellSize * 0.04);
    ctx.restore();
  }

  /** Renders the locked grid + active piece + ghost onto the board canvas. */
  function renderBoard({ grid, activeCells, activeColor, ghostCells, ghostOn, lockFlashRows, mb }) {
    visualTime = performance.now() * 0.001;
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
        const rawCell = grid[r][c];
        if (rawCell) {
          const isItem = MindBender.isItem(rawCell);
          const cell = MindBender.baseColor(rawCell);
          const flashing = lockFlashRows && lockFlashRows.includes(r);
          // Mind Bender "Blur": the stack fades left-to-right once a second
          const cellAlpha = mb && mb.blurMs != null ? MindBender.blurAlpha(c, mb.blurMs) : 1;
          drawCell(boardCtx, r - hiddenOffset, c, colorFor(cell), cellAlpha, true);
          if (isItem) drawItemMark(boardCtx, r - hiddenOffset, c, mb ? mb.urgency : 0, cellAlpha);
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

  let lastMbMult = null, lastMbFx = null;
  /** Mind Bender multiplier + active timed effect, shown in the mode pill. */
  function setMindBender(multiplier, effectLabel) {
    const m = el['hud-mb'];
    const fx = el['hud-mb-effect'];
    if (m && multiplier !== lastMbMult) {
      m.textContent = `MB \u00D7${multiplier}`;
      m.classList.toggle('is-hot', multiplier >= 5);
      m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop');
      lastMbMult = multiplier;
    }
    if (fx && effectLabel !== lastMbFx) {
      fx.textContent = effectLabel || '';
      fx.hidden = !effectLabel;
      lastMbFx = effectLabel;
    }
  }
  function resetMindBenderHud() { lastMbMult = null; lastMbFx = null; }

  function setCombo(text) {
    el['combo-banner'].textContent = text || '\u00A0';
  }

  function setOverlay(id, active) {
    el[id].classList.toggle('overlay--active', active);
  }

  function setCountdown(n) {
    el['countdown-num'].textContent = n > 0 ? String(n) : 'GO!';
  }

  function setModeHud(mode, { timeLeft = 0, bossHp = 0, bossMaxHp = 0, gravityIndex = 0 } = {}) {
    const name = el['hud-mode-name'];
    const status = el['hud-mode-status'];
    const meter = el['boss-meter'];
    const fill = el['boss-meter-fill'];
    if (!name || !status) return;
    name.textContent = mode ? mode.name : 'STANDARD';
    document.body.classList.remove('mode-zen','mode-blitz','mode-inferno','mode-gravity','mode-boss','mode-standard');
    document.body.classList.add(`mode-${mode ? mode.id : 'standard'}`);
    let text = '';
    if (mode && mode.id === 'blitz') {
      const sec = Math.ceil(timeLeft / 1000);
      text = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    } else if (mode && mode.id === 'gravity') {
      text = ['DOWN','RIGHT','UP','LEFT'][gravityIndex % 4];
    } else if (mode && mode.id === 'boss') {
      text = `BOSS LV ${bossMaxHp ? Math.ceil((bossMaxHp - 10) / 2 + 1) : 1}`;
    } else if (mode && mode.id === 'inferno') {
      text = 'RISING';
    } else if (mode && mode.id === 'zen') {
      text = 'RELAXED';
    } else {
      text = 'CLASSIC';
    }
    status.textContent = text;
    if (meter && fill) {
      const bossOn = mode && mode.id === 'boss' && bossMaxHp > 0;
      meter.hidden = !bossOn;
      fill.style.width = bossOn ? `${Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100))}%` : '0%';
    }
  }

  function showGameOver({ score, level, lines, bestCombo, isHighScore, title = 'GAME OVER' }) {
    el['gameover-title'].textContent = title;
    el['go-score'].textContent = Math.floor(score);
    el['go-level'].textContent = level;
    el['go-lines'].textContent = lines;
    el['go-combo'].textContent = bestCombo;
    el['gameover-title'].textContent = isHighScore ? 'NEW HIGH SCORE!' : 'GAME OVER';
    el['gameover-title'].className = `overlay-title ${isHighScore ? 'overlay-title--accent' : 'overlay-title--danger'}`;
    setOverlay('overlay-gameover', true);
  }

  function updateStartStats(stats) {
    el['corner-highscore'].textContent = stats.highScore;
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

  function startAmbientBackground() {
    const c = el['ambient-canvas']; if (!c || ambientRaf) return;
    const count = 54;
    ambientStars = Array.from({length: count}, (_,i) => ({ x: Math.random(), y: Math.random(), r: .35+Math.random()*2.2, s:.00025+Math.random()*.0009, p:Math.random()*Math.PI*2, drift:Math.random()*2 }));
    const tick = (t) => {
      const w=c.width/dpr,h=c.height/dpr; const st=document.documentElement.dataset.blockStyle||'neon';
      ambientCtx.clearRect(0,0,w,h);
      const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const g=ambientCtx.createRadialGradient(w*.5,h*.42,0,w*.5,h*.5,Math.max(w,h)*.8);
      g.addColorStop(0,'rgba(80,180,255,.10)'); g.addColorStop(1,'rgba(0,0,0,0)'); ambientCtx.fillStyle=g; ambientCtx.fillRect(0,0,w,h);
      ambientStars.forEach((q,i)=>{
        q.y=(q.y+q.s)%1; q.x=(q.x+Math.sin(t*.00025+q.p)*.00012)%1; if(q.x<0)q.x+=1;
        const a=.10+.18*(.5+.5*Math.sin(t*.002+q.p));
        ambientCtx.globalAlpha=a; ambientCtx.fillStyle=(st==='fire'&&i%3===0)?'#ff7b22':(st==='crystal'||st==='glass')?'#dffcff':'white';
        ambientCtx.shadowColor=st==='fire'?'#ff4b16':accent; ambientCtx.shadowBlur=st==='neon'||st==='holo'?8:4;
        ambientCtx.beginPath(); ambientCtx.arc(q.x*w,q.y*h,q.r,0,Math.PI*2); ambientCtx.fill();
      });
      if (st==='fire'){ ambientCtx.globalAlpha=.06; ambientCtx.fillStyle='#ff4218'; ambientCtx.fillRect(0,h*.72,w,h*.28); }
      ambientCtx.globalAlpha=1; ambientRaf=requestAnimationFrame(tick);
    };
    ambientRaf=requestAnimationFrame(tick);
  }
  function stopAmbientBackground() { if (ambientRaf) cancelAnimationFrame(ambientRaf); ambientRaf=0; }

  return {
    cacheEls, startAmbientBackground, stopAmbientBackground, showScreen, resizeBoardCanvas, renderBoard, renderFx, applyShake,
    drawMiniPiece, updateHud, setCombo, setOverlay, setCountdown,
    showGameOver, setModeHud, updateStartStats, showAchievementPopup,
    clearColorCache, recordTrail, resetTrail, resolveColor: colorFor, setMindBender, resetMindBenderHud,
    get holdCtx() { return holdCtx; },
    get nextCtx() { return nextCtx; },
    get cellSize() { return cellSize; },
    el,
  };
})();
