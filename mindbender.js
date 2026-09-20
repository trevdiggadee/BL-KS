/**
 * mindbender.js
 * Single responsibility: the "Mind Bender" rules borrowed from tetris.com's
 * Mind Bender — a flashing item block that hides in the stack, a score
 * multiplier that grows every time you clear one, and ten random effects that
 * fire when you do. Pure rules + grid transforms: no DOM, no rendering, no
 * input. Game owns the live state object and calls in here; UI only asks
 * MindBender.blurAlpha() how faded a column should look.
 *
 * How an item lives in the grid: it is just an ordinary cell whose colour
 * name carries a trailing "?" (e.g. "cyan?"). Because it is part of the cell
 * value it follows the block through every line clear, garbage row and effect
 * with no extra bookkeeping.
 */

const MindBender = (() => {
  const ENABLED = true;

  const MIN_LINES_BEFORE_ITEMS = 5;   // lines cleared before the first item can appear
  const MIN_STACK_ROWS = 4;           // the stack must be at least this tall
  const SPAWN_AFTER_MS = 15000;       // gap after an item is cleared before the next one
  const DESPAWN_AFTER_MS = 30000;     // an uncleared item moves (and costs 1x) after this long
  const MULT_MIN = 1;
  const MULT_MAX = 10;
  const ITEM_BONUS = 1000;            // x multiplier *before* it goes up
  const URGENT_AFTER_MS = 20000;      // item flashes faster once it is running out

  const COLORS = ['cyan', 'amber', 'violet', 'green', 'magenta', 'blue', 'orange'];

  const EFFECTS = {
    blur:     { name: 'BLUR',      timed: true,  ms: 5000  },
    erosion:  { name: 'EROSION',   timed: false },
    fission:  { name: 'FISSION',   timed: false },
    fusion:   { name: 'FUSION',    timed: false },
    invasion: { name: 'INVASION',  timed: false },
    shift:    { name: 'SHIFT',     timed: false },
    slow:     { name: 'SLOW DOWN', timed: true,  ms: 10000 },
    speed:    { name: 'SPEED UP',  timed: true,  ms: 10000 },
    turn:     { name: 'TURN',      timed: false },
    twist:    { name: 'TWIST',     timed: false },
  };
  const EFFECT_IDS = Object.keys(EFFECTS);

  // ---------------------------------------------------------------- state
  function createState() {
    return {
      multiplier: 1,
      hasItem: false,
      itemAgeMs: 0,
      noItemMs: 0,
      lastEffect: null,
      effect: null,        // { id, remainingMs, totalMs } for timed effects
    };
  }

  // ---------------------------------------------------------------- cells
  function isItem(cell) { return typeof cell === 'string' && cell.endsWith('?'); }
  function baseColor(cell) { return isItem(cell) ? cell.slice(0, -1) : cell; }

  function findItem(grid) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < Board.COLS; c++) {
        if (isItem(grid[r][c])) return [r, c];
      }
    }
    return null;
  }

  function rowsHaveItem(grid, rows) {
    return rows.some((r) => grid[r].some(isItem));
  }

  function stackTop(grid) {
    for (let r = 0; r < grid.length; r++) {
      if (grid[r].some((cell) => cell !== null)) return r;
    }
    return grid.length;
  }

  function stackHeight(grid) { return grid.length - stackTop(grid); }

  // ------------------------------------------------------- item lifecycle
  function pickItemCell(grid, avoid) {
    const cells = [];
    for (let r = Board.HIDDEN_ROWS; r < grid.length; r++) {
      for (let c = 0; c < Board.COLS; c++) {
        if (avoid && avoid[0] === r && avoid[1] === c) continue;
        if (grid[r][c] !== null && !isItem(grid[r][c])) cells.push([r, c]);
      }
    }
    // if the stack is a single block there is nowhere else to go
    if (!cells.length && avoid && grid[avoid[0]][avoid[1]] !== null) return avoid;
    if (!cells.length) return null;
    return cells[Math.floor(Math.random() * cells.length)];
  }

  function markItem(grid, pos) {
    const [r, c] = pos;
    grid[r][c] = baseColor(grid[r][c]) + '?';
  }

  function unmarkItem(grid, pos) {
    const [r, c] = pos;
    grid[r][c] = baseColor(grid[r][c]);
  }

  /** Called when a piece is placed or held. Returns true if an item appeared. */
  function trySpawn(grid, st, totalLines, { force = false, avoid = null } = {}) {
    if (!ENABLED || findItem(grid)) return false;
    if (!force) {
      if (totalLines < MIN_LINES_BEFORE_ITEMS) return false;
      if (st.noItemMs <= SPAWN_AFTER_MS) return false;
    }
    if (stackHeight(grid) < MIN_STACK_ROWS) return false;
    const pos = pickItemCell(grid, avoid);
    if (!pos) return false;
    markItem(grid, pos);
    st.hasItem = true;
    st.itemAgeMs = 0;
    return true;
  }

  /** Advance timers. Returns { despawned } when a stale item had to move. */
  function tick(grid, st, dtMs, totalLines) {
    const out = { despawned: false, effectEnded: null };
    if (!ENABLED) return out;

    const pos = findItem(grid);
    st.hasItem = !!pos;

    if (st.hasItem) {
      st.itemAgeMs += dtMs;
      if (st.itemAgeMs > DESPAWN_AFTER_MS) {
        unmarkItem(grid, pos);
        st.multiplier = Math.max(MULT_MIN, st.multiplier - 1);
        st.hasItem = false;
        st.itemAgeMs = 0;
        trySpawn(grid, st, totalLines, { force: true, avoid: pos });   // reappears somewhere new
        out.despawned = true;
      }
    } else {
      st.noItemMs += dtMs;
    }

    if (st.effect) {
      st.effect.remainingMs -= dtMs;
      if (st.effect.remainingMs <= 0) {
        out.effectEnded = st.effect.id;
        st.effect = null;
      }
    }
    return out;
  }

  /** 0..1 — how close the current item is to running out (drives flash speed). */
  function urgency(st) {
    if (!st.hasItem) return 0;
    return Math.max(0, Math.min(1, (st.itemAgeMs - URGENT_AFTER_MS) / (DESPAWN_AFTER_MS - URGENT_AFTER_MS)));
  }

  /** An item was cleared: bonus uses the multiplier BEFORE it rises. */
  function onItemCleared(st) {
    const before = st.multiplier;
    st.multiplier = Math.min(MULT_MAX, st.multiplier + 1);
    st.hasItem = false;
    st.itemAgeMs = 0;
    st.noItemMs = 0;
    return { bonus: ITEM_BONUS * before, before, after: st.multiplier };
  }

  // -------------------------------------------------------------- effects
  function invasionAllowed(grid) {
    // Four rows rise from the bottom. Refuse if that could push the stack into
    // the spawn area (which would be an instant block-out).
    return stackTop(grid) >= Board.HIDDEN_ROWS + 2 + 4;
  }

  function pickEffect(grid, st) {
    const pool = EFFECT_IDS.filter((id) => id !== st.lastEffect && (id !== 'invasion' || invasionAllowed(grid)));
    const id = pool[Math.floor(Math.random() * pool.length)];
    st.lastEffect = id;
    return id;
  }

  function packSegment(row, start, end, toward) {
    const cells = [];
    for (let c = start; c <= end; c++) if (row[c] !== null) cells.push(row[c]);
    for (let c = start; c <= end; c++) row[c] = null;
    if (toward === 'left') cells.forEach((v, i) => { row[start + i] = v; });
    else cells.forEach((v, i) => { row[end - cells.length + 1 + i] = v; });
  }

  /** Drop rows that have become empty inside the stack (blocks cascade down). */
  function cascade(grid) {
    const kept = grid.filter((row) => row.some((cell) => cell !== null));
    const empties = grid.length - kept.length;
    return [...Array.from({ length: empties }, () => new Array(Board.COLS).fill(null)), ...kept];
  }

  /**
   * Applies an instant (non-timed) effect. Returns the grid to use afterwards.
   * Timed effects (blur / slow / speed) leave the grid alone.
   */
  function applyInstant(id, grid) {
    const C = Board.COLS;
    const half = C / 2;
    const T = grid.length;
    switch (id) {
      case 'erosion': {
        for (let r = T - 1; r >= T - 4; r--) {
          const filled = [];
          for (let c = 0; c < C; c++) if (grid[r][c] !== null) filled.push(c);
          if (filled.length) grid[r][filled[Math.floor(Math.random() * filled.length)]] = null;
        }
        return cascade(grid);
      }
      case 'fission':
        grid.forEach((row) => { packSegment(row, 0, half - 1, 'left'); packSegment(row, half, C - 1, 'right'); });
        return grid;
      case 'fusion':
        grid.forEach((row) => { packSegment(row, 0, half - 1, 'right'); packSegment(row, half, C - 1, 'left'); });
        return grid;
      case 'shift': {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        grid.forEach((row) => packSegment(row, 0, C - 1, side));
        return grid;
      }
      case 'turn': {
        const top = stackTop(grid);
        const flipped = grid.slice(top).reverse();
        return [...grid.slice(0, top), ...flipped];
      }
      case 'twist':
        return grid.map((row) => row.slice().reverse());
      case 'invasion': {
        if (!invasionAllowed(grid)) return grid;
        const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];
        const rows = [0, 1, 2, 3].map(() => new Array(C).fill(pick()));
        if (Math.random() < 0.5) {
          const hole = Math.floor(Math.random() * C);                 // one four-high hole
          rows.forEach((row) => { row[hole] = null; });
        } else {
          const a = Math.floor(Math.random() * C);                    // two two-high holes
          let b = Math.floor(Math.random() * (C - 1));
          if (b >= a) b += 1;
          rows[0][a] = null; rows[1][a] = null;
          rows[2][b] = null; rows[3][b] = null;
        }
        return [...grid.slice(4), ...rows];
      }
      default:
        return grid;
    }
  }

  /** Gravity multiplier for timed speed effects (applied to ms-per-row). */
  function gravityFactor(st) {
    if (!st.effect) return 1;
    if (st.effect.id === 'slow') return 2;
    if (st.effect.id === 'speed') return 0.5;
    return 1;
  }

  /** Column visibility 0.15..1 during Blur: fades left-to-right once a second. */
  function blurAlpha(col, elapsedMs) {
    const t = (elapsedMs % 1000) / 1000;
    const x = col / (Board.COLS - 1);
    const fadeIn = Math.max(0, Math.min(1, (t - x * 0.45) / 0.2));
    const recover = 1 - Math.max(0, Math.min(1, (t - 0.85) / 0.15));
    return 1 - 0.85 * fadeIn * recover;
  }

  return {
    ENABLED, MULT_MAX, EFFECTS,
    createState, isItem, baseColor, findItem, rowsHaveItem, stackHeight,
    trySpawn, tick, urgency, onItemCleared,
    pickEffect, applyInstant, gravityFactor, blurAlpha,
  };
})();
