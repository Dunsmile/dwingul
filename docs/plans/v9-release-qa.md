# V9 responsive release QA

Date: 2026-09-14

## Result

The scoped browser release checks pass after the two issues found during QA were corrected. There are no open P0, P1, or P2 findings in this test scope.

The final automated run completed 115 route renders and 13 interactive game checks with:

- no horizontal overflow at the document root or in individual visible elements;
- no uncaught page errors or console errors;
- no local HTTP responses with status 500 or higher;
- correct scroll preservation for same-page updates and reset to the top for page navigation;
- a visible, usable mobile action after the typing game reaches its result state.

## Environment and boundaries

- Isolated local Node server: `http://127.0.0.1:4174`
- Database: in-memory test database (`DW_DB=:memory:`)
- Browser: headless Chromium through Playwright
- Viewports: 320x568, 390x844, 768x1024, 1440x900, and 1920x1080
- Production, the preserved local server on port 4173, external applications, and external accounts were not accessed.
- The ticket-dependent local transfer UI was outside this pass and is being validated separately.

## Coverage

At each of the five viewports, the test rendered the home page, explore page, and all 21 content detail pages. Each render checked the expected content title, error-page absence, horizontal overflow, browser errors, and server failures.

The profile flow created a profile through the form. The history flow stored and rendered a private result. The ranking flow stored and rendered a V9 score with its unit, exercised the sequence filters, and checked that unrelated sort-mode controls were absent.

The following games were started and operated with both desktop keyboard input and mobile on-screen controls:

- reaction;
- racing;
- jump;
- sequence;
- typing;
- sort, which covers the left/right control pattern.

The typing test also advanced to game over at 390px and verified the exact `홈으로 가기` link in the result card.

Scroll checks recorded:

- profile submit: 297px before and 297px after;
- ranking filter submit: 305px before and 305px after;
- history result navigation: 0px;
- cross-page navigation: 0px;
- explore category update: 0px before and 0px after.

## Findings resolved during QA

### P1 — Content Security Policy blocked the Google Fonts stylesheet

Every page initially logged a CSP error because the application stylesheet imported a Google Fonts URL while `style-src` allowed only local and inline styles. The remote import was removed. The final five-viewport sweep has zero console errors.

### P2 — Sequence rankings exposed an unrelated sort game-mode control

The sequence ranking page initially showed the sort-specific `20초 모드 / 무한 모드` control and submitted `gameMode=sprint`. The extraneous control was removed. The targeted sequence filter check and full rerun now pass.

A stale isolated server process also produced temporary `/api/launch-transfer` 404 responses during setup. Restarting port 4174 from the current source removed them; this was test-environment drift rather than a release-source defect.

## Visual inspection

The screenshots were inspected at rendered size. The wide home page remains balanced and readable. Racing keeps its HUD, track, and controls clear at desktop and mobile widths. Sequence fits its rhythm HUD and tap controls at 390px. The 320px typing view keeps the phrase, input, and attack action usable without horizontal clipping; supporting instructions continue below the fold. The 390px typing result keeps the result score and both main actions visible above the mobile navigation.

Evidence:

- `output/playwright/v9-release/homepage-1920.png`
- `output/playwright/v9-release/game-racing-1440.png`
- `output/playwright/v9-release/game-racing-390.png`
- `output/playwright/v9-release/game-jump-390.png`
- `output/playwright/v9-release/game-reaction-390.png`
- `output/playwright/v9-release/game-sequence-390.png`
- `output/playwright/v9-release/game-sort-390.png`
- `output/playwright/v9-release/game-typing-320.png`
- `output/playwright/v9-release/game-typing-result-390.png`

## Reproduction

Run the isolated local application on port 4174 with an in-memory database, then run:

```sh
node tests/v9-release-browser.mjs
```

The machine-readable result is written to `output/playwright/v9-release/report.json`. The final result was `passed: true`, with 115 route checks, 13 game checks, and an empty findings list.

## Remaining test limits

This pass used desktop Chromium emulation. It does not replace a short check on physical iOS Safari and Android devices, especially for software-keyboard resizing during typing. The ticket-dependent transfer UI also remains covered by its separate validation path.
