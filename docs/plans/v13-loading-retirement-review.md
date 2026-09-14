# v13 loading and retired-content review

Reviewed the current working tree on 2026-09-14. Scope was `asset-delivery.js`, `game-assets.js`, `birth-calendar.js`, the related route/form paths in `app.js`, retired-content endpoints in `server/api.js`, the delivery builder, and catalogue/search/static-site discovery. Pending integration counts and the bus asset builder were excluded as requested. No source or database was changed for this review.

## Material findings

### P1 — a delayed birth-calendar load can resume on a different route

The `birth-form` submit handler mutates shared `ctx`, then awaits `ensureBirthCalendar()` without capturing or checking `routeToken` (`public/js/app.js:209`). `render()` only cancels the fortune-analysis object; it cannot cancel the script promise (`public/js/app.js:164`). If the user leaves while `/js/lunar.js` is delayed, the old handler resumes in the new route. It can write remembered birth data, PUT the profile birth, or call `beginFortuneAnalysis()`. The latter captures the *new* route token and can therefore open a fortune dialog over the unrelated page.

Reproduction: delay `/js/lunar.js`; submit a valid fortune birth form with consent (and optionally Remember); navigate Home before releasing the script; then release it. Assert that the new route receives no dialog, local birth write, or `PUT /api/profile/birth`. The same stale-submit pattern is present in `unified-profile-form` and `profile-birth-form` (`public/js/app.js:210-211`). Capture the route/form identity before the first await and recheck it after every await that precedes a mutation or navigation.

### P2 — leaving while a run is created produces an orphan run

`startContent()` captures the route token, but it performs share/group reads and `POST /api/runs` before its first token check (`public/js/app.js:98-101`). A route change during a slow response prevents the game from mounting, but the accepted request still creates a run. This inflates run/activity state and leaves a run that the client can never finish.

Reproduction: intercept `POST /api/runs`, let the server commit while delaying the response, navigate Home, then release the response. Assert that no game mounts (currently correct) and inspect that the run count nevertheless increased. Check the token immediately before the POST and pass an abort signal through `api()` for requests not yet accepted. To eliminate the post-accept race, create the run after the required art is decoded, or introduce an explicit server-side start/claim lifecycle.

### P2 — users can newly join retired game rooms

New group creation is blocked for retired content, but group preview and join only validate code/exclusion and do not check `byId(g.content)?.retired` (`server/api.js:96-97`). A surviving `sequence` room therefore accepts new members even though its game cannot start.

Reproduction: seed a legacy group whose content is `sequence`, call `POST /api/groups/preview`, then `POST /api/groups/join` as a new user. Both currently succeed and the latter inserts a membership. Keep preview read-only if archived room identification is useful, but return 410 from join and present the retirement message in the join UI.

### P2 — retired result shares are accepted but cannot be viewed

The share API rejects only retired `challenge` creation, so a new retired `result` share remains accepted (`server/api.js:99`). The client applies the retirement page to every share for retired content before inspecting its kind (`public/js/app.js:163`). Consequently the API can create a valid result-share URL whose historical result the recipient cannot see; existing pre-retirement result links are hidden the same way.

Reproduction: insert or create a `sequence` share with `kind: result`, open `#/s/{id}`, and observe the generic retirement page instead of the stored result. Choose one coherent contract: reject all newly created retired shares while rendering existing result shares as read-only archives, or intentionally permit result sharing and render the result without a replay action. Challenges and new-run links should remain blocked.

## Confirmed behavior

- Game time does not begin before required images decode. `prepareGameAssets()` awaits every `warmImage()`, and `mountGame()` is called only after that succeeds or the user explicitly chooses the procedural fallback (`public/js/app.js:85-103`). Route abort prevents the delayed mount.
- Failed or timed-out images are removed from the warm cache, so Retry makes a new request. Successful decoded images are reused. An aborted route leaves already-started warming in progress, but progress callbacks and mounting are suppressed; this is bounded by the per-image 15-second timeout.
- Catalogue, search metadata, ranking selectors, and static page generation use the active catalogue, so `sequence` is absent from new discovery. Direct historical records can still resolve their title through `byId()`, as intended.
- The delivery transform is content-addressed by source bytes plus encoder options and retains semantic PNG keys in the manifest. The new bus rear has a checked-in generator input (`design/scenes-v13/traffic-bus-rear-source.png`) and a deterministic production build step. No missing generated-source provenance was found in the reviewed v13 addition.

## Focused regression coverage to add with fixes

1. A browser test delaying `/js/lunar.js` and proving route departure prevents dialog, storage, and profile writes.
2. An API test with a seeded retired group proving preview behavior is intentional and join returns 410 without inserting membership.
3. An API/client pair covering the chosen retired-result-share contract separately from retired challenges.
4. A browser/API test delaying run creation and proving route departure leaves no startable or counted orphan run under the selected lifecycle.

## Resolution re-review — 2026-09-14

All four findings above are resolved in the reviewed working tree.

- Birth and profile submissions capture the route, user, and originating form. They recheck that identity after the calendar load and other asynchronous boundaries. A real-browser regression held `/js/lunar.js`, submitted a consented Remember form, navigated Home, and then released the script. The browser stayed Home with zero dialogs, zero remembered-birth rows, and zero profile-birth PUTs.
- Run creation now checks route identity around prerequisite reads and creation. A stale accepted response invokes the guarded cleanup endpoint; aborting at the art gate does the same. Browser regressions held an already accepted Sort response, navigated away, released it, and observed the owned untouched database row removed. A second race navigated directly into Jump: Jump mounted with `rulesVersion: v13`, the stale Sort row was removed, and Jump was the only remaining run, demonstrating that shared `ctx` was not contaminated.
- `DELETE /api/runs/:id` deletes only the requesting user's unfinished, untouched run. Focused API coverage proves cross-user deletion cannot remove it and proves RPG-progress, racing-reward, and finished rows survive owner cleanup requests.
- Retired group preview and join now return 410. A seeded legacy room retained exactly its original member after both calls.
- Retired result shares render as read-only archives. API coverage verifies the result payload remains readable; browser coverage verifies the archived score is visible and no `play/sequence` link is emitted. Retired challenges and new runs remain blocked.

Focused evidence:

- `node --test tests/loading-retirement-v13.test.mjs` — 2/2 passed.
- `node tests/loading-retirement-v13-browser.mjs` — passed on an isolated port 4178 in-memory server.
- Browser report: `output/loading-retirement-v13/report.json`.
- Screenshots: `output/loading-retirement-v13/stale-birth-stayed-home.png`, `rapid-route-jump.png`, and `archived-result-share.png`.
- `git diff --check` for the two focused regressions and this review — clean.

No further material loading, route-race, cache/fallback, retired-new-run, or archived-share issue was found in this focused re-review. The full suite and generated delivery bundle remain root-owned integration checks.
