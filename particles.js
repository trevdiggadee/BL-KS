/**
 * particles.js
 * Single responsibility: cheap visual-effects pools rendered on the fx
 * canvas above the board — burst particles, row shockwaves for line
 * clears, and light beams for hard drops. No game logic — spawn, update,
 * draw.
 */

const Particles = (() => {
  let particles = [];
  let shocks = [];
  let beams = [];
  const MAX_PARTICLES = 500;

  function hexToRgb(hex) {
    const h = (hex || '#ffffff').replace('#', '');
    if (h.length !== 6) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  function rgba(hex, a) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  /** A big, dense burst per cleared row plus a full-width shockwave band.
   *  `big` (Tetris) scales particle count, speed and spread further up. */
  function spawnLineClearBurst(rowsPixelY, cols, cellSize, colors, big = false) {
    const perCell = big ? 7 : 4;
    const boardWidthPx = cols * cellSize;

    rowsPixelY.forEach((y, idx) => {
      for (let i = 0; i < cols; i++) {
        const x = i * cellSize + cellSize / 2;
        const color = colors[(i + idx) % colors.length];
        for (let n = 0; n < perCell; n++) {
          if (particles.length >= MAX_PARTICLES) break;
          const angle = Math.random() * Math.PI * 2;
          const speed = (big ? 3.2 : 2) + Math.random() * (big ? 7 : 4.5);
          particles.push({
            x, y: y + cellSize / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (big ? 2.4 : 1.2),
            life: 1,
            decay: 0.012 + Math.random() * 0.016,
            size: (big ? 3 : 2) + Math.random() * (big ? 6 : 3.5),
            color,
            grav: true,
          });
        }
      }
      shocks.push({
        y: y + cellSize / 2,
        width: boardWidthPx,
        height: 6,
        maxHeight: big ? 60 : 34,
        life: 1,
        color: colors[idx % colors.length],
      });
    });
  }

  function spawnBurstAt(x, y, color, count = 14) {
    for (let n = 0; n < count; n++) {
      if (particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color,
        grav: true,
      });
    }
  }

  /** A fast-fading vertical light beam tracing the path a piece just
   *  slammed through on a hard drop, one per occupied column. */
  function spawnDropBeam(x, yTop, yBottom, color, width) {
    beams.push({ x, yTop, yBottom, color, width, life: 1 });
  }

  function update() {
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.grav) p.vy += 0.12;
      p.life -= p.decay;
    });

    shocks = shocks.filter((s) => s.life > 0);
    shocks.forEach((s) => {
      s.height += (s.maxHeight - s.height) * 0.22;
      s.life -= 0.055;
    });

    beams = beams.filter((b) => b.life > 0);
    beams.forEach((b) => { b.life -= 0.1; });
  }

  function draw(ctx) {
    // Row shockwaves first (they sit "under" the particle sparks)
    shocks.forEach((s) => {
      const alpha = Math.max(0, s.life) * 0.5;
      if (alpha <= 0.01) return;
      const grad = ctx.createLinearGradient(0, s.y - s.height / 2, 0, s.y + s.height / 2);
      grad.addColorStop(0, rgba(s.color, 0));
      grad.addColorStop(0.5, rgba(s.color, alpha));
      grad.addColorStop(1, rgba(s.color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, s.y - s.height / 2, s.width, s.height);
    });

    // Hard-drop beams
    beams.forEach((b) => {
      const alpha = Math.max(0, b.life);
      if (alpha <= 0.01) return;
      const grad = ctx.createLinearGradient(0, b.yTop, 0, b.yBottom);
      grad.addColorStop(0, rgba(b.color, 0));
      grad.addColorStop(0.7, rgba(b.color, alpha * 0.5));
      grad.addColorStop(1, rgba(b.color, alpha * 0.9));
      ctx.fillStyle = grad;
      ctx.fillRect(b.x - b.width / 2, b.yTop, b.width, Math.max(1, b.yBottom - b.yTop));
    });

    // Spark particles on top
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function clear() { particles = []; shocks = []; beams = []; }
  function count() { return particles.length; }

  return { spawnLineClearBurst, spawnBurstAt, spawnDropBeam, update, draw, clear, count };
})();
