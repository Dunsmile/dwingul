import {ENERGY_TEST_VERSION, energyTest, makeEnergyResult} from './energy-test.js';

export const PERSONALITY_TEST_VERSION = 'axes-v9';
export const LEGACY_PERSONALITY_TEST_VERSION = 'legacy-v8';
export {ENERGY_TEST_VERSION};

const axis = (id, label, first, second) => ({id, label, poles: [first, second]});
const pole = (code, name, strength, balance) => ({code, name, strength, balance});

const axes = {
  energy: [
    axis('charge', '에너지 충전', pole('O', '바깥 점화', '사람과 움직임 속에서 분위기를 깨우는 힘', '혼자 숨을 고르는 시간을 일정에 먼저 남겨보세요.'), pole('I', '안쪽 충전', '조용한 시간에 생각과 기운을 깊게 모으는 힘', '준비가 끝나기 전에도 편한 사람에게 생각을 한 줄 건네보세요.')),
    axis('pace', '움직이는 속도', pole('Q', '빠른 시동', '작은 행동으로 가능성을 바로 확인하는 추진력', '시작 전에 멈출 기준 하나만 정하면 힘을 오래 쓸 수 있어요.'), pole('D', '숙성 리듬', '충분히 살핀 뒤 흔들림 없이 움직이는 집중력', '결정할 시간을 정해두면 생각이 실행으로 더 잘 이어져요.')),
    axis('care', '마음을 돌보는 법', pole('H', '마음 공명', '말 뒤에 있는 감정과 관계의 온도를 알아채는 감각', '공감한 뒤 필요한 현실적 도움도 한 번 물어보세요.'), pole('P', '실용 지원', '막힌 지점을 찾아 구체적인 도움으로 바꾸는 능력', '해결책보다 먼저 상대가 지금 듣고 싶은지 확인해보세요.')),
    axis('change', '변화를 만나는 법', pole('N', '새 길 탐색', '낯선 자극을 배움과 재미로 바꾸는 호기심', '새 시도 뒤에는 마음에 든 한 가지를 반복해 내 것으로 만들어보세요.'), pole('S', '익숙함 가꾸기', '좋았던 방식과 관계를 안정적으로 이어가는 꾸준함', '익숙한 루틴 한 칸에 작은 변화를 넣어 숨통을 틔워보세요.')),
  ],
  chat: [
    axis('start', '대화 시작', pole('F', '먼저 열기', '어색한 순간에 첫 말을 꺼내 흐름을 만드는 힘', '한 번 말을 연 뒤에는 다른 사람의 속도를 기다려보세요.'), pole('W', '때를 읽기', '분위기와 사람의 상태를 살핀 뒤 알맞게 참여하는 감각', '생각이 있다면 완벽한 타이밍보다 짧은 한마디로 먼저 표시해보세요.')),
    axis('volume', '메시지 호흡', pole('B', '풍성한 반응', '표현과 리액션을 넉넉히 건네 대화를 살리는 힘', '중요한 말은 한 줄로 다시 정리하면 더 잘 전달돼요.'), pole('M', '간결한 반응', '필요한 말을 골라 또렷하고 부담 없이 전하는 힘', '짧은 답에도 내 기분을 보여주는 표현 하나를 보태보세요.')),
    axis('response', '도움을 건네는 법', pole('E', '마음 먼저', '상대가 느낀 감정을 알아주고 안전한 대화를 만드는 힘', '마음을 들은 뒤 무엇을 함께 할지 구체적으로 물어보세요.'), pole('S', '해결 먼저', '상황을 정리하고 다음 행동을 빠르게 제안하는 힘', '제안 전에 공감 한 문장을 건네면 해결책도 편하게 들려요.')),
    axis('flow', '약속을 만드는 법', pole('C', '정리와 조율', '흩어진 의견을 선택지와 약속으로 묶는 능력', '모두가 아직 말하지 않았을 수 있으니 결정 전에 한 번 더 물어보세요.'), pole('L', '자연스러운 흐름', '부담을 낮추고 각자의 리듬이 이어지게 두는 여유', '정해야 할 시점에는 내 선호와 가능한 범위를 분명히 알려주세요.')),
  ],
  taste: [
    axis('novelty', '새로움의 온도', pole('N', '새 취향 발견', '익숙하지 않은 것에서도 재미의 단서를 찾는 호기심', '새 경험 중 다시 만나고 싶은 하나를 골라 취향으로 남겨보세요.'), pole('F', '익숙한 취향', '내가 좋아하는 결을 알고 만족스러운 선택을 반복하는 감각', '좋아하는 것과 닮았지만 한 가지가 다른 선택을 곁들여보세요.')),
    axis('planning', '계획의 밀도', pole('P', '미리 그리기', '기대하는 장면을 계획해 시간과 선택을 알차게 쓰는 힘', '계획에 비워둔 한 칸을 만들어 우연한 발견도 받아보세요.'), pole('S', '그때 고르기', '지금의 기분과 상황에 맞춰 유연하게 즐기는 힘', '꼭 하고 싶은 한 가지만 먼저 정하면 여유가 더 편안해져요.')),
    axis('company', '함께하는 크기', pole('G', '여럿의 활기', '여러 사람의 다른 반응 속에서 즐거움을 키우는 힘', '모임 뒤에는 혼자 쉬거나 한 사람과 천천히 이야기할 시간을 챙겨보세요.'), pole('I', '작은 관계', '소수와 깊고 편안한 시간을 만드는 집중력', '가끔은 느슨한 모임에 참여해 새로운 취향의 입구를 만나보세요.')),
    axis('setting', '쉬는 장면', pole('A', '움직이는 휴식', '걷고 보고 해보는 과정에서 기분을 환기하는 힘', '바쁜 체험 사이에 아무것도 하지 않는 짧은 틈을 넣어보세요.'), pole('C', '포근한 휴식', '편안한 공간과 감각을 세심하게 가꾸는 능력', '좋아하는 공간을 벗어난 짧은 산책이 새로운 영감을 줄 수 있어요.')),
  ],
};

