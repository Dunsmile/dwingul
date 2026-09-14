# V16 racing implementation report

## Root causes

- Roadside props used half the road distance (`distance * .5`), so they slid relative to the road plane. They also had no contact shadow and were rendered in index order rather than depth order. The source PNGs have no transparent bottom padding; the drift was projection timing, not asset trim.
- The engine already stopped simulation when fuel reached zero, but `city-racing.js` called `finish` in that same tick. The stopped vehicle was therefore hidden by the result view before the player could perceive the stop.
- V7 drained only 0.5 fuel/second, restored 15 per pickup, placed the first fuel at 93–120 m, and later fuel at 367–467 m intervals. In a normal run, recovery outweighed interval drain and often hit the tank cap.
- Speed technically rose at 1.08 m/s per elapsed second, but reached the 42 m/s cap quickly. The V16 curve rises from 18 to 48 m/s at 0.72 m/s per second, so acceleration remains visible for about 42 active seconds.
- The live engine file doubled as the V7 settlement replay. Changing balance in place would invalidate old reward verification.

## Changes and balance

- Added `public/js/legacy/city-engine-v7.js`, a behavior-preserving snapshot of the previous engine. `garage-store.js` routes V7 settlements to it and V16 settlements to the current engine. The visible racing renderer also selects frozen V4, V5, V6, or V7 engines from `ctx.settings.version`; only V16 falls through to the current engine.
- V16 fuel drains at 1.1/second and fuel recovery is 8, always capped at the selected car's tank.
- The first fuel appears at 220–280 m. Later pickups are 650–850 m apart. Even at the V16 base speed cap, the minimum interval costs more fuel than one pickup restores.
- Speed is `min(48, 18 + elapsedSeconds * .72) * car.speed`, with the existing per-car speed and boost multipliers unchanged.
- Collision damage, armor, boost duration/proc traits, eight cars, same-lane 1–6 m near-miss logic, rear-only traffic/player art, and path-validated reachable traffic are unchanged.
- Roadside items now advance by the same world distance as the roadway, render far-to-near, and receive a scale-aware ground shadow at the exact projected base.
- At V16 game over the engine remains stopped for 650 ms with `주행 종료` drawn on the road. Only then does the V16 result callback run. Distance, time, traffic, and fuel remain frozen during the pause. Historical V4–V7 playback retains its immediate result timing and emits its exact versioned mode.

## Tests and evidence

- `node --test tests/v16-racing-engine.test.mjs tests/city-v5.test.mjs tests/city-v6.test.mjs tests/city-vehicle-art-v12.test.mjs`: 25/25 pass. This covers all eight car traits, fuel drain/recovery/cap, delayed and spaced fuel, elapsed-time acceleration, frozen V7 constants, deterministic earlier engines, rear-only art, same-lane near misses, and traffic reachability.
- `DW_TEST_URL=http://127.0.0.1:4181 node tests/v16-racing-browser.mjs`: pass against an isolated `:memory:` database. Direct mounts bypass the shared default and prove V7 playback retains 0.5/sec drain, 1.08/sec acceleration and `city-basic-v7`, while V16 uses 1.1/sec, 0.72/sec and `city-basic-v16`. It verifies rear-only vehicles, observes no V16 result immediately at game over, proves distance/time stay unchanged through 500 ms, then observes the result after another 200 ms. No page errors.
- Roadside screenshots were inspected around 120 m, 300 m, and 500 m. Houses, lamps, shrubs, and trees remain attached to their scale-aware projected footpoints rather than drifting at half road speed.
- The official web-game client ran twice with left/right input bursts. Its text state showed speed rising from 18.68 to 19.31 m/s while fuel fell from 28.96 to 28.00; all generated traffic used rear art. The latest gameplay screenshot was visually inspected.
- Browser artifacts: `/tmp/dwingul-v16-racing/grounded-120m.png`, `grounded-300m.png`, `grounded-500m.png`, `stopped-freeze.png`, `report.json`, and `/tmp/dwingul-v16-client/`.
- Testing used port 4181 and `DW_DB=:memory:` only. No request touched user port 4173 or a persistent/production database.

## Shared integration required from root

These files are root-owned and were not edited here.

1. In `public/js/game-options.js`, make racing default to `v16`, while accepting `v7` as a preserved version: `['v4','v5','v6','v7'].includes(raw.version) ? raw.version : 'v16'`.
2. In the same file, add `city-${car.id}-v16` names for all eight `cityCars`. Keep the existing V7 names for archived records.
3. In `public/js/catalog.js`, change `currentGameModes.racing` from `city-basic-v7` to `city-basic-v16`.
4. In root-owned racing copy (`content.js`/generated content source), update the rules from `0.5/sec`, `+15`, and the former pickup cadence to `1.1/sec`, `+8`, first fuel 220–280 m and later 650–850 m. Mention gradual elapsed-time acceleration if space permits.
5. If `game-assets.js` contains version-keyed racing preload data, add V16 alongside V7; no new art asset is required.
6. Update root-owned/legacy V7 assertions so V7 engine tests import `legacy/city-engine-v7.js`. New-current assertions should import `city-engine.js` and expect V16. Existing integration tests that create a default racing run will pass once the default version is V16; before that switch, they correctly expose the V7/current replay mismatch.

No change is required in `public/js/games.js`: it already mounts `createCityRacing`, and that renderer now dispatches V4–V7 to their frozen engines and V16 to the current engine. Its result mode and replay details use the selected version.
