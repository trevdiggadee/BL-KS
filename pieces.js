/**
 * pieces.js
 * Single responsibility: define the seven tetrominoes, their rotation
 * states, colors, and the wall-kick offsets used when rotating near
 * walls/other pieces. Uses a simplified Super Rotation System (SRS).
 */

const Pieces = (() => {
  // Each shape is defined across 4 rotation states (0=spawn,1=R,2=2,3=L)
  // as coordinates on a 4x4 grid (row, col), row 0 = top.
  const SHAPES = {
    I: {
      color: 'cyan',
      states: [
        [[1, 0], [1, 1], [1, 2], [1, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]],
        [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 1], [1, 1], [2, 1], [3, 1]],
      ],
    },
    O: {
      color: 'amber',
      states: [
        [[0, 1], [0, 2], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 1], [1, 2]],
      ],
    },
    T: {
      color: 'violet',
      states: [
        [[0, 1], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 1]],
        [[0, 1], [1, 0], [1, 1], [2, 1]],
      ],
    },
    S: {
      color: 'green',
      states: [
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 1], [1, 1], [1, 2], [2, 2]],
        [[1, 1], [1, 2], [2, 0], [2, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
      ],
    },
    Z: {
      color: 'magenta',
      states: [
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 2], [1, 1], [1, 2], [2, 1]],
        [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
      ],
    },
    J: {
      color: 'blue',
      states: [
        [[0, 0], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 0], [2, 1]],
      ],
    },
    L: {
      color: 'orange',
      states: [
        [[0, 2], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [1, 2], [2, 0]],
        [[0, 0], [0, 1], [1, 1], [2, 1]],
      ],
    },
  };

  const ORDER = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  // Simplified wall-kick offsets tried in order [dCol, dRow] when a
  // rotation is blocked. Covers the common cases well enough for solid
  // classic-feel play without the full JLSTZ/I kick tables.
  const KICKS_COMMON = [
    [0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, 1],
  ];
  const KICKS_I = [
    [0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [0, 1],
  ];

  function randomBagGenerator() {
    let bag = [];
    return function next() {
      if (bag.length === 0) {
        bag = ORDER.slice();
        // Fisher-Yates shuffle
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
      }
      return bag.pop();
    };
  }

  function createPiece(type) {
    return {
      type,
      rotation: 0,
      color: SHAPES[type].color,
      row: type === 'I' ? -1 : 0,
      col: 3,
    };
  }

  function getCells(piece) {
    return SHAPES[piece.type].states[piece.rotation].map(([r, c]) => [
      piece.row + r,
      piece.col + c,
    ]);
  }

  function getKicks(type) {
    return type === 'I' ? KICKS_I : KICKS_COMMON;
  }

  return { SHAPES, ORDER, randomBagGenerator, createPiece, getCells, getKicks };
})();