const questionRows = {
  energy: [
    ['친구들과 비어 있는 오후가 생겼어요.', '먼저 같이 할 일을 꺼내본다', '혼자 하고 싶던 일을 떠올린다'],
    ['좋은 아이디어가 갑자기 떠올랐어요.', '작게라도 바로 해본다', '순서와 필요한 것을 먼저 적는다'],
    ['친구가 속상한 일을 털어놓아요.', '어떤 마음이었는지 더 들어본다', '지금 풀 수 있는 일을 함께 찾는다'],
    ['비슷하게 흘러가던 주말, 더 끌리는 쪽은?', '처음 가는 곳을 하나 찾아본다', '좋아하는 장소에서 편히 보낸다'],
    ['사람이 많은 행사에서 쉬는 시간이 왔어요.', '옆 사람에게 가볍게 말을 건다', '조용한 곳에서 잠깐 기운을 모은다'],
    ['예상하지 못한 한 시간이 비었어요.', '마음 가는 일을 바로 시작한다', '할 일을 살펴 가장 좋은 쓰임을 고른다'],
    ['의견이 부딪힌 대화를 정리한다면?', '서로 어떤 기분이었는지 확인한다', '합의된 사실과 다음 일을 정리한다'],
    ['자주 하는 일을 더 잘하고 싶어요.', '새 도구나 방식을 시험해본다', '지금의 루틴을 한 단계 다듬는다'],
    ['기분 좋은 소식이 생겼어요.', '떠오르는 사람에게 바로 알린다', '혼자 충분히 기뻐한 뒤 이야기한다'],
    ['두 선택 사이에서 확신이 없을 때는?', '일단 하나를 정해 반응을 본다', '차이를 더 비교한 뒤 고른다'],
    ['함께하는 사람이 지쳐 보여요.', '마음 상태를 묻고 곁에 있어준다', '부담되는 일을 찾아 나누어 맡는다'],
    ['여행에서 하루가 통째로 비었어요.', '예정에 없던 동네로 가본다', '좋았던 코스를 여유롭게 다시 즐긴다'],
  ],
  chat: [
    ['새 단톡방에 초대됐어요.', '먼저 인사와 가벼운 질문을 남긴다', '대화 분위기를 본 뒤 자연스럽게 인사한다'],
    ['친구가 웃긴 사진을 올렸어요.', '리액션과 떠오른 이야기를 함께 보낸다', '딱 맞는 반응 하나를 남긴다'],
    ['친구가 힘든 하루였다고 해요.', '무슨 마음인지 편하게 말하도록 기다린다', '지금 도울 수 있는 일을 물어본다'],
    ['모임 시간이 좀처럼 정해지지 않아요.', '가능한 선택지를 모아 투표를 만든다', '각자 가능한 시간이 나오길 기다려 맞춘다'],
    ['한동안 조용하던 방에 반가운 소식이 있어요.', '내가 먼저 소식을 꺼내 대화를 연다', '알맞은 이야기가 나올 때 자연스럽게 보탠다'],
    ['여행 사진 여러 장을 공유하고 싶어요.', '사진마다 짧은 이야기를 붙여 올린다', '가장 마음에 든 사진만 골라 올린다'],
    ['친구가 선택 때문에 고민 중이에요.', '어떤 점이 마음에 걸리는지 먼저 묻는다', '선택별 장단점을 같이 정리한다'],
    ['저녁 메뉴 의견이 제각각이에요.', '조건을 모아 모두 괜찮은 곳을 제안한다', '이야기가 모이는 쪽에 편하게 따른다'],
    ['처음 만난 사람들과 어색한 순간이에요.', '공통으로 답하기 쉬운 질문을 건넨다', '누군가 시작하면 관심 있는 말부터 잇는다'],
    ['중요한 공지를 확인했어요.', '필요한 친구를 태그하고 내용을 덧붙인다', '확인 표시를 남기고 내 일정에 적는다'],
    ['친구가 실수해서 풀이 죽었어요.', '괜찮다고 느낄 때까지 마음을 다독인다', '수습할 순서를 함께 찾아본다'],
    ['주말 약속이 가까워졌지만 계획이 없어요.', '장소와 시간을 확인해 약속을 확정한다', '당일 컨디션에 맞춰 정해도 좋다고 말한다'],
  ],
  taste: [
    ['쉬는 날 점심 메뉴를 고른다면?', '처음 보는 메뉴를 주문해본다', '생각만 해도 좋은 단골 메뉴를 고른다'],
    ['짧은 여행을 앞두고 있어요.', '가고 싶은 곳과 시간을 미리 정리한다', '도착해서 끌리는 곳을 따라간다'],
    ['주말에 보고 싶은 공연이 생겼어요.', '친구들을 모아 함께 즐긴다', '마음 맞는 한 사람과 조용히 간다'],
    ['하루를 쉬고 난 뒤 개운한 장면은?', '동네를 걸으며 볼거리와 맛을 찾는다', '편한 공간에서 음악이나 영화를 즐긴다'],
    ['영화를 한 편 고른다면?', '평소 안 보던 장르에 도전한다', '좋아하는 분위기의 작품을 찾는다'],
    ['친구를 집에 초대하려고 해요.', '메뉴와 음악을 미리 골라둔다', '그날 먹고 싶은 것을 함께 정한다'],
    ['생일을 보내는 방식으로 더 끌리는 것은?', '여러 사람이 모인 신나는 자리', '가까운 사람 몇 명과 긴 대화'],
    ['비 오는 오후에 시간이 비었어요.', '우산을 쓰고 짧게라도 나가본다', '창가에 자리를 만들고 느긋하게 쉰다'],
    ['선물 가게에서 나를 위한 것을 고른다면?', '써본 적 없는 재미있는 물건', '오래 좋아해온 취향의 물건'],
    ['맛집이 많은 동네에 도착했어요.', '후보를 찾아 동선을 알차게 짠다', '걷다가 마음 가는 곳에 들어간다'],
    ['새 취미를 시작할 기회가 생겼어요.', '함께 배울 사람을 모아본다', '혼자 또는 친한 사람과 천천히 익힌다'],
    ['긴 하루 끝에 기분을 바꾸고 싶어요.', '산책이나 가벼운 활동으로 몸을 움직인다', '씻고 편한 옷으로 갈아입어 푹 쉰다'],
  ],
};

