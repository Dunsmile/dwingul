# V12 typing duel camera handoff

## Change

- Active typing battles request `/assets/pixel/scenes/duel-hero-{0..15}.png` for the selected hero and `/assets/pixel/scenes/duel-monster-{01..25}.png` for the current monster species.
- Hero variants are authored facing right and monster variants facing left. Boss stages use the same inward-facing species image and retain the existing crown, boss size, filter, HP, timing, and rules.
- Character collection, selector, profile, and other non-battle views still use the established front-facing illustrated persona paths.
- Each duel hero falls back to its existing illustrated persona. Each duel monster falls back to its existing illustrated monster. If that fallback also fails, the existing semantic keyboard/diamond placeholder remains.
- Battle images use the established delegated `data-decorative-image` and `data-fallback-src` contract without inline error handlers. The local listener remains so direct game mounts also retain the semantic placeholder.

## Files

- `public/js/typing-rpg.js`
- `tests/typing-duel-v12.test.mjs` (new)
- `tests/v12-duel-camera-browser.mjs` (new)
- `tests/rpg-v11-browser.mjs` (updated gameplay path expectations; collection checks unchanged)
- `docs/plans/v12-duel-camera-handoff.md` (new)

## Verification

- Mapping tests cover all 16 heroes, all 25 monster species, unknown-character normalization, stage wrapping, and identical boss species mapping.
- Existing typing RPG model and UI tests verify gameplay stats, rules, progression, collection, and profile behavior remain unchanged.
- Browser QA requests and decodes all 41 duel PNGs, then checks normal and boss battles at 390 and 1440, scene bottom anchors, clipping/overflow, exact primary and fallback paths, and forced 404 recovery. It writes four screenshots and `output/duel-v12/duel-camera-report.json`.
- The existing RPG browser regression also passes with the selected hero/species 25 duel paths while its 16-card front-facing collection check remains intact.

No CSS change was required: the existing battle containers provide fixed bottom anchors, and battle images already use full-size `object-fit: contain` inside those containers.
