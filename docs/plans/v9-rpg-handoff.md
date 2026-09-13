# v9 RPG 모듈 인계

## 구현 범위

- `rpg-items.js`: 3효과 × (일반 50 + 고급 25 + 희귀 20 + 전설 6 + 신 3) = 312개. 기존 12개 ID·이름·기본 수치는 그대로다.
- 확률은 일반 60%, 고급 30%, 희귀 8%, 전설 1.5%, 신 0.5%다.
- 모든 항목은 `image: /assets/pixel/items/{id}.svg`를 가진다.
- `rpg-store.js`: 기존 `rpg_inventory`에 `quantity DEFAULT 1`, `enhancement DEFAULT 0`을 추가한다. 기존 한 개씩의 보유 상태와 장착 상태는 유지한다.
- 응답은 구형 `owned: string[]`를 계속 제공하며, `inventory: Array<{itemId, quantity, enhancement}>`를 추가한다.
- 강화는 동일 ID 총수량이 3개 이상일 때 기본 여분 2개를 소비하고 +1 한다. +10에서 막는다. 장착 능력치는 `round(base × (1 + 0.1 × level))`이다.
- 시작 설정에는 계산된 숫자 능력치가 들어가므로 이미 시작한 게임의 장비 스냅샷은 강화 후에도 바뀌지 않는다.
- `typing-hub.js`: 수량·강화가 보이는 한 줄 장비 목록, 효과 필터, 등급 필터, 페이지당 6행, 312개 도감, 프로필 기본 접힘을 제공한다.
- `rpg-draw-dialog.js`: 한 개 또는 열 개를 한 번에 받은 뒤 한 상자씩 수동 공개한다. `rare`, `legend`, `divine`만 추가 흔들림을 쓴다. `revealedCount`를 결과 객체에 기록하므로 닫았다가 이어 열 수 있다.

## 저장소 API

`draw`는 아래 두 호출을 모두 받는다.

```js
rpg.draw(user, key)                       // 이전 단일 호출 호환
rpg.draw(user, key, 10)
rpg.draw(user, {key, count: 10})
```

`count`는 1 또는 10만 허용한다. 비용은 각각 50, 500골드이며 중복 환급은 없다. 같은 키의 재시도는 골드와 수량을 다시 바꾸지 않고 처음 순서를 돌려준다. 단일 뽑기는 기존 `rpg_draws`를 그대로 쓰며, 열 개 뽑기는 `rpg_draw_batches`에 순서가 있는 JSON 결과를 저장한다.

응답은 단일 호출 호환 필드와 묶음 필드를 함께 가진다.

```js
{
  item, duplicate,                       // 첫 항목, 기존 호출 호환
  items: [{item, duplicate}, ...],        // 길이 1 또는 10
  revealedCount: 0,
  owned, inventory, equipped, gear, gold // 현재 프로필
}
```

추가 저장소 메서드는 다음과 같다.

```js
rpg.enhance(user, {itemId})
rpg.discard(user, {itemId})
```

`discard`는 해당 ID의 대표 장비와 여분 전체를 지우며, 장착 중이면 자동 해제한다. 모든 변경 작업과 기존 RPG 진행 저장은 `lib/transaction.js`의 `atomic`으로 감쌌다.

## 앱·라우트 연결

`app.js`와 서버 라우트는 이 작업 범위 밖이라 아래 연결이 필요하다.

1. `data-act="rpg-draw"`에서 `Number(el.dataset.count) || 1`을 읽고 `POST /api/rpg/draw`에 `{key, count}`를 보낸다. 서버는 `rpg.draw(user, data)` 또는 `rpg.draw(user, data.key, data.count)`를 호출한다.
2. 대화상자의 `onResult`에서는 첫 항목만 복사하지 말고 정규화된 전체 결과를 `lastDraw`에 둔다. `onReveal(out)`에서도 변경된 `revealedCount`를 포함한 전체 결과를 다시 보관한다.

```js
onResult: out => { lastDraw = {...out}; },
onReveal: out => { lastDraw = {...out}; },
```

3. `data-act="rpg-enhance"`는 `{itemId: el.dataset.item}`으로 강화 API를 호출하고 다시 렌더한다.
4. `data-act="rpg-delete"`는 `data-name`, `data-quantity`, `data-enhancement`, `data-equipped`로 확인 문구를 만든다. 문구에는 전체 수량, 현재 강화, 장착 해제 여부를 명시하고 예를 선택했을 때만 삭제 API를 호출한다.
5. `[data-rpg-rarity-filter]`의 `change`에서 선택한 option의 `data-href`로 이동한다.
6. 권장 라우트는 `POST /api/rpg/enhance`, `POST /api/rpg/discard`다. 이름을 달리 쓰면 앱과 저장소 매핑만 함께 맞춘다.

## UI 이벤트와 상태

- 뽑기 버튼: `data-act="rpg-draw" data-count="1|10"`
- 보관 상자: `data-act="rpg-reveal"`
- 강화: `data-act="rpg-enhance" data-item data-quantity data-enhancement`
- 삭제: `data-act="rpg-delete" data-item data-name data-quantity data-enhancement data-equipped`
- 등급 선택: `select[data-rpg-rarity-filter]`, 각 option의 `data-href`
- 대화상자 콜백: `onResult(normalizedResult)`, `onReveal(normalizedResult, revealedIndex)`

## 검증과 남은 위험

- `npm test`: 117개 모두 통과했다.
- 새 테스트는 카탈로그 수·기존 항목·확률 경계·강화 반올림, 이전 스키마 마이그레이션, 단일/열 개 멱등성과 비용, 수량, 강화/삭제 트랜잭션, UI 필터·도감·연결 속성, 대화상자 결과 정규화를 확인한다.
- 실제 DOM에서 열 개를 닫고 다시 여는 브라우저 검증은 앱 상태 연결 뒤 수행해야 한다.
- 현재 등급 필터는 앱의 change 연결이 필요하다. 효과 탭과 페이지 이동은 링크라 별도 연결 없이 동작한다.
- 생성된 아이콘 파일은 이 모듈에 포함하지 않는다. URI는 확정되어 있으므로 자산 생성 단계가 312개 경로를 채워야 한다.
- 프로덕션 DB나 `dwingul-local` 실행 데이터는 읽거나 쓰지 않았다.
