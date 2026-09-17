/**
 * particles.js
 * Single responsibility: a small, cheap particle pool rendered on its own
 * canvas layer above the board. No game logic — just spawn + update + draw.
 */

const Particles = (() => {
  let particles = [];
  const MAX_PARTICLES = 220;

  function spawnLineClearBurst(rowsPixelY, cols, cellSize, colors) {
    rowsPixelY.forEach((y) => {
      for (let i = 0; i < cols; i++) {
        if (particles.length >= MAX_PARTICLES) break;
        const x = i * cellSize + cellSize / 2;
        const color = colors[i % colors.length];
        for (let n = 0; n < 3; n++) {
          particles.push({
            x, y: y + cellSize / 2,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 4 - 1,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            size: 2 + Math.random() * 3,
            color,
          });
        }
      }
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
      });
    }
  }

  function update() {
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      p.life -= p.decay;
    });
  }

  function draw(ctx) {
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

  function clear() { particles = []; }
  function count() { return particles.length; }

  return { spawnLineClearBurst, spawnBurstAt, update, draw, clear, count };
})();
