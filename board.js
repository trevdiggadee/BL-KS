/**
 * board.js
 * Single responsibility: the playfield grid — its cells, line-clear
 * detection, and locking pieces into place. No rendering, no input.
 */

const Board = (() => {
  const COLS = 10;
  const ROWS = 20;
  // Extra hidden rows above the visible field so long pieces (I in
  // vertical spawn) and rotations near the top never go out of bounds.
  const HIDDEN_ROWS = 2;
  const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

  function create() {
    const grid = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      grid.push(new Array(COLS).fill(null));
    }
    return grid;
  }

  function isInsideCols(col) {
    return col >= 0 && col < COLS;
  }

  function cellFree(grid, row, col) {
    if (!isInsideCols(col)) return false;
    if (row >= TOTAL_ROWS) return false;
    if (row < 0) return true; // above the grid is open space
    return grid[row][col] === null;
  }

  function canPlace(grid, cells) {
    return cells.every(([r, c]) => cellFree(grid, r, c));
  }

  function lockPiece(grid, cells, color) {
    cells.forEach(([r, c]) => {
      if (r >= 0 && r < TOTAL_ROWS && isInsideCols(c)) {
        grid[r][c] = color;
      }
    });
  }

  /** Returns array of full row indices, top to bottom. */
  function findFullRows(grid) {
    const full = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (grid[r].every((cell) => cell !== null)) full.push(r);
    }
    return full;
  }

  /** Removes the given rows and drops everything above down. Returns a new grid;
   *  keeps rows that weren't cleared and prepends a fresh empty row for each one that was. */
  function clearRows(grid, rowIndices) {
    const set = new Set(rowIndices);
    const kept = grid.filter((_, r) => !set.has(r));
    const empties = rowIndices.map(() => new Array(COLS).fill(null));
    const newGrid = [...empties, ...kept];
    return newGrid;
  }

  /** Checks whether any locked cell sits within the visible (non-hidden) area. */
  function isTopedOut(grid) {
    // Game over when a locked cell exists in the hidden buffer rows AND
    // a newly spawned piece cannot fit — handled by spawn collision check
    // in game.js. This helper exposes the buffer rows for that check.
    for (let r = 0; r < HIDDEN_ROWS; r++) {
      if (grid[r].some((c) => c !== null)) return true;
    }
    return false;
  }

  return { COLS, ROWS, HIDDEN_ROWS, TOTAL_ROWS, create, canPlace, lockPiece, findFullRows, clearRows, isTopedOut, cellFree };
})();
