# v12 final independent review

## Findings

No reproducible P1 or P2 defect found in the final repository diff.

## Spec and integration assessment

- Fortune: all four requested contents use required unchecked consent, local analysis with ready/error/cancel states, explicit confirmation, single history commit, compact interpretation-first results, and bottom actions. Raw birthday/calendar/time are remembered only through the independent optional checkbox. Derived result retention is disclosed consistently in the form and `scripts/build-site.mjs`. Share uses an explicit allowlist and excludes raw birth fields, the birth object, and pillars.
- Lifecycle: `render()` cancels analysis before advancing the route token; the controller also refuses stale readiness. `take()` is one-shot and the click handler clears the controller before awaiting the history request. Close/Escape and route-away do not commit. Historic result rendering does not rerun analysis and tolerates missing sections/birth data.
- CSP/security: the prior inline `onerror` P2 is resolved. The analysis portrait now uses the existing delegated `data-decorative-image` / `data-fallback-src` mechanism, and the browser suite includes a forced-404 fallback case. No new remote source, inline script allowance, traversal-capable scene path, or share-field spread was introduced.
- Jump: scene art is layered over a playable procedural fallback; moving ground uses the same `scroll` distance at exact `JUMP_FLOOR=390`; obstacle images draw into the existing logical rectangles and collision remains the unchanged 6 px inset. Code-rendered hints and the newly bounded HUD backgrounds preserve readability without entering collision logic.
- Sort: the lodge is a cover-cropped optional background. Existing centerline, perspective guides, queue coordinates, controls, timing, and fever state remain code-driven above it.
- City: the village is decorative, roadside props are projected outside lanes at -1.35/5.35 and move from `s.distance`, while the live road polygon, lane markings, traffic indicators, vehicles, pickups, and collision geometry remain code-rendered. The road texture is clipped to the exact projected road.
- City vehicle poses: all four traffic types select from a closed five-view allowlist using the existing projected `x` and `scale`; all eight player cars use a closed rear-view allowlist. The selected PNG preserves the existing sprite width and is bottom-anchored exactly at `vehicleSpriteBox(...).floorY`; every exported silhouette reaches its trimmed bottom row. Unknown identifiers return `null`, and loading failure falls through to the prior illustrated sprite and then the geometric renderer. Vehicle footprints, collisions, pass state, spawning, and simulation rules are unchanged.
- DOM scenes: memory, numbers, color, timing, typing, and rhythm consume their intended new scene files through CSS. Color cells retain exact opaque HSL colors with no image/filter/opacity change. Memory states retain explicit visual overlays and forced-colors handling.
- Typing duel poses: all 16 selectable heroes map to right-facing battle-only variants, and the 25 monster species map to left-facing variants with the established 25-stage wrap. Bosses retain the same species, crown, sizing, rules, and timing. The existing front-facing collection art is untouched. Both primary and fallback paths are locally derived from normalized character/stage data; a failed duel PNG falls back to the established illustrated asset and then the semantic placeholder.
- Asset reachability: all 89 files in `public/assets/pixel/scenes/` have live JS or CSS consumers and are included in the generated scene manifest and 615-entry artbook. This consists of the original 20 scene assets plus 20 traffic views, eight player rear views, 16 duel heroes, and 25 duel monsters. No generated v12 scene asset is orphaned.
- Reproducibility: `scripts/build-scene-art.mjs` builds all 89 production assets from checked-in `design/scenes-v12` sources and the four checked-in pose atlases listed in `design/pose-sources-v12.json`. Atlas cells are seam-selected, chroma backing is converted to alpha, each sprite is tightly trimmed, and `design/scene-assets-v12.json` is regenerated. The main build invokes this before artbook/site generation.

## Verification

- Focused pose, city render, and typing model tests: 17 passed, 0 failed.
- Final sequential release run: 217 passed, 0 failed. Earlier concurrent build/test output collisions were eliminated by running the release checks sequentially.
- `npm run build`: completed; generated 89 scene assets, a 615-asset artbook, and 31 crawlable pages.
- `tests/v12-game-scenes-browser.mjs` on isolated port 4174: passed with 11 screenshots, desktop/mobile interactions, fever state, racing height variants, and all-scene-asset failure fallbacks.
- `tests/v12-city-camera-browser.mjs` on isolated port 4174: passed with six screenshots, all 28 vehicle pose files decoded across desktop/mobile galleries, live racing reported allowlisted selected art, and forced pose failures retained driving and lane input through the legacy fallback.
- `tests/v12-duel-camera-browser.mjs` on isolated port 4176: passed with four responsive normal/boss screenshots, all 41 duel pose files decoded, scene bounds stayed contained, and forced hero and monster failures loaded their illustrated fallbacks.
- `tests/fortune-v12-browser.mjs` on isolated port 4176: passed with zero recorded page errors, including the delegated analysis-image fallback.
- Source and built CSP both retain the restrictive `script-src 'self' https://www.googletagmanager.com`; fortune markup contains no inline handler.

The final fortune/browser and DOM-scene scripts cover all four fortune flows, raw/derived retention for guest and configured users, intercepted share bodies, working/ready route cancellation, delayed duplicate confirmation, image fallback, responsive result order, late 7×7 color/memory states, typing/rhythm interaction, and overflow. The added vehicle and duel browser suites directly cover pose decoding, responsive containment, selected runtime paths, and fallback behavior.

Root final visual review also found daily CSS-sheet portrait clipping; fortune-only fallback portraits now use standalone contained PNG/SVG artwork. All four header images passed four-edge containment and decode checks at 390/1440, with refreshed 24 captures. Official game-client driving exercised separate left-edge/right/front traffic selection and rear player art; no console errors.
