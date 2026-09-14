# 장문 타자 문구 v15 출처와 편집 원칙

## 구성

- 총 250문장이다. 공백과 문장 부호를 포함한 유니코드 코드 포인트 기준으로 각 문장은 20~30자다.
- `traditional-adaptation` 200문장은 전통 속담 50종의 뜻을 현대의 자연스러운 문장으로 풀어 썼다. 원문 인용 모음이 아니라 속담마다 관계, 학습, 일, 판단 등 서로 다른 적용 장면을 담은 편집 문장이다.
- `original-aphorism` 50문장은 Typing Master용으로 새로 쓴 지혜 문장이다. 역사적 인물이나 옛 문헌의 말로 표시하지 않는다.
- 현대 작가, 연설가, 상업 명언집의 문장은 사용하지 않았다. 사람 이름을 붙인 명언도 없다.

## 참고한 공공 자료

2026년 9월 15일에 다음 자료를 참고해 전통 속담의 표기와 성격을 교차 확인했다.

1. 국립국어원 우리말샘 및 온라인가나다
   - 우리말샘에 수록된 속담의 표기와 뜻을 확인하는 기준으로 사용했다.
   - [늦게 배운 도둑이 날 새는 줄 모른다](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=315560)
   - [굳은 땅에 물이 괸다](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=321031)
   - [소금 먹은 놈이 물켠다와 아니 땐 굴뚝에 연기 날까](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5691&mn_id=217&pageIndex=217)
   - [아 해 다르고 어 해 다르다](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=322521)
2. 한국학중앙연구원 한국민족문화대백과사전
   - 속담이 공동체에서 전승되며 일상의 사물과 현상으로 생활의 지혜와 통념을 표현한다는 설명을 편집 원칙의 근거로 삼았다.
   - [속담](https://encykorea.aks.ac.kr/Article/E0030388)
   - [속담대사전](https://encykorea.aks.ac.kr/Article/E0030389)
   - [속담사전](https://encykorea.aks.ac.kr/Article/E0030391)

이 자료들은 개별 문장 250개의 직접 출전이라는 뜻이 아니다. 전통 속담 자체와 그 일반적인 뜻을 확인하기 위한 참고 자료다. 실제 연습 문장은 길이와 가독성에 맞게 새로 풀어 썼으며, 각 문장의 `basis` 필드에 바탕이 된 속담 또는 창작 문장임을 표시했다.

## 데이터 사용

`public/js/typing-long-phrases.js`는 다음 두 값을 내보낸다.

- `typingLongPhrases`: 화면에서 바로 사용할 문자열 250개의 배열
- `typingLongPhraseMetadata`: 각 문자열의 `text`, `kind`, `basis`를 같은 순서로 담은 배열

길이가 30자를 넘는 초안은 문법과 뜻을 확인하며 직접 고쳤다. 실행 중 단어를 자동 삭제하거나 문장을 자르는 처리는 하지 않는다. 최종 문장을 그대로 보관해 저장된 게임의 재생 결과도 일정하게 유지한다. 테스트는 최종 내보내기 결과를 기준으로 개수, 중복, 길이, 메타데이터 대응을 검사한다.
