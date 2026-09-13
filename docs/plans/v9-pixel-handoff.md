# v9 픽셀 UI·자산 통합 안내

## 디자인 방향

v9 화면은 작은 숲속 모험가의 필드 노트를 주제로 한다. 크림색 종이, 세이지 패널, 짙은 코코아 외곽선이 기본이고 테라코타는 주요 버튼의 그림자와 선택 표시처럼 작은 강조에만 쓴다. 둥근 카드 대신 2~3px 외곽선, 3~8px 계단식 그림자, 거의 각진 모서리를 사용한다. 장식은 픽셀 감성을 주되 본문은 시스템 한글 글꼴과 넉넉한 행간을 유지한다.

`public/assets/pixel/woodland-pets.png`의 4×4 숲 친구가 홈, 콘텐츠 카드, 결과의 주인공이다. 312개 장비 SVG와 16개 페르소나 SVG는 투명하게 확대되는 보조 아이콘과 공유·결과 대체 자산이다. 두 자산 계열은 서로 역할이 다르다.

## CSS 연결

`public/index.html`에서 기존 스타일 뒤에 아래 파일을 연결한다.

```html
<link rel="stylesheet" href="/css/pixel.css">
```

`pixel.css`는 기존 레이아웃 클래스를 덮어쓰도록 만들어졌으므로 마지막에 와야 한다. PC의 `.wrap`은 최대 1520px이며 카드 열 수나 게임 캔버스 크기를 줄이지 않는다. 919px과 679px에서만 기존 반응형 흐름을 보정한다. 모바일 내비게이션과 모든 일반 버튼은 최소 44px, 실제 기본값은 48~56px다. `prefers-reduced-motion`과 `forced-colors`도 포함되어 있다.

Galmuri는 제목, 버튼, 내비게이션, 짧은 레이블에만 쓴다. 본문은 읽기 쉬운 시스템 한글 글꼴이다. 루트 작업에서 공식 OFL 배포본을 확인해 아래 경로에 둬야 한다.

```text
public/assets/fonts/Galmuri11.woff2
```

글꼴이 없어도 시스템 글꼴로 폴백되지만, 출시 전에는 OFL 라이선스 파일과 출처를 함께 저장한다. 이 작업에서는 외부 파일을 내려받거나 라이선스를 추정하지 않았다.

## 4×4 숲 친구 사용법

`.pixel-pet`은 정사각형 요소 하나로 쓴다. 스프라이트 시트가 4×4이므로 위치 값은 각 축에서 `0%`, `33.333%`, `66.667%`, `100%` 중 하나다.

```html
<span class="pixel-pet" role="img" style="--pet-x:66.667%;--pet-y:33.333%" aria-label="달빛 고양이"></span>
```

홈 히어로의 `.hero-art`, 각 `.card-art`, 결과의 `.result-stamp` 안에 넣으면 문맥에 맞는 반응형 크기가 자동 적용된다. `.card-art`에 `.pixel-pet`이 있으면 이전 문자 `.glyph`는 CSS에서 숨긴다. 같은 그림을 반복하기보다 콘텐츠 ID를 안정적으로 0~15에 매핑하면 새로고침과 공유 화면에서 캐릭터가 바뀌지 않는다.

스프라이트는 `background-size:400% 400%`, `image-rendering:pixelated`를 사용한다. 임의의 `25%`, `50%`, `75%` 위치는 셀 중심이 맞지 않으므로 사용하지 않는다.

## 장비·페르소나 SVG 생성

생성기는 `public/js/rpg-items.js`를 직접 읽어 카탈로그의 정확한 ID와 이미지 주소를 사용한다.

```sh
node scripts/generate-pixel-assets.mjs
```

실행 결과:

- `public/assets/pixel/items/*.svg`: 312개
- `public/assets/pixel/personas/*.svg`: `0.svg`부터 `15.svg`까지 16개

장비는 슬롯마다 다섯 실루엣을 쓴다. 무기는 검·펜촉·키보드·만년필·문장검, 방어구는 망토·책 표지·사전·갑옷·수호패, 회복 장신구는 책갈피·찻잔·잉크병·문장석·부적이다. 등급마다 종이와 금속색, 모서리 장식, 빛나는 표시 수가 달라진다. 각 아이템 오른쪽 아래의 3×3 룬 인장은 312개 모두 다른 시각 서명이다. 이름만 바꾼 동일 SVG가 생기지 않도록 생성기가 `<title>`과 `<desc>`를 제외한 실제 그림 중복을 검사한다.

생성기는 대상 폴더 안의 기존 `.svg`만 지운 뒤 다시 만들며 다른 확장자와 상위 폴더는 건드리지 않는다. 다음 조건 중 하나라도 어기면 실패한다.

- 카탈로그가 정확히 312개이고 ID가 모두 고유한가
- 모든 `item.image`가 `/assets/pixel/items/{id}.svg`와 정확히 일치하는가
- 결과 SVG가 48×48, `crispEdges`, 제목과 닫는 태그를 포함하는가
- 스크립트, 외부 참조, `undefined`, `NaN`이 없는가
- 허용된 기본 도형 태그만 쓰는가
- 제목을 제외한 실제 그림이 312개 모두 다른가
- 최종 장비와 페르소나 파일 수가 각각 312개와 16개인가

## 확인 항목

생성기와 파일 수를 다시 확인한다.

```sh
node --check scripts/generate-pixel-assets.mjs
node scripts/generate-pixel-assets.mjs
test "$(find public/assets/pixel/items -name '*.svg' | wc -l | tr -d ' ')" = 312
test "$(find public/assets/pixel/personas -name '*.svg' | wc -l | tr -d ' ')" = 16
```

브라우저 통합 뒤 CSS에서 확인할 핵심은 다음과 같다.

- `.pixel-pet`의 배경 이미지가 `woodland-pets.png`, 크기가 `400% 400%`, 렌더링이 `pixelated`인가
- `.hero`, `.content-card`, `.panel`, `.button`, `.answer`, `.result-card`가 코코아 외곽선과 작은 모서리를 사용하는가
- 긴 설명 문단이 Galmuri가 아닌 시스템 글꼴로 읽히는가
- 320·390px에서 카드와 답변이 가로로 잘리지 않고 탭 영역이 44px 이상인가
- 768px에서 히어로 캐릭터가 문장을 침범하지 않는가
- 1440·1920px에서 `.wrap`과 카드 그리드가 지나치게 좁아지지 않는가
- 게임 캔버스와 v7 모바일 조작 버튼의 기존 크기·고정 위치가 유지되는가
- 움직임 줄이기 설정에서 숲 친구의 계단식 움직임이 멈추는가

이 작업은 `app.js`, `index.html`, `catalog.js`, 기존 CSS를 수정하지 않았다. 루트 통합에서 스타일 링크, `.pixel-pet` 마크업, Galmuri 파일만 연결하면 된다.
