# v9 성향 검사 통합 안내

`public/js/personality-tests.js`는 에너지, 단톡방, 취향 검사를 각각 12문항·4축·축당 3문항으로 제공한다. 각 축은 세 번 응답하므로 동점이 없고, 네 축의 조합으로 검사마다 16가지 결과가 나온다. 문항의 양쪽 선택지는 전체 12문항에서 6회씩 뒤집혀 같은 위치만 반복해서 눌러도 한쪽 성향으로 쏠리지 않는다.

이 모델은 뒹굴이 만든 오락·대화용 분류다. 결과 본문에도 공인되거나 타당화된 MBTI 검사가 아니라는 문장이 포함되어 있다. 화면이나 소개 문구에서도 `MBTI 검사`, `성격 진단`, `심리 검증`처럼 오해를 부르는 표현을 쓰지 않는다. `네 가지 축으로 보는 자체 성향 테스트`가 정확한 표현이다.

## 공개 API

- `testQuestions`: `{energy, chat, taste}` 배열. 각 문항은 기존 화면이 읽을 수 있는 `[상황, 선택지A, 선택지B]` 형식이다.
- `personalityTests`: 축, 문항별 점수 방향, 16개 결과 원문을 담은 정의다. 보통 화면에서는 직접 읽을 필요가 없다.
- `makePersonalityResult(id, name, answers)`: 완성된 결과를 만든다. `id`는 `energy`, `chat`, `taste`만 허용하며 `answers`는 0 또는 1로 채운 정확히 12개의 배열이어야 한다.
- `getPersonalityTestVersion(result)`: 새 결과는 `axes-v9`, 태그가 없고 응답이 8개인 기존 결과는 `legacy-v8`, 그 밖에는 `unknown`을 돌려준다.
- `canComparePersonalityResults(a, b)`: 콘텐츠와 검사 버전이 모두 같을 때만 `true`다.
- `isAxesV9PersonalityResult(result)`: 새 4축 결과인지 확인한다.
- `compareTasteResults(a, b)`: v9끼리는 화면의 선택지 위치가 아니라 네 개의 정규화된 취향 축을 비교한다. `same/total`과 축 거리 기반 `similarity`, 축별 `dimensions`를 함께 돌려준다. 기존 8문항 결과끼리는 예전처럼 같은 답의 수와 비율을 센다. v8과 v9가 섞이면 오류를 내므로 화면에서 새 검사를 권하면 된다.

새 결과는 기존 저장·공유 화면에 필요한 `content`, `name`, `title`, `subtitle`, `sections`, `scores`, `answers`, `display`, `unit`을 유지한다. 추가로 `personality: {code, axes}`, `testVersion: 'axes-v9'`, `sprite: '/assets/pixel/personas/{0..15}.svg'`, `birth: null`이 들어간다. `scores`는 각 축 첫 번째 극의 선택 수에서 두 번째 극의 선택 수를 뺀 값이며 `-3`, `-1`, `1`, `3` 중 하나다. `personality.axes[축].normalized`는 이를 3으로 나눈 `-1..1` 값이다.

## `profiles.js` 연결

`business-test.js`의 사업가 검사는 그대로 둔다. `profiles.js`에서 새 모듈을 별칭으로 가져와 기존 질문 객체와 합친다.

```js
import {
  testQuestions as personalityQuestions,
  makePersonalityResult,
  compareTasteResults,
} from './personality-tests.js';

export const testQuestions = {
  shop: businessQuestions,
  ...personalityQuestions,
};
```

`makeResult`에서는 이름을 정리한 다음 사업가 분기와 별도로 세 성향 검사만 새 함수로 보낸다. 생일은 전달하거나 계산하지 않는다.

```js
export function makeResult(id, profile, answers = [], card = 0, theme = '오늘 하루') {
  const name = profile.name?.trim() || '뒹굴러';
  if (id === 'shop') return businessResult(name, answers);
  if (personalityQuestions[id]) return makePersonalityResult(id, name, answers);
  // 기존 타로·오늘·사주 분기
}
```

기존 `compareResults`의 취향 분기는 `return compareTasteResults(a, b)`로 바꿀 수 있다. 이 함수가 v8 8문항끼리의 공유 비교도 처리한다. 서로 다른 버전이면 호출부에서 오류를 잡아 `검사 버전이 달라요. 새 취향 검사를 함께 해보세요.`처럼 안내한다. 저장된 v8 결과의 답 배열이나 공유 payload를 마이그레이션하지 않는다.

## 화면과 자산

에너지, 단톡방, 취향 입력은 닉네임만 받는다. 저장된 생일이 있어도 성향 점수에는 쓰지 않는다. 선택 화면은 12단계 진행률을 표시해야 한다. 결과 코드(`OQHN`, `WMEL` 등)는 뒹굴 자체 축의 약자이며 MBTI 코드로 소개하지 않는다.

`sprite`는 세 검사 모두 결과 순서에 따라 0부터 15까지를 가리킨다. 루트 작업에서 `public/assets/pixel/personas/0.svg`부터 `15.svg`까지 만들면 된다. 자산이 아직 없을 때는 `sprite` 렌더링만 조건부로 건너뛰어도 결과 내용은 완전하다.

## 확인 명령

성향 검사 단위 검증:

```sh
node --test tests/personality-v9.test.mjs
```

통합 뒤 전체 검증:

```sh
npm test
```

`tests/profile-v8.test.mjs`와 `tests/profiles.test.mjs`에는 예전 8문항 길이를 고정한 기대값이 있으므로 통합 시 에너지·단톡방·취향은 12로 갱신한다. 사업가 12문항 기대값은 그대로 둔다. 새 전용 검사는 16개 조합 전부의 도달 가능성, 축별 세 문항, 선택지 위치의 균형, 모든 답의 축 귀속, 결정성, 입력 오류, v8 공유 비교를 검증한다.
