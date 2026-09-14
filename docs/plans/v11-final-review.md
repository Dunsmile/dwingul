# V11 final independent review

검토 기준은 `docs/plans/2026-09-14-play-polish-v11.md`이며, 이번 검토에서는 제품 소스를 수정하지 않았다. 로컬 `4174`와 메모리·임시 SQLite만 사용했고 `4173` 및 운영 데이터에는 접근하지 않았다.

## 발견 사항

### P2 — 앱 푸터에 공통 문의 이메일이 직접 노출되지 않음 — 검토 중 수정됨

- 최초 상태의 `public/js/app.js:33`은 `/contact/` 링크와 제휴용 `mailto:` 하나만 제공했다. 계획 1절은 앱에도 공통 이메일과 제휴 메일 링크를 함께 요구하며, `tests/v11-responsive-browser.mjs:32`도 두 `mailto:` 링크를 검사한다.
- Chromium에서 홈을 열어 확인한 값은 `mailtoCount: 1`이었고, `node tests/v11-responsive-browser.mjs`는 32행에서 실패했다.
- 검토 중 루트가 문의·제안 링크를 `mailto:poilkjmnb122@gmail.com`으로 바꿨다. 같은 브라우저 검사를 다시 실행해 115개 레이아웃이 모두 통과했다.

### P2 — 과거 V9 리듬 기록 이름이 다른 게임 이름으로 표시됨 — 검토 중 수정됨

- 최초 상태의 `public/js/app.js:112`는 `rhythm-endless-v9`를 `리듬 릴레이 · 무한 모드`로 먼저 반환했다. `public/js/game-options.js:24`의 보존된 정식 이름은 `무한 리듬 · 100가지 패턴`이고, `리듬 릴레이`는 V7 모드다.
- 이 분기는 `gameModeNames` 조회보다 앞에 있어 과거 V9 개인 기록과 랭킹 필터 모두 잘못 표시했다.
- 검토 중 루트가 해당 특례를 제거했다. 현재는 `gameModeNames`가 V9/V7/V11 이름을 각각 반환한다.

### P2 — 완성된 PNG 패키지를 우회하는 내부 게임 이미지 4곳 — 검토 중 수정됨

- 최초 상태의 `public/js/rhythm-game.js:84,91` 안내 캐릭터와 플레이어, `public/js/city-racing.js:14` 터치 부스터, `public/css/world.css:49` 기억판 별이 레거시 SVG를 직접 기본 이미지로 사용했다.
- 생성된 `/assets/pixel/illustrated/personas/{10,4}.png`와 `/assets/pixel/illustrated/world/{boost,star}.png`는 이미 존재했고 V11 manifest와 파일 검증도 통과했다. 4174 리듬 DOM에서도 SVG `src`가 확인돼, 미완성 원화 문제가 아니라 소비 경로 연결 누락으로 판정했다.
- 검토 중 루트가 네 경로를 PNG 기본으로 바꿨다. 이미지 요소는 기존 SVG를 오류 대체 경로로 유지하고, CSS 배경은 PNG를 직접 사용한다. 수정 후 반응형 115개 화면과 리듬 실제 입력 검사를 다시 통과했다.

P1 수준의 실행·데이터 손상 문제는 발견하지 못했다.

## 데이터와 버전 검토

- 캐릭터 구매와 장착은 `atomic()` 안에서 처리되고, 중복 구매는 소유권을 먼저 확인해 추가 차감 없이 같은 전체 프로필을 반환한다. 16개 캐릭터 메타데이터에는 전투 수치가 없다.
- 기존 `rpg_profiles`는 `selected_character` 기본값을 추가하면서 골드·장비·스테이지를 유지한다. 유효하지 않은 선택은 무료 기본 캐릭터로 해석한다.
- 실행 설정은 서버가 선택 캐릭터와 장비를 확정하고, 앱의 `gameContextSettings()`가 두 값을 전투 생성기까지 보존한다. 공유·친구방에서는 장비를 0으로 만들면서 각 플레이어의 선택 캐릭터만 유지한다.
- 스냅샷 테이블 순서는 `rpg_profiles` 다음에 `rpg_characters`를 가져온다. Durable Object SQLite 메모리 재현에서 같은 사용자 ID, 골드 777, 선택 캐릭터와 소유권 행을 함께 가져왔고 응답은 200이었다.
- 최근 플레이는 `activity:${user.id}`와 `history:${user.id}`를 합쳐 최신 시각으로 중복 제거한다. 실행 생성이 성공한 뒤에만 시작 활동을 기록하고 완료 결과는 별도 이력으로 유지한다.
- 현재 리듬과 점프는 V11 생성기로, V9 리듬과 V6/V5 점프는 동결 생성기로 라우팅한다. 시작할 수 없는 V7 리듬·V4 점프는 명시적으로 거부한다. 서버는 새 기록의 모드를 실행 설정에서 다시 산출한다.

## 검증 증거

- `npm test`: 199개 통과, 실패 0.
- `node tests/v11-responsive-browser.mjs`: 320/390/768/1440/1920 너비의 홈·둘러보기·21개 상세 등 115개 레이아웃 통과. 최근 순서, 푸터 링크, 히어로 글꼴, 차량 8종 순환, RPG와 아트북도 포함한다.
- `node tests/rpg-v11-browser.mjs`: 16개 수집 화면, 구매·장착 이벤트, 선택 영웅, 25번째 종족, 접힌 상세 HUD와 실제 입력 통과.
- `node tests/rhythm-jump-v11-browser.mjs`: 실제 키보드·포인터 입력, 가이드/카운트다운 입력 차단, 세 방향 판정, 점프 이동 축과 모바일 overflow 통과.
- `node tests/web-game-client.mjs`를 리듬·점프·RPG 각각 실행했다. 세 게임 모두 상태 JSON과 화면을 만들었고 브라우저 오류 파일은 생성되지 않았다.
- `node --check public/js/app.js server/api.js workers/import-snapshot.js scripts/build-illustrated-art.mjs scripts/build-artbook.mjs`와 `git diff --check`: 오류 없음.
- V11 아트북/manifest 집중 테스트는 35개 통과했다. 현재 최종 파일은 몬스터 25/25, 캐릭터 16/16, 차량 8/8, 장비 312/312가 모두 서로 다른 바이트 해시를 가진다.

검토용 실행 결과는 `output/play-polish-v11/responsive-art-report.json`과 `output/play-polish-v11/review-client-{rhythm,jump,rpg}/`에 있다.
