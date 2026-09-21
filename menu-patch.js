/**
 * menu-patch.js — start-screen tweaks (load FIRST in the script list)
 * ------------------------------------------------------------------
 * 1. Removes the BLØKS/TETRIS title block at the top.
 * 2. Removes the flame PLAY button (and everything inside it) and moves
 *    its id to .hero-stage, so main.js wires the background scene itself
 *    as the play control. Keyboard (Enter/Space) works too.
 * 3. Rebuilds each floating .hero-piece as a real tetromino (I/O/T/L/S/Z)
 *    instead of a single cube, reusing the existing 3D cube markup.
 *
 * Safe at any position in the script list: classic scripts all run
 * before main.js's DOMContentLoaded init, so UI cacheEls always sees
 * the moved id. A rAF fallback re-binds directly if that ever changes.
 */
(function () {
  'use strict';

  var TETROMINOES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]]
  };
  var PIECE_ORDER = ['I', 'O', 'T', 'L', 'S', 'Z'];
  var CUBE_FACES = '<i class="cf cf--front"></i><i class="cf cf--back"></i>' +
    '<i class="cf cf--right"></i><i class="cf cf--left"></i>' +
    '<i class="cf cf--top"></i><i class="cf cf--bottom"></i>';

  function currentMode() {
    try {
      return (JSON.parse(localStorage.getItem('neonblock-visuals-v2') || '{}').gameMode) || 'standard';
    } catch (_) { return 'standard'; }
  }

  function startGame() {
    if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.uiTap) Audio_.sfx.uiTap();
    if (typeof Game !== 'undefined' && typeof Game.startCountdown === 'function') {
      Game.startCountdown(currentMode());
    }
  }

  function apply() {
    // 1 ── game title at the top ──────────────────────────────────────────
    document.querySelectorAll('.start-top').forEach(function (n) { n.remove(); });

    // 2 ── flame play button out; hero stage becomes the button ──────────
    var stage = document.querySelector('.hero-stage');
    var flame = document.getElementById('btn-play');
    if (flame && flame.classList.contains('play-flame')) {
      // Keep the node hidden rather than deleting it: main.js already
      // cached it if this file ran after init, and a dead id would make
      // bindNav() throw and kill every menu button wired after it.
      flame.removeAttribute('id');
      flame.style.display = 'none';
    }
    if (stage) {
      stage.id = 'btn-play';
      stage.setAttribute('role', 'button');
      stage.setAttribute('tabindex', '0');
      stage.setAttribute('aria-label', 'Play BLØKS — tap the scene to start');

      requestAnimationFrame(function () {
        var cached = (window.UI && UI.el) ? UI.el['btn-play'] : null;
        if (cached !== stage) {
          // Fallback: main.js bound the hidden flame — wire the stage directly.
          stage.addEventListener('click', startGame);
          stage.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); }
          });
        } else {
          // main.js owns the click; just add keyboard support.
          stage.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stage.click(); }
          });
        }
      });
    }

    // 3 ── floating cubes → tetrominoes ──────────────────────────────────
    document.querySelectorAll('.hero-piece').forEach(function (hp, i) {
      var cells = TETROMINOES[PIECE_ORDER[i % PIECE_ORDER.length]];
      hp.innerHTML = '';
      cells.forEach(function (cr) {
        var cube = document.createElement('div');
        cube.className = 'cube3d';
        cube.style.left = 'calc(var(--cube-size) * ' + cr[0] + ')';
        cube.style.top = 'calc(var(--cube-size) * ' + cr[1] + ')';
        cube.innerHTML = CUBE_FACES;
        hp.appendChild(cube);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