const outcomeRows = {
  energy: [
    ['OQHN','햇살 점화대장','사람 사이로 먼저 뛰어들어 새 길을 밝히고 마음까지 살피는 에너지예요.','떠오른 모임 하나를 작게 열고 끝난 뒤 혼자 쉬는 시간도 예약해두세요.','함께할 이유를 먼저 말하고, 상대가 원하는 속도도 물어보면 좋아요.'],
    ['OQHS','다정한 추진대','따뜻한 반응과 빠른 행동으로 익숙한 일상을 활기 있게 만드는 에너지예요.','자주 만나는 사람에게 고마움을 바로 표현하고 편한 루틴 하나를 함께 지켜보세요.','내가 먼저 움직여도 괜찮은지 묻고, 마음을 들은 뒤 약속을 정해보세요.'],
    ['OQPN','번개 실험가','사람과 아이디어를 연결해 새 시도를 현실로 빠르게 옮기는 에너지예요.','궁금한 아이디어를 20분짜리 실험으로 만들고 결과를 한 줄 기록해보세요.','결론과 첫 단계를 또렷이 말한 뒤, 상대의 기분도 한 번 확인해주세요.'],
    ['OQPS','민첩한 해결사','익숙한 현장에서 막힌 곳을 찾아 곧바로 손을 보태는 에너지예요.','오늘 반복되는 불편 하나를 골라 가장 작은 해결책을 적용해보세요.','해결을 제안하기 전에 지금 도움이 필요한지 한 문장으로 물어보세요.'],
    ['ODHN','온기 산책가','사람의 마음을 천천히 읽으면서 새로운 가능성을 키우는 에너지예요.','새로운 장소에서 편한 사람 한 명과 충분히 머물며 인상 깊은 것을 나눠보세요.','생각할 시간이 필요하다고 알리고, 마음이 정리되면 먼저 다시 말을 걸어보세요.'],
    ['ODHS','포근한 모임지기','관계를 오래 바라보고 편안한 리듬을 차분히 가꾸는 에너지예요.','익숙한 모임에서 모두가 편해질 작은 약속 하나를 제안해보세요.','상대의 이야기를 들은 뒤 내가 이해한 마음을 천천히 확인해주세요.'],
    ['ODPN','여유로운 개척자','사람들과 큰 그림을 나누고 충분히 살핀 뒤 낯선 길을 여는 에너지예요.','새 계획의 기대와 걱정을 각각 한 줄 적고 시작 날짜를 정해보세요.','검토한 이유와 선택 기준을 알려주면 동료가 내 속도를 이해하기 쉬워요.'],
    ['ODPS','든든한 현장감독','사람 곁에서 상황을 꼼꼼히 읽고 안정적인 해법을 만드는 에너지예요.','반복되는 약속 하나의 순서를 정리해 모두가 보기 쉽게 나눠보세요.','무엇을 언제까지 할지 차분히 말하고, 부담되는 부분도 함께 확인해주세요.'],
    ['IQHN','고요한 영감샘','혼자 모은 깊은 생각으로 새로움과 따뜻함을 조용히 퍼뜨리는 에너지예요.','떠오른 생각을 짧은 메모나 그림으로 만들고 믿는 사람 한 명에게 보여주세요.','바로 답하지 못해도 생각 중이라고 알리면 조용한 배려가 더 잘 전해져요.'],
    ['IQHS','잔잔한 응원등','익숙한 관계의 작은 변화를 알아채고 필요한 온기를 빠르게 건네는 에너지예요.','오늘 자주 만나는 사람의 좋은 점 하나를 발견한 순간 바로 말해주세요.','긴 말보다 구체적인 한마디로 마음을 표현하면 편안하게 닿아요.'],
    ['IQPN','혼자 뛰는 발명가','고요히 충전한 뒤 독창적인 해결을 재빠르게 시험하는 에너지예요.','혼자 집중할 30분을 확보해 새 도구나 방법 하나를 직접 시험해보세요.','완성된 답만 보여주기보다 지금 시험 중인 가정을 먼저 공유해보세요.'],
    ['IQPS','조용한 해결손','눈에 띄지 않는 불편을 발견해 익숙한 흐름을 빠르게 바로잡는 에너지예요.','매일 거슬리던 작은 일 하나를 오늘 끝낼 수 있는 크기로 줄여 해결해보세요.','도움을 건넬 때 무엇을 바꿨는지 짧게 알려주면 오해를 줄일 수 있어요.'],
    ['IDHN','달빛 탐험가','혼자 깊이 생각하고 마음의 결을 따라 새로운 세계를 만나는 에너지예요.','궁금했던 주제를 천천히 탐색한 뒤 가장 마음이 움직인 이유를 적어보세요.','생각을 정리할 시간이 필요하다고 말하고, 느낌부터 나누면 대화가 편해져요.'],
    ['IDHS','깊은 온기지기','조용한 자리에서 관계와 일상의 온도를 오래 지켜내는 에너지예요.','편안한 공간을 가꾸고 소중한 사람에게 안부 한 줄을 먼저 보내보세요.','갑작스러운 변화가 부담될 때 원하는 예고와 시간을 구체적으로 알려주세요.'],
    ['IDPN','사색하는 설계자','낯선 가능성을 오래 들여다보고 단단한 구조로 바꾸는 에너지예요.','새 아이디어의 핵심을 한 문장으로 줄인 뒤 이번 주 첫 단계를 달력에 넣으세요.','결론뿐 아니라 판단 기준을 함께 말하면 깊은 생각이 더 잘 전달돼요.'],
    ['IDPS','단단한 충전소','혼자 정돈한 힘으로 익숙한 삶을 안정적이고 실용적으로 지키는 에너지예요.','오늘의 루틴에서 에너지를 아껴주는 순서 하나를 만들어 반복해보세요.','변화가 필요할 때 준비할 시간과 가능한 범위를 먼저 합의해보세요.'],
  ],
  chat: [
    ['FBEC','대화 불꽃지휘자','먼저 풍성하게 말을 열고 마음과 약속을 함께 챙기는 대화 스타일이에요.','조용한 방에 모두가 답하기 쉬운 질문 하나를 올려보세요.','반응을 충분히 건넨 뒤 다른 사람이 말할 자리를 한 박자 비워주세요.'],
    ['FBEL','반응 만발 정원사','먼저 건넨 다정한 반응으로 자연스러운 대화가 자라게 해요.','친구의 근황에 구체적인 리액션과 궁금한 점 하나를 보내보세요.','답을 재촉하지 않는다는 말을 덧붙이면 풍성한 표현이 더 편하게 느껴져요.'],
    ['FBSC','속전속결 조율자','활발하게 의견을 모으고 해결과 약속을 빠르게 만드는 스타일이에요.','미뤄진 약속에 선택지 세 개와 답할 시간을 함께 올려보세요.','정답처럼 말하기보다 제안이라고 밝히고 다른 선택도 열어두세요.'],
    ['FBSL','경쾌한 해결메이트','먼저 많은 아이디어를 건네며 그때그때 막힌 일을 풀어줘요.','친구의 고민에 가능한 방법을 몇 개 제안하고 끌리는 것을 물어보세요.','해결책을 보내기 전에 들어주길 원하는지 같이 찾아보길 원하는지 확인하세요.'],
    ['FMEC','다정한 진행자','짧고 따뜻한 말로 대화를 열고 필요한 약속까지 차분히 챙겨요.','모임 전 안부 한마디와 확인할 사항 하나를 간결하게 보내보세요.','짧은 메시지에도 고마움이나 반가움을 보여주는 표현을 넣어주세요.'],
    ['FMEL','한마디 온기배달부','필요한 순간 먼저 건넨 짧은 공감으로 방의 온도를 높여요.','오늘 떠오른 사람에게 구체적인 안부 한 문장을 보내보세요.','말수가 적어도 듣고 있다는 표시를 남기면 마음이 선명하게 전해져요.'],
    ['FMSC','또렷한 약속잡이','먼저 핵심을 꺼내고 현실적인 다음 단계를 분명하게 정해요.','흐릿한 계획 하나를 날짜와 담당이 있는 문장으로 바꿔보세요.','용건 앞에 상대의 상황을 묻는 짧은 문장을 두면 말이 부드러워져요.'],
    ['FMSL','간결한 길잡이','필요한 때 먼저 나타나 짧은 해결책으로 흐름을 가볍게 해요.','복잡한 대화에서 지금 필요한 다음 행동 하나만 골라 제안해보세요.','내 답이 짧아도 무관심한 것은 아니라는 신호를 표현으로 보여주세요.'],
    ['WBEC','흐름 읽는 응원단','때를 살핀 뒤 풍성한 공감과 정리로 모두의 대화를 받쳐줘요.','여러 의견이 나온 뒤 공통된 마음과 선택지를 한 번 정리해보세요.','정리하기 전에 아직 말하지 않은 사람이 있는지 편하게 물어보세요.'],
    ['WBEL','조용히 번지는 웃음','대화의 틈을 읽고 넉넉한 반응으로 자연스럽게 즐거움을 키워요.','마음에 든 이야기 하나를 골라 왜 좋았는지 반응을 보태보세요.','참여하고 싶은 순간에는 타이밍을 오래 기다리지 말고 이모지부터 남겨보세요.'],
    ['WBSC','타이밍 좋은 정리꾼','충분히 들은 뒤 풍부한 정보와 실행 가능한 약속을 묶어줘요.','흩어진 의견을 조건별로 나누고 결정할 질문 하나를 던져보세요.','정리한 내용이 모두의 뜻과 맞는지 확인하는 여지를 꼭 남겨주세요.'],
    ['WBSL','필요한 순간 해결사','흐름을 지켜보다 막히는 순간 여러 해법을 꺼내주는 스타일이에요.','대화가 멈춘 이유를 살피고 부담이 가장 적은 방법부터 제안해보세요.','늦게 참여했을 때는 먼저 들은 내용을 확인한 뒤 해결책을 보태주세요.'],
    ['WMEC','세심한 마음지킴이','말할 때를 신중히 골라 짧은 공감과 정확한 약속을 남겨요.','조용해진 친구에게 답하기 편한 안부와 가능한 도움 하나를 보내보세요.','생각을 다 정리한 뒤 말하기보다 지금 듣고 있다는 신호를 먼저 주세요.'],
    ['WMEL','잔잔한 공감우체국','흐름을 방해하지 않는 한마디로 깊고 편안한 연결을 만들어요.','고마웠던 말을 구체적인 한 문장으로 적어 천천히 건네보세요.','침묵이 편안함인지 망설임인지 상대가 알 수 있게 짧게 알려주세요.'],
    ['WMSC','신중한 공지등대','상황을 충분히 확인한 뒤 필요한 정보와 약속을 정확히 밝혀줘요.','중요한 공지를 핵심·기한·할 일 세 줄로 정리해 공유해보세요.','정보만 보내기보다 궁금한 점을 물어도 좋다는 말을 덧붙여주세요.'],
    ['WMSL','묵묵한 믿음창고','필요한 순간에만 정확한 도움을 건네며 편안한 신뢰를 쌓아요.','친구가 부탁한 작은 일을 조용히 끝내고 결과를 분명하게 알려주세요.','내가 괜찮다고 느껴도 상대는 확인이 필요할 수 있으니 상태를 한 줄 공유하세요.'],
  ],
  taste: [
    ['NPGA','도시 보물 원정대','새로운 경험을 촘촘히 계획해 여럿과 활기차게 누리는 취향이에요.','가보고 싶던 동네의 새 장소 두 곳을 골라 작은 모임을 만들어보세요.','일정과 기대를 먼저 공유하고 각자 쉬고 싶은 시간도 물어보세요.'],
    ['NPGC','새 취향 살롱지기','낯선 취향을 미리 골라 편안한 공간에서 사람들과 나누길 좋아해요.','처음 듣는 음악이나 메뉴 하나를 준비해 작은 홈모임에서 소개해보세요.','함께할 사람에게 분위기와 시간을 알려주고 부담 없는 선택권을 주세요.'],
    ['NPIA','골목 지도 수집가','새로운 장소를 알차게 그려두고 소수와 깊이 탐험하는 취향이에요.','마음 맞는 한 사람과 낯선 골목의 산책 코스를 짜서 걸어보세요.','꼭 가고 싶은 곳과 즉석에서 바꿔도 되는 곳을 미리 나눠 말해주세요.'],
    ['NPIC','호기심 찻집 큐레이터','새로운 감각을 세심히 고르고 작은 관계 속에서 천천히 음미해요.','새 차나 디저트 하나를 골라 편한 사람과 맛과 느낌을 기록해보세요.','추천할 때 무엇이 좋았는지 설명하고 상대의 익숙한 취향도 물어보세요.'],
    ['NSGA','즉흥 축제 탐험가','새로운 재미를 그날의 기분대로 여럿과 움직이며 발견해요.','친구들에게 오늘 가능한 사람을 물어보고 처음 가는 곳으로 가볍게 떠나보세요.','즉흥 제안에는 예상 시간과 비용을 함께 알려주면 참여가 쉬워져요.'],
    ['NSGC','번개 모임 발견자','낯선 취향을 즉석에서 골라 편안한 자리에서 함께 즐겨요.','새 배달 메뉴나 보드게임을 골라 짧고 느슨한 모임을 열어보세요.','갑작스러운 초대라는 점을 밝히고 거절해도 편하다는 말을 덧붙이세요.'],
    ['NSIA','바람 따라 산책가','소수와 가볍게 움직이며 예상 밖의 장면을 만나는 취향이에요.','친한 사람과 목적지 없이 한 시간 걸으며 마음 가는 곳에 들러보세요.','계획이 바뀌어도 좋은지 먼저 묻고 지치면 바로 쉬자고 말해주세요.'],
    ['NSIC','느긋한 새로움 채집가','혼자나 가까운 사람과 낯선 감각을 부담 없이 천천히 모아요.','처음 보는 책이나 음악을 하나 골라 편한 공간에서 느긋하게 만나보세요.','새 취향을 권할 때 바로 좋아하지 않아도 괜찮다는 여유를 함께 전하세요.'],
    ['FPGA','단골 코스 대장','좋아하는 경험을 알차게 준비해 여럿의 즐거운 전통으로 만들어요.','검증된 장소와 메뉴로 모두가 기다릴 정기 모임 하나를 계획해보세요.','일정과 순서를 또렷이 알리고 새로운 의견을 넣을 자리도 남겨주세요.'],
    ['FPGC','포근한 홈파티 셰프','익숙한 취향을 정성껏 준비해 편안한 모임으로 나누길 좋아해요.','잘하는 메뉴와 좋아하는 음악으로 작은 홈파티를 준비해보세요.','각자의 편한 음식과 머무를 시간을 미리 물으면 더 포근해져요.'],
    ['FPIA','나만의 루틴 등산가','좋아하는 활동을 계획적으로 반복하며 소수와 단단한 추억을 쌓아요.','자주 걷는 길이나 운동을 편한 사람과 정기 약속으로 만들어보세요.','내 루틴의 이유를 알려주고 상대가 바꾸고 싶은 부분도 물어보세요.'],
    ['FPIC','취향 서랍 정리사','오래 좋아한 것을 세심하게 모아 조용하고 편안하게 즐기는 취향이에요.','좋아하는 책·음악·차 중 하나를 골라 나만의 작은 목록을 정리해보세요.','추천할 때 가장 편한 입문작 하나만 건네고 천천히 반응을 기다려주세요.'],
    ['FSGA','익숙한 길의 분위기메이커','좋아하는 활동을 그날의 기분에 맞춰 여럿과 유쾌하게 즐겨요.','친구들과 익숙한 동네에서 하고 싶은 일을 당일 투표로 골라보세요.','다수의 활기 속에서도 조용히 쉬고 싶은 사람의 선택을 챙겨주세요.'],
    ['FSGC','편안한 약속 지킴이','익숙하고 포근한 즐거움을 자연스러운 모임으로 이어가요.','편한 장소에서 별 준비 없이 만나는 느슨한 약속을 제안해보세요.','계획이 적어도 시작과 마칠 대략의 시간은 알려주면 모두가 편해요.'],
    ['FSIA','혼자 걷는 단골길','좋아하는 활동을 혼자 또는 가까운 사람과 자유롭게 반복해요.','익숙한 산책길을 기분 가는 대로 걷고 오늘 달라 보인 장면을 찾아보세요.','함께할 때 말없이 보내는 시간도 좋은지 미리 물어보세요.'],
    ['FSIC','포근한 취향 보관소','익숙한 공간과 소수의 관계에서 그날 필요한 쉼을 가장 잘 찾아요.','좋아하는 음료와 작품 하나로 방해받지 않는 저녁을 만들어보세요.','집에서 쉬고 싶을 때 거절만 남기지 말고 다음에 편한 만남을 제안해주세요.'],
  ],
};

