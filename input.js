/**
 * input.js
 * Single responsibility: translate keyboard, touch buttons, and swipe
 * gestures into abstract game actions via a callback map. Owns DAS/ARR
 * style key-repeat for left/right/soft-drop. No game rules live here.
 */

const Input = (() => {
  const handlers = {
    left: () => {}, right: () => {}, rotateCW: () => {}, rotateCCW: () => {},
    softDropStart: () => {}, softDropEnd: () => {}, hardDrop: () => {},
    hold: () => {}, pause: () => {}, confirmTap: () => {},
  };

  function on(map) { Object.assign(handlers, map); }

  // --- Keyboard, with DAS (delay) then ARR (repeat rate) for movement ---
  const DAS_MS = 170;
  const ARR_MS = 45;
  let dasTimer = null, arrTimer = null, activeDir = null;
  const pressed = new Set();

  function startAutoRepeat(dir) {
    if (activeDir === dir) return;
    stopAutoRepeat();
    activeDir = dir;
    const move = dir === 'left' ? handlers.left : handlers.right;
    move();
    dasTimer = setTimeout(() => {
      arrTimer = setInterval(move, ARR_MS);
    }, DAS_MS);
  }

  function stopAutoRepeat() {
    if (dasTimer) clearTimeout(dasTimer);
    if (arrTimer) clearInterval(arrTimer);
    dasTimer = null; arrTimer = null; activeDir = null;
  }

  function keyDown(e) {
    if (pressed.has(e.code)) {
      // still allow repeated hard-drop prevention etc.
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
      return;
    }
    pressed.add(e.code);
    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault(); startAutoRepeat('left'); break;
      case 'ArrowRight':
        e.preventDefault(); startAutoRepeat('right'); break;
      case 'ArrowDown':
        e.preventDefault(); handlers.softDropStart(); break;
      case 'ArrowUp':
      case 'KeyX':
        e.preventDefault(); handlers.rotateCW(); break;
      case 'KeyZ':
      case 'ControlLeft':
        e.preventDefault(); handlers.rotateCCW(); break;
      case 'Space':
        e.preventDefault(); handlers.hardDrop(); break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault(); handlers.hold(); break;
      case 'KeyP':
      case 'Escape':
        e.preventDefault(); handlers.pause(); break;
      default:
        break;
    }
  }

  function keyUp(e) {
    pressed.delete(e.code);
    if (e.code === 'ArrowLeft' && activeDir === 'left') stopAutoRepeat();
    if (e.code === 'ArrowRight' && activeDir === 'right') stopAutoRepeat();
    if (e.code === 'ArrowDown') handlers.softDropEnd();
  }

  function initKeyboard() {
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
  }

  // --- Touch buttons: press-and-hold repeat for left/right/soft-drop ---
  function bindHoldButton(el, downFn, upFn, repeatMs) {
    if (!el) return;
    let timer = null;
    const start = (e) => {
      e.preventDefault();
      el.classList.add('btn--active');
      downFn();
      if (repeatMs) {
        clearInterval(timer);
        timer = setInterval(downFn, repeatMs);
      }
    };
    const end = (e) => {
      if (e) e.preventDefault();
      el.classList.remove('btn--active');
      clearInterval(timer);
      timer = null;
      if (upFn) upFn();
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  }

  function bindTapButton(el, fn) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.classList.add('btn--active');
      fn();
    });
    const clear = () => el.classList.remove('btn--active');
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointerleave', clear);
  }

  function initButtons(refs) {
    bindHoldButton(refs.left, handlers.left, null, ARR_MS + 60);
    bindHoldButton(refs.right, handlers.right, null, ARR_MS + 60);
    bindHoldButton(refs.softDrop, handlers.softDropStart, handlers.softDropEnd, null);
    bindTapButton(refs.rotate, handlers.rotateCW);
    bindTapButton(refs.hardDrop, handlers.hardDrop);
    bindTapButton(refs.hold, handlers.hold);
  }

  // --- Swipe gestures on the board surface ---
  function initSwipe(el) {
    if (!el) return;
    let startX = 0, startY = 0, lastX = 0, lastY = 0, tracking = false, moved = false;
    const CELL_PX_THRESHOLD = 28;
    const TAP_MAX_MOVE = 10;
    const SWIPE_MIN = 40;

    el.addEventListener('pointerdown', (e) => {
      tracking = true; moved = false;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
    });

    el.addEventListener('pointermove', (e) => {
      if (!tracking) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(e.clientX - startX) > TAP_MAX_MOVE || Math.abs(e.clientY - startY) > TAP_MAX_MOVE) moved = true;

      if (Math.abs(dx) >= CELL_PX_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) handlers.right(); else handlers.left();
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (dy > CELL_PX_THRESHOLD * 1.4 && dy > Math.abs(dx)) {
        handlers.softDropStart();
      }
    });

    el.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      handlers.softDropEnd();
      const totalDx = e.clientX - startX;
      const totalDy = e.clientY - startY;
      if (!moved) {
        handlers.rotateCW();
        return;
      }
      if (totalDy < -SWIPE_MIN && Math.abs(totalDy) > Math.abs(totalDx)) {
        handlers.hold();
      } else if (totalDy > SWIPE_MIN * 2.2 && Math.abs(totalDy) > Math.abs(totalDx)) {
        handlers.hardDrop();
      }
    });

    el.addEventListener('pointercancel', () => { tracking = false; handlers.softDropEnd(); });
  }

  return { on, initKeyboard, initButtons, initSwipe, stopAutoRepeat };
})();
