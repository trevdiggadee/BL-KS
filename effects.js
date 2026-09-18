/**
 * effects.js
 * Handles visual effects, particle rendering, and pseudo-3D block drawing.
 */

const Effects = (() => {
  let animationsEnabled = true;

  function setAnimationsEnabled(enabled) {
    animationsEnabled = enabled;
  }

  function draw3DBlock(ctx, x, y, width, height, colorHex, isGhost = false) {
    const depth = width * 0.18; // 3D depth extrusion

    if (isGhost) {
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
      return;
    }

    // --- 1. Drop Shadow ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x + depth, y + depth, width, height);

    // --- 2. Main Face ---
    ctx.fillStyle = colorHex;
    ctx.fillRect(x, y, width - depth, height - depth);

    // --- 3. Top Highlight Bevel ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - depth, y);
    ctx.lineTo(x + width - depth - depth * 0.5, y + depth * 0.5);
    ctx.lineTo(x + depth * 0.5, y + depth * 0.5);
    ctx.closePath();
    ctx.fill();

    // --- 4. Right Side 3D Extrusion (Darker) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x + width - depth, y);
    ctx.lineTo(x + width, y + depth);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width - depth, y + height - depth);
    ctx.closePath();
    ctx.fill();

    // --- 5. Bottom Side 3D Extrusion ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, y + height - depth);
    ctx.lineTo(x + depth, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width - depth, y + height - depth);
    ctx.closePath();
    ctx.fill();

    // --- 6. Inner Neon Glow Edge ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, width - depth - 2, height - depth - 2);
  }

  return {
    setAnimationsEnabled,
    draw3DBlock
  };
})();
