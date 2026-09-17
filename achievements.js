/**
 * achievements.js
 * Single responsibility: define achievements and decide which newly
 * unlock given the current stats snapshot. Does not touch storage or DOM
 * directly — callers persist unlocked IDs and render popups.
 */

const Achievements = (() => {
  const LIST = [
    { id: 'first_line', name: 'First Line', desc: 'Clear your first line.', check: (s) => s.totalLines >= 1 },
    { id: 'first_tetris', name: 'First Tetris', desc: 'Clear 4 lines at once.', check: (s) => s.totalTetrises >= 1 },
    { id: 'lines_100', name: 'Centurion', desc: 'Clear 100 lines lifetime.', check: (s) => s.totalLines >= 100 },
    { id: 'lines_500', name: 'Line Machine', desc: 'Clear 500 lines lifetime.', check: (s) => s.totalLines >= 500 },
    { id: 'lines_1000', name: 'Millennium', desc: 'Clear 1,000 lines lifetime.', check: (s) => s.totalLines >= 1000 },
    { id: 'tetris_10', name: 'Tetris Master', desc: 'Clear 10 Tetrises lifetime.', check: (s) => s.totalTetrises >= 10 },
    { id: 'combo_10', name: 'Chain Reaction', desc: 'Reach a 10x combo in one game.', check: (s) => s.bestCombo >= 10 },
    { id: 'level_10', name: 'Level 10', desc: 'Reach level 10.', check: (s) => s.highestLevel >= 10 },
    { id: 'level_20', name: 'Level 20', desc: 'Reach level 20.', check: (s) => s.highestLevel >= 20 },
    { id: 'perfect_game', name: 'Perfect Game', desc: 'Clear lines without a single hold use.', check: (s) => s.perfectGames >= 1 },
    { id: 'marathon', name: 'Marathon', desc: 'Play for 30 minutes total.', check: (s) => s.totalPlayTimeMs >= 30 * 60 * 1000 },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Place 500 pieces lifetime.', check: (s) => s.totalPieces >= 500 },
  ];

  /** Returns the list of achievement objects newly unlocked this check
   *  (present in `stats` thresholds but not yet in `unlockedMap`). */
  function checkNewUnlocks(stats, unlockedMap) {
    const newly = [];
    LIST.forEach((a) => {
      if (!unlockedMap[a.id] && a.check(stats)) {
        newly.push(a);
      }
    });
    return newly;
  }

  function all() { return LIST; }

  return { all, checkNewUnlocks, LIST };
})();
