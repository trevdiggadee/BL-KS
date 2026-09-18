/**
 * modes.js
 * Special gameplay modes. Pure definitions + small helpers; Game owns the
 * live run state and calls these helpers when a special mode is active.
 */
const Modes = (() => {
  const LIST = {
    standard: { id:'standard', name:'STANDARD', icon:'◆', desc:'Classic endless NEONBLOCK.', gravity:1, score:1 },
    zen: { id:'zen', name:'ZEN', icon:'◉', desc:'Slower gravity and a forgiving lock.', gravity:.62, score:1 },
    blitz: { id:'blitz', name:'BLITZ', icon:'⚡', desc:'90 seconds. Fast gravity. Chase the highest score.', gravity:1.28, score:1.35, timeLimit:90000 },
    inferno: { id:'inferno', name:'INFERNO', icon:'🔥', desc:'The stack fights back with rising garbage rows.', gravity:1.12, score:1.25, garbageEvery:10000 },
    gravity: { id:'gravity', name:'GRAVITY', icon:'↻', desc:'Gravity shifts direction throughout the run.', gravity:1.0, score:1.2, gravityShiftEvery:8000 },
    boss: { id:'boss', name:'BOSS', icon:'☠', desc:'Damage the boss by clearing lines while surviving attacks.', gravity:1.08, score:1.3, bossAttackEvery:7500, bossHp:12 },
  };
  function get(id){ return LIST[id] || LIST.standard; }
  function all(){ return Object.values(LIST); }
  return { LIST, get, all };
})();
