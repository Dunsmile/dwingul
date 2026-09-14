# V11 game creator routing handoff

## Implemented in `public/js/games.js`

- Sequence V11 mounts the current three-lane rhythm creator.
- Explicit sequence V9 mounts the frozen `legacy/rhythm-game-v9.js` creator.
- Jump V11 mounts the current world-distance creator.
- Explicit jump V6 and V5 mount their frozen legacy creators.
- V7 sequence and V4 jump throw a clear unsupported-rule error instead of silently running under a different scoring implementation. Existing old group/share starts are rejected by the server before this boundary.
- All other games keep their existing creator.
- Mount settings are normalized once for the game context while retaining server-provided `gear` and `characterId`. This closes the loss between `app.js` receiving the selected RPG character and `typing-rpg.js` choosing its portrait.

No scoring or game simulation code changed in this routing task.

## Verification

- `node --test tests/game-routing-v11.test.mjs tests/games.test.mjs tests/jump-rhythm-v11.test.mjs`: 13/13 passed.
- `tests/rhythm-jump-v11-browser.mjs` exercised the real `app.js` → isolated port 4174 API → `mountGame` route after dispatch was added. Its completed report is `output/play-polish-v11/browser-report.json`: V11 rhythm and jump loaded, keyboard/pointer controls passed, world travel matched, overflow was false, and browser errors were empty.
- Static syntax check for `public/js/games.js` passed.

## Root-owned copy changes still needed

- `public/js/catalog.js` still describes rhythm as one button using only Space/Enter. Replace it with the fixed mapping: left `←`/`A`, center `Space`/`Enter`/`↓`/`S`, right `→`/`D`, and explain that the same lane and timing must match after 3·2·1.
- `public/js/app.js` only renders endless statistics for `rhythm-endless-v9`. Apply the same result block to `rhythm-three-lane-v11` and add its display label to `modeLabel`.
- The API already returns `gameSettings.characterId` into `app.js`; no additional app routing change is required for the selected portrait after this `games.js` fix.

The isolated server remains root-owned on port 4174. Port 4173 and production were not accessed.
