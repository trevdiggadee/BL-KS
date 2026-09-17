/**
 * effects.js
 * Single responsibility: juicy feedback that isn't particles or audio —
 * screen shake, board flash, and floating combo/tetris/level-up toasts.
 */

const Effects = (() => {
  let shakeMagnitude = 0;
  let shakeDecay = 0.85;
  let flashAlpha = 0;
  let flashColor = '255,255,255';
  let animationsEnabled = true;

  function setAnimationsEnabled(v) { animationsEnabled = v; }

  function shake(magnitude = 6) {
    if (!animationsEnabled) return;
    shakeMagnitude = Math.max(shakeMagnitude, magnitude);
  }

  function flash(color = '255,255,255', alpha = 0.35) {
    if (!animationsEnabled) return;
    flashColor = color;
    flashAlpha = Math.max(flashAlpha, alpha);
  }

  function getShakeOffset() {
    if (shakeMagnitude < 0.1) { shakeMagnitude = 0; return { x: 0, y: 0 }; }
    const x = (Math.random() - 0.5) * shakeMagnitude;
    const y = (Math.random() - 0.5) * shakeMagnitude;
    shakeMagnitude *= shakeDecay;
    return { x, y };
  }

  function getFlashOverlayStyle() {
    if (flashAlpha < 0.01) { flashAlpha = 0; return null; }
    const style = `rgba(${flashColor}, ${flashAlpha.toFixed(3)})`;
    flashAlpha *= 0.88;
    return style;
  }

  // --- Toasts (combo / tetris / level up / high score banners) ---
  let toastContainer = null;

  function initToasts(containerEl) {
    toastContainer = containerEl;
  }

  function toast(text, variant = 'default', duration = 1100) {
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.textContent = text;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--in'));
    setTimeout(() => {
      el.classList.remove('toast--in');
      el.classList.add('toast--out');
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  return { setAnimationsEnabled, shake, flash, getShakeOffset, getFlashOverlayStyle, initToasts, toast };
})();
