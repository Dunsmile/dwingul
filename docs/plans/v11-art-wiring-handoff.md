# V11 illustrated art wiring handoff

## Implemented

- `public/js/art.js` now accepts only known local illustrated PNG, retained WebP, and legacy SVG namespaces. A legacy world/RPG/persona/item SVG resolves to the same basename under `assets/pixel/illustrated/`, with the SVG retained as a one-time fallback.
- Decorative images swap to the legacy SVG on the first loading error. They expose the existing semantic fallback only if that source also fails. Unsafe paths, traversal, query strings, and unknown folders are rejected.
- `public/js/pixel-world.js` loads illustrated world PNGs first and retries the matching SVG once. Drawing, projection, collision, and portrait behavior are unchanged.
- `public/js/rpg-draw-dialog.js` loads illustrated chest and equipment PNGs first. Its old SVGs and final glyph/missing-art behavior remain available after loading failures, and all existing reveal/shake timing is unchanged.
- `scripts/build-artbook.mjs` builds a `pixel-v11` manifest from original WebP thumbnails/portraits plus the illustrated PNG package. It validates the PNG signature and IHDR dimensions, verifies every old world/RPG SVG has its same-basename PNG mirror, imports the RPG character/species names, and adds the 8 player cars, 4 traffic vehicles, and 25 species.
- The manifest and page identify the raster artwork as original generated artwork and accurately describe the 312 equipment variants as derivatives of 75 base illustrations. They include `© 2026 DWINGUL`, the contact email, and the partnership email link.

## Root integration points

These direct source references do not pass through `art.js` and remain outside this task's ownership:

- `public/js/rhythm-game.js`: replace the guide/player persona SVG primaries with illustrated persona PNGs and retain the SVGs as error fallbacks.
- `public/js/city-racing.js`: replace the boost button's direct `/assets/pixel/world/boost.svg` primary with `/assets/pixel/illustrated/world/boost.png`, retaining the SVG fallback if desired.
- `public/css/world.css`: replace the memory-cell star SVG background with `/assets/pixel/illustrated/world/star.png` once the PNG package is complete.
- `public/css/typing-rpg.css` already points to the illustrated battlefield PNG. The old hero/monster SVG strings in `typing-rpg.js` are intentional runtime fallbacks behind the illustrated persona/species primaries.

The strict artbook build requires the complete generated mirrors. The completed package now covers every old world basename and includes the RPG battlefield, spells, every chest state, hero, and the 25 monster/boss mirrors.

## Verification

- `node scripts/build-artbook.mjs`: produced 526 assets.
- `node --test tests/art-wiring-v11.test.mjs tests/world-art.test.mjs tests/pixel-package-v10.test.mjs`: 19 passed, 0 failed.
- The focused tests cover allowed-path validation, unsafe input rejection, generated markup, one-time canvas fallback, two-stage decorative fallback, RPG chest/item source selection, current typing RPG active paths, v11 metadata, PNG-only manifest sources, exact PNG dimensions/aspect ratios, unique local assets, product names, Korean aliases, and all PNG/SVG fallback pairs.
- Browser QA at 390 px exercised all nine artbook tabs: 21 thumbnails, 11 original portraits, 64 world assets, 65 RPG assets, 16 characters, 312 equipment variants, 25 species, 8 player cars, and 4 traffic vehicles. Every tab had zero horizontal overflow and its first visible images loaded. Searching `바보` returned exactly `타로 · 바보`.
- Visual inspection at 390 px and 1440 px found the gallery grid, art cropping, labels, filters, and footer readable with no layout defect. Screenshots: `output/playwright/v11-artbook-world-390.png`, `output/playwright/v11-artbook-world-1440.png`.
- A browser request interception deliberately blocked `/assets/pixel/illustrated/world/book.png`. The detail page switched to `/assets/pixel/world/book.svg`, remained visible (`naturalWidth: 32`), and kept the surrounding layout intact. Screenshot: `output/playwright/v11-art-fallback-daily-390.png`.
- A second interception blocked the sealed chest PNG. The draw dialog's local handler switched to `/assets/pixel/rpg/chest-sealed.svg`; the original animated image node stayed connected and visible (`naturalWidth: 96`). The global decorative handler intentionally ignores draw-dialog fallbacks so the two handlers cannot race.
- The only browser console entry was the pre-existing local `favicon.ico` 404. No art request failed outside the deliberate fallback check.
