# v13 play experience implementation plan

Goal: implement the user's corrected test semantics, retire sequence, step runner difficulty every 10 active seconds, rear-only traffic, opaque memory preview, integrated RPG HUD, and measured image-loading improvements.

Architecture: retain old persisted results/replay modes. Active catalog and routing retire sequence without deleting user records. New jump rules receive v13 mode and frozen v11 replay. RPG changes are presentation only. Media changes preserve stored original art and use reproducible delivery variants; preload only current-game essentials with an explicit loading gate before starting its clock.

Authorized design: use the user's supplied RPG placements within existing pixel palette. Desktop three HUD columns above duel actors and bottom input; mobile same hierarchy with adequate text and keyboard space. Teto/egen uses directness/initiative vs sensitivity/empathy with original questions, clear complementary percentages and named outcome. No new birth requirement.

## Independent implementation chunks
- [x] Root: investigate delivery waterfall and byte sizes; retire sequence from active discoverability/new runs; retain record viewing; add loading gate and measured delivery optimization.
- [x] Game tuning: freeze v11 jump, v13 difficulty = floor(activeSeconds/10); increase target obstacle count per time window by one and speed by step with safe spacing. Fix memory preview opacity. Rear-only vehicles preserve collision geometry.
- [x] RPG: integrate player/monster HUD and input into one scene using reference placement, test attack/heal/IME, mobile keyboard and all viewports.
- [x] Energy: TestMoa reference review, original teto/egen question+result scoring with versioned sharing/history compatibility.
- [x] Focused failing regression checks before fixes; independent review of implementation and semantics.
- [x] Root: full tests/build sequentially; official game client and screenshots; responsive browser checks and cold asset measurements (warm-cache speed is not claimed).
- [ ] GitHub PR, merge, Cloudflare deployment and production read-only verification. No modifications to production database or user port4173.

Latest user instruction supersedes prior one-lane rhythm plan: delete the game, do not continue rhythm implementation.
