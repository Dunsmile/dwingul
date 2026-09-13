# 뒹굴 공개 배포 안내

2026-09-14에 https://dwingul.com 공개 배포를 완료했다. 다음은 실제 확인한 상태와 이후 배포 시 반복할 절차다.

- Cloudflare Workers + SQLite Durable Object로 배포했고, `www`는 대표 주소로 308 이동한다.
- 원본 로컬 DB를 백업한 뒤 기존 107행을 이전했다. 삽입 결과는 원본 테이블별 개수와 일치했다. 일회성 DB 반입 경로와 비밀키는 제거했다.
- 기존 로컬 브라우저는 홈의 “온라인에서 기존 기록 이어가기”로 성장·장비·차량을 연결할 수 있다. 연결표는 30일 동안 한 번만 사용 가능하며 브라우저에만 남아 있던 미저장 결과와 생일은 원래 로컬 브라우저에 유지된다.
- GA4 `G-725B71K0DR` / 속성 `553941025`: 실시간 page_view와 game_start 수신을 확인했다.
- AdSense: 소유권 확인 및 심사 요청 완료, 현재 “준비 중 / 리뷰가 요청됨”. 승인과 광고 게재는 아직 시작되지 않았다.
- Search Console: 도메인 소유권 확인, https://dwingul.com/sitemap.xml 제출 완료. 검색 색인과 노출은 후속 처리 대상이다.
- https://github.com/Dunsmile/dwingul 공개 저장소와 Issues를 확인했다. CI는 현재 연결의 workflow 권한 제약으로 템플릿만 보관한다.
- 출시 브라우저 검수: 5개 화면 폭, 115개 경로와 13개 게임 조작 검사 통과.

## 1. 배포용 파일 만들기

저장소 루트에서 다음 순서로 실행한다.

```sh
node scripts/generate-pixel-assets.mjs
node scripts/build-site.mjs
```

두 번째 명령은 `public/`을 바탕으로 `dist/`를 새로 만든다. 브라우저에서 사용하면 안 되는 `public/js/rpg-store.js`와 `public/js/garage-store.js`는 복사하지 않는다. 홈, 콘텐츠 안내 21개, 소개·개인정보처리방침·이용약관·연락 페이지를 만들고 `sitemap.xml`, `robots.txt`, `ads.txt`도 생성한 뒤 자체 검증한다. 성공 시 `site built: 26 crawlable pages`가 표시된다.

배포 전에는 적어도 다음 항목을 확인한다.

- `dist/index.html`에 21개 안내 링크와 정적 홈 소개가 보이는지 확인한다.
- `dist/content/<콘텐츠 ID>/index.html`에서 이용 안내를 읽을 수 있고, 시작 버튼이 `/#/detail/<콘텐츠 ID>`로 이동하는지 확인한다.
- `dist/js/rpg-store.js`와 `dist/js/garage-store.js`가 없는지 확인한다.
- `dist/ads.txt` 내용이 `google.com, pub-7301223136166743, DIRECT, f08c47fec0942fa0`인지 확인한다.
- `dist/sitemap.xml`에 홈 1개, 콘텐츠 21개, 안내 4개로 총 26개 URL이 있는지 확인한다.
- 모바일과 데스크톱에서 홈, 게임 1개, 퀴즈 1개, 성향 테스트 1개, 운세 1개, 개인정보처리방침을 직접 연다.

