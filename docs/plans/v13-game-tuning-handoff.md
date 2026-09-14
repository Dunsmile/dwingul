# v13 game tuning handoff

## Jump v13

- Active difficulty level is `floor(activeElapsedMs / 10000)`. Paused wall time does not enter the game tick, so it cannot raise difficulty.
- Target cadence is `5 + level` obstacles per 10 seconds, increasing without a level cap. It is a scheduling target rather than a promise: every selected pattern retains its existing `minimumGapByType`, so the safe effective cadence can remain below the target for tall/dense patterns.
- Speed is `min(420, 220 + level * 24)` pixels/second. It changes only at the same 10-second boundaries and retains the established v11 maximum as the practical safety ceiling.
- `jumpV13NextPatternDistance()` accounts for each pattern's number of obstacles and its last internal event, then takes the larger of target-cycle spacing and the established family-safe minimum gap.
- The status HUD reports difficulty and target cadence explicitly. State snapshots expose `rulesVersion`, `difficultyLevel`, and `targetObstaclesPer10s`.
- `jumpWorldSpeed()` and `jumpWorldSpeedV11()` preserve the old continuous v11 curve. Current `createJump()` defaults to v13; `createJumpV11()` is exposed through `public/js/legacy/jump-game-v11.js`. Result modes are `jump-distance-v13` and `jump-distance-v11` respectively.

Root integration required: import current `createJump` as v13 and the legacy wrapper as v11 in `games.js`; dispatch both normalized versions. Make v13 the new default in game options and server validation while retaining v11 replay acceptance.

## Rear-only racing

- Traffic now uses four semantic rear sources: car → `player-basic-rear.png`, van → `player-van-rear.png`, truck → `player-pickup-rear.png`, bus → `traffic-bus-rear.png`.
- `city-racing.js` no longer selects traffic yaw from screen position. Debug snapshots report `artView: 'rear'` for every traffic vehicle and player.
- The loader applies `assetUrl()` only when assigning the actual `Image.src`; reported semantic paths remain stable source PNGs. Preload is limited to four traffic rears plus the selected player rear.
- Existing projected box width, natural image aspect ratio, exact `floorY` bottom anchor, footprints, and collision geometry remain unchanged.

The missing bus rear was generated with the built-in image generation tool from the existing bus front and van rear references. Source: `design/scenes-v13/traffic-bus-rear-source.png`. Production source/output: `public/assets/pixel/scenes/traffic-bus-rear.png`. Root must add it to the asset builder and delivery manifest.

Final generation prompt: create a symmetric straight rear view of the same forest-green vintage village bus, retaining cream roof, strapped roof luggage, rear window, red tail lamps, bumper and leaf emblem; crisp matching pixel art; entire vehicle tightly trimmed with transparent background; wheels share one bottom contact line; no road, scenery, checkerboard, text, watermark, headlights, grille, front windshield or front-facing view.

## Memory preview

Diagnosis: the preview buttons are correctly marked `is-lit`, but they are also disabled during the show phase. The global `button:disabled { opacity: .45 }` makes the targets translucent and visually blurred.

`public/css/play-tuning-v13.css` restores `opacity: 1` and `filter: none` only for disabled memory cells. Root must link this stylesheet after the global application/game styles.

## Focused verification

- `tests/jump-v13-tuning.test.mjs`
- `tests/memory-preview-v13.test.mjs`
- Updated rear-only cases in `tests/city-vehicle-art-v12.test.mjs`
- Focused run with v11 jump safety/replay tests: 25 passed, 0 failed.
- `tests/v13-game-tuning-browser.mjs` passed against an isolated in-memory server on port 4178. It verified v13 jump state, fully opaque/unfiltered memory targets, rear-only live traffic, and steering at 390×844 and 1440×950. Six screenshots and the report are in `/tmp/dwingul-v13-game-tuning/`.

The browser test temporarily loads the scoped memory stylesheet because the root-owned site stylesheet link is still pending. The current jump creator defaults to v13, so the test can verify v13 state before root completes explicit v11/v13 dispatch wiring.
