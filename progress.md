Original prompt: 사용자가 승인한 뒹굴 와이어프레임을 로컬 앱으로 구현. 좌우 캐릭터 분류, 랜덤 1~10초 두 자리 결과, 단계별 색 찾기, Coddy 참고 반응 게임, 낙하 문장 벽돌, 3차선 주행, 통합 상식·맞히기, IQ형 20문항, 이름·생년월일·태어난 시간 기반 운세·성향 연결. 합쳐진 자리는 자율 보완하고 로컬 실행까지 수행.

2026-09-13: 기존 기획 읽음. 별도 dwingul-local 폴더에 구현. sources는 수정하지 않음. 20종으로 메뉴 재편, 외부 DB 없이 문제 묶음 시작. 구현 계획 docs/implementation-plan.md.

2026-09-13 구현 및 검증 완료:
- 게임 9, 퀴즈 3, 성향·운세 8 실제 동작. 질문 소스 110개.
- SQLite 기록, 관리 PIN/복구 코드, 3범위 랭킹, 친구방 미리보기·참여·권한·삭제, 공유 수신·비교.
- IQ 자체 문항20; 양력/음력/윤달·시각 모름 지원. 일반 공유에서 답변 제거, 취향 비교만8개.
- npm test 9개 통과. tests/browser-report.json: 20종 흐름 + 6폭78화면, 오류/가로넘침0.
- tests/social-browser-report.json: 두 브라우저 친구방·고정주제 퀴즈·친구전용순위·취향8개 비교 통과.
- tests/game-layout-report.json: 9게임×3뷰포트(320×568,390×844,1280×720), 모든 게임 영역 하단이 화면 내부, 가로넘침/오류0. 화면 캡처 실물 검토 완료.
- 개발 게임 클라이언트 전체9게임 실행, 상태JSON/스크린샷, 오류파일 없음.
- 리뷰 승인. 기존guess주제 마이그레이션, 과거결과 등록버튼, 미가입 미리보기 수정. 서버 재시작 영구저장 확인.
- 최종 서버 http://localhost:4173 실행, Chrome과 Codex 미리보기 열기 요청. README와 시작.command, VS Code 작업 추가.
- 공개배포/DNS/실광고는 적용하지 않음. 공개 운영 전 점수 조작 방지·운영/역법 정밀 검증은 README에 범위를 명시함.

마지막 가독성 보정: 문장 벽돌 글자48px 및 글자폭 기반 벽돌, 작은창 입력부 노출, 3뷰포트 입력/제거/바닥종료 재검증 통과. 수정 후 게임클라이언트+9개 테스트+구문검사 통과. 테스트서버 종료, 실제 로컬서버4173 유지.

2026-09-13 사용자 조작감 수정 요청:
- 좌우 폭 확대·개별 자연낙하; 표시타이머; 반응3회; 레이싱늦은옆충돌; 기억판확장; 순서9칸.
- 원인 재현: 레이싱 장애물 y682에서옆차선진입후즉시종료. 기존동일차선/y525..710 판정.
- 독립 racing-physics 모듈과6회귀검사, 현재그림안쪽박스+충돌우선/안전추월면제,180ms차선이동 통합.
- games/catalog/app/server 동작·안내·결과·새랭킹모드 연결. 모드분리후 기존기록보존 검증.
- 현재17개자동테스트통과, 브라우저개정흐름 및 게임클라이언트검증진행.

게임 조작감 2차 검증 완료:
- tests/game-feel-v2-report.json: 6게임18뷰포트 정상; 개별캐릭터y불변/연속낙하/놓침,표시타이머1.23→5.15/일시정지,3회반응,기억판8단계25→36→49,순서9개,추월후차선변경 안전 및 정면충돌 통과.
- 개발게임클라이언트6종 실행, 실제화면과 active상태캡처 검토, 오류없음.
- tests/browser.cjs 전체20종/78화면과 social-browser.cjs 친구방·공유 통과. 숫자완주테스트는 로드후측정훅전실제RAF시간을 초기값으로 포함해 검사(실제게임동작변경없음).
- 스펙/품질검토완료. 반응스페이스키 반복입력 무시 추가, 실제keydown repeat경계검증 통과.
- 새랭킹모드분리/구기록보존 포함17자동테스트통과. 시작시게임페이지스크롤초기화.

