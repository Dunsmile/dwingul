# v13 immersive typing RPG handoff

## Implemented composition

The active typing battle is now one illustrated pixel battlefield. Its top row contains player HP/MP at left, stage/gold at center, and monster identity/HP/counter at right. The inward-facing hero and monster occupy the middle scene, and the attack phrase, per-character feedback, input, attack button, live hint, heal hint, and collapsed details sit in a translucent command panel at the bottom of the same arena.

The DOM keeps the existing class names used by game state and regression checks. Only their grouping changed: `typing-rpg__hud`, `typing-rpg__scene`, and `typing-rpg__command` are direct children of `typing-rpg__arena`. The existing pause button is moved into that arena after mounting, so its original event handler and state remain intact. The duplicated outer typing status toolbar is hidden. The model, IME composition handling, 15-point base heal, gear modifiers, stage rules, counter timing, replay records, and result data are unchanged.

Responsive rules cover a short 320×568 viewport plus 320, 390, 768, and 1440 widths. On mobile the stage/gold capsule occupies its own centered row above two equal player/monster panels. Key labels, values, monster name, and full remaining counter time use at least 12 px type; the redundant small stage badge is hidden. The scene is reduced to 150–165 px so the command panel follows the actors without a large empty gap. The focused input remains keyboard reachable without horizontal overflow, and the in-arena pause button remains at least 44 px square.

## Asset delivery

Semantic exported paths remain the allowlisted PNG paths. Actual `img.src` assignments pass through `assetUrl()`, while fallback `data-*` values remain stable for delegated recovery and tests. Each stage change calls `warmImage()` for the next monster species without blocking combat.

The start gate's critical image list should be limited to:

- `/assets/pixel/illustrated/rpg/battlefield.png`
- the selected `typingRpgHeroDuelArtPath(characterId)`
- the current `typingRpgMonsterDuelArtPath(stage)`

`/assets/pixel/illustrated/rpg/spell-attack.png` and `/assets/pixel/illustrated/rpg/spell-heal.png` are small effect assets and can warm concurrently without delaying the clock. After the critical gate resolves, warming `typingRpgMonsterDuelArtPath(stage + 1)` is the useful near-term prefetch; the component also repeats this warm when the active stage changes.

## Files

- `public/js/typing-rpg.js`
- `public/css/typing-rpg.css`
- `tests/typing-immersive-v13.test.mjs`
- `tests/v13-rpg-immersive-browser.mjs`
- `docs/plans/v13-rpg-handoff.md`

## Verification

- Focused Node tests: 16 passed, 0 failed across immersive structure/delivery, v4 combat/IME, v5 stage/heal/replay, and v12 duel mapping.
- Official client browser QA on `PORT=4179 DW_DB=:memory:` passed at 320×568, 320×700, 390×844, 768×900, and 1440×1000. The QA script loads the source RPG stylesheet after the current delivery bundle so these screenshots include the latest overrides; root must regenerate the delivery CSS bundle before final integrated QA.
- Browser checks covered zero horizontal overflow, scene/command separation, complete untruncated monster names, full counter seconds, 12 px minimum mobile HUD type, decoded actor art, keyboard focus, hidden duplicate toolbar, visible 44 px in-arena pause control, deferred IME composition, deliberate damage, and a base 15-point heal.
- Screenshots and the machine-readable report are in `output/v13-rpg/`; screenshot names include the full viewport, for example `immersive-320x568.png` and `immersive-390x844.png`.
- `git diff --check` passed for the scoped implementation and tests.
