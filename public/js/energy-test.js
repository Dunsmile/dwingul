export const ENERGY_TEST_VERSION = 'teto-egen-v13';

const rows = [
  ['모임 장소를 정해야 하는데 의견이 흩어져 있어요.', '조건을 모아 한 곳을 제안하고 결정을 이끈다', '각자가 편한 지점을 더 듣고 자연스럽게 좁힌다'],
  ['친구의 말투가 평소보다 조금 가라앉았어요.', '마음에 걸린 표현을 살피며 괜찮은지 조심스레 묻는다', '무슨 일이 있는지 바로 물으며 대화를 연다'],
  ['새로운 일을 맡을 사람이 필요한 순간이에요.', '할 수 있는 범위를 말하고 먼저 손을 든다', '필요한 역할과 사람들의 상황을 충분히 살핀다'],
  ['가까운 사람이 고민을 꺼냈어요.', '말 사이의 감정을 따라가며 충분히 들어준다', '핵심 문제를 묻고 할 수 있는 다음 행동을 찾는다'],
  ['약속 당일 계획이 갑자기 바뀌었어요.', '가능한 선택지를 빠르게 정리해 새 계획을 제안한다', '함께한 사람들의 기분과 원하는 속도를 먼저 확인한다'],
  ['누군가 정성껏 준비한 것을 보여줘요.', '작은 차이와 분위기를 알아보고 구체적으로 표현한다', '가장 인상적인 점을 또렷하게 바로 말한다'],
  ['원하는 기회를 발견했지만 경쟁이 있을 것 같아요.', '내 의사를 분명히 밝히고 먼저 시도한다', '상황과 상대의 반응을 읽으며 알맞은 때를 고른다'],
  ['친구와 의견이 어긋난 뒤 다시 이야기하게 됐어요.', '상대가 서운했던 지점을 먼저 짚고 말의 온도를 맞춘다', '내 입장과 해결하고 싶은 부분을 솔직하게 꺼낸다'],
  ['낯선 사람들과 함께 과제를 시작해요.', '우선 할 일을 나누고 진행 방향을 제시한다', '각자의 강점과 편한 역할을 물으며 흐름을 만든다'],
  ['선물을 고를 때 더 오래 보는 것은?', '그 사람이 지나가듯 말한 취향과 작은 단서', '지금 가장 필요하고 유용하게 쓸 수 있는 것'],
  ['불편한 규칙 때문에 모두가 머뭇거리고 있어요.', '바꿔야 할 이유를 말하고 대안을 제안한다', '누가 어떤 점에서 불편한지 차분히 의견을 모은다'],
  ['좋아하는 사람에게 마음을 전하고 싶어요.', '상대가 부담 없을 순간과 표현을 세심하게 고른다', '내 마음을 숨기지 않고 명확하게 전한다'],
];

export const energyTest = Object.freeze({
  id: 'energy',
  questions: rows.map((row, index) => {
    const poles = index % 2 === 0 ? ['teto', 'egen'] : ['egen', 'teto'];
    return Object.freeze({
      prompt: row[0],
      options: Object.freeze(row.slice(1).map((label, optionIndex) => Object.freeze({label, pole: poles[optionIndex]}))),
    });
  }),
});