2026-09-13 게임·문항 3차 개선:
- 좌우 중앙1열, 126px 낙하간격, 정답후 나머지y위치불변. single-line-v3 모드.
- 9패드 평소중립색, 순서/입력 피드백 때만색.
- 문장벽돌 직접작성100개 비복원덱. 바닥실패/100개완주, phrases-100-v3.
- 맞히기 드라마100+애니100+게임100. 원문초성자동산출, 보기초성정답유일검사. 영문만있는정답4개는다른작품/캐릭터로교체.
- IQ 창작100개(4유형각25), 각5개씩무작위추출후문항/보기시드셔플. 독립검토후회전범위/공개수/종이구멍조건명확화.
- ppippi.me/saju/game 가상게스트로직접확인. 메커니즘참고 '액운훌쩍' 신규구현(2단점프,숙이기,2목숨,점차가속).21종.
- runs/groups question_version 마이그레이션. 기존그룹/공유/진행중run v1채점유지, 새문제v3분리. 기존기록보존.
- npm test32개통과, 전체21종/78화면통과, v2회귀통과. v3게임100문장완주와12화면, 퀴즈8판100문항/공유다른브라우저동일문제 통과.
- 실제스크린샷검토(한줄,패드점등,모바일/넓은PC새게임,드라마/IQ). 개발게임클라이언트4종실행 및 상태검토. 최종안정화검증/로컬서버재시작수행.

3차 최종 확인: 문항32자동검사, 21종전체흐름, v2회귀, v3게임(리사이즈간격포함), 퀴즈8판100문항과공유, 친구방·취향사회흐름 통과. 개발게임클라이언트4종실제이미지/상태확인. localhost4173최신서버실행, 기존users3/runs28/records0/groups0그대로보존및question_version추가확인. 테스트4174서버종료, 사용자4173서버유지.

2026-09-13 게임 확장 v4 완료:
- 좌우: 중앙한줄126px간격유지, 오답+놓침3회즉시종료, 10초/무한설정. 무한300→850px/s 가속.
- 타이핑마스터: 시작설정레인/RPG. 레인100문장유지. RPG별도모듈/스타일, HP/MP/콤보/공격/8초반격/힐/한글IME/100완주/HP0종료.
- 도심질주: 2.5D원근5차선, 기본/스피드/롱런속도·연료, 각50토큰해금/4번준비중. 초당연료1/+15회복, 근접추월부스터+1/10에서수동사용/초당2소모/2배가속. 100개고유패턴/2~3차/버스2배길이. 고정4ms세계좌표충돌·안전추월판정·실거리m.
- 뒹굴멀리뛰기: 4종각25패턴, 넓은2칸발판한번점프통과, 높은벽2단필수, 천장슬라이드필수. 거리m/2목숨. 독립물리재검토220·420px/s 모두통과가능.
- 차고: SQLite wallet/run_rewards 신규, 실행/친구방설정version추가. 입력재생으로주행결과확인/중복적립차단/해금원자차감/랭킹등록과별도정산/등록거리는정산값사용. 친구방·공유조건서버고정. 레거시기록모드유지.
- npm test49/49 통과. tests/game-expansion-v4.mjs: 좌우두모드/60초가속/3회종료, 실제주행2517m·26동전·18근접추월·1부스터/자동적립, 두차량50토큰해금·리로드,320/390/1440px화면통과.
- tests/typing-v4-browser.mjs: 한글조합/공격/MP힐/반격/일시정지/HP0/100RPG문장및100레인문장완주/3화면통과.
- tests/browser.cjs 21종전체흐름+78화면, social-browser.cjs 두브라우저친구방/공유기존동작통과. 개발게임클라이언트레이싱/점프/RPG실행, 실제화면·상태JSON검토.
- 모바일설정을제목바로아래배치, RPG소형HUD, 낮은PC차량캔버스높이조절(차체비율유지). 출력 output/game-v4/.
- 사용자 DB백업 data/backups/dwingul-before-v4-20260913-2127.sqlite. 적용전후 users3/runs34/records0/groups0/shares0 보존, integrity_check ok.
- 최신 localhost4173 서버실행, 테스트4174종료. 공개배포없음.

