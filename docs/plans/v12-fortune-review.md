# v12 fortune independent review

Reviewed `app.js`, `profiles.js`, `fortune-analysis.js`, `fortune-results.js`, `fortune.css`, both `fortune-v12` tests, and the handoff. Root-owned CSS linking and static privacy-source work were treated as pending integration and are not findings.

## Findings

### Resolved — Analysis portrait fallback under the deployed CSP

The earlier P2 is fixed. `public/js/app.js` now emits `data-decorative-image` and `data-fallback-src="/assets/pixel/illustrated/personas/8.png"` with no inline event handler. The capturing `error` listener in `public/js/art.js` recognizes the image and swaps the source without violating `public/_headers` (`script-src 'self' ...`).

The expanded browser test now forces `/assets/pixel/scenes/analysis-reader.png` to return 404 and requires the persona fallback to load visibly. This directly covers the former failure mode under the real CSP.

No open P1 or P2 fortune finding remains from this review.

The completed flow meets the material v12 requirements:

- Daily, tarot, character, and chemistry require an initially unchecked use-consent. Remember is a separate unchecked choice.
- Daily/character/chemistry enter local analysis after form validation; tarot enters it after the consented form and required card choice.
- The dialog describes local browser work, exposes no fabricated percentage, has a disabled result action while working, a real ready state, error/retry, Close/Escape, focus placement, and reduced-motion styling.
- `render()` cancels the active controller before incrementing `routeToken`; the controller also checks its captured route before publishing readiness. Browser navigation therefore cannot produce late result navigation or a history write.
- `take()` exposes a ready result once. The click handler clears the controller before awaiting `finish()`, so repeated confirmation cannot commit the same analysis twice.
- Cancel/close clears the controller and unlocks the tarot selection state. No result is passed to `finish()`, so no history is written.
- `finish()` remains the single history-commit boundary. Fortune analysis computes in memory, and explicit result confirmation is what reaches `addHistory()`.
- Retention disclosure matches the implementation: raw birthday/calendar/time live in `ctx.profile` and are persisted only through the independent Remember branch; the saved result contains the derived `birth` object and interpretation and is kept in guest local history or synchronized personal history for configured profiles.
- `share()` constructs an explicit field allowlist. It includes name/title/display/element and other generic public result fields, but cannot include `birth`, pillars, birthday, calendar, or time through object spreading.
- Fortune results use the compact header, interpretation-first order, safe empty-section fallback for old history, and bottom Home/Again/Share/chemistry Compare actions.

## Concrete verification performed

On isolated port 4174, I completed character, tarot, and chemistry flows with consent and confirmed each went through the enabled analysis confirmation before rendering. Character and chemistry produced the derived character title and three interpretation blocks; tarot produced the selected card title and its three interpretation blocks. No production server or database was touched.

## Test coverage gaps (release-hardening, not P1/P2 findings)

The implementation is stronger than the current automated coverage in several places. These should be added to the release gate because they protect the specific privacy/lifecycle contract:

1. Browser-test tarot and chemistry through confirmation. The current browser suite completes daily and cancels character, but does not prove the two remaining flows use the dialog or that tarot unlocks after cancellation.
2. Intercept `/api/shares` and assert the request body recursively excludes `birth`, `pillars`, `birthday`, `calendar`, and `time`; also assert the allowed derived `element` remains intentional.
3. Inspect guest local history and configured `/api/profile` history after Remember off/on. Assert raw birth fields are absent from result rows, derived birth interpretation is present, raw profile birth is written only when Remember is checked, and one confirmation adds exactly one row server-side as well as locally.
4. Add a navigation test that changes the hash during the working delay and another from the ready dialog, then waits beyond 850 ms and verifies no result/history mutation.
5. Add a rapid repeated confirm test around the async history request. The controller unit test proves `take()` is one-shot, while a browser/network test would preserve that property across event handling.
6. Add browser-level failure/retry coverage by injecting a failing calculator through a narrow test seam. Unit coverage verifies the controller, but not dialog copy, focus, retry button replacement, or successful commit after retry.
7. Update older browser scripts that submit fortune forms directly; several still omit `useConsent` and expect `.result-card`, so they will fail or wait on the wrong selector once included in a broad release run.

## Minor observations

- `cancelFortuneAnalysis()` closes the dialog after nulling the controller, so the subsequent `close` listener does not set `ctx.locked=false`. This is harmless on route navigation because `startContent()` replaces `ctx`; user-driven Close/Escape still unlocks through their own listeners. It does not currently reproduce as a defect.
- The analysis “progress” is a truthful indeterminate busy state rather than measured progress. That is appropriate for the synchronous local calculation and avoids the prohibited fabricated percentage.
