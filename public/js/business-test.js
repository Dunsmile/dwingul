// Original situations: each type receives one equal-weight choice per question.
export const businessTypes = [
 {name:'기회 개척가',short:'작게 시도하고 반응을 보며 판을 넓혀요',strength:'불확실한 상황에서도 가설을 세우고 실행하는 속도',caution:'실험을 늘리다 이미 약속한 품질과 비용을 놓치기 쉬워요.',action:'가장 궁금한 가설 하나와 중단 기준을 적고, 일주일 동안 작은 시제품을 보여주세요.',partner:'일정과 비용을 꼼꼼히 확인하는 운영형 동료와 실험의 한도를 합의해보세요.'},
 {name:'브랜드 장인',short:'남다른 완성도에서 선택받을 이유를 만들어요',strength:'제품과 경험을 깊이 다듬고 일관된 기준을 지키는 집중력',caution:'더 완벽해진 뒤 공개하려다 실제 사용자의 반응을 늦게 들을 수 있어요.',action:'대표 기능 하나만 완성해 세 명에게 써보게 하고, 내가 중요하게 본 부분과 그들의 반응을 비교해보세요.',partner:'고객을 만나고 이야기를 전하는 관계형 동료와 공개 날짜를 먼저 정해보세요.'},
 {name:'관계 연결가',short:'사람의 목소리를 듣고 다시 찾아올 이유를 만들어요',strength:'대화에서 필요한 것을 발견하고 신뢰를 쌓는 감각',caution:'사람마다 다른 부탁을 모두 받아주면 사업의 기준이 흐려질 수 있어요.',action:'잠재 고객 세 명에게 최근 불편했던 경험을 묻고, 반복된 요구 하나만 골라 해결해보세요.',partner:'요청의 우선순위를 정리하는 제품형 동료와 공통 기준을 만들어보세요.'},
 {name:'운영 설계가',short:'계속 굴러갈 수 있는 구조를 먼저 생각해요',strength:'일정·비용·반복 업무를 정리하고 약속을 꾸준히 지키는 힘',caution:'예측이 어려운 기회를 검토만 하다 시도할 시점을 놓칠 수 있어요.',action:'작은 서비스를 한 번 운영한다고 가정하고 시간·비용을 적어본 뒤, 감당 가능한 실험 하나를 실행해보세요.',partner:'새로운 기회를 제안하는 개척형 동료와 실패해도 괜찮은 실험 범위를 정해보세요.'}
];
export const BUSINESS_TEST_VERSION='subtypes-v9';
export const businessSubtypes = [
 {id:'explorer-focused',primary:0,secondary:0,name:'기회 개척가',short:'하나의 가설을 빠르게 시험하고 배운 것을 다음 시도로 연결해요.'},
 {id:'explorer-craft',primary:0,secondary:1,name:'기준을 세우는 개척가',short:'새 기회를 먼저 시험하되, 선택받을 만한 완성도까지 함께 살펴요.'},
 {id:'explorer-connection',primary:0,secondary:2,name:'반응을 잇는 개척가',short:'사람의 반응에서 다음 기회를 찾고 대화로 가설을 다듬어요.'},
 {id:'explorer-operations',primary:0,secondary:3,name:'실행을 굴리는 개척가',short:'새로운 시도를 반복 가능한 일정과 비용 안에서 빠르게 굴려요.'},
 {id:'craft-explorer',primary:1,secondary:0,name:'시장을 여는 브랜드 장인',short:'선명한 완성도를 만들고 작은 시장 실험으로 가능성을 확인해요.'},
 {id:'craft-focused',primary:1,secondary:1,name:'브랜드 장인',short:'자신만의 기준을 깊이 다듬어 선택받을 이유를 선명하게 만들어요.'},
 {id:'craft-connection',primary:1,secondary:2,name:'팬을 모으는 브랜드 장인',short:'완성도 높은 경험과 세심한 대화로 다시 찾는 사람을 만들어요.'},
 {id:'craft-operations',primary:1,secondary:3,name:'체계를 세우는 브랜드 장인',short:'제품의 기준을 지키면서 꾸준히 전달할 운영 방식까지 설계해요.'},
 {id:'connection-explorer',primary:2,secondary:0,name:'기회를 잇는 관계 연결가',short:'사람이 들려준 문제를 새로운 실험과 사업 기회로 빠르게 이어가요.'},
 {id:'connection-craft',primary:2,secondary:1,name:'경험을 다듬는 관계 연결가',short:'사람의 목소리를 듣고 기억에 남는 제품 경험으로 세심하게 다듬어요.'},
 {id:'connection-focused',primary:2,secondary:2,name:'관계 연결가',short:'대화에서 반복되는 필요를 발견하고 오래 이어지는 신뢰를 쌓아요.'},
 {id:'connection-operations',primary:2,secondary:3,name:'약속을 지키는 관계 연결가',short:'사람과의 약속을 안정적인 과정으로 정리해 신뢰를 꾸준히 이어가요.'},
 {id:'operations-explorer',primary:3,secondary:0,name:'실험을 굴리는 운영 설계가',short:'감당할 수 있는 범위를 정하고 새로운 실험이 계속 돌게 만들어요.'},
 {id:'operations-craft',primary:3,secondary:1,name:'품질을 지키는 운영 설계가',short:'반복 가능한 흐름 속에서도 결과물의 기준과 완성도를 놓치지 않아요.'},
 {id:'operations-connection',primary:3,secondary:2,name:'협업을 잇는 운영 설계가',short:'사람 사이의 약속과 역할을 정리해 함께 일하는 흐름을 안정시켜요.'},
 {id:'operations-focused',primary:3,secondary:3,name:'운영 설계가',short:'시간과 비용, 반복 업무를 구조화해 사업이 꾸준히 굴러가게 해요.'}
];
const rows = [
 ['주말에 작게 시작할 프로젝트를 골라요. 가장 끌리는 것은?', '새로운 수요가 있는지 빠르게 시험할 아이디어','내 취향과 전문성을 담을 수 있는 제품','주변 사람이 자주 말하던 불편을 풀어줄 서비스','내 시간 안에서 꾸준히 반복 운영할 수 있는 일'],
 ['첫 버전 공개까지 일주일이 남았어요. 무엇부터 챙길까요?', '핵심 가설 하나를 확인할 최소 기능','처음 쓰는 순간 기억에 남을 완성도','써볼 사람을 만나 반응을 들을 약속','문의·결제·전달 과정을 빠뜨리지 않을 점검표'],
 ['예상 밖의 요청이 들어왔어요. 첫 반응은?', '작은 실험으로 새로운 가능성을 확인한다','지금 제품의 방향과 품질에 맞는지 살핀다','왜 필요한지 고객의 상황을 자세히 듣는다','추가 시간과 비용을 계산해 범위를 정한다'],
 ['이번 달 여유 시간이 생겼어요. 어디에 쓸까요?', '아직 안 해본 고객 유입 방법을 시도한다','자주 쓰는 기능의 불편한 부분을 다듬는다','기존 이용자와 이야기하고 관계를 이어간다','반복 작업을 자동화하고 운영 부담을 줄인다'],
 ['비슷한 서비스가 등장했어요. 가장 하고 싶은 일은?', '아직 비어 있는 다른 기회를 찾아 실험한다','우리만 잘하는 한 가지를 더 선명하게 만든다','고객이 우리를 계속 쓰는 이유를 직접 듣는다','현재 지표와 비용을 확인하고 대응 순서를 정한다'],
 ['첫 손님을 만났어요. 가장 궁금한 것은?', '어떤 새로운 상황에서도 사용할 수 있을까?','제품의 어떤 부분이 가장 인상적이었을까?','어떤 일을 겪고 이 서비스를 찾았을까?','이 과정을 안정적으로 반복하려면 무엇이 필요할까?'],
 ['함께 일할 동료에게 내 역할을 소개한다면?', '새 기회를 찾고 먼저 시험해볼게요','사용자가 만날 결과물의 기준을 잡을게요','고객과 팀 사이의 이야기를 이어갈게요','일정과 자원을 정리해 일이 이어지게 할게요'],
 ['좋은 반응을 얻었어요. 다음 선택은?', '다른 고객층에서도 통하는지 시험한다','대표 경험 하나를 더 깊게 다듬는다','만족한 고객과 소개받은 사람을 만난다','늘어난 사용량을 감당할 운영 흐름을 만든다'],
 ['계획대로 되지 않은 한 주를 돌아봐요. 가장 먼저 적는 것은?', '다음에는 바꿔서 시험해볼 가설','결과물에서 부족했던 구체적인 부분','고객이나 동료의 이야기를 놓친 순간','예상과 달랐던 시간·비용·일정'],
 ['새 기능 두 개 중 하나만 만들 수 있어요. 나의 기준은?', '새 가능성을 더 많이 확인할 수 있는 기능','서비스의 개성을 가장 잘 드러내는 기능','고객이 반복해서 필요하다고 말한 기능','현재 운영을 안정시키고 부담을 줄이는 기능'],
 ['일이 잘 굴러간다고 느끼는 순간은?', '시도에서 배운 것이 다음 기회로 이어질 때','내가 만든 결과물을 자신 있게 보여줄 때','이용자가 다시 찾아와 이야기를 건넬 때','내가 잠깐 쉬어도 정해둔 흐름대로 돌아갈 때'],
 ['앞으로 한 달 동안 하나만 지킬 수 있다면?', '매주 새로운 가설 하나를 작게 시험한다','대표 결과물 하나의 완성도를 높인다','매주 고객의 실제 경험을 직접 듣는다','시간과 비용을 기록하며 지속할 범위를 지킨다']
];
// Rotate choices so repeatedly choosing the same position does not imply one type.
export const businessQuestions=rows.map((row,i)=>[row[0],...row.slice(1).map((_,j)=>row[1+(j+i)%4])]);
export function businessResult(name,answers){
 if(answers.length!==rows.length||answers.some(v=>!Number.isInteger(v)||v<0||v>3))throw Error('12가지 상황에 모두 답해주세요.');
 const counts=[0,0,0,0];answers.forEach((v,i)=>counts[(v+i)%4]++);
 const order=[0,1,2,3].sort((a,b)=>counts[b]-counts[a]||a-b),top=counts[order[0]],leaders=order.filter(i=>counts[i]===top);
 const primary=order[0],runnerUp=order[1],secondary=counts[runnerUp]>=3?runnerUp:primary;
 const chosen=businessTypes[primary],mixed=leaders.length>1;
 const subtype=businessSubtypes.find(item=>item.primary===primary&&item.secondary===secondary);
 const title=mixed?(leaders.length===4?'고르게 살피는 균형 사업가':leaders.map(i=>businessTypes[i].name).join(' · ')):subtype.name;
 const explanation=mixed
  ?`같은 점수에서는 고정된 순서로 ${chosen.name}를 주 스타일, ${businessTypes[secondary].name}를 보조 스타일로 정했어요.`
  :secondary===primary
   ?`${chosen.name} 점수가 가장 높고 다음 스타일이 2점 이하라 주 스타일이 선명한 결과예요.`
   :`${chosen.name}를 중심으로 ${businessTypes[secondary].name}의 경향이 3점 이상 함께 나타났어요.`;
 const businessSubtype={...subtype,strongMain:secondary===primary,explanation};
 const sections=[['나의 사업 스타일',mixed?'이번 선택에서는 여러 방식이 같은 비중으로 나타났어요. 상황에 따라 어떤 역할이 편한지 함께 살펴보세요.':subtype.short],['잘 쓰는 강점',mixed?leaders.map(i=>businessTypes[i].strength).join(' / '):chosen.strength],['놓치기 쉬운 부분',mixed?'모든 방식을 한 번에 챙기려 하기보다, 이번 실험에서 가장 중요한 기준 하나를 골라보세요.':chosen.caution],['이번 주의 작은 실험',mixed?'관심 있는 아이디어 하나에 대해 고객 한 명을 만나고, 작은 결과물과 운영 시간을 함께 기록해보세요.':chosen.action],['함께 일한다면',mixed?'동료와 각자 먼저 맡고 싶은 역할을 정하고, 결정을 미루게 되는 지점을 이야기해보세요.':chosen.partner],['결과 읽는 법','12가지 상황에서 고른 선택의 비중이에요. 성공 가능성이나 직업 적합성을 측정하는 검사는 아니며, 지금의 경험과 우선순위에 따라 달라질 수 있어요.']];
 return {content:'shop',name,title,subtitle:`${name}님의 12가지 선택으로 본 사업 스타일`,sections,scores:counts,answers,display:title,unit:'',businessVersion:BUSINESS_TEST_VERSION,businessSubtype,business:businessTypes.map((t,i)=>({name:t.name,count:counts[i],percent:Math.round(counts[i]/rows.length*100)}))};
}