2026-09-13 게임 개선 v5 구현 및 검증:
- 사용자 힐 해석 확정: 회복량만15HP, MP글자당2 유지. RPG매10보스/일반10초·보스15초/피해5부터+1·보스2배/25색/무한100문장순환.
- RPG시작·뽑기·장비UI, 3슬롯12아이템, 플레이골드50뽑기/중복20환급, 서버난수·소유검증·run장비고정. 보스중간저장+종료재생정산/입력prefix검증/차액보상/멱등성/0ms입력거부. 닉네임PIN연결후11·21·31스킵,항상10점시작. 시작구간랭킹분리.
- 좌우20초·무한, 앞블록즉시정지형2.5D/모바일확대,1.2초내연속+5/100→5초보라피버,3실수ㅠㅠ·시간끝^^900ms.
- 도심개별차량무작위간격8~58m/반복차선/최고속도경로검증/물리길이4·5·6·8m. 동일차선입력시1~2m근접회피만1회지급(최고속3m조기회피도제외). 연료2/sec,코인150~230m/연료초회280~360·이후1100~1400m. 무한보급불가.
- 멀리뛰기충돌시월드/거리정지,공중캐릭터착지·X눈650ms후결과. 지상/공중충돌실브라우저확인.
- v4타자/레이싱물리legacy동결/구정산호환/구기록보존. 새그룹v5, 구규칙초대새도전안내. RPG공유는모험초대,공정비교친구방기본장비1부터.
- 66개자동검사통과. v5브라우저320·390·1440폭시작/보스10/120골드중간저장/뽑기/장착리로드/11스테이지10점/종료정산,피버/종료표정확인. 주행실제입력재현 seed6: 근접42·부스터1(연장포함)·1112m·동전1, 연료종료/서버정산성공.
- 전체21종/78화면브라우저검증통과. 개발게임클라이언트4종실행하고각이미지·JSON실제검토. output/game-v5/에보고서및그림.
- 최종66/66자동검사,사회적친구방·공유검사통과. 백업 data/backups/dwingul-before-v5-20260913131228.sqlite. 4173최신서버재시작완료, users3/runs46/records0/groups0/shares0/racing_wallet1/run_rewards0 보존, integrity ok. RPG4테이블정상추가. 공개배포없음.
- 테스트4174서버종료. 사용자4173서버 session4267 유지. 최신 타이핑 마스터 시작 화면의 앱 열기 요청 등록(queued).

2026-09-13 게임 v6 피드백 반영:
- 원인확인: 실제 사용자게스트 best_cleared14/gold30/items2 저장됨, pin미연결로checkpoints[1]만노출. 저장 UI가시성부족. 이전데이터삭제없음.
- rpg.profile earnedCheckpoints/추천최신시작 추가. 시작·결과·장비탭에저장카드/프로필폼, 게스트잠금다음탄표시, 같은user_id에프로필생성하여아이템·장착유지. 일반몬스터처치자동저장까지확대. 생성/리로드/다른브라우저복구/11시작10점검증.
- 점프두번째vy-700/중력1250(기존단일-610/1500유지), 높은벽148~163/폭48~66. 1250가지조합(25종×2속도×25입력타이밍) 통과율32.24→72.56%. 한단점프로높은벽불가유지.
- 회피상한2→6m,입력순간같은차선·1~6m한번. 연료첫140~180m이후550~700m로간격절반. 차량차체바닥좌표원근투영,지붕·측면·바퀴, 실제fore/aft와동일한pass상태주황/초록통과라벨. 차선옆공간HUD/모바일도로세로확대.
- racing/jump v6 분리, v5레이싱엔진legacy동결, 기존run 정산호환. RPG·sort규칙v5유지.
- v6 실제브라우저게스트14/2회장비뽑기·장착/프로필생성·리로드/11탄시작10점·장비동일,모바일320/390·PC1440가로넘침없음. 게임클라이언트레이싱·점프·타자이미지/JSON실제검토. 실제키입력4253m·근접156·부스터1연장·동전9·자동정산성공. 전체21흐름/78화면통과.
- 최종77/77 통과. 백업 data/backups/dwingul-before-v6-20260913133800.sqlite. 4173 재시작 후 전체 테이블행수·클리어14·골드30·공격/회복 장착2개 모두일치, integrity ok. 테스트4174종료완료/사용자4173 session63095 유지.