function buildQuestions(id) {
  return questionRows[id].map((row, index) => {
    const axisIndex = index % 4;
    const round = Math.floor(index / 4);
    const currentAxis = axes[id][axisIndex];
    const firstPoleAtLeft = (axisIndex + round) % 2 === 0;
    const canonicalOptions = row.slice(1);
    return {
      prompt: row[0],
      axis: currentAxis.id,
      poles: firstPoleAtLeft
        ? currentAxis.poles.map(item => item.code)
        : [...currentAxis.poles].reverse().map(item => item.code),
      options: firstPoleAtLeft ? canonicalOptions : [...canonicalOptions].reverse(),
    };
  });
}

function buildDefinition(id) {
  const questions = buildQuestions(id);
  return {
    id,
    axes: axes[id],
    questions,
    outcomes: new Map(outcomeRows[id].map(([code, name, summary, action, communication]) => [code, {name, summary, action, communication}])),
  };
}

export const personalityTests = Object.freeze({
  energy: energyTest,
  chat: buildDefinition('chat'),
  taste: buildDefinition('taste'),
});

export const testQuestions = Object.freeze(Object.fromEntries(
  Object.entries(personalityTests).map(([id, definition]) => [id, definition.questions.map(question => [
    question.prompt,
    ...question.options.map(option => typeof option === 'string' ? option : option.label),
  ])]),
));

