/**
 * stats.js
 * Single responsibility: render the Stats screen from a save-data snapshot.
 * Pure DOM rendering — reads storage-shaped data, writes nothing.
 */

const StatsScreen = (() => {
  function formatPlayTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function render(data) {
    const s = data.stats;
    const grid = document.getElementById('stats-grid');
    const cards = [
      ['HIGH SCORE', s.highScore],
      ['BEST LEVEL', s.highestLevel],
      ['TOTAL LINES', s.totalLines],
      ['TOTAL GAMES', s.totalGames],
      ['TETRISES', s.totalTetrises],
      ['BEST COMBO', s.bestCombo],
      ['TOTAL PIECES', s.totalPieces],
      ['PLAY TIME', formatPlayTime(s.totalPlayTimeMs)],
    ];
    grid.innerHTML = cards.map(([label, value]) => `
      <div class="stat-card">
        <div class="stat-card__value">${value}</div>
        <div class="stat-card__label">${label}</div>
      </div>
    `).join('');

    const recentList = document.getElementById('recent-list');
    if (!data.recentGames || data.recentGames.length === 0) {
      recentList.innerHTML = `<div class="howto-text">No games played yet — go set a record.</div>`;
    } else {
      recentList.innerHTML = data.recentGames.slice(0, 10).map((g) => `
        <div class="recent-row">
          <div class="recent-row__score">${g.score}</div>
          <div class="recent-row__meta">Lvl ${g.level} · ${g.lines} lines · ${new Date(g.date).toLocaleDateString()}</div>
        </div>
      `).join('');
    }

    const achvGrid = document.getElementById('achv-grid');
    achvGrid.innerHTML = Achievements.all().map((a) => {
      const unlocked = !!data.achievements[a.id];
      return `
        <div class="achv-row ${unlocked ? 'unlocked' : ''}">
          <div class="achv-badge">${unlocked ? '\u2605' : '\u2022'}</div>
          <div>
            <div class="achv-name">${a.name}</div>
            <div class="achv-desc">${a.desc}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  return { render };
})();