2026-09-13 게임 UI v7 진행:
- 재현: 320px 레이싱 상태 두줄에서 도로 top 341.98→359.17(+17.19px), 타이핑 상점→장비 탭 scroll0 초기화.
- shell을 pathname 단위로 구분하여 동일화면 갱신/탭/필터에서 현재 scroll/focus 복원. 새화면만 top. dialog 열림은 게임/오디오 pause 사유로 별도 합성.
- 도심 HUD·상태·차선칩 두줄높이고정, mobile canvas1100:1000 비율/주소창 높이변화무시. ↑/Numpad8/Space와 모바일 원형 부스터. 320/390/1440에서 도로위치동일, 실제fixture로 PC↑/모바일터치 부스트 성공.
- 뽑기 중앙 native dialog: 열기연출→터치reveal→4등급outline·즉시장착. 기존멱등서버차감유지. 먼저닫으면 미공개상자버튼으로다시열기(추가차감없음), 회신실패/장착/스크롤유지검증. reduced-motion 지원.
- 독립 리듬엔진/화면 합성음: 4박 countin→listen/respond,8라운드96~124BPM,1박bridge,첫다운비트-150ms조기입력지원,±80/150ms,콤보/에너지. 키다운/포인터다운시점채점/키반복·release중복방지. 실제cue와박자에시각반응,음소거/일시정지/백그라운드오디오정지/정리. v7별도순위·친구방버전.
- spec 검토에서 조기닫기 자동공개1건 발견하여 미공개상자보관으로수정. 하위검토도구사용량제한으로이후통합/코드검토/브라우저검증은주에이전트수행.
- npm test86/86. ui-v7-browser:3폭고정/PC·터치부스터/모달pause/탭·장착scroll/열기·reveal·장착/실패/보관상자 추가결제없음통과. rhythm-v7-browser3폭, rhythm-play-v7-browser8라운드완주47perfect/100%/6775점·keydownhold·조기다운비트·실제AudioContext생성·suspend/resume/close·무음폴백 통과. skill게임클라이언트city/typing/rhythm 실행하고이미지·JSON실물검토.
- 최종 전체21흐름/78화면 및 social친구방·공유 통과. v6게스트14/아이템/프로필연결/11스테이지시작회귀통과. 작은320×568은첫진입높이에맞춰캔버스축소후고정, 부스터를좌우버튼사이로배치해도로를가리지않고모든조작558px이내노출.
- 백업 data/backups/dwingul-before-v7-20260913142012.sqlite. 4173 새서버 session55550, 적용전후 모든테이블행수일치(users3/runs67/records0/groups0/shares0/rpg_draws4/inventory3/progress3/run_rewards9), 사용자 best14/gold50/attack-common·heal-uncommon 장착 보존, integrity ok. 변경한서버정적모듈응답확인.
- DB최종비교는 SQLite null-prototype행을JSON정규화한뒤엄격비교하여통과. 정적서빙신규rhythm연결확인. 테스트4174 종료. 새리듬시작화면 앱열기 queued. 미완료필수작업없음.