const outcomes = {
  strongTeto: {
    title: '선명한 테토형',
    summary: '원하는 방향을 분명히 말하고 먼저 움직이며 장면의 속도를 만드는 편이에요.',
    strength: '결정이 필요한 순간에 주도권을 잡고, 생각을 행동으로 빠르게 옮겨요.',
    balance: '속도를 내기 전 상대의 마음과 준비 정도를 한 번 물으면 추진력이 더 편안하게 전해져요.',
  },
  teto: {
    title: '유연한 테토형',
    summary: '상황을 살피면서도 필요할 때는 직접 말하고 움직이는 쪽에 조금 더 가까워요.',
    strength: '분위기에 휩쓸리지 않으면서도 관계의 신호를 놓치지 않고 결정을 도와요.',
    balance: '결론을 꺼내기 전에 상대가 중요하게 보는 한 가지를 들으면 선택의 폭이 넓어져요.',
  },
  balanced: {
    title: '테토·에겐 균형형',
    summary: '먼저 이끄는 힘과 세심하게 맞추는 힘을 장면에 따라 비슷하게 꺼내 쓰는 편이에요.',
    strength: '결정할 때와 기다릴 때를 구분하며, 직접성과 공감을 함께 활용해요.',
    balance: '상황마다 어느 쪽을 선택했는지 떠올리면 내가 편해지는 조건을 더 또렷하게 알 수 있어요.',
  },
  egen: {
    title: '단단한 에겐형',
    summary: '필요한 행동도 챙기지만 사람의 마음과 분위기를 세심하게 읽는 쪽에 조금 더 가까워요.',
    strength: '작은 변화와 말의 온도를 알아채 관계가 편안하게 이어지도록 도와요.',
    balance: '원하는 것이 생기면 완벽한 표현을 기다리지 말고 짧고 분명한 한 문장으로 알려보세요.',
  },
  strongEgen: {
    title: '섬세한 에겐형',
    summary: '마음의 결을 세심하게 읽고 상대와 속도를 맞추며 관계의 온도를 가꾸는 편이에요.',
    strength: '말로 드러나지 않은 감정과 취향까지 알아채고 배려 있는 선택으로 연결해요.',
    balance: '상대를 충분히 살핀 뒤에는 내 선택과 경계도 또렷하게 말하면 섬세함을 오래 지킬 수 있어요.',
  },
};

function outcomeFor(tetoCount) {
  if (tetoCount >= 10) return ['teto', outcomes.strongTeto];
  if (tetoCount >= 7) return ['teto', outcomes.teto];
  if (tetoCount === 6) return ['balanced', outcomes.balanced];
  if (tetoCount >= 3) return ['egen', outcomes.egen];
  return ['egen', outcomes.strongEgen];
}

export function makeEnergyResult(name, answers) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) throw Error('닉네임을 입력해주세요.');
  if (!Array.isArray(answers) || answers.length !== energyTest.questions.length) throw Error('12가지 상황에 모두 답해주세요.');
  if (answers.some(answer => !Number.isInteger(answer) || answer < 0 || answer > 1)) throw Error('각 상황의 선택을 다시 확인해주세요.');

  const tetoCount = energyTest.questions.reduce((count, question, index) => count + (question.options[answers[index]].pole === 'teto' ? 1 : 0), 0);
  const tetoPercent = Math.round(tetoCount / energyTest.questions.length * 100);
  const egenPercent = 100 - tetoPercent;
  const [kind, outcome] = outcomeFor(tetoCount);
  const outcomeIndex = ['strongEgen', 'egen', 'balanced', 'teto', 'strongTeto'].findIndex(key => outcomes[key] === outcome);

  return {
    content: 'energy',
    name: cleanName,
    title: outcome.title,
    subtitle: `${cleanName}님의 선택은 테토력 ${tetoPercent}% · 에겐력 ${egenPercent}%`,
    sections: [
      ['테토력과 에겐력', `테토력 ${tetoPercent}% · 에겐력 ${egenPercent}%`],
      ['지금의 반응 방식', outcome.summary],
      ['내가 잘 쓰는 힘', outcome.strength],
      ['균형을 잡는 힌트', outcome.balance],
      ['결과 읽는 법', '테토는 직접 말하고 먼저 움직이는 경향, 에겐은 감정과 분위기를 섬세하게 살피는 경향을 뜻해요. 관계 속 선택을 가볍게 돌아보는 자체 테스트이며, 성별이나 신체 특성을 판정하지 않아요. 상황과 경험에 따라 결과가 달라질 수 있어요.'],
    ],
    scores: [tetoPercent, egenPercent],
    answers: [...answers],
    display: outcome.title,
    unit: '',
    personality: {kind, tetoPercent, egenPercent},
    testVersion: ENERGY_TEST_VERSION,
    sprite: `/assets/pixel/personas/${outcomeIndex}.svg`,
    birth: null,
  };
}