function validateAnswers(id, answers) {
  if (!Object.hasOwn(personalityTests, id)) throw Error('지원하지 않는 성향 검사예요.');
  if (!Array.isArray(answers) || answers.length !== 12) throw Error('12가지 상황에 모두 답해주세요.');
  if (answers.some(answer => !Number.isInteger(answer) || answer < 0 || answer > 1)) throw Error('각 상황의 선택을 다시 확인해주세요.');
}

function scorePersonality(id, answers) {
  const definition = personalityTests[id];
  const counts = Object.fromEntries(definition.axes.map(currentAxis => [currentAxis.id, Object.fromEntries(currentAxis.poles.map(item => [item.code, 0]))]));
  definition.questions.forEach((question, index) => counts[question.axis][question.poles[answers[index]]]++);

  const scoredAxes = {};
  const scores = [];
  let code = '';
  for (const currentAxis of definition.axes) {
    const [first, second] = currentAxis.poles;
    const score = counts[currentAxis.id][first.code] - counts[currentAxis.id][second.code];
    const selected = score > 0 ? first : second;
    code += selected.code;
    scores.push(score);
    scoredAxes[currentAxis.id] = {
      label: currentAxis.label,
      code: selected.code,
      name: selected.name,
      score,
      normalized: score / 3,
      counts: {...counts[currentAxis.id]},
    };
  }
  return {code, scores, axes: scoredAxes};
}

