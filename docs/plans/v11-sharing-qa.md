# v11 공유·친구방 API QA 인계

## 검증 범위

- 최신 게임 규칙
  - 따라해 뒹굴: `{ "version": "v11", "mode": "rhythm" }`
  - 점프: `{ "version": "v11" }`
  - 도심 질주: `{ "version": "v7", "car": "basic" }`
- 방장이 만든 친구방에 다른 세션이 참여한 뒤, 두 세션 모두 방의 동일한 시드와 설정으로 실행되는지 확인했다.
- 도전 공유를 다른 세션이 열고 실행할 때 공유의 동일한 시드와 설정이 유지되는지 확인했다.
- 직접 실행, 새 친구방, 새 도전 공유에 명시한 이전 버전이 모두 400으로 거부되는지 확인했다.
- DB에 남은 이전 버전 및 무버전 친구방/도전 공유가 최신 규칙으로 자동 변환되지 않는지 확인했다.
- 과거에 시작된 도심 질주 v6 실행은 보관된 v6 엔진과 실제 입력·경과 시간으로 재생해 정산하고, 같은 실행의 두 번째 정산은 중복 지급하지 않는지 확인했다.

검증은 모두 `createApp({ dbPath: ':memory:' })`의 임시 SQLite와 운영체제가 배정한 임시 포트를 사용한다. 최신 친구방·공유 테스트는 실행 생성까지만 확인하며 임의 점수를 기록하거나 랭킹에 게시하지 않는다. 과거 도심 질주 정산만 고정 시드 엔진이 만든 입력, 시간, 코인, 거리, 종료 사유를 그대로 제출한다.

## 호환성 결론

- 새 실행은 현재 버전만 시작한다. 이전 버전을 명시한 직접 실행, 친구방 생성, 도전 공유 생성은 거부한다.
- 저장된 이전 버전 친구방과 도전 공유도 시작을 거부하므로, 예전 초대가 최신 규칙 점수로 섞이지 않는다.
- 이미 완료한 리듬 v9, v7 및 무버전 nine-pad 기록은 각각 `rhythm-endless-v9`, `rhythm-relay-v7`, `nine-pad` 모드로 남고 최신 `rhythm-three-lane-v11` 랭킹과 분리된다.
- 레이싱 v4~v6 실행은 각각의 보관 엔진으로 서버 재생한다. v6 회귀 테스트는 실제 입력 순서, 경과 시간, 결과 일치 및 정산 멱등성을 확인한다.
- 리듬과 점프의 일반 기록 API는 과거 엔진 입력을 서버에서 재생하지 않는다. 저장된 실행의 버전으로 모드만 고정해 랭킹을 분리한다. 이 문서는 그 동작을 호환성 특성으로 기록하며 서버 검증이 존재한다고 주장하지 않는다.

## 소스 수정 사항

초기 QA에서 `server/api.js`가 이전 버전을 명시한 새 친구방과 새 도전 공유를 받아들이는 문제가 드러났다. 다음 방어가 반영됐다.

- 새 친구방 생성 시 현재 버전과 다른 `gameSettings.version`을 거부한다.
- 새 도전 공유 생성 시 현재 버전과 다른 `payload.gameSettings.version`을 거부한다.
- 실행 시 콘텐츠별 하드코딩 대신 `gameSettings(content).version`과 비교한다.

추가 QA에서 저장된 점프·레이싱 친구방의 `game_settings`가 `NULL`이거나 도전 공유 payload에 `gameSettings`가 없는 경우 최신 규칙으로 자동 변환되는 경계도 발견했다. 새 친구방에는 현재 설정을 명시적으로 저장하고, 저장된 친구방·도전 공유에서 버전이 누락되거나 현재 버전과 다르면 실행을 거부하도록 반영했다.

## 테스트

- `tests/v11-sharing-api.test.mjs`: 최신 친구방/도전 공유, 이전 규칙 생성·실행 거부, v6 레이싱 재생 정산
- `tests/cloudflare-v9.test.mjs`: Worker 호환 API의 현재 v11 및 리듬 v9/v7/nine-pad 분리
- `tests/profile-v9-integration.test.mjs`: 현재 리듬 모드와 이전 모드 이름
- `tests/rhythm-integration-v7.test.mjs`: 현재 친구방과 이전 리듬 기록/초대 경계
- `tests/server.test.mjs`: 기존 규칙 기록과 현재 규칙 기록의 랭킹 분리

집중 검증 명령:

```sh
node --test tests/v11-sharing-api.test.mjs tests/cloudflare-v9.test.mjs tests/profile-v9-integration.test.mjs tests/rhythm-integration-v7.test.mjs tests/server.test.mjs
```

최종 결과는 18/18 통과다. 전체 `npm test`에서는 공유·버전 관련 테스트를 포함해 196개가 통과했고, 별도 아트북 산출물의 버전 문자열과 누락된 `illustrated/world/book.png`를 확인하는 `tests/world-art.test.mjs` 두 건만 실패했다. 두 실패는 이 QA 범위의 API 또는 테스트 변경과 무관하다.
