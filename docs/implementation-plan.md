# 뒹굴 로컬 앱 Implementation Plan

> For agentic workers: use subagent-driven-development with one bounded games implementation task; root owns integration, persistence, content and final judgment. No re-delegation. The user approved the wireframe and explicitly authorized implementation and local execution.

Goal: turn the accepted mobile/wide-PC wireframe into a locally running app with 20 playable contents, actual results and persisted local records.
Architecture: browser ES modules and native CSS/Canvas, Node 24 local HTTP server, SQLite on local disk. No cloud account, deployment or paid API. Questions are versioned source data, not a separate question database.

## Chunk 1: shared contract and games

Files: public/js/games.js and public/css/games.css owned by game implementer. Other files owned by root.

Export `mountGame(container, id, {seed, onFinish})` from games.js. Supported ids sort, timing, color, reaction, typing, racing, memory, numbers, sequence. Return `{destroy(), getState(), advanceTime(ms)}`. onFinish receives `{value:number, display:string, unit:string, higherBetter:boolean, mode:string, details:object}`. value is ranking metric; timing value may be internal absolute error but never render that error to user. Details must include target and stoppedSeconds. No external calls. Seed controls random selection, so shared challenge same seed gives same conditions. All timers/listeners must clean up on destroy. Pause tab/game without counting hidden time. Hook getState includes active entities and positions; advanceTime deterministic. Container owns only its own contents; root owns header/results/routing.

Rules:
- sort: 10 seconds, queue of blue/white original characters; blue left, white right. Wrong input temporarily locks 200ms; correct increments; keyboard and touch. Render queue and outgoing animation like quick sorting reference, no copied assets.
- timing: integer target 1..10 chosen from seed. Hidden running clock (to estimate), start/stop, final stopped time exactly 2 decimals. No displayed delta. Timeout 15s. Same target subgroup in rankings.
- color: stages 2x2 twice, 3x3 four times, 4x4 four times, 5x5 six times, 6x6 eight times then 7x7; progressive smaller color difference, 30 sec total, wrong click removes 1 second. Correct tile position randomized. Score correct count.
- reaction: click prepare, red wait random 1.5..4.5s, green click records ms. Early tap retry without counting valid round; 5 valid rounds final average/best. No unsupported population percentile.
- typing: original Korean short phrases fall in brick-shaped blocks, type exact phrase and Enter removes oldest matching block, Korean IME compatible. Floor collision game over; spawn/speed rise. Mobile keyboard works. Pause button available. No 30-second hard stop; renamed 문장 벽돌.
- racing: 3 lane endless top-down driving, arrows/touch/swipe shift lanes, increasing speed, obstacle collision ends, collect coins, distance score; original drawn graphics.
- memory: grid flashes a growing set for 1.2s, select memorized cells, 3 misses end, score correct completed rounds.
- numbers: shuffled 1..25, touch ascending, show next target, elapsed result after 25, lower better; wrong tap penalty.
- sequence: 4 pads flash a growing sequence then user repeats; wrong pad ends, completed sequence length score.

Steps: [x] implement game module [x] test state boundary rules [x] integrate shell [x] browser input/screenshot testing via develop-web-game client.

## Chunk 2: server, content and UI

Root files: server.mjs; public/index.html; public/js/app.js, catalog.js, quizzes.js, profiles.js; public/css/app.css; tests/server.test.mjs, browser.cjs.

Catalog 20: 9 games, 3 quizzes (knowledge with general/capitals/flags/mix; guess with drama/anime/game; IQ-style 20), 4 personality (shop, energy, chat, taste), 4 fortune (tarot, daily, character, chemistry).

Keep previous navigation home/explore/rankings/me. Main area max 1440px, responsive 2/3/4 cards, wide desktop aside. Home recommendation based on local play counts with fixed nav.

Actual quiz question choices/explanations and deterministic selections; answer-based test results. IQ-style original items covering numerical, matrix, spatial and deductive patterns; no claim of standardized IQ score.

Profile name/date/calendar/time unknown input before personality/fortune; birth data stays browser memory unless explicit save-on-device checkbox. Calendar calculation library may run browser-side. Personality depends on answers; profile enriches companion character, not scientific prediction. Tarot 22-card choice and theme; daily based on date. Comparison shares only derived profile/result, never DOB/time. Actual local share token server and recipient flow.

Local SQLite profiles (random device token + salted PIN hash + recovery secret), records, groups/membership/scope links, shares. Read rankings public, friend-only membership gate, owner-only exclude/rotate/delete, own record delete. PIN alone never login. Basic input/range/mode checks; browser game scores not cheat-proof and local version must say no public launch readiness.

Steps: [x] data tests first [x] implement server validation/auth/scope deletion [x] implement UI/content/result handlers [x] persist local records and shared flows [x] test two browser clients and restart persistence.

## Chunk 3: delivery verification

[x] run automated rule/API checks [x] run game client per key game class with screenshots/state [x] mobile/PC route checks [x] inspect gameplay screenshots [x] review spec then code defects [x] fix failures [x] keep local server running and open app [x] README with one-command startup and limitations; user final with localhost link.

### Ranking contracts clarified after review
- World and country filter; Korea 시·도/시·군·구; content, mode, device, week/all filters. Display actual participants and self-selected country/region.
- Separate group-only withdrawal, leave group, owner exclusion, group deletion, original record deletion. Group actions preserve public rows; original deletion removes all linked scopes. Verify with two cookie clients.
- Store explicit preferred scope and last manual scope locally. Explicit > last manual > world. Challenge/group links never overwrite preference.