export function makePersonalityResult(id, name, answers) {
  if (id === 'energy') return makeEnergyResult(name, answers);
  validateAnswers(id, answers);
  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) throw Error('닉네임을 입력해주세요.');
  const definition = personalityTests[id];
  const personality = scorePersonality(id, answers);
  const outcome = definition.outcomes.get(personality.code);
  const outcomeIndex = [...definition.outcomes.keys()].indexOf(personality.code);
  const selectedPoles = definition.axes.map(currentAxis => currentAxis.poles.find(item => item.code === personality.axes[currentAxis.id].code));
  const labels = {energy: '에너지', chat: '단톡방', taste: '취향'};
  const sections = [
    ['한눈에 보는 나', outcome.summary],
    ['내가 잘 쓰는 힘', selectedPoles.map(item => item.strength).join(' · ')],
    ['균형을 잡는 힌트', selectedPoles.map(item => item.balance).join(' ')],
    ['오늘 해볼 작은 일', outcome.action],
    ['함께할 때 이렇게 말해요', outcome.communication],
    ['결과 읽는 법', '네 가지 축을 세 번씩 물어 지금의 선택 경향을 이야기로 풀었어요. 재미와 대화를 위한 자체 분류이며, 공인되거나 타당화된 MBTI 검사가 아니에요. 상황과 경험에 따라 결과가 달라질 수 있어요.'],
  ];
  return {
    content: id,
    name: cleanName,
    title: outcome.name,
    subtitle: `${cleanName}님의 12가지 선택으로 본 ${labels[id]} 스타일 · ${personality.code}`,
    sections,
    scores: personality.scores,
    answers: [...answers],
    display: outcome.name,
    unit: '',
    personality: {code: personality.code, axes: personality.axes},
    testVersion: PERSONALITY_TEST_VERSION,
    sprite: `/assets/pixel/personas/${outcomeIndex}.svg`,
    birth: null,
  };
}

