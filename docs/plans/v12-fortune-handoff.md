# V12 fortune UX handoff

## Implemented scope

- Daily, tarot, character, and chemistry forms now show an unchecked required use-consent separately from the unchecked optional remember control.
- The disclosure states the actual data flow: raw birthday/time are saved only when remember is selected; derived character, element, pillars, and interpretation remain in recent personal history (up to 100), and configured profiles synchronize that history to the server until the user clears it.
- Fortune calculation remains local. A modal labels the work as local, uses a short character animation, exposes a disabled result action while working, enables an explicit `결과 확인하기` when ready, and has close/Escape, retry, focus, stale-route cancellation, and reduced-motion behavior.
- A result is committed to history only after explicit confirmation. The analysis controller exposes a result once, which prevents duplicate confirmation/history writes.
- Fortune results use a compact portrait/card header with date, name, element, title, and the first real interpretation as the takeaway. Ordered interpretation blocks and derived birth information follow. Home, replay, share, and chemistry compare actions appear after the reading.
- Legacy fortune history tolerates missing sections and profile fields and does not rerun analysis.

## Data behavior verified in source

- `birthFromForm` creates the one-off raw profile in browser memory.
- The optional `remember` branch writes raw birth details to local profile storage for guests or `/api/profile/birth` for configured users.
- `finish` calls `addHistory`; stored fortune results include derived `birth` content (name, pillars, element counts and interpretation fields) but no original birthday, calendar, or time.
- `share` uses an explicit payload allowlist and excludes `birth`, `birthday`, `calendar`, `time`, and pillars.

Recommended policy wording: “생일·시간 원문은 기억하기를 선택한 경우에만 저장합니다. 파생된 캐릭터·오행과 해석 결과는 이 브라우저의 개인 이력에 최대 100개 보관되며, 프로필 사용자는 서버 개인 이력에도 보관됩니다. 개인 이력을 지우면 삭제됩니다.”

## Files

- `public/js/app.js`
- `public/js/profiles.js`
- `public/js/fortune-analysis.js` (new)
- `public/js/fortune-results.js` (new)
- `public/css/fortune.css` (new; linked from `public/index.html` during integration)
- `tests/fortune-v12.test.mjs` (new)
- `tests/fortune-v12-browser.mjs` (new)
- `docs/plans/v12-fortune-handoff.md` (new)

## Verification

- `npm test`: 204 passing.
- `DW_TEST_URL=http://127.0.0.1:4176 node tests/fortune-v12-browser.mjs` against a dedicated in-memory server: passes eight complete flows (daily/tarot/character/chemistry at 390 and 1440), guest/configured remember off/on retention, the actual share request allowlist, route-away cancellation while working and ready, rapid double confirmation with delayed history sync, and forced analysis-reader 404 fallback under real response headers.
- The same run verifies the title, image, and first interpretation enter the first fold; all primary actions follow interpretations and pillars; tarot art stays inside its compact frame; no horizontal overflow occurs. It writes a structured report to `output/fortune-v12/fortune-browser-report.json` and 24 screenshots beside it.
- `node --check public/js/app.js`: passes.

## Integration notes and remaining checks

- The production `analysis-reader.png` is expected at `/assets/pixel/scenes/analysis-reader.png`. The UI falls back to existing illustrated persona 8 if it is absent.
- Existing older ad-hoc browser scripts that submit a fortune form directly must check `useConsent` and click `결과 확인하기`; the npm test suite is unaffected. Update those scripts if they remain in the release gate.
- The analysis failure path is covered at controller level. A browser-level forced calculation failure is not practical without a test-only hook and was intentionally omitted.
- The form privacy link opens the static `/privacy/` page. Align the source policy in `scripts/build-site.mjs` with the wording above before release.
