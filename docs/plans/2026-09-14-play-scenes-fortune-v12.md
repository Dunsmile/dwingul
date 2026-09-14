# v12 — 플레이 원화와 운세 결과 읽기

> For agentic workers: use subagent-driven-development for bounded work and independent review. User authorized implementation and autonomous UX choices. Root owns art generation, integration and release. No subagent may delegate.

**Goal:** Replace remaining flat game scenery with woodland raster art and make fortune analysis and reading feel coherent and clear.

**Architecture:** Preserve all current deterministic gameplay/scoring versions and database records. Decorative raster layers are separate from hitboxes and interactive semantic controls. Four fortune results use a shared analysis dialog and content-first result template with explicit temporary-use consent, separate optional saved birth details, and actions at the bottom.

**Tech stack:** Existing vanilla JS/Canvas/CSS, Node SQLite/Cloudflare Durable Object, Playwright, built-in imagegen and Sharp asset encoding.

## 1. Scene artwork — root
- [x] Inspect current forest art; create original raster backgrounds for jump landscape, sorting room, existing RPG scene framing, memory/color/timer tabletop, road scenery and transparent obstacle sheet. Preserve readable empty play space, matched game camera, no text in textures.
- [x] Create analysis character poses or use existing coherent character with new reading props, animate transforms with reduced-motion fallback.
- [x] Save source PNGs and prompts in design/ and reproducibly encode cropped production images in public/assets/pixel/scenes/; include in build and artbook.

## 2. Gameplay surfaces — bounded implementation
- [x] Audit jumping, sorting, typing, memory, color, racing, timer plus other flat play backgrounds; replace major scenery/panels/obstacles with supplied PNG/WebP art.
- [x] Keep logical obstacle sizes and contact points truthful, repeated floor travel tied to world distance, avoid fixed scenery looking like a collision object.
- [x] Keep text, colors required for color discrimination, reaction states and controls crisp/functional; fallback if art is unavailable. No game rule changes.
- [x] Verify active gameplay at mobile/desktop with screenshots, controls and deterministic state.

## 3. Fortune flow — bounded implementation
- [x] daily/tarot/character/chemistry: validate form and consent, then analysis dialog with character motion, actual progress/error handling, explicit enabled result button when ready. Do not imply remote AI computation or fabricate percentages. Prevent duplicate results and stale navigation; no forced long waits.
- [x] Result header pairs compact portrait/card with title and key takeaway (no invented fortune score) and real interpretation. Follow with readable sections/profile explanations and only then bottom Home/Again/Share/Compare actions. Existing history results must render safely.
- [x] Add unchecked use-consent with fields, purpose, retention, refusal consequence. Keep optional remember details separate; no prechecked required consent. Verify actual data path and keep birthday/time out of shared payloads.
- [x] Responsive layout, keyboard/focus/escape/reduced-motion/error/retry tests. No production records for testing.

## 4. Review and release — root
- [x] Independent spec/privacy/code review, fix material issues; existing regression tests plus meaningful dialog/privacy/layout tests.
- [x] Build, in-memory test server only (do not restart user4173), browser gameplay and fortune screenshots.
- [x] GitHub merge, Cloudflare deploy, read-only production assets/guides verification and release notes.

Reference: User supplied HOXY daily fortune screenshot and accessibility text provide section order, compact score header and bottom CTA. Direct web open of daily-fortune and tarot-reading was blocked by web safety, so do not retry via another route. Do not copy medical/supplement advice or claim scientific fortune accuracy.

## Added camera audit — user steering
- [x] Four traffic types × five separate front/side views and eight straight-rear player vehicles, depth-aware selection, natural image ratio and exact wheel-floor anchor.
- [x] Audit jump/sort/rhythm orientation; preserve appropriate front/side staging. Replace typing combat with 16 right-facing heroes and 25 left-facing monsters; keep collection portraits.
- [x] 89 production PNGs from 12 stored source images; chroma-backed tool outputs encoded to actual alpha, no painted checkerboards shipped. Artbook 615 entries.
- [x] All-four fortune portraits use standalone contained images; fix initial tarot intrinsic sizing and daily CSS-sheet clipping.
