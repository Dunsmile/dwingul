# v12 vehicle camera handoff

## Camera-aware racing art

- `public/js/city-vehicle-art.js` owns the closed four-type × five-view traffic matrix and eight rear-view player paths. Its image cache is independent of the general scene loader and rejects unknown types, views, and cars.
- Traffic view selection uses the existing projected `x` and `scale`. Screen offset is normalized by the projected outer-lane span. Yaw is suppressed through scale 0.25 near the vanishing point, then grows continuously to full strength at scale 1. Thresholds at ±0.2 and ±0.7 select `front`, `left/right`, and `left-edge/right-edge`. At scale 1, lanes 0–4 map directly to all five authored views.
- `public/js/city-racing.js` draws the selected separate PNG when ready, then the existing illustrated vehicle, then the geometric fallback. It does not mirror images at runtime.
- The new tightly trimmed PNG destination keeps its natural aspect ratio at the existing nominal projected width and ends exactly at `vehicleSpriteBox(...).floorY`. This prevents symmetric head-on and naturally taller vehicle views from stretching into the old type-wide height. The old illustrated fallback retains its old rectangle, including its historical 12% lower allowance. `vehicleSpriteBox`, footprints, collision, speed, distance, spawn, and pass rules are unchanged.
- `getState()` now reports `artView` and `artSource` per traffic vehicle and `{ view: 'rear', source }` for the player, giving seeded browser QA a deterministic rendering trace.

## Other service orientation audit

- Jump runner: correct for its motion. All run/jump/slide/dead portraits face screen-right, matching obstacles approaching from the right. No fix needed.
- Sort queue: correct for the interaction. Characters face the player/camera while waiting and exiting; side identity is communicated by authored blue/white clothing and code-directed horizontal exit motion. Turning them sideways would weaken the immediate classification cue. No fix needed.
- Typing duel: the hero and all monsters are frontal portraits even though the hero is staged left, monster right, and the attack bolt travels left-to-right. This reads acceptably at small size but is the one concrete orientation mismatch. Recommended future art work: inward-facing three-quarter combat variants (hero toward screen-right, monsters toward screen-left), preserving transparent trim and current bottom anchors. It requires coordinated art for 16 heroes and 25 monsters, so no source change was made in this bounded racing task.
- Rhythm: frontal orientation is appropriate. Both guide and player perform toward the user on parallel tracks; neither represents travel or a face-to-face duel. No fix needed.

## Verification

- `tests/city-vehicle-art-v12.test.mjs` covers all five near-lane views, distant convergence, mid-depth left/right selection, all approved path families, natural-aspect floor anchoring, renderer fallback order, and debug state wiring.
- `tests/v12-city-camera-browser.mjs` loaded all 20 traffic and eight player PNGs at nonzero natural dimensions, captured the full five-view and eight-rear matrices at 1440px and 390px, exercised real desktop/mobile racing, and verified steering remains live when every new vehicle PNG is aborted.
- Browser evidence: `/tmp/dwingul-v12-vehicle-camera/report.json` and six sibling PNGs. The run passed with 28 distinct authored sources.
