# v13 테토·에겐 성향 테스트 인계

## 구현 결과

- `energy`를 기존 네 축 16유형 검사에서 하나의 테토↔에겐 연속선 검사로 분리했다.
- 테토는 직접 표현하고 먼저 움직이는 경향, 에겐은 감정과 분위기를 세심하게 살피는 경향으로 설명한다.
- 12개 자체 상황 문항을 새로 작성했다. 선택지의 좌우 위치는 테토 6회, 에겐 6회로 균형을 맞췄다.
- 결과는 상보적인 `테토력`과 `에겐력` 백분율을 항상 함께 보여준다. 6:6은 억지로 한쪽에 배정하지 않고 `테토·에겐 균형형`으로 표시한다.
- 강한/유연한 테토형, 균형형, 단단한/섬세한 에겐형의 다섯 구간으로 해석한다.
- 성별이나 신체 특성을 판정하지 않는 자체 오락 테스트라는 한계를 결과에 명시했다. 호르몬 측정 또는 MBTI 검사라는 표현은 사용하지 않았다.
- 입력은 기존과 같이 닉네임과 12개 선택뿐이며 `birth`는 `null`이다.

참고한 TestMoa 원문은 이 검사를 관계에서 보이는 반응과 선호를 가볍게 살펴보는 용도로 한정하고, 경험과 최근 감정에 따라 답이 달라질 수 있으며 정확한 궁합 판정이 아니라고 설명한다. 문항과 결과 문장은 참조 페이지에서 복사하지 않고 새로 작성했다.

## 버전과 이전 결과

- 새 결과의 명시 버전: `teto-egen-v13`
- 기존 `energy`의 명시된 `axes-v9` 결과는 `getPersonalityTestVersion`과 `isAxesV9PersonalityResult`에서 계속 인식한다.
- 답변 8개인 과거 결과는 계속 `legacy-v8`로 인식한다.
- 새 결과 객체는 기존 공통 필드인 `content`, `name`, `title`, `subtitle`, `sections`, `scores`, `answers`, `display`, `unit`, `personality`, `testVersion`, `sprite`, `birth`를 유지한다.

## 루트 통합 필요 사항

이 작업 범위 밖의 서버 allowlist 한 곳을 바꿔야 공유에서 새 버전이 보존된다.

`server/api.js`의 `safe.testVersion` 대입을 다음 의미로 확장한다. `axes-v9`는 그대로 보존하고, 콘텐츠가 `energy`일 때만 `teto-egen-v13`을 보존하며, 나머지는 기존처럼 `legacy-v8`로 처리한다.

```js
safe.testVersion = payload.testVersion === 'axes-v9'
  ? 'axes-v9'
  : data.content === 'energy' && payload.testVersion === 'teto-egen-v13'
    ? 'teto-egen-v13'
    : 'legacy-v8';
```

현재 `public/js/app.js`는 `r.testVersion`을 fallback보다 먼저 사용하므로 새 결과에는 추가 수정이 필요 없다. 새 결과가 항상 명시 버전을 넣으며, 기존 버전 없는 12답변 결과의 `axes-v9` fallback도 유지된다. 현재 결과 공유 payload에는 `scores`가 이미 포함되어 테토력·에겐력 두 값이 전달된다. 생일·시간·달력·사주 기둥은 이 검사 payload에 필요하지 않다.

## 집중 검증

다음 집중 검증에서 14개 관련 테스트가 모두 통과했다.

```sh
node --test tests/energy-v13.test.mjs tests/personality-v9.test.mjs tests/profiles.test.mjs
node --test --test-name-pattern='profile integration|private profile history' tests/profile-v9-integration.test.mjs
```

검증 범위는 문항 수와 선택지 위치 균형, 양 극단과 50:50 점수, 백분율 합계, 결과 용어, 금지된 신체·호르몬 주장, 입력 검증, 닉네임 전용 입력, `birth: null`, 기존 v9/legacy 버전 판별 및 기존 취향 비교다.

추가로 가능한 4,096개 답변 조합을 전수 계산해 모든 조합에서 두 백분율 합계가 100이고 명시 버전이 유지되는 것을 확인했다. 변경 파일에는 `git diff --check` 오류가 없다.

`tests/profile-v9-integration.test.mjs` 전체 실행의 에너지와 무관한 리듬 카탈로그 검사는 동시 진행 중인 루트 변경 때문에 `options.rhythm.time`을 찾지 못했다. 해당 파일의 프로필 저장·버전 호환 검사 두 개는 위 패턴 실행으로 통과했다.

## 변경 파일

- `public/js/energy-test.js` (신규)
- `public/js/personality-tests.js`
- `tests/energy-v13.test.mjs` (신규)
- `tests/personality-v9.test.mjs`
- `tests/profiles.test.mjs`
- `docs/plans/v13-energy-handoff.md` (신규)
