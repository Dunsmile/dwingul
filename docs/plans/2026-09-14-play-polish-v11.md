# 뒹굴 플레이·탐색·원화 개선 v11

> For agentic workers: use subagent-driven-development for bounded independent game tasks. Main agent owns synthesis, integration, final checks and deployment. User authorized autonomous design and execution.

**Goal:** Make returning to a recent game effortless, improve four game experiences, and replace flat production art with the illustrated woodland style.

**Architecture:** Keep the current app, shared profile and Cloudflare SQLite Durable Object. Preserve historical game rules and records with explicit versions; add new purchases atomically to existing profiles. Gameplay validation stays deterministic on client/server. Use new local raster artwork with safe fallbacks and a reproducible manifest.

**Tech stack:** Vanilla JavaScript/Canvas, SQLite, Node tests, Playwright, Cloudflare Workers, image_gen plus image encoding.

## 1. Home, contact and search — main
- [x] Hero text only: use readable system Korean sans; preserve other pixel typography.
- [x] Common email contact poilkjmnb122@gmail.com, mailto partnership link, © 2026 DWINGUL on app and all static pages.
- [x] Account-scoped recent activity sorting, deduplicate services; home primary row and explore newest first, stable fallback for unplayed services. Record starts without pretending incomplete play is a finished result.
- [x] Unique service title/description, crawlable canonical pages, rich content and useful schema, category internal links, image/sitemap metadata. Audit stale gameplay claims, sitemap and noindex boundaries. Search visibility is not guaranteed.
- [x] Context clues for all 300 initial-letter questions without answer leakage or changing legacy scoring.

## 2. City driving — bounded game worker
- [x] 8 vehicles total: existing 3 plus 5 with clear balanced fuel/speed/boost/armor tradeoffs and token prices. Preserve owned cars and old runs.
- [x] New rules: fuel is health, collision -10 by default with cooldown and one hit per overlap; armor mitigation; drain .5/s (was 2), pickup density ×1.5. Fuel exhaustion ends run.
- [x] Distinct boost duration and deterministic proc chance where described. Explain exact stats before purchase and use same simulation on server.
- [x] More upright rear three-quarter illustrated vehicle sprites and road projection, contact point/length stay honest.
- [x] Versioned replay and tests for damage, cooldown, pickups, economy and recoverability; mobile/PC controls.

## 3. Jump and rhythm — bounded game worker
- [x] Unify floor/object travel on one world distance; increase obstacle density as speed increases, while keeping feasible jump/slide transitions.
- [x] Reproduce countdown/key/lane rhythm issues. Clear explicit input contract for Space/Enter and lanes, input disabled during guide/countdown, exact lane timing, no double handling.
- [x] Woodland play UI, new rule versions where scoring changes, deterministic regression tests and real browser inputs.

## 4. Typing RPG — bounded RPG worker
- [x] 16 selectable existing woodland identities, first free and others purchasable with earned gold. Cosmetic collection tiers, no character stats for fair records.
- [x] Atomic ownership/equip, no double charges, profile recovery and current gear/gold retained. Selected portrait rendered in combat.
- [x] Compact combat HUD: stage/gold, HP/MP, enemy, input and attack; extra statistics in optional details/results.
- [x] 25 visually distinct monster species (not five recolors). Root supplies rich raster species assets. Boss progression remains reproducible.
- [x] Unit/API purchase tests, UI and input validation.

## 5. Illustrated asset package — main
- [x] Audit current SVG and CSS artwork; generate illustrated source atlases/portraits for equipment, characters, enemies, cars, tarot and utility assets; preserve all catalogue IDs.
- [x] Produce local transparent PNG/WebP assets, correct cropping and resolution; wire gameplay/cards/artbook to final assets. Simple bars and interactive controls remain HTML for readability/accessibility.
- [x] Manifest includes complete production art, previews and original links. Store prompts and reproduction instructions, no external runtime image dependencies.

## 6. Verification and release — main
- [x] Use isolated in-memory QA DB on 4174 only. Do not restart or reset the user's 4173 DB. No test records on production.
- [x] Meaningful tests of new behavior, old replay/profile regressions, 320/390/768/1440/1920 responsive checks, official web-game client inputs and screenshot inspection.
- [ ] Independent spec/code review, fix material findings, build and deploy after verification. Public read-only checks and GitHub release notes.

References: user supplied Naver vehicle design URL and Newdaily camera reference. Official Google Search Central starter guide informs SEO changes. External artwork is reference only, not copied into the product.
