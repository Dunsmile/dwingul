# V9 무한 리듬 인수인계

## 구현 범위

- `public/js/rhythm-engine.js`
  - V7의 `RHYTHM_RULES`, `createRhythmRounds`, `judgeRhythmOffset`, `createRhythmEngine`를 그대로 유지했다.
  - V9 전용 `RHYTHM_ENDLESS_RULES`, `createRhythmPatterns`, `judgeEndlessRhythmOffset`, `createRhythmEndlessEngine`를 추가했다.
  - 시드로 섞이는 100개 고유 패턴 덱을 모두 사용한 뒤 새 덱으로 계속 진행한다. 덱 경계에서도 같은 패턴이 바로 반복되지 않는다.
  - 96 BPM에서 시작해 10구간마다 4 BPM씩 오르고 136 BPM에서 멈춘다.
  - 매 구간 `listen → prepare(3·2·1) → respond` 순서로 진행한다. 응답 첫 목표는 응답 화면 진입 후 한 박자 뒤에 배치한다.
  - V9 판정 폭은 Perfect ±90ms, Good ±175ms다.
  - 에너지가 0이 되면 `gameover`에서 점수·에너지·플레이 경과 시간을 900ms 동안 고정하고, 이후 `finished`가 되어 결과를 반환한다.
  - 결과 모드는 `rhythm-endless-v9`다.
- `public/js/rhythm-game.js`
  - V9 엔진을 명시적으로 사용한다.
  - 무한 구간 HUD, 3·2·1 준비 화면, 첫 목표 한 박자 여유에 맞춘 응답 레일, 게임오버 정지 화면을 반영했다.
  - 입력 버튼은 응답 단계에서만 활성화된다. 키 반복 방지, 포인터 입력, 음소거, 일시정지와 오디오 정리는 기존 동작을 유지한다.
- `public/css/rhythm.css`
  - 준비 단계와 900ms 게임오버 정지 오버레이 스타일을 추가했다.
- `tests/rhythm-v9.test.mjs`
  - 패턴 100개 고유성·시드 재현, 판정 경계, 매 응답 전 준비 단계, 첫 목표 지연, 100패턴 이후 무한 진행, 136 BPM 상한, 게임오버 동결, 시간 분할 결정성을 검사한다.
- `tests/rhythm-v9-browser.mjs`
  - 1280×720, 390×844, 320×568에서 실제 3·2·1 표시, 입력 버튼 상태, 첫 목표 지연, Perfect 입력, 일시정지, 화면 범위, 900ms 게임오버 정지를 검사한다.

## 통합 담당 변경점

다음 파일은 이 작업 범위 밖이라 수정하지 않았다.

- `public/js/game-options.js`: `sequence`의 현재 설정을 V9로 바꾸고 `gameMode()`가 `rhythm-endless-v9`를 반환하게 한다. V7 설정은 `rhythm-relay-v7`, 이전 설정은 `nine-pad`로 계속 해석해야 한다.
- `public/js/catalog.js`: `currentGameModes.sequence`를 `rhythm-endless-v9`로 바꾸고 8라운드·45초 설명을 무한 100패턴·매 차례 3·2·1 설명으로 갱신한다.
- `public/js/app.js`: 결과 카드의 리듬 조건에 `rhythm-endless-v9`를 추가하고 완료 구간을 `/ 8` 없이 표시한다. 모드 표시 이름도 무한 리듬에 맞게 추가한다.
- `server.mjs`: 결과 단위를 강제하는 조건에 `rhythm-endless-v9`를 추가해 `점`으로 저장하고, 새 실행·친구방 V9 설정을 허용한다.
- 서버·통합 테스트: 새 실행과 친구방은 V9 모드, 기존 V7 및 `nine-pad` 기록은 각 모드로 그대로 조회·저장되는지 확인한다.

## 검증 결과

- `npm test`: 116개 통과.
- `node tests/rhythm-v9-browser.mjs`: 1280×720, 390×844, 320×568 통과, 브라우저 오류 0.
- 개발 게임 클라이언트로 실제 시작 화면과 `render_game_to_text`를 확인했다.
- 실제 플레이 및 게임오버 이미지는 `output/rhythm-v9/`에 생성했으며 커밋 대상은 아니다.
