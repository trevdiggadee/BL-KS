/**
 * collision.js
 * Single responsibility: answer movement/rotation questions by combining
 * Board (the grid) and Pieces (the shapes). No game state of its own.
 */

const Collision = (() => {
  function fits(grid, piece) {
    return Board.canPlace(grid, Pieces.getCells(piece));
  }

  function tryMove(grid, piece, dRow, dCol) {
    const moved = { ...piece, row: piece.row + dRow, col: piece.col + dCol };
    return fits(grid, moved) ? moved : null;
  }

  /** Attempts rotation with wall kicks. dir = 1 (CW) or -1 (CCW). */
  function tryRotate(grid, piece, dir) {
    const states = 4;
    const nextRotation = (piece.rotation + dir + states) % states;
    const kicks = Pieces.getKicks(piece.type);
    for (const [dCol, dRow] of kicks) {
      const candidate = { ...piece, rotation: nextRotation, row: piece.row + dRow, col: piece.col + dCol };
      if (fits(grid, candidate)) return candidate;
    }
    return null;
  }

  /** Drops a piece straight down as far as it will go (for ghost + hard drop). */
  function dropDistance(grid, piece) {
    let distance = 0;
    while (fits(grid, { ...piece, row: piece.row + distance + 1 })) {
      distance += 1;
    }
    return distance;
  }

  function getGhost(grid, piece) {
    const distance = dropDistance(grid, piece);
    return { ...piece, row: piece.row + distance };
  }

  return { fits, tryMove, tryRotate, dropDistance, getGhost };
})();
