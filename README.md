# 뒹굴

**플레이:** https://dwingul.com · **소스:** https://github.com/Dunsmile/dwingul

짧은 틈에 즐기는 게임, 창작 퀴즈, 자체 성향 테스트와 오락용 운세를 모은 한국어 웹 놀이터입니다. 현재 카탈로그는 게임 10개, 퀴즈 3개, 성향 테스트 4개, 운세·사주 4개로 모두 21개입니다.

## 현재 제공하는 것

- 픽셀 RPG 분위기의 반응형 화면과 직접 만든 픽셀 펫 16종, 장비 SVG 312종
- 놀이의 동작을 보여주는 전용 썸네일 21종과 숲속 스타일의 내부 게임·퀴즈·운세 UI
- 영웅·몬스터·달리기 캐릭터와 타로·차량·장비를 모은 [픽셀 아트북](https://dwingul.com/artbook/) 및 [디자인 패키지 안내](docs/design/README.md)
- 100가지 고유 패턴을 이어가는 무한 리듬 게임과 이전 규칙을 분리해 보존하는 버전형 기록
- 에너지·단톡방·취향 테스트별 12개 상황, 4개 양극 축, 16개 조합 결과
- 개척·브랜드·관계·운영의 조합으로 16유형을 구분하는 12문항 사업가 테스트
- 닉네임·PIN·복구 코드를 쓰는 프로필, 개인 기록, 공개 범위를 직접 고르는 순위와 친구방
- 21개 콘텐츠별 정적 안내, 정책 페이지, sitemap, robots, ads.txt를 만드는 공개 빌드

성향 테스트는 대화와 놀이를 위한 자체 분류이며 공인 MBTI 또는 검증된 심리검사가 아닙니다. IQ 추리는 표준화 지능검사가 아니고, 운세·타로·사주 문구는 중요한 결정을 대신하지 않습니다. 게임 골드·토큰·장비에는 결제나 현금 가치가 없습니다.

## 로컬에서 실행

[Node.js 24 이상](https://nodejs.org/)이 필요합니다.

```sh
npm ci
npm start
```

브라우저에서 `http://localhost:4173`을 엽니다. 기본 로컬 서버는 `data/dwingul.sqlite`를 사용합니다. 이 파일에는 로컬 프로필과 기록이 들어갈 수 있으며 Git에 포함하지 않습니다.

실제 로컬 기록과 완전히 분리해 확인하려면 메모리 DB와 다른 포트를 사용합니다. 서버를 끄면 이 데이터는 사라집니다.

```sh
DW_DB=:memory: PORT=4174 npm start
```

Cloudflare 환경을 로컬에서 확인할 때는 다음 명령을 사용합니다.

```sh
npm run build
npm run dev
```

## 검증과 빌드

```sh
npm ci
npm test
npm run build
npm run check
```

- `npm test`: 규칙, 문항, 프로필·권한, SQLite 저장, Cloudflare 어댑터와 정적 공개 빌드를 검증합니다. 자동 테스트는 메모리 DB나 임시 파일을 사용합니다.
- `npm run check`: 서버 API와 브라우저 앱 진입점의 문법을 확인합니다.
- `npm run build`: 픽셀 자산을 다시 만들고 `public/`을 바탕으로 배포용 `dist/`를 생성합니다. 서버 전용 브라우저 저장소 모듈은 결과물에서 제외됩니다.

브라우저 통합 검증은 별도 테스트 서버와 Playwright를 사용합니다. 필요한 경우 `npx playwright install chromium`으로 브라우저를 준비한 뒤 `tests/`의 해당 시나리오를 실행합니다. 테스트 서버에는 `DW_DB=:memory:` 또는 임시 DB 파일을 사용하고 실제 이용 데이터가 있는 로컬 서버나 운영 환경을 대상으로 실행하지 않습니다.

## 저장 구조

로컬 Node 서버와 Cloudflare Worker는 `server/api.js`의 같은 API 동작을 사용합니다. 로컬 개발은 Node 내장 SQLite를, Cloudflare 배포는 SQLite 기반 Durable Object를 사용합니다. 현재 구조에는 별도의 외부 DB 서비스가 필요하지 않습니다.

Durable Object의 운영 데이터는 Git 저장소에 들어가지 않습니다. SQLite 파일, `.dev.vars`, `.env*`, Wrangler 로컬 상태, 세션 값, PIN, 복구 코드, Cloudflare 토큰과 테스트 출력도 커밋하지 않습니다. 공개 배포와 계정 연결 상태는 코드 존재만으로 판단하지 않으며 [배포 안내](docs/deployment.md)의 확인 절차를 따릅니다.

## 폴더 안내

| 경로 | 역할 |
|---|---|
| `public/` | 브라우저 앱, 스타일, 폰트와 정적 자산 |
| `server/api.js` | 로컬 서버와 Worker가 함께 쓰는 API·도메인 규칙 |
| `server.mjs` | Node SQLite를 사용하는 로컬 HTTP 서버 |
| `workers/` | Cloudflare Worker, Durable Object와 SQLite 어댑터 |
| `scripts/` | 픽셀 자산과 정적 공개 사이트 생성기 |
| `tests/` | 단위·통합·브라우저 검증과 격리된 테스트 도구 |
| `docs/` | 설계 기록, 참고 자료와 배포 절차 |
| `data/`, `dist/`, `output/` | 로컬 데이터 또는 생성물; Git에 포함하지 않음 |

## 협업

오류와 제안은 [Dunsmile/dwingul Issues](https://github.com/Dunsmile/dwingul/issues)에 남겨주세요. 보안에 민감한 값이나 개인정보는 공개 이슈에 쓰지 않습니다. 코드 변경 절차는 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다.

현재 동작과 검증은 코드를 기준으로 확인합니다. 이전 버전의 설계 배경과 변경 기록은 [구현 문서](docs/implementation-plan.md), [v8 프로필·콘텐츠 계획](docs/plans/2026-09-13-v8-profile-content.md), [v9 출시 계획](docs/plans/2026-09-13-v9-launch.md)에서 볼 수 있습니다.

저장소에는 배포 설정과 GA4·AdSense 연동 코드가 포함될 수 있지만, 실제 배포 완료, 분석 데이터 수집, 광고 심사 승인 또는 검색 등록 완료를 뜻하지 않습니다.