2026-09-13 콘텐츠·공통 프로필 v8 완료:
- 실제 원인: 초성 오답 후보가 다른 초성을 우선했고, 공통 users.id는 있으나 사주 입력·브라우저 이력과 RPG 저장 UI가 분리돼 있었음.
- 300문항 네 보기의 전체 초성/단어별 길이/공백 동일. 드라마 제목 변형·캐릭터 근접 발음으로 구성. 기존 guess-bank-v3와 v1 재현·채점·공유 유지, 새 initial-match-v8/종목-initials-v8 분리.
- 원본 12상황/4선택 사업가 테스트, 보기 순환으로 순서 편향 완화. 개척가/장인/연결가/설계가 비중·동률·강점/주의/작은 실험/파트너 안내. 단톡방은 닉네임만, 사주 계산과 결과 기둥 제거.
- 생일8자리 텍스트(ISO/점/슬래시도 수용), 시간24시 시/분 dropdown+모름. 입력 검증은 클라이언트/서버 양쪽 solar/lunar/leap·실제날짜·미래·잘못된시간 포함.
- 상단 공통 프로필 → 기존ID에 연결. profile_details/private_history/personal_bests 3테이블 추가. 같은ID의 RPG진행/보유장착/차량토큰 유지. 개인결과최근100·모드별최고기록 복구, 공개랭킹자동등록없음. 원본생일/시각은 선택저장때만 전송, 공유·개인결과 payload에서도 원본 제외.
- 기존 브라우저 birth는 명시선택 전 서버이관없음. 계정별 로컬캐시·레거시이력 한 번 이관, 저장실패시원본유지. 같은브라우저 자동연결, 긴 복구코드+PIN으로 다른브라우저 복구, 계정간 캐시 혼합없음. 다른사람1회입력은 저장한생일 덮어쓰지않음.
- 90/90 자동검사 통과. v8모바일실제폼/생일비저장/생일저장/다른사람·불러오기/단톡방·사업가완료/결과재열기/다른브라우저복구/RPG·차량일치 검증. 전체21종 및 84반응형화면, social공유·친구방, v6장비·보스14게스트저장·11시작, v7부스터/뽑기/스크롤 회귀 통과. 모바일·PC 이미지 실제확인.
- 백업 data/backups/dwingul-before-v8-20260913143844.sqlite. 기존 모든테이블행수와 전체행 SHA256지문 재시작전후 동일. users3/runs71/rpg_draws7/inventory5/progress4/run_rewards10 등 작업중사용자변경도 보존, integrity ok. 신규3테이블 초기정상. 정적새파일200.
- 4173 최신서버 session33592 실행 유지, 4174테스트서버 종료. 공통프로필 화면 앱열기 queued: /?v=profile-content-8#/profile. 배포·DNS변경 없음. 필수 미완료 작업 없음.

2026-09-14 픽셀 패키지 v10 시작:
- 요청: 21종 의미가 드러나는 새 썸네일 + 게임/퀴즈/성향/운세 내부의 모든 그래픽을 홈의 픽셀 스타일로 제작·적용.
- v9 배포 완료 상태(main e2ebd9f)에서 시작. 기존 캐릭터 썸네일 반복 및 게임 내부 둥근 CSS/벡터 캐릭터 혼재 확인.
- 제작 목록/적용 위치/검증 기준 docs/plans/2026-09-14-pixel-package-v10.md 작성. 실제 사용자 DB 보존, 4174 메모리 DB만 테스트.

