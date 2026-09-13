# RPG pixel art package v10

## Delivered assets

The editable generator at `scripts/generate-pixel-assets.mjs` now produces the complete RPG art package without external images:

- 312 unique 48×48 gear SVGs, one for every existing catalog ID.
- 16 woodland persona SVGs with four species and four role treatments.
- A 96×96 typing hero, 25 monsters, and 25 crowned boss variants built from the six approved woodland portrait sources.
- A 192×112 layered woodland battlefield and 48×48 attack/heal effects.
- A sealed draw chest plus closed/open chest pairs for common, uncommon, rare, legend, and divine rewards.

All SVGs use fixed view boxes, `shape-rendering="crispEdges"`, and embedded Korean titles. Gear and interface art use native SVG geometry. Battle portrait wrappers embed only the approved local WebP bytes as `data:image/webp;base64` references, so generated assets have no runtime dependency on a separate portrait URL. The generator validates RIFF/WebP signatures and rejects external, arbitrary-data, event-handler, and cross-document filter references. The palette follows the homepage cream, cocoa, sage, forest, and gold colors. Gear rarity uses white, blue, purple, yellow, and red stepped frames. Slot-specific wood, leather, metal, cloth, ceramic, and crystal palettes give the silhouettes three material tones. Each slot has five recognizable forms: five weapon families, five defensive families, and five recovery families. A prefix emblem reflects names such as 풀잎, 유성, 서리, and 태양, while a small engraved maker rune gives every catalog asset a unique signature without the former QR-like block.

## Runtime integration

`typing-rpg.js` loads the portrait hero, attack effect, and stage palette artwork. Five source species each receive five distinct color-matrix material treatments, producing the stable 25 normal enemy files. Every tenth stage advances through the complete 25-piece boss set, so stages 10 through 250 expose boss 01 through 25 before looping. Boss wrappers reserve space for a separate gold pixel crown and add a stepped stage-color aura. This visual selection does not alter the stage palette or combat model. Existing v4 saved runs keep their legacy styling because the new layout is scoped under `typing-rpg--pixel`.

`rpg-draw-dialog.js` uses a neutral sage ribbon and cocoa wax seal while preparing, so the pre-reveal state cannot disclose rarity. It then places the matching open rarity chest behind the awarded item. The existing sequential ten-draw flow, equip callback, resume counter, and rare-or-better shake rule are unchanged. Image error handlers retain a compact fallback so a missing art file cannot block the draw flow.

## Regeneration and checks

Run:

```sh
node scripts/generate-pixel-assets.mjs
node --test tests/pixel-package-v10.test.mjs tests/typing-rpg-v5.test.mjs tests/rpg-v9-ui.test.mjs tests/rpg-v9-items.test.mjs
```

The package test verifies exact file counts, catalog-to-file coverage, SVG safety and crisp view boxes, all 25 palette mappings, boss differences, rarity chests, and runtime asset references. No item IDs, rarity odds, stats, combat formulas, storage fields, replay behavior, or draw mutations were changed.
