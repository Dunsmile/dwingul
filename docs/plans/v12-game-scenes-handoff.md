# v12 canvas game scenes handoff

## Owned implementation

- `public/js/scene-art.js`: fixed scene PNG allowlist, lazy image cache, readiness guard, cover/tile helpers, and per-context pattern cache. Unknown names return `null`; unloaded and failed images remain safe fallbacks.
- `public/js/jump-game.js`: responsive forest crop, distance-linked ground tile at exact `JUMP_FLOOR = 390`, exact obstacle destination rectangles, and code-rendered high-contrast `2단!` / `↓ 숙이기` hints. Existing procedural woodland and obstacles remain the fallback.
- `public/js/sort-game.js`: responsive lodge cover for 900×440 and 500×520, functional perspective guides above the art, readable status panel, and a subtle fever tint. Queue, exits, timing, and scoring are unchanged.
- `public/js/city-racing.js`: responsive village backdrop, distance-based roadside PNG props projected at lanes -1.35 / 5.35, and a cached moving road texture clipped to the existing projected `-.5..4.5` road polygon. The existing shoulders, boundaries, markings, contact indicators, pickups, and vehicles render above it. Procedural building blocks remain only as an asset-failure fallback.
- `tests/scene-art-v12.test.mjs`: allowlist/cache/failure tests plus source-level geometry ordering checks.
- `tests/v12-game-scenes-browser.mjs`: desktop/mobile gameplay and screenshots, sort fever, racing heights 320/630/1100, overflow checks, scene response checks, and an all-scene-assets-aborted fallback pass.

No engine, model, hitbox, spawn, scoring, mode identifier, production data, or generated asset file was changed by this work.

## Verification evidence

- Focused Node run: `node --test tests/scene-art-v12.test.mjs tests/jump-v4.test.mjs tests/game-v5.test.mjs tests/city-v11-render.test.mjs` — 15 passed, 0 failed.
- Isolated browser run: `DW_TEST_URL=http://localhost:4174 node tests/v12-game-scenes-browser.mjs` — passed with 11 canvas screenshots, all requested scene responses at HTTP 200, real jump/sort/racing input, and successful fallback play after aborting every `/assets/pixel/scenes/*.png` request.
- Browser evidence is outside the worktree at `/tmp/dwingul-v12-scenes/report.json` and its sibling PNGs. Reviewed compositions include mobile jump with grounded obstacle, mobile normal/fever sorting, and racing at 320, 630, and 1100 canvas heights.

## Integration notes

- The city source painting contains a road, but it never controls the game roadway: the exact live `cityProjection(canvas.height)` polygon fully paints and clips the functional surface above the backdrop at every tested height.
- The jump forest source is a single non-seamless 1152×768 composition, so it uses a responsive cover crop. The separate 384×96 ground is the moving parallax layer and advances by the same `scroll` distance as obstacles.
- Scene imagery is requested once per game instance and patterns are cached. No image decoding, pattern creation, or array construction for art occurs inside the jump/sort frame paths; city retains its existing per-frame object ordering and adds one bounded 40-prop projection loop.
