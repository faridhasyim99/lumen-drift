# LUMEN DRIFT

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/faridhasyim99/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/faridhasyim99/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete original 2D canvas arcade game. You pilot a light-orb through a
dark field: collect lumen shards for score, dodge void mines, chain pickups
into a combo multiplier, and dash through danger.

## How to play

- **Goal:** reach **600 lumen** or clear **wave 10**. You have 3 lives.
- **Move:** mouse or WASD / arrow keys.
- **Dash:** Space or click — a short burst with a cooldown, briefly invulnerable.
- **Pause:** P. **Restart:** R. **Mute:** M.
- **Combo:** pickups chained within 2.5 seconds raise the multiplier up to x5.
  Taking a hit resets the chain.

## Run it

Serve `game/` with any static server and open `index.html` in a desktop
browser. No build step, no network requests, no libraries: vanilla canvas
plus synthesized WebAudio bleeps.

```bash
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

## Files

- `game/index.html` — the page and canvas.
- `game/src/config.js` — every tuning number in one place.
- `game/src/random.js` — the seeded random helpers.
- `game/src/input.js` — keyboard and mouse input.
- `game/src/world.js` — the rules: entities, spawning, waves, collisions.
- `game/src/render.js` — everything the player sees.
- `game/src/audio.js` — synthesized sound effects (no audio files).
- `game/src/main.js` — the frame loop and screen flow.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — 4 screenshots of the game itself: title, play, game over,
  win.

## Verified (17 Nov 2026, automated play-test in headless Chromium)

23/23 checks pass: title shows, Enter starts, arrow keys move the player,
mouse steers, Space dashes, P pauses/resumes, both win (score target) and
lose (0 lives) paths are reachable, R and click restart from both end
screens, no console errors, no failed requests, no network requests
(local files and `data:` only). Dossier build verified:
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` writes
`out/dossier.json` (372,046 bytes) and two runs are byte-identical.

## License

MIT. See `LICENSE`.