export function getPersonalityTestVersion(result) {
  if ([PERSONALITY_TEST_VERSION, ENERGY_TEST_VERSION, LEGACY_PERSONALITY_TEST_VERSION].includes(result?.testVersion)) return result.testVersion;
  if (['energy', 'chat', 'taste'].includes(result?.content) && Array.isArray(result?.answers) && result.answers.length === 8) return LEGACY_PERSONALITY_TEST_VERSION;
  return 'unknown';
}

export function canComparePersonalityResults(first, second) {
  const version = getPersonalityTestVersion(first);
  return ['energy', 'chat', 'taste'].includes(first?.content)
    && first.content === second?.content
    && version !== 'unknown'
    && version === getPersonalityTestVersion(second);
}

export function isAxesV9PersonalityResult(result) {
  return getPersonalityTestVersion(result) === PERSONALITY_TEST_VERSION
    && ['energy', 'chat', 'taste'].includes(result?.content)
    && typeof result?.personality?.code === 'string';
}

export function compareTasteResults(first, second) {
  if (first?.content !== 'taste' || second?.content !== 'taste') throw Error('취향 검사 결과끼리만 비교할 수 있어요.');
  if (!canComparePersonalityResults(first, second)) throw Error('같은 버전의 취향 검사 결과만 비교할 수 있어요.');
  const version = getPersonalityTestVersion(first);
  if (version === PERSONALITY_TEST_VERSION) {
    const axisIds = personalityTests.taste.axes.map(currentAxis => currentAxis.id);
    if (!first.personality?.axes || !second.personality?.axes) throw Error('취향 축 정보가 없는 결과예요.');
    const same = axisIds.filter(id => first.personality.axes[id]?.code === second.personality.axes[id]?.code).length;
    const dimensions = Object.fromEntries(axisIds.map(id => {
      const firstValue = first.personality.axes[id]?.normalized;
      const secondValue = second.personality.axes[id]?.normalized;
      if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) throw Error('취향 축 점수를 확인해주세요.');
      return [id, {
        label: first.personality.axes[id].label,
        first: firstValue,
        second: secondValue,
        similarity: Math.round((1 - Math.abs(firstValue - secondValue) / 2) * 100),
      }];
    }));
    const similarity = Math.round(Object.values(dimensions).reduce((sum, dimension) => sum + dimension.similarity, 0) / axisIds.length);
    return {
      title: `4개 취향 축 중 ${same}개가 닮았어요`,
      text: same === 4
        ? '취향의 방향이 모두 닮았어요. 같은 것을 어떻게 다르게 즐기는지 이야기해보세요.'
        : '닮은 축은 함께 즐길 출발점으로, 다른 축은 서로의 새로운 취향을 소개할 기회로 삼아보세요.',
      same,
      total: 4,
      similarity,
      dimensions,
      version,
    };
  }
  const total = Math.min(first.answers.length, second.answers.length);
  const same = Array.from({length: total}, (_, index) => first.answers[index] === second.answers[index]).filter(Boolean).length;
  return {
    title: `${total}개 중 ${same}개가 같아요`,
    text: '같은 선택은 함께 즐기고, 다른 선택은 서로에게 새로운 취향을 소개하는 계기로 삼아보세요.',
    same,
    total,
    similarity: total ? Math.round(same / total * 100) : 0,
    version,
  };
}