2026-09-14 픽셀 패키지 v10 구현·검증:
- 21개 서비스별 새 장면 일러스트와 모바일/큰 화면용 WebP 42개, 투명 캐릭터 원화 11개 제작. 최종 원본은 design/masters, 프롬프트는 design/*.json, 공개 목록은 docs/design/README.md와 /artbook/에 정리.
- 내부 UI 공통 종이·나무·숲색 스타일 적용. 실제 타이핑 영웅/25몬스터/25보스, 312장비, 상자, 16성향초상, 타로22+뒷면, 오행5, 정렬캐릭터 표정, 차량7 및 아이템 등 연결. SVG는 제작기에서 재현하며 RPG는 검증한 로컬 투명 WebP만 포함.
- 독립 검토에서 실제 차량 아트 연결, 점프 자세, 공유받은 결과 썸네일, 이미지 오류 대체, 아트북 치수/한국어 검색 누락을 발견해 반영. 차량은 기존 노면 접점·길이·충돌을 유지하는 투영 방식으로 새 자산을 표시. 멀리 뛰기는 모바일에서 논리 화면640폭으로 확대, 달리기2/점프/숙이기/실패X 상태를 연결.
- 생성 도중 두 포즈의 가짜 투명 배경을 발견하여 재제작, 최종11 WebP 모두 실제 alpha 검증. 단위 테스트에 투명 채널·482개 목록·실제 SVG 비율·한국어 검색을 검증하도록 추가.
- 검증은 4174 메모리 DB와 별도 테스트 브라우저만 사용. 사용자 4173 DB 및 운영 데이터/서버 규칙 변경 없음. 최종 자동 검사147개, 전체 브라우저 실행 5폭/115화면·게임13확인·결과5종·장비/뽑기·아트북482항목 모두 통과, findings 없음. Cloudflare 로컬4175에서 정적 리소스507개와 가이드3개 통과.
- 배포 완료: GitHub main fd6322a, Cloudflare a803a3b4-246d-421a-8791-eb94b93e8c03. dwingul.com/www 사용자 지정 도메인 배포 성공. 운영 읽기 전용 확인에서 제작물482개·정적 리소스507개·대표 가이드3개 HTTP200, 모바일 아트북/가이드 그림·레이아웃 직접 확인.

## 2026-09-14 — v11 release preparation

- Hero-only readable type, email/partnership footer, account-scoped recent ordering and reset handling.
- 300 original guessing clues under initial-clues-v11; frozen V8 bank retained.
- Racing V7: 8 cars, fuel-as-health, armor, 0.5/s drain, 1.5x pickups, per-car boost traits and illustrated upright vehicles.
- Jump V11 uses world-distance scheduling. Rhythm V11 has three explicit lanes and fixed keyboard/countdown behavior; mobile start panel no longer clips its button.
- RPG: 16 cosmetic characters, atomic ownership/equip and recovery, 25 species, compact HUD with legible enemy status over illustrated background.
- Generated 13 source atlases/backgrounds, exported 494 production PNGs and 526-entry artbook. 312 equipment cards derive from 75 base illustrations; original16 character identities retained.
- 31 crawlable pages with unique metadata, categories, canonical links, schema and image sitemap.
- QA evidence: 199 unit/API tests, 115 responsive views (320–1920), 20 game views, real RPG/rhythm/jump controls, prior-mode replay and sharing guards, image fallbacks; independent review issues resolved.
- Released from GitHub main 4c13f04 (PR #1), Cloudflare version 24c2fdf3-f464-4aa1-9e67-bc8c76f3019d. Production read-only check passed: artbook526, resources551, crawlable pages31 with unique titles/canonical/contact, www308, private server modules404. Existing in-app browser renders current home and RPG character menu. No production game/profile creation or test purchases were performed.

## 2026-09-14 — v12 scene/fortune/camera release preparation

- User requested illustrated play scenery and obstacles, fortune analysis dialog, content-first compact results and bottom actions, explicit privacy use consent. Later added correct car camera views and cross-game orientation audit.
- Added 89 production scene/pose PNGs from 12 stored generated source atlases/backgrounds. Built-in imagegen handled art and camera edits; Sharp encodes source alpha or reserved chroma backing and slices sprites. No painted checkerboards shipped. Artbook total615.
- Forest jump/floor/4obstacles, lodge sort, memory/color/timing/rhythm tabletop, RPG scene framing, city village/road/4props, analyzing cat. Readable jump HUD, exact color cells and contact geometry retained.
- Traffic4types×5authored angles, depth-aware view selection; player8rear poses. New sprite natural aspect ratio and floor anchoring. Typing16heroes face right,25monsters left; menu/collection portraits unchanged.
- Four fortune flows use required unchecked use consent, independent optional birth remember, cancellable local-analysis dialog and explicit one-shot result confirmation. Birth raw fields excluded from shares. Derived private history retention is described separately in consent and privacy page.
- Root visual inspection fixed initial tarot intrinsic image overflow and daily CSS-spritesheet clipping; allfour headers now bounded standalone images. CSS/Canvas missing-art fallbacks verified.
- Verified:217unit/APItests,89assets/615artbook/31crawlable build;36DOMgame views320/390/1440 with7×7hardmemory/color;11Canvasviews;6vehicle views including28all-angle/rear sprites;4duel views plus41asset requests;24fortune captures and8flows withretention/cancel/duplicate/share/fallback checks. Official game client jump and racing executed. Independent material findings resolved.
- Testing used4174/4176in-memory servers, no changes to user4173 or realDB. No productiontest records. Released after final sequential checks: GitHub PR#2 / main4182504, Cloudflare1a47197f-176d-4efb-a78c-01e6b361934d. Read-only production verification:615artbook entries,646resources,31unique crawlable pages, www308/private modules404; live artbook390/1440 vehicle28+duel41loaded withoutoverflow. Release docs/releases/2026-09-14-v12.md. No remaining required work.

## 2026-09-14 — v13 play experience

- Latest user corrections supersede the previous rhythm repair request: retired sequence from discovery/new gameplay, retained old records and read-only result shares. 20 active contents and 30 crawlable pages.
- Rebuilt energy semantics as 12 original directness/empathy situations, complementary percentages and 5 outcome bands; versioned results remain recoverable/shareable.
- Jump v13 steps every 10 active seconds, target 5+level obstacles/10sec, speed min(420,220+24*level), family-safe spacing. v11 replay kept. Rear-only racing includes newly generated rear bus and rear geometric fallback. Memory show phase remains opaque.
- RPG HUD/duel/input integrated in one scene using the user's references. Mobile labels and monster counter remain legible. Found and fixed pause/resume disabled-state and overlay interaction during integration.
- Added reproducible 585 WebP delivery variants, content hashes/immutable cache, current-game-only preload/decode gate, lazy calendar loading. Fixed delayed route response contamination, unstarted-run cleanup ownership/progress checks, retired-group joins and archived-result display after independent review.
- Controlled cold-load bytes: home3.83→2.25MB, typing2.02→1.47MB, racing3.83→1.56MB. These are local throttled measurements, not universal user speed claims; no warm-speed claim. Source art retained.
- Latest unit/API suite:236/236 passed. Integrated36 game views at320/390/768/1440, real attacks/pause/resume/steering, memory/fallback, energy percentages/history/share/recovery, calendar/run races verified. Official game client jump+racing executed and screenshots viewed. Testing only isolated memoryDB; user4173 and actualDB untouched.
- Release details/evidence: docs/releases/2026-09-14-v13.md. Released through PR#3, implementation9eb9860/merge5960b79, Cloudflare99d40d73-3c27-429b-95fb-289b2ba2683f. Read-only production checks passed:650base resources,585source-to-delivery checks (583unique files),615artbook,30crawlable pages,8source hashes,WebP MIME/cache,www308/private modules404. Owned4176 stopped; user4173 PID95174 preserved. No remaining required work.

## 2026-09-14 — v14 typing corrections

- User reported HP loss on every correctly typed Korean character, requested a visible pause control, shorter PC battlefield/actors, matching pixel panels, and no layout expansion when opening battle details.
- Reproduced unflagged Korean pre-edit values: final exact target `잔잔한 물소리` reduced HP100→88 before a counter. Native fully flagged composition alone did not reproduce it. The input boundary now buffers uncertain edits, NFC-normalizes text, charges correct-prefix MP, and applies typo damage only to the confirmed attack. The server replay model and existing versioned rules/logs are unchanged. Identical failing browser scenario now remains HP100.
- Rebuilt the scene with square brown borders/paper/shadows, PC height420–560px, actors up to136/144px, persistent top-center pause. Details use a bounded internal overlay; input and arena geometry stay fixed.
- Checks:240unit/API tests pass. Six viewport checks1440/1366/1280/1024/390/320, genuine Chromium composition viaCDP plus unflagged pre-edit, NFD, correction, confirmed typo feedback, counter, heal15, and pause/resume passed. Official game client run captured separate draft inputs. Test server4176 uses memoryDB; user4173 and production records are untouched.
- Released: PR#4 implementation365b7fa/main76dd772; Cloudflaree2a96db0-217c-4252-a49e-c7eabcb5c713. Four production JS/CSS hashes match tested artifacts, home200. Test4176 PID43864 stopped; user4173 PID95174 preserved. No remaining requested work.

## 2026-09-15 — v15 typing menu and long sentences

- User requested consistent Safari monster HP, a Minecraft-layout-inspired in-game title/menu, and 250 long 20–30-character sentences with double attack. Existing illustration/pixel style retained; no third-party game assets copied.
- Added a bounded forest title/menu with settings, shop, equipment, characters and profile panels. Internal lists scroll without moving the frame; mode/checkpoint survive navigation, batch-draw return and profile recovery.
- Added short/long mode settings through client, server replay, checkpoints, rewards, records, rooms, shares and private history. Short record key/rules remain compatible; long has its own key and doubles final equipment/combo damage. Inventory and unlocked chapters are shared.
- Long deck: 250 unique static reviewed sentences (23–30 characters including spaces), 200 traditional-proverb adaptations and 50 original wisdom lines; source/editing notes in docs/content. Removed draft automatic word deletion and directly repaired awkward shortened sentences before release.
- Replaced native meters with common accessible 11px square gauges. Fixed narrow-mobile HP text overlap and small-PC internal overflow when opening help; cleared stale menu toast when starting combat.
- Verified 250 unit/API tests, 12 Chromium/WebKit menu+combat views, 2 engine shop/draw/equip/enhance/delete flows, old Korean composition/correction/heal and 6 short-mode layouts. Official game client captured long-mode drafts at HP100; screenshots visually inspected. Full build succeeds with 615 artwork entries and 30 crawlable pages. Test data only isolated memory DB; production/user4173 untouched.
- Released through PR#5 implementation03e1907/main88037e3. Cloudflaredc4536b1-5517-4b50-a6ec-23fe24634249; 11production JS/CSS hashes match tested build, home/typing guide200 and www308 verified read-only without API requests. User4173 PID95174 preserved; isolated root4176 stopped. See docs/releases/2026-09-15-v15.md. No remaining requested work.

## 2026-09-15 — v16 jump implementation handoff

- Jump-owned modules now implement 3 health, ~1000m healing hearts capped at 3, six 1000m stages, per-stage 1.2x cadence, retained 10-second speed/density growth, safe pattern gaps, 150ms landing input buffer and explicit Space/Up/W held-key tracking.
- Stage 2 is warmed at start; each new stage warms only its successor. Runtime expects root-provided `jump-stage-2..6` backgrounds and four obstacle assets per stage in scene-art sources.
- Review follow-up guarantees hearts only appear after a pattern clears and reserves a pickup corridor before the next pattern. Every stage now tiles its own ground; easy favors 75% basic patterns, then double and slide unlock progressively. A 120-second-per-stage scheduler check confirms actual cadence rises without breaking safe clamps.
- Jump-focused unit/physics regression tests pass 21/21, including maximum-speed avoidability. Shared v16 routing then allowed Chromium QA to pass Space/Up/W buffer, pause, 6000m all stages, heart cap, three-hit ending and paused ending. Screenshot inspected; new stage art was not registered yet, so final art rerun remains with root. Exact requirements and evidence: `docs/plans/v16-jump-report.md`.

## 2026-09-15 — v16 racing implementation unit

- Froze the prior current engine as `legacy/city-engine-v7.js`; reward settlement routes V7 and V16 to their matching deterministic engines.
- V16 uses 1.1 fuel/sec, +8 recovery, first fuel 220–280 m, later fuel 650–850 m, and a longer 18→48 m/s elapsed-time acceleration curve.
- Roadside scenery now shares road world distance, sorts by depth, and has projected contact shadows. Game over holds the stopped road scene for 650 ms before the V16 result.
- Focused engine/legacy/traffic/art checks 25/25 and memory-only browser freeze/visual run passed. Official game client run and screenshots inspected. User4173 and persistent DB untouched.
- Root must switch shared racing defaults/mode names/catalog/rules to V16. Full detail: `docs/plans/v16-racing-report.md`.
- Follow-up: `city-racing.js` now routes visible V4–V7 playback through frozen engines and emits matching versioned result modes/details; V7 keeps immediate historical ending while V16 alone pauses 650ms. Direct browser mounts proved V7/V16 one-second balance and modes independently. Prop footpoint/shadow screenshots at 120m, 300m, and 500m were visually inspected and remain grounded.

## v16 통합 완료 (2026-09-15)
게임 3종 개선 및 신규 원화36개, v16랭킹·정산, 정적안내20개/RSS/sitemap 반영. 전체268테스트, Chromium/WebKit36점검과 6000m구간플레이 통과. PR6병합 f4c15ba, Cloudflare a41a6bb1-7a6e-4743-85b9-61d7428735b6. 운영30페이지/14파일해시/18봇UA조회확인. GSC sitemap30/RSS21 읽기성공; 색인요청 진행결과는 출시문서 참고.

서치콘솔 홈 및 도심질주 안내 색인 생성 요청 접수 완료. sitemap30/RSS21 읽기성공과 별개로 검색 노출 및 AdSense 준비중 상태는 Google 처리 대기. 사용자 서버4173 유지, QA서버종료.

## v17 구현 및 검증 (2026-09-15)
타이핑의 자모 환산 타수/제출 정확도와 결과 카드, 프로필 통계 보관을 추가했다. IME를 포함한 초안과 제출은 분리하며 치명적 오타도 통계에 포함. 서버 재생과 이상 입력 속도 제한 적용. 멀리 뛰기는100개 기술 묶음/공중 급강하/착지 슬라이딩과260→480가속을 적용하고 v16을 동결해 v17 랭킹 분리. 전체283검사, 타이핑6화면, 점프 호환8화면, 실제6000m 무피격 통과. 출시 상세 docs/releases/2026-09-15-v17.md. 운영배포확인은 다음 단계.
