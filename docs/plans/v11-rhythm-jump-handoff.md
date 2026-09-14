# V11 jump and rhythm handoff

## Outcome

- Jump scheduling now uses one world-distance axis. Ground scroll, score distance, every obstacle, internal pattern offsets, and the next-pattern countdown all consume the same `worldDelta`.
- A faster run increases obstacle frequency because a fixed safe world gap takes less time to cross. At 420 px/s the interval is about 52% of the corresponding 220 px/s interval.
- Recovery floors remain explicit by pattern family: basic 360 px, wide 380 px, double 720 px, slide 420 px. The double gap exceeds the measured two-jump landing time at maximum speed.
- Rhythm is a three-lane game with a fixed physical contract: left = `←`/`A`, center = `Space`/`Enter`/`↓`/`S`, right = `→`/`D`.
- Countdown, guide, pause, game-over, and finished phases ignore gameplay input without changing energy or statistics.
- A wrong lane receives `wrong-lane`, does not consume the timing target, and cannot become correct because its button happens to hold focus. Correct-lane timing keeps the V9 ±90/175 ms windows, 3·2·1 preparation, one-beat runway, 136 BPM cap, and frozen 900 ms ending.
- Both games have distinct record modes: `jump-distance-v11` and `rhythm-three-lane-v11`.
- Current V6 jump and V9 rhythm implementations were copied under `public/js/legacy/` before the rule changes.

## Root causes

Jump stored obstacle offsets and pattern gaps in milliseconds, then moved objects by an accelerating speed multiplied by a per-object `speedScale`. The same scheduled delay therefore became a larger physical hole at high speed, while the floor and different obstacles could cover different distances.

Rhythm tried to focus a disabled tap button after Start. Focus remained on the hidden Start button, and the document handler rejected Space/Enter from interactive targets. The V9 engine also had no lane field or lane argument, so it could only judge the nearest time and had no information with which to reject a wrong lane.

## Files

- `public/js/jump-game.js`
- `public/js/jump-patterns.js`
- `public/js/rhythm-engine.js`
- `public/js/rhythm-game.js`
- `public/css/rhythm.css`
- `public/js/legacy/jump-game-v6.js`
- `public/js/legacy/jump-patterns-v6.js`
- `public/js/legacy/rhythm-engine-v9.js`
- `public/js/legacy/rhythm-game-v9.js`
- `tests/jump-rhythm-v11.test.mjs`
- `tests/rhythm-jump-v11-browser.mjs`

## Shared integration required from root

1. In `game-options.js`, make sequence default to `{ version: 'v11', mode: 'rhythm' }` and resolve it to `rhythm-three-lane-v11`. Preserve explicit V9 as `rhythm-endless-v9`, V7 as `rhythm-relay-v7`, and older sequence results as `nine-pad`.
2. Make jump default to `{ version: 'v11' }` and resolve it to `jump-distance-v11`; retain V6/V5/V4 names and modes.
3. In `games.js`, route sequence V11 to current `createRhythm` and V9 to `./legacy/rhythm-game-v9.js`. V7 remains a ranked historical mode whose shared starts were already rejected; its engine is retained inside `legacy/rhythm-engine-v9.js`, but there is no separate V7 UI creator in the available history. Route jump V11 to current `createJump`, V6 to `./legacy/jump-game-v6.js`, and V5 to the existing `./legacy/jump-game-v5.js` if V5 starts remain supported.
4. Add result/ranking labels for both V11 modes. Render `rhythm-three-lane-v11` with the endless rhythm result statistics.
5. Update catalog/detail/play instructions from one-button rhythm to the fixed three-lane mapping. The current detail text still says every note uses Space/Enter.
6. Allow both V11 modes through server run/result validation while retaining all prior stored and ranked mode names.

## Verification

- `node --test tests/jump-rhythm-v11.test.mjs tests/jump-v4.test.mjs tests/rhythm-v9.test.mjs tests/rhythm-v7.test.mjs`: 26/26 pass.
- `node tests/rhythm-jump-v11-browser.mjs`: pass at 390×844. It uses real keyboard and pointer events, including Space from a focused wrong lane, inert guide/countdown input, correct center Enter, shared jump world travel, double jump, crouch, overflow, and console checks.
- Official `tests/web-game-client.mjs`: rhythm and jump both produced state plus screenshots with no error artifact.
- Full repository test run: 175/177. The two failures are outside this scope: a City V4 garage request returned 400 instead of 200, and the new RPG character-purchase API returned 404.

Reviewed screenshots:

- `output/play-polish-v11/rhythm-three-lanes-390.png`
- `output/play-polish-v11/jump-world-distance-390.png`
- `output/play-polish-v11/client-rhythm/shot-0.png`
- `output/play-polish-v11/client-jump/shot-0.png`

The 390 px rhythm screen keeps all three pads fully visible and labels every key. The jump screen shows the richer layered woodland background without changing collision geometry. The desktop client view keeps the rails, lanes, guide, and controls readable.
