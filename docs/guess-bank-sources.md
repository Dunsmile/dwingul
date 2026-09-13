# 뒹굴 맞히기 문제 bank 자료 근거

문항과 해설 문장은 뒹굴용으로 새로 작성했다. 외부 문장의 줄거리 표현은 옮기지 않았다. 드라마는 공식 서비스에 표시된 제목 표기를, 애니와 게임은 제작사·배급사의 작품 및 캐릭터 명단을 확인하는 용도로만 아래 자료를 사용했다. 초성은 `canonicalAnswer`에서 실행 시 자동 산출한다.

## 드라마 제목

- [Netflix 한국 드라마 공식 장르 목록](https://www.netflix.com/kr/browse/genre/2638104): 넷플릭스 제공작의 한국어 제목 표기 확인.
- [정신병동에도 아침이 와요 공식 작품 페이지](https://www.netflix.com/kr/title/81572595): 영문 제목 `D.P.`를 대신한 한글 제목 확인.
- [모래에도 꽃이 핀다 공식 작품 페이지](https://www.netflix.com/kr/title/81701142): 영문 제목 `W`를 대신한 한글 제목 확인.
- [KBS 프로그램 공식 사이트](https://program.kbs.co.kr/): KBS 드라마 제목 표기 확인.
- [SBS 드라마 공식 사이트](https://programs.sbs.co.kr/drama): SBS 드라마 제목 표기 확인.
- [tvN 드라마 공식 사이트](https://tvn.cjenm.com/ko/): tvN 드라마 제목 표기 확인.
- [MBC 드라마 공식 사이트](https://program.imbc.com/drama): MBC 드라마 제목 표기 확인.

드라마 문항은 제목 자체와 그 제목에서 계산한 초성만 사용한다. 따라서 줄거리·배우·방영 연도처럼 바뀌거나 혼동하기 쉬운 부가 사실을 정답 근거로 삼지 않는다.

## 애니 캐릭터

- [ONE PIECE.com 캐릭터 검색](https://one-piece.com/character/index.html)
- [TV 도쿄 나루토 질풍전 캐릭터](https://www.tv-tokyo.co.jp/anime/naruto/chara/index.html)
- [귀멸의 칼날 공식 캐릭터](https://kimetsu.com/anime/character/)
- [주술회전 공식 캐릭터](https://jujutsukaisen.jp/character/)
- [나의 히어로 아카데미아 공식 캐릭터](https://heroaca.com/character/)
- [명탐정 코난 요미우리TV 공식 캐릭터](https://www.ytv.co.jp/conan/character/)
- [드래곤볼 공식 사이트](https://dragon-ball-official.com/)
- [미소녀 전사 세일러문 공식 사이트](https://sailormoon-official.com/)
- [SPY×FAMILY 공식 캐릭터](https://spy-family.net/tvseries/character/)
- [진격의 거인 공식 캐릭터](https://shingeki.tv/final/character/)

작품별로 열 명씩 구성했다. 문제에는 작품명과 한국어 캐릭터명 초성만 제시한다. 설명도 해당 작품과 캐릭터명의 연결만 확인한다.

## 게임 캐릭터

- [Nintendo 공식 캐릭터·시리즈 안내](https://www.nintendo.com/us/store/characters/): 슈퍼 마리오, 젤다의 전설, 동물의 숲, 별의 커비.
- [Sonic Channel 공식 캐릭터](https://sonic.sega.jp/SonicChannel/character/)
- [Overwatch 공식 영웅 목록](https://overwatch.blizzard.com/ko-kr/heroes/)
- [Overwatch 오리사 공식 영웅 페이지](https://overwatch.blizzard.com/ko-kr/heroes/orisa/): 영문 이름 `D.Va`를 대신한 한글 캐릭터명 확인.
- [League of Legends 공식 챔피언 목록](https://www.leagueoflegends.com/ko-kr/champions/)
- [FINAL FANTASY VII REBIRTH 공식 캐릭터](https://www.square-enix.com/asia/newsportal/ko/topics/final-fantasy-vii-rebirth/)
- [BIOHAZARD Portal 공식 시리즈 안내](https://game.capcom.com/residentevil/)
- [Street Fighter 6 공식 캐릭터](https://www.streetfighter.com/6/ko-kr/character/)
- [한국닌텐도 동물의 숲 amiibo 카드 목록](https://www.nintendo.com/kr/front_images/amibo/lineup/178/76e0f2416e708aaccf6eb85423ed94fd.pdf): 영문 이름 `DJ K.K.`를 대신한 `콩돌이` 표기 확인.

게임도 작품명과 캐릭터명 초성을 중심으로 묻는다. 서로 다른 지역판에서 이름이 달라질 수 있는 경우 한국 서비스에서 널리 쓰이는 표기를 `canonicalAnswer`로 고정했다.

## 검증 규칙

- `drama`, `anime`, `game` 각각 정확히 100문항, 총 300문항.
- 모든 ID와 정답 문자열은 bank 전체에서 중복되지 않음.
- 모든 정답 문자열에 초성 놀이가 가능한 한글 완성형 음절이 하나 이상 포함됨.
- 각 문항은 서로 다른 실제 제목·캐릭터명 보기 네 개를 가짐.
- 정답 index가 `canonicalAnswer`를 가리킴.
- 표시 초성은 `hangulInitials(canonicalAnswer)`와 일치함.
- 같은 초성을 가진 보기가 한 문제에 둘 이상 들어가지 않음.
