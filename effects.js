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
  let streakTimer = null;
  let ambientEnabled = true;

  function initToasts(containerEl) {
    toastContainer = containerEl;
    if (!streakTimer) startAmbientStreaks();
  }

  function startAmbientStreaks() {
    if (!ambientEnabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    streakTimer = setInterval(() => {
      if (document.hidden || !document.body.contains(document.body)) return;
      const el = document.createElement('i');
      el.className = 'fx-streak';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.top = `${65 + Math.random() * 30}vh`;
      el.style.transform = `rotate(${18 + Math.random() * 25}deg) scaleY(${0.65 + Math.random() * .8})`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }, 2600);
  }

  function pulse(selector) {
    const target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!target) return;
    target.classList.remove('ui-pulse');
    void target.offsetWidth;
    target.classList.add('ui-pulse');
  }

  function rippleFromEvent(event) {
    const target = event?.currentTarget || event?.target;
    if (!target || !target.getBoundingClientRect) return;
    const r = target.getBoundingClientRect();
    const dot = document.createElement('i');
    dot.className = 'ui-ripple';
    dot.style.left = `${(event?.clientX ?? (r.left + r.width / 2)) - r.left}px`;
    dot.style.top = `${(event?.clientY ?? (r.top + r.height / 2)) - r.top}px`;
    // Only add a positioning context if the element doesn't already have one
    // via CSS — checking the computed style (not target.style) avoids
    // clobbering an existing `position: absolute/fixed` rule, which would
    // otherwise yank the button out of its CSS-positioned spot the instant
    // it's pressed (breaking real clicks on any absolutely-positioned button).
    if (getComputedStyle(target).position === 'static') {
      target.style.position = 'relative';
    }
    target.appendChild(dot);
    setTimeout(() => dot.remove(), 650);
  }

  function toast(text, variant = 'default', duration = 1100) {
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.textContent = text;
    el.setAttribute('aria-live', 'polite');
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--in'));
    setTimeout(() => {
      el.classList.remove('toast--in');
      el.classList.add('toast--out');
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  return {
    setAnimationsEnabled, shake, flash, getShakeOffset, getFlashOverlayStyle,
    initToasts, toast, pulse, rippleFromEvent
  };
})();
