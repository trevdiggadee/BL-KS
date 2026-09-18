# NEONBLOCK

A premium, neon-arcade falling-block puzzle game. Fully client-side,
offline-capable, installable as a PWA, no accounts and no backend.

## Run it locally

No build step. Any static file server works:

```bash
cd neonblock
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` directly in a browser — everything but the
service worker (which requires http/https, not `file://`) will still work.

## Deploy: GitHub → Cloudflare Pages

1. Push this folder to a GitHub repo.
2. In Cloudflare Pages, create a project connected to that repo.
3. Build settings: **no build command**, output directory `/` (repo root).
4. Every push to your main branch auto-deploys.

There's no environment config, no secrets, and no server — Cloudflare is
just serving static files.

## Project structure

```
index.html            All screens (start, game, stats, settings, how-to-play)
style.css             Design tokens, themes, layout, every screen's styling
manifest.json         PWA manifest (icons, standalone display, theme color)
service-worker.js     Offline caching (cache-first, versioned cache name)
gen_icons.py          Regenerates assets/icons/* (needs Pillow: pip install pillow)
js/
  storage.js          Save system: versioned schema, safe defaults, migration
  pieces.js            Tetromino shapes, rotations, wall kicks, 7-bag randomizer
  board.js             Grid state, line-clear detection, locking
  collision.js         Movement/rotation/ghost-piece checks (Board + Pieces)
  scoring.js           Points, level curve, gravity speed
  audio.js              All sound synthesized live via Web Audio (no asset files)
  particles.js         Line-clear particle bursts
  effects.js            Screen shake, flash, toast banners
  achievements.js      Achievement definitions + unlock checks
  modes.js             Special gameplay mode definitions
  input.js             Keyboard (DAS/ARR), touch buttons, swipe gestures
  ui.js                Canvas rendering, screen switching, HUD
  stats.js             Renders the Stats screen from save data
  settings.js          Wires the Settings screen; theme/audio/data actions
  game.js              The game loop and state machine — ties everything together
  main.js              Bootstraps the app, nav wiring, service worker registration
assets/icons/          App icons (192/512, maskable variants, apple-touch-icon)
```

## Continuing development

Every file has one job (see the header comment at the top of each). To add
a feature:

- New sound → add a function to `SFX` in `audio.js`.
- New achievement → add an entry to `LIST` in `achievements.js` with an id,
  name, description, and a `check(stats)` function.
- New theme → add an `html[data-theme="yourtheme"] { ... }` block in
  `style.css` (copy an existing one) and a swatch button in `index.html`.
- New setting → add the control to the Settings screen markup in
  `index.html`, a default in `DEFAULTS()` in `storage.js`, and a listener
  in `settings.js`.

## Save data

Everything lives in `localStorage` under the key `neonblock.save.v1` — high
score, level, stats, achievements, settings, and recent games. It's
versioned (`schemaVersion`/`version`) so a future update can migrate old
saves instead of wiping them. Players can export/import their save from
Settings → Data.

## Regenerating icons

```bash
pip install pillow
python3 gen_icons.py
```


## Special modes

Special Modes are selected directly from the main menu:
- **STANDARD** — classic endless play.
- **ZEN** — slower, relaxed gravity.
- **BLITZ** — 90-second score attack with faster gravity and score bonus.
- **INFERNO** — rising garbage rows periodically pressure the stack.
- **GRAVITY** — gravity rotates between down, right, up, and left.
- **BOSS** — line clears damage a boss while periodic boss attacks add garbage.

The selected mode is remembered locally and starts when PLAY is pressed.