`dist/`는 매번 지우고 다시 만드는 결과물이다. `wrangler.jsonc`의 정적 자산 디렉터리는 `./dist`를 가리키며, 모든 요청이 먼저 Worker를 통과하도록 설정되어 있다. 정적 자산 설정은 Cloudflare 공식 [Workers Static Assets 시작 안내](https://developers.cloudflare.com/workers/static-assets/get-started/)와 실제 설정을 함께 확인한다. 계정 로그인과 아래 외부 확인을 마친 뒤의 배포 명령은 다음과 같다.

```sh
npx wrangler deploy
```

운영 데이터가 연결된 첫 배포 전에는 미리보기 또는 별도 테스트 환경에서 세션, 프로필 생성, PIN 확인, 복구 코드, 생일 저장·삭제, 개인 기록, 친구방과 공유 링크를 확인한다.

## 2. Cloudflare 무료 한도

아래 수치는 2026-09-14에 Cloudflare 공식 문서에서 확인한 값이다. 요금과 한도는 바뀔 수 있으므로 실제 공개 직전에 링크된 문서를 다시 확인한다.

- [Workers 정적 자산](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) 자체는 무료이며 정적 자산 저장에 별도 요금이 없다. 이 프로젝트는 `run_worker_first: true`를 사용하므로 HTML, JavaScript, CSS, 이미지와 API를 포함한 모든 요청이 먼저 Worker 호출로 계산된다. 운영 한도는 무제한 정적 요청이 아니라 아래 Workers Free 요청 한도를 기준으로 본다.
- [Workers Free 한도](https://developers.cloudflare.com/workers/platform/limits/)는 하루 100,000개 요청, 요청당 CPU 10ms, 메모리 128MB, 요청당 하위 요청 50개다. 한 버전에 정적 파일 20,000개, 파일 하나당 25MiB까지 허용된다.
- [Durable Objects Free 한도](https://developers.cloudflare.com/durable-objects/platform/pricing/)는 SQLite 기반 Durable Object에서만 제공된다. 하루 요청 100,000개, 컴퓨팅 13,000 GB-s, 읽기 5,000,000행, 쓰기 100,000행, 계정 전체 저장소 5GB가 포함된다.

현재 정적 파일 수와 일반적인 이용 흐름을 기준으로 초기 하루 100~200명 규모의 시험 운영에는 여유가 있다. 한 사람이 불러오는 자산 수, 반복 플레이와 API 호출 수에 따라 실제 사용량은 달라지므로 보장값으로 보지는 않는다. 출시 뒤에는 Cloudflare 대시보드에서 전체 Worker 요청 수, 오류율, CPU 시간과 Durable Object 사용량을 확인한다. 무료 한도에 가까워지면 먼저 캐시와 자산 요청, 불필요한 저장 호출과 반복 조회를 점검하고, 이용량과 비용을 검토한 뒤 요금제 변경을 결정한다.

## 3. 운영·재배포 점검 절차

다음 항목은 이후 변경이나 재배포에서 확인한다. 최초 출시 상태는 위에 기록했다.

### 공개 GitHub 저장소와 연락 창구

1. `Dunsmile/dwingul`을 공개 저장소로 게시하고 Issues 기능을 켠다.
2. `https://github.com/Dunsmile/dwingul/issues`가 로그아웃 상태에서도 열리는지 확인한다.
3. 저장소에 포함된 오류 제보 양식이 기본 양식으로 보이고 개인정보 경고와 필수 항목이 동작하는지 확인한다.
4. 저장소 공개 전 커밋 기록과 파일에 Cloudflare 토큰, 복구 코드, 세션 값 같은 비밀정보가 없는지 점검한다.

### Cloudflare 배포와 데이터

1. 운영 Cloudflare 계정으로 Wrangler 인증을 마친다.
2. Worker의 정적 자산 디렉터리가 `./dist`인지, `run_worker_first`가 켜져 있는지, Durable Object 바인딩과 마이그레이션 이름이 운영 계정 값에 맞는지 확인한다.
3. 별도 테스트 환경에 먼저 배포하고 API, 세션 쿠키, 프로필, PIN, 복구, 공유와 삭제 흐름을 확인한다.
4. 기존 운영 데이터가 있다면 백업·마이그레이션·되돌리기 순서를 문서화하고 실제 데이터로 복구 연습을 한다.
5. 테스트용 프로필과 기록이 운영 저장소에 남지 않게 정리한 뒤 운영 배포를 실행한다.

### 도메인과 HTTPS

1. `dwingul.com`을 같은 Cloudflare 계정의 활성 Zone으로 둔다.
2. 해당 호스트 이름에 충돌하는 기존 CNAME이 없는지 확인한다.
3. 공식 [Workers Custom Domains 안내](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)에 따라 Worker에 `dwingul.com` 사용자 지정 도메인을 연결한다. Cloudflare가 DNS 레코드와 인증서를 만들 때까지 상태를 확인한다.
4. `https://dwingul.com`, 정적 자산, API, `robots.txt`, `sitemap.xml`, `ads.txt`를 외부 네트워크에서 확인한다.
5. `www.dwingul.com`을 사용할 경우 한쪽을 대표 주소로 정하고 다른 쪽을 HTTPS 리디렉션한다. 현재 생성 페이지의 canonical은 `https://dwingul.com`이다.

### 방문 분석

1. `public/js/site-config.js`의 GA4 측정 ID가 운영 속성의 ID와 같은지 확인한다.
2. 운영 도메인에서 동의 전에는 Google 분석 스크립트와 `_ga` 쿠키가 생기지 않고, 허용 뒤에만 로드되는지 확인한다.
3. 거절 값이 브라우저에 남고 분석 설정을 다시 열 수 있는지 확인한다.
4. Google Tag Assistant와 GA4 실시간 보고서로 페이지 이동과 허용된 이벤트만 들어오는지 확인한다. 이름, 생일, 답변, PIN, 복구 코드, 세션 값과 공유 토큰은 보내지 않는다.
5. 동의 구현은 Google의 [Analytics 데이터 수집 안내](https://support.google.com/analytics/answer/11593727)와 [동의 설정 안내](https://support.google.com/analytics/answer/12329709)를 공개 직전에 다시 확인한다.

### AdSense

1. AdSense 계정에서 `dwingul.com`을 사이트로 추가하고 검토를 요청한다.
2. 페이지의 `google-adsense-account` 값이 `ca-pub-7301223136166743`인지 확인한다.
3. `https://dwingul.com/ads.txt`가 열리고 게시자 ID가 `pub-7301223136166743`인지 확인한다. 형식은 Google의 [ads.txt 안내](https://support.google.com/adsense/answer/12171612)를 따른다.
4. 사이트 소유권 상태를 확인한다. 메타 태그 방식은 Google의 [AdSense 사이트 연결 안내](https://support.google.com/adsense/answer/7584263)를 따른다.
5. 현재 게임 화면에는 자동 광고와 광고 단위를 켜지 않는다. 사이트 승인과 실제 이용 흐름 검토 뒤, 콘텐츠를 가리지 않는 수동 광고 위치와 단위를 별도로 결정한다.

### 검색 공개

1. Google Search Console에서 `dwingul.com` 소유권을 확인한다.
2. `https://dwingul.com/sitemap.xml`을 제출한다.
3. 홈, 대표 콘텐츠 안내, 개인정보처리방침을 URL 검사로 확인한다.
4. 출시 뒤 색인 제외 사유, 404, canonical 선택과 모바일 사용성 문제를 확인하고 실제 원인을 수정한다.

### GitHub Actions

1. 현재 workflow 쓰기 권한이 없는 연결이므로 `.github/templates/ci.yml`을 준비해 두었다. 관리자가 `.github/workflows/ci.yml`로 활성화한 뒤 Pull Request나 기본 브랜치 갱신에서 CI가 Node.js 24에서 `npm ci`, `npm test`, `npm run build`, `npm run check`를 모두 통과하는지 확인한다.
2. CI는 배포 작업을 하지 않으며 Cloudflare, GA4, AdSense 또는 Search Console 비밀값을 받지 않는다.
3. 배포는 위 검증과 계정 상태를 직접 확인한 뒤 권한 있는 운영자가 별도로 실행한다.

## 4. 출시 직후 확인과 되돌리기

배포 직후 새 브라우저와 기존 프로필 브라우저에서 모두 확인한다. 새 이용자는 동의 선택 전 분석 요청이 없어야 하고, 기존 이용자는 저장된 선택이 유지되어야 한다. 서버 응답 오류, 세션 급증, 데이터 저장 실패, 잘못된 공개 범위가 보이면 새 쓰기를 막고 직전 검증 버전으로 Worker를 되돌린 뒤 원인을 확인한다. 정적 페이지 문제만 있다면 이전 `dist/`가 아니라 이전에 검증된 배포 버전을 다시 활성화한다.

배포가 안정된 뒤에도 게임 규칙이나 콘텐츠 설명을 바꾸면 `node scripts/build-site.mjs`를 다시 실행해 정적 안내, 사이트맵과 실제 앱 규칙을 함께 맞춘다.
