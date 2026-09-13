import assert from 'node:assert/strict';
import {cp, mkdir, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {catalog, categories} from '../public/js/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = path.join(root, 'public');
const outputDirectory = path.join(root, 'dist');
const siteOrigin = 'https://dwingul.com';
const buildDate = '2026-09-14';
const owner = '뒹굴 운영팀';
const contactUrl = 'https://github.com/Dunsmile/dwingul/issues';
const excludedClientFiles = new Set(['js/rpg-store.js','js/garage-store.js']);

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const absolute = pathname => new URL(pathname,siteOrigin).href;

// Every guide is deliberately written for its own rules. Do not replace this map with category filler.
export const guides = {
  sort:{
    intro:'멈춰 있는 캐릭터의 색을 읽고 파랑은 왼쪽, 하양은 오른쪽으로 보내는 순발력 게임입니다. 빠르게 누르는 것보다 다음 캐릭터를 정확히 확인하는 리듬이 오래 갑니다.',
    tips:['손가락을 두 버튼 위에 미리 올리고 캐릭터가 멈춘 뒤 색을 확인하세요.','연속 성공이 끊기지 않도록 속도보다 정확도를 먼저 잡으세요.','피버가 켜지면 어느 쪽도 정답이므로 짧은 시간 동안 한 버튼에 집중해도 됩니다.'],
    scoring:'처리한 캐릭터 수가 기록입니다. 20초 모드는 짧은 집중력을, 무한 모드는 세 번 실수하기 전까지의 꾸준함을 비교합니다. 서로 다른 모드는 별도 기록으로 봅니다.',
    faq:[['피버는 어떻게 채우나요?','1.2초 안에 연속으로 맞히면 피버가 5씩 오르고, 100이 되면 5초 동안 양쪽 모두 정답입니다.'],['한 번 틀리면 바로 끝나나요?','아니요. 세 번째 실수에서 끝납니다. 실수 뒤에는 다음 캐릭터의 색부터 다시 차분히 보세요.'],['키보드로도 할 수 있나요?','화면 버튼과 키보드 방향 입력을 모두 사용할 수 있습니다. 내 손에 편한 방식을 고르세요.']]},
  timing:{
    intro:'1초부터 10초 사이의 목표 시간이 정해지면 올라가는 숫자를 보며 정확한 순간에 멈추는 게임입니다. 감으로 세는 게임과 달리 화면의 시계를 끝까지 볼 수 있습니다.',
    tips:['초 단위 숫자가 바뀌는 박자를 먼저 한두 번 눈으로 따라가세요.','목표 직전에는 손가락에 힘을 빼고 버튼 위에서 기다리세요.','결과가 빠르거나 늦었는지 보고 다음 판의 누르는 순간을 조금만 조정하세요.'],
    scoring:'멈춘 시간은 소수점 둘째 자리까지 표시되고, 순위는 목표와의 절대 오차가 작은 기록이 앞섭니다. 목표 시간이 다른 판은 화면에 목표와 멈춘 시간을 함께 보여줍니다.',
    faq:[['목표는 매번 같나요?','아니요. 한 판을 시작할 때 1~10초 중 하나가 정해집니다.'],['숫자가 중간에 사라지나요?','현재 규칙에서는 숫자를 계속 보며 멈춥니다. 기록 이름도 숫자가 보이는 규칙을 구분합니다.'],['정확히 목표를 누르면 어떻게 되나요?','표시 가능한 범위에서 목표와 같은 시간에 멈추면 오차가 가장 작은 기록이 됩니다.']]},
  color:{
    intro:'비슷한 색으로 채운 격자에서 단 하나 다른 칸을 찾아내는 관찰 게임입니다. 판이 진행될수록 칸 수가 늘어나 눈의 이동과 집중 전환이 중요해집니다.',
    tips:['격자를 왼쪽 위부터 줄 단위로 훑으면 같은 곳을 반복해서 보는 일을 줄일 수 있습니다.','색 이름을 맞히려 하지 말고 주변 칸과 밝기 차이만 비교하세요.','25칸에서는 화면 중심만 보지 말고 네 모서리를 먼저 확인해보세요.'],
    scoring:'30초 동안 맞힌 다른 색 칸의 수가 기록입니다. 오답마다 남은 시간이 1초 줄어들어 무작정 여러 칸을 누르는 방식은 불리합니다.',
    faq:[['격자는 언제 커지나요?','4칸 두 번, 9칸 네 번, 16칸 네 번, 25칸 여섯 번의 흐름으로 커집니다.'],['오답 점수도 따로 깎이나요?','점수보다 시간이 줄어듭니다. 오답 한 번마다 1초가 빠져 결과적으로 풀 기회가 적어집니다.'],['색각 검사용인가요?','아닙니다. 오락용 색 차이 찾기 게임이며 색각 상태를 검사하거나 판단하지 않습니다.']]},
  reaction:{
    intro:'빨간 화면에서 기다리다가 초록색으로 바뀌는 순간 누르는 반응 게임입니다. 예상해서 누르기보다 변화가 실제로 보인 뒤 반응하는 것이 핵심입니다.',
    tips:['버튼 중앙에 손가락을 가볍게 대고 화면 전체의 색 변화를 보세요.','빨간 화면이 길게 느껴져도 박자를 예상하지 말고 기다리세요.','한 번 빠르게 나왔다고 서두르지 말고 세 번 모두 같은 자세를 유지하세요.'],
    scoring:'유효한 세 번의 반응 시간을 밀리초로 재고 평균을 기록합니다. 평균 시간이 낮을수록 앞서며, 가장 빠른 한 번도 결과에서 함께 확인할 수 있습니다.',
    faq:[['빨간 화면에서 누르면 기록되나요?','미리 누른 시도는 유효 기록에 넣지 않고 다시 준비합니다.'],['몇 번 측정하나요?','초록불 뒤의 유효한 반응을 세 번 모아 평균을 냅니다.'],['의학적인 반응속도 검사인가요?','아닙니다. 기기와 입력 방식에도 영향을 받는 짧은 웹 게임 기록입니다.']]},
  typing:{
    intro:'제시된 문장을 정확히 입력해 몬스터를 공격하고, 보스와 장비를 거치며 스테이지를 이어가는 타이핑 RPG입니다. 빠른 타수만큼 오타를 줄이고 반격 시간을 관리하는 일이 중요합니다.',
    tips:['문장을 한 덩어리로 외우기보다 현재 입력할 어절과 다음 어절을 번갈아 보세요.','MP가 가득 차면 입력창을 비우고 ‘힐’을 입력해 회복할 수 있습니다.','장비 효과는 모험을 시작할 때 고정되므로 출발 전에 공격·방어·회복 장비를 확인하세요.'],
    scoring:'몬스터를 처치할 때마다 점수가 올라가며 도달 스테이지와 처치 수가 함께 남습니다. 10스테이지마다 보스가 나오고, 프로필을 연결하면 클리어한 보스 다음 구간부터 시작할 수 있습니다.',
    faq:[['몬스터는 언제 공격하나요?','일반 몬스터는 10초마다, 보스는 15초마다 반격합니다. 새 전투 초반에는 준비 시간이 있습니다.'],['장비 뽑기에 실제 돈을 쓰나요?','아니요. 게임 안에서 얻는 골드를 사용하며 결제나 현금 교환 기능은 없습니다.'],['같은 장비가 나오면 어떻게 되나요?','여분 수량으로 쌓이고, 기본 여분 두 개를 사용해 대표 장비를 최대 +10까지 강화할 수 있습니다.']]},
  racing:{
    intro:'5차선 도로에서 차량을 피하고 동전과 연료를 모아 가능한 멀리 달리는 게임입니다. 앞차만 보지 말고 옮겨갈 차선의 빈 공간과 연료를 함께 읽어야 합니다.',
    tips:['항상 현재 차선 양옆 중 어느 쪽이 비었는지 미리 확인하세요.','연료 아이템은 +15칸이므로 탱크가 너무 많이 비기 전에 경로에 넣으세요.','같은 차선 앞차를 6m 이내에서 피하면 부스터가 쌓이지만, 무리한 근접 회피보다 생존이 먼저입니다.'],
    scoring:'충돌하거나 연료가 바닥날 때까지 이동한 거리(m)가 기록입니다. 모은 동전과 종료 이유도 결과에 표시되며, 차량 규칙 버전별 기록은 섞지 않습니다.',
    faq:[['연료는 얼마나 줄고 채워지나요?','연료는 초당 2칸 줄고 연료 아이템 하나가 15칸을 채웁니다. 탱크 최대치를 넘지는 않습니다.'],['부스터는 어떻게 쓰나요?','근접 회피로 10칸을 모은 뒤 위쪽 키나 화면의 부스터 버튼을 누르면 가속합니다.'],['새 차량은 유료인가요?','현금 결제가 아니라 게임에서 모은 토큰 50개로 차고의 차량을 해제합니다.']]},
  memory:{
    intro:'잠깐 빛난 칸의 위치를 기억했다가 같은 자리를 고르는 공간 기억 게임입니다. 한 장면을 사진처럼 외우기보다 모양과 순서로 묶으면 부담이 줄어듭니다.',
    tips:['빛난 칸을 위·가운데·아래처럼 구역으로 나눠 기억하세요.','서로 붙은 칸은 선이나 도형 하나로 묶어 떠올리세요.','격자가 커질 때는 칸 개수보다 상대적인 위치를 기준으로 보세요.'],
    scoring:'완료한 단계 수가 기록입니다. 25칸에서 시작해 36칸과 49칸으로 커지고, 세 번째 실수에서 게임이 끝납니다.',
    faq:[['처음부터 49칸인가요?','아니요. 작은 25칸 판에서 시작해 진행하면서 36칸, 49칸으로 커집니다.'],['기억할 칸도 늘어나나요?','네. 처음 세 칸에서 시작해 단계가 오를수록 더 많은 위치를 기억합니다.'],['실수한 칸을 다시 누를 수 있나요?','실수는 누적되며 다음 제시에서 다시 도전합니다. 세 번 실수하면 현재 단계로 결과가 정해집니다.']]},
  numbers:{
    intro:'무작위로 놓인 숫자를 1부터 25까지 차례대로 누르는 시선 탐색 게임입니다. 손보다 눈이 다음 숫자를 먼저 찾아두는 것이 기록을 줄이는 열쇠입니다.',
    tips:['현재 숫자를 누르는 동안 시선은 다음 숫자로 옮겨보세요.','격자를 몇 구역으로 나눠 숫자의 대략적인 위치를 기억하세요.','잘못 누른 뒤 급하게 만회하기보다 다음 정답을 다시 확인하세요.'],
    scoring:'25까지 모두 누르는 데 걸린 시간에 오답 벌점이 더해져 최종 초 기록이 됩니다. 시간이 낮을수록 앞섭니다.',
    faq:[['숫자 위치는 매번 같나요?','아니요. 한 판마다 1~25의 위치가 섞입니다.'],['건너뛰어 눌러도 되나요?','현재 찾아야 할 숫자만 처리됩니다. 순서가 아닌 숫자를 누르면 벌점이 생깁니다.'],['모바일과 PC 기록은 같나요?','게임 규칙은 같지만 입력 방식 차이가 있어 순위에서 기기 유형을 나눠 볼 수 있습니다.']]},
  sequence:{
    intro:'안내 캐릭터의 네 박자를 듣고 내 차례의 3·2·1 준비 뒤에 같은 리듬을 두드리는 무한 리듬 게임입니다. 소리와 화면의 박자를 함께 쓰면 패턴을 더 오래 이어갈 수 있습니다.',
    tips:['듣는 동안 네 박자를 짧게 끊어 속으로 따라 해보세요.','3·2·1 뒤 첫 박자까지 한 박 여유가 있으니 숫자에 맞춰 미리 누르지 마세요.','빠른 패턴은 모든 음을 세기보다 강하게 느껴지는 위치를 기준으로 묶으세요.'],
    scoring:'정확한 입력과 이어진 패턴에 따라 점수가 올라갑니다. 100개 고유 패턴을 섞어 사용하고 한 바퀴 뒤에도 계속되며, 속도는 최대 136 BPM을 넘지 않습니다.',
    faq:[['한 패턴은 몇 박자인가요?','안내와 응답 모두 네 박자로 구성됩니다.'],['몇 라운드에서 끝나나요?','현재 v9 규칙은 무한 모드입니다. 에너지가 모두 줄 때까지 이어집니다.'],['소리를 끌 수 있나요?','화면의 소리 버튼으로 끌 수 있지만 리듬을 듣는 게임이므로 화면 표시를 더 주의해서 보세요.']]},
  jump:{
    intro:'달리면서 장애물을 한 번 또는 두 번 뛰어넘고 낮은 구름 아래로 숙이는 거리 도전입니다. 장애물 모양을 빨리 알아보고 필요한 동작을 한 번만 정확히 고르는 것이 중요합니다.',
    tips:['낮은 장애물은 한 번, 높은 벽과 넓은 장애물은 두 번째 점프까지 준비하세요.','낮은 구름은 점프로 넘기보다 아래쪽 키나 숙이기 버튼을 누르고 유지하세요.','첫 충돌 뒤 바로 속도를 되찾으려 하지 말고 다음 패턴의 빈 공간부터 확인하세요.'],
    scoring:'두 번째 충돌 전까지 이동한 거리(m)가 기록입니다. 시드로 섞인 100가지 패턴이 이어지며 이동 속도에 따라 장애물이 다가오는 간격이 달라집니다.',
    faq:[['2단 점프는 어떻게 하나요?','공중에 있을 때 점프 입력을 한 번 더 누르면 됩니다.'],['구름도 점프로 피할 수 있나요?','낮게 걸린 구름은 숙이기가 의도된 동작입니다. 점프하면 닿을 수 있습니다.'],['한 번 부딪히면 끝나나요?','아니요. 첫 충돌 뒤 계속 달리고 두 번째 충돌에서 끝납니다.']]},
  knowledge:{
    intro:'일반 상식, 수도, 국기 등 선택한 주제에서 서로 다른 열 문제를 풀고 짧은 해설로 확인하는 퀴즈입니다. 점수뿐 아니라 틀린 이유를 알아가는 데 초점을 둡니다.',
    tips:['문제에서 묻는 대상과 단위를 먼저 확인한 뒤 선택지를 보세요.','확실히 아닌 선택지를 지우고 남은 답 사이의 차이를 비교하세요.','결과 화면의 해설에서 정답을 뒷받침하는 핵심 단어를 다시 읽어보세요.'],
    scoring:'열 문제 중 맞힌 수를 기록합니다. 같은 시드와 문제 버전의 친구 도전은 같은 문제 조건을 사용합니다.',
    faq:[['한 판에 몇 문제인가요?','선택한 주제에서 서로 다른 열 문제를 풉니다.'],['틀린 문제 해설도 볼 수 있나요?','네. 결과에서 정답과 짧은 설명을 함께 확인할 수 있습니다.'],['문제 순서는 늘 같나요?','문제 풀과 시드에 따라 구성이 달라지고, 문제 버전이 바뀐 기록은 구분합니다.']]},
  guess:{
    intro:'드라마·애니메이션·게임 주제에서 초성과 힌트를 보고 제목이나 캐릭터를 고르는 팬 퀴즈입니다. 선택지는 초성과 글자 모양이 맞도록 구성되어 단순한 길이 비교만으로 풀기 어렵습니다.',
    tips:['초성을 먼저 음절 단위로 끊고 힌트의 장르·관계를 함께 보세요.','비슷한 선택지는 띄어쓰기와 음절 수보다 힌트에 맞는 설정을 비교하세요.','모르는 문제는 결과 해설에서 정답을 확인하고 다음 판의 단서로 남기세요.'],
    scoring:'열 문제 중 맞힌 수를 기록합니다. 장르별 100개 풀에서 문제를 뽑으며, 친구 도전은 같은 주제·시드·문제 버전으로 채점합니다.',
    faq:[['어떤 주제가 있나요?','드라마, 애니메이션, 게임처럼 화면에서 제공하는 장르를 고를 수 있습니다.'],['초성이 같은 선택지가 있나요?','네. 같은 초성과 단어 모양을 가진 선택지를 사용해 힌트를 함께 읽어야 합니다.'],['제목을 직접 입력하나요?','현재는 제시된 네 선택지 중 하나를 고르는 방식입니다.']]},
  iq:{
    intro:'수열·행렬·공간·논리의 규칙을 찾아보는 창작 추리 문제 모음입니다. 정답 수는 이 문제 묶음에서의 결과일 뿐 표준화된 IQ 수치가 아닙니다.',
    tips:['수열은 차이, 반복 주기, 번갈아 나오는 규칙을 차례로 확인하세요.','행렬은 가로 규칙과 세로 규칙 중 어느 쪽이 더 일관적인지 비교하세요.','논리 문제는 문장을 짧은 조건으로 나눠 확실한 사실부터 표시하세요.'],
    scoring:'네 유형에서 다섯 문제씩 총 스무 문제를 풀고 맞힌 수를 기록합니다. 표준화 검사와 비교하거나 지능 수치로 환산하지 않습니다.',
    faq:[['문제는 몇 개인가요?','수열·행렬·공간·논리에서 다섯 문제씩, 한 판에 스무 문제입니다.'],['결과가 실제 IQ인가요?','아닙니다. 뒹굴이 만든 오락용 규칙 찾기 문제의 정답 수입니다.'],['매번 같은 문제인가요?','100개 문제 풀에서 유형별로 새 구성을 뽑아 순서와 내용이 달라질 수 있습니다.']]},
  shop:{
    intro:'열두 가지 사업 상황에서 가까운 선택을 골라 개척·브랜드·관계·운영 네 방식의 비중을 살펴보는 자체 테스트입니다. 성공 가능성이나 직업 적합성을 판정하지 않습니다.',
    tips:['되고 싶은 모습보다 실제로 먼저 할 행동에 가까운 답을 고르세요.','두 선택이 모두 좋다면 최근 한 달에 더 자주 했던 쪽을 떠올리세요.','결과의 강점뿐 아니라 이번 주 작은 실험 제안을 하나만 실행해보세요.'],
    scoring:'각 답은 네 사업 방식 중 하나에 같은 비중으로 더해집니다. 가장 많이 선택한 방식과 전체 비중을 보여주며 동률이면 섞인 결과로 설명합니다.',
    faq:[['좋은 유형과 나쁜 유형이 있나요?','없습니다. 서로 다른 상황에서 먼저 쓰기 편한 접근을 이야기합니다.'],['사업 성공을 예측하나요?','아닙니다. 현재의 경험과 우선순위를 돌아보는 오락·대화용 테스트입니다.'],['결과가 동점이면 오류인가요?','오류가 아닙니다. 여러 방식이 같은 비중이면 균형 또는 혼합 결과로 보여줍니다.']]},
  energy:{
    intro:'열두 상황을 통해 에너지 충전, 움직이는 속도, 돌봄 방식, 변화 선호의 네 축을 살펴보는 뒹굴 자체 테스트입니다. 테토·에겐이라는 가벼운 유행어를 사용하지만 호르몬이나 건강을 측정하지 않습니다.',
    tips:['최근의 실제 생활에서 더 자연스러운 반응을 고르세요.','상황에 따라 다르면 피곤할 때도 유지되는 선택을 떠올리세요.','네 글자 코드는 MBTI 코드가 아니라 이 테스트 축의 약자입니다.'],
    scoring:'각 축을 세 번씩 물어 다수인 방향을 고르므로 축 안의 동점은 없습니다. 네 축을 조합해 16가지 이름과 실천·대화 팁을 제공합니다.',
    faq:[['MBTI 검사인가요?','아닙니다. 구조만 네 개의 양극 축을 조합하며 공인되거나 타당화된 MBTI 검사가 아닙니다.'],['생일이 결과에 쓰이나요?','아니요. 닉네임과 열두 답만 사용합니다.'],['다시 하면 달라질 수 있나요?','네. 최근 상황과 경험에 따라 답이 바뀌면 결과도 달라질 수 있습니다.']]},
  chat:{
    intro:'새 단톡방, 공지, 약속, 고민 상담처럼 익숙한 열두 상황에서 대화 시작·메시지 호흡·도움 방식·약속 흐름의 네 축을 살펴봅니다.',
    tips:['메신저에서 실제로 자주 하는 행동을 기준으로 답하세요.','읽고 반응하지 않는 경우와 짧게 표시하는 경우를 구분해 떠올리세요.','결과의 소통 팁을 친구에게 보여주고 서로 편한 방식을 물어보세요.'],
    scoring:'네 축을 각각 세 번 묻고 더 자주 고른 방향을 조합해 16가지 단톡방 역할을 만듭니다. 답변 위치는 축마다 번갈아 배치됩니다.',
    faq:[['말이 많으면 항상 먼저 열기 유형인가요?','아닙니다. 대화를 시작하는 방식과 메시지 양은 서로 다른 축입니다.'],['단톡방 관리 능력을 평가하나요?','아닙니다. 편한 참여 방식과 도움 방식을 이야기하는 자체 테스트입니다.'],['생일이나 성별이 필요한가요?','필요하지 않습니다. 닉네임과 열두 선택만 사용합니다.']]},
  taste:{
    intro:'새로움, 계획, 함께하는 사람 수, 쉬는 장면의 네 축으로 취향을 살펴보고 같은 버전의 친구 결과와 비교하는 테스트입니다.',
    tips:['가격이나 이동 거리 같은 조건이 같다고 생각하고 더 끌리는 장면을 고르세요.','평소의 선택과 특별한 날의 선택이 다르면 더 자주 반복하는 쪽을 택하세요.','친구와 다른 축은 누가 맞는지보다 다음에 서로 무엇을 소개할지 이야기하세요.'],
    scoring:'각 축의 세 답을 -1부터 1 사이 방향과 거리로 정리합니다. 친구 비교는 선택지의 왼쪽·오른쪽 위치가 아니라 네 취향 축의 방향과 거리를 사용합니다.',
    faq:[['예전 8문항 결과와 비교할 수 있나요?','같은 버전끼리 비교합니다. 기존 8문항 공유는 기존 방식으로 열리지만 새 12문항과 섞어 점수를 만들지 않습니다.'],['취향 궁합의 좋고 나쁨을 정하나요?','아닙니다. 닮은 부분과 서로 소개할 부분을 찾는 대화 도구입니다.'],['공유할 때 생일도 전달되나요?','취향 테스트는 생일을 받지 않으며 공유 답변에는 닉네임과 검사 결과에 필요한 정보만 사용합니다.']]},
  tarot:{
    intro:'스물두 장의 타로 이야기 중 마음이 가는 한 장을 고르고 관계·일·공부·오늘 같은 주제에 비춰 작은 행동을 떠올리는 오락용 콘텐츠입니다.',
    tips:['카드 이름을 맞히려 하기보다 지금 시선이 머무는 그림을 고르세요.','문장을 미래 예언보다 현재 생각을 정리하는 질문으로 읽어보세요.','행동 제안은 부담 없이 오늘 할 수 있는 가장 작은 크기로 줄이세요.'],
    scoring:'점수나 당첨 확률은 없습니다. 선택한 카드와 주제를 바탕으로 이야기와 실천 힌트를 보여줍니다.',
    faq:[['미래를 정확히 예측하나요?','아닙니다. 카드를 매개로 현재 마음을 돌아보는 오락용 이야기입니다.'],['좋지 않은 이름의 카드가 나오면 나쁜 일인가요?','카드 이름을 사건의 확정으로 해석하지 않습니다. 변화나 점검처럼 생각할 주제로 풀어냅니다.'],['같은 카드를 다시 고를 수 있나요?','새로 시작하면 다시 카드를 선택할 수 있으며 그때의 주제와 마음에 따라 다르게 읽을 수 있습니다.']]},
  daily:{
    intro:'입력한 생년월일과 선택 입력한 시간을 바탕으로 오늘 날짜에 맞춘 짧은 메시지와 행동 힌트를 보여주는 오락용 운세입니다.',
    tips:['태어난 시간을 모르면 시간 모름을 선택해 세 기둥만으로 보세요.','메시지는 결정을 대신하는 지시가 아니라 오늘을 돌아볼 질문으로 사용하세요.','생일을 저장하고 싶지 않으면 기억하기를 선택하지 않고 한 번만 이용하세요.'],
    scoring:'점수나 좋고 나쁨의 등급은 없습니다. 입력 정보와 한국 시간의 오늘 날짜로 같은 날의 이야기 흐름을 만듭니다.',
    faq:[['태어난 시간을 꼭 알아야 하나요?','아니요. 시간 모름을 선택하면 시주를 제외하고 계산합니다.'],['내일도 같은 결과인가요?','오늘 날짜가 달라지면 메시지 선택도 달라질 수 있습니다.'],['중요한 결정을 맡겨도 되나요?','아닙니다. 재미와 자기 대화를 위한 가벼운 콘텐츠로만 이용하세요.']]},
  character:{
    intro:'생년월일시의 간지와 겉 오행 구성을 바탕으로 목·화·토·금·수 중 하루 기둥의 요소를 귀여운 캐릭터 이야기로 풀어냅니다.',
    tips:['양력·음력·윤달 여부를 실제 생일 기준으로 정확히 고르세요.','시간을 모르면 임의의 시간을 넣지 말고 시간 모름을 선택하세요.','오행 개수는 성격 점수가 아니라 입력한 기둥의 겉 요소 구성으로 읽으세요.'],
    scoring:'생년월일의 세 기둥과 시간이 있을 때의 시주를 계산해 천간·지지의 겉 오행 개수를 보여줍니다. 출생 지역이나 진태양시 보정은 적용하지 않습니다.',
    faq:[['전문 사주 감정과 같은가요?','아닙니다. 일부 전통 계산 요소를 캐릭터 이야기로 단순화한 오락용 콘텐츠입니다.'],['시간 모름은 결과가 틀린 건가요?','시주를 제외한 세 기둥만 표시하므로 입력 범위가 다르다는 뜻입니다.'],['생일은 공개 랭킹에 나오나요?','생일과 시간은 공개 랭킹이나 공유 카드에 표시하지 않습니다. 기억하기를 선택한 정보는 개인 프로필 영역에서 다룹니다.']]},
  chemistry:{
    intro:'두 사람이 각자 입력한 사주 캐릭터의 요소를 나란히 놓고 편안한 속도와 대화 포인트를 이야기하는 초대형 콘텐츠입니다. 궁합의 우열이나 관계의 미래를 판정하지 않습니다.',
    tips:['상대의 생일을 대신 입력하기보다 초대 링크로 직접 입력하도록 해주세요.','같은 요소는 닮은 방식, 다른 요소는 물어볼 방식으로 가볍게 읽으세요.','결과 문장 하나를 골라 실제로 서로 편한 연락·약속 방식을 이야기해보세요.'],
    scoring:'숫자 궁합 점수는 만들지 않습니다. 두 캐릭터의 요소가 같은지 다른지에 따라 대화의 출발점을 제안합니다.',
    faq:[['점수가 높아야 잘 맞나요?','숫자 점수가 없습니다. 관계의 좋고 나쁨을 확정하지 않습니다.'],['친구의 생일이 공개되나요?','친구가 입력한 생일과 시간은 비교 결과의 공개 문구나 랭킹에 표시하지 않습니다.'],['연애 관계만 볼 수 있나요?','아니요. 친구, 가족, 동료처럼 서로의 리듬을 이야기하고 싶은 관계에서 사용할 수 있습니다.']]},
};

const guideCss = `
.guide-thumb{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;margin-bottom:10px;border:2px solid #49382d}.guide-cover{display:block;width:100%;max-width:640px;height:auto;aspect-ratio:3/2;border:3px solid #49382d;box-shadow:5px 5px #b59b73;margin:24px 0}.static-art-fallback{color:#64503b;background-color:#e5dcc1;background-image:repeating-linear-gradient(0deg,#eee4cb 0 8px,#e5dcc1 8px 16px)}*{box-sizing:border-box}html{background:#f6eedb;color:#49382d}body{margin:0;font-family:'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;line-height:1.75}.guide-shell{width:min(920px,calc(100% - 32px));margin:0 auto;padding:26px 0 72px}.guide-nav,.guide-footer{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.guide-nav{padding:10px 0 24px;border-bottom:2px solid #49382d}.guide-brand{font-family:var(--pixel-display,system-ui);font-weight:900;font-size:22px}.guide-breadcrumb{color:#756b5d;font-size:14px}.guide-hero{padding:46px 0 34px}.guide-kicker{color:#8e4938;font-family:var(--pixel-display,system-ui);font-weight:800}.guide-hero h1{margin:8px 0 14px;font-family:var(--pixel-display,system-ui);font-size:clamp(30px,7vw,50px);line-height:1.3}.guide-lede{font-size:18px;max-width:760px}.guide-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.guide-meta span{padding:5px 10px;border:1px solid #8e8069;background:#fffaf0;font-size:13px}.guide-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}.guide-button{display:inline-flex;min-height:48px;align-items:center;padding:10px 18px;border:2px solid #49382d;background:#40563d;color:#fffaf0;text-decoration:none;font-family:var(--pixel-display,system-ui);box-shadow:3px 3px 0 #bc6850}.guide-button.secondary{background:#fffaf0;color:#49382d;box-shadow:3px 3px 0 #c8b694}.guide-section{margin-top:22px;padding:25px;border:2px solid #49382d;background:#fffaf0;box-shadow:4px 4px 0 #c8b694}.guide-section h2{margin:0 0 12px;font-family:var(--pixel-display,system-ui);font-size:22px}.guide-section p{margin:0}.guide-section ol{margin:0;padding-left:23px}.guide-section li+li{margin-top:9px}.guide-faq{display:grid;gap:14px}.guide-faq article{padding-top:14px;border-top:1px solid #c8b694}.guide-faq article:first-child{padding-top:0;border-top:0}.guide-faq h3{margin:0 0 5px;font-size:17px}.guide-related{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.guide-related a{padding:14px;border:1px solid #a89576;background:#f7efdD;color:#49382d;text-decoration:none}.guide-footer{margin-top:42px;padding-top:20px;border-top:2px solid #49382d;color:#756b5d;font-size:13px}.guide-footer a{color:inherit}.guide-legal h1{font-family:var(--pixel-display,system-ui);font-size:clamp(30px,7vw,46px)}.guide-legal h2{margin-top:32px;font-family:var(--pixel-display,system-ui);font-size:21px}.guide-legal li+li{margin-top:8px}@media(max-width:640px){.guide-shell{width:min(100% - 24px,920px);padding-top:16px}.guide-hero{padding-top:32px}.guide-section{padding:20px}.guide-related{grid-template-columns:1fr}.guide-button{width:100%;justify-content:center}}`;

function commonHead({title,description,pathname,type='website'}) {
  const canonical=absolute(pathname); const artId=catalog.find(c=>pathname===`/content/${c.id}/`)?.id||'sort'; const art=absolute('/assets/pixel/thumbnails/'+artId+'.webp');
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f6eedb"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="뒹굴"><meta property="og:type" content="${type}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${art}"><meta property="og:image:width" content="960"><meta property="og:image:height" content="640"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${art}"><meta name="google-adsense-account" content="ca-pub-7301223136166743"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/pixel.css"><link rel="stylesheet" href="/css/consent.css"><style>${guideCss}</style><script type="module" src="/js/telemetry.js"></script>`;
}

function footer() {
  return `<footer class="guide-footer"><span>© ${new Date().getFullYear()} ${owner}</span><nav aria-label="정책과 연락"><a href="/about/">소개</a> <a href="/privacy/">개인정보처리방침</a> <a href="/terms/">이용약관</a> <a href="/contact/">연락</a> <button type="button" data-analytics-settings>방문 분석 설정</button></nav></footer>`;
}

function pageDocument({head,body}) {
  return `<!doctype html><html lang="ko"><head>${head}</head><body>${body}</body></html>\n`;
}

function relatedItems(item) {
  const same=catalog.filter(candidate=>candidate.cat===item.cat&&candidate.id!==item.id);
  const fallback=catalog.filter(candidate=>candidate.cat!==item.cat);
  return [...same,...fallback].slice(0,3);
}

function contentIndexPage() {
  const description='21가지 놀거리의 조작법, 기록 기준과 시작 팁을 한곳에서 찾아보세요.';
  const sections=Object.entries(categories).map(([category,name])=>`<section class="guide-section"><h2>${escapeHtml(name)}</h2><div class="guide-related">${catalog.filter(item=>item.cat===category).map(item=>`<a href="/content/${item.id}/"><img class="guide-thumb static-art-fallback" src="/assets/pixel/thumbnails/${item.id}-small.webp" width="480" height="320" alt="" loading="lazy" decoding="async"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.desc)}</p></a>`).join('')}</div></section>`).join('');
  return pageDocument({head:commonHead({title:'놀거리 가이드 | 뒹굴',description,pathname:'/content/'}),body:`<div class="guide-shell"><nav class="guide-nav"><a class="guide-brand" href="/">뒹굴</a><a href="/#/explore">놀거리 시작하기 →</a></nav><main><header class="guide-hero"><span class="guide-kicker">PLAY GUIDE</span><h1>놀거리 가이드</h1><p>${description}</p></header>${sections}</main>${footer()}</div>`});
}

function guidePage(item) {
  const guide=guides[item.id];
  const pathname=`/content/${item.id}/`;
  const title=`${item.title} 하는 법과 기록 안내 | 뒹굴`;
  const description=`${item.desc} ${guide.scoring}`.slice(0,155);
  const faqJson=guide.faq.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}));
  const structured={'@context':'https://schema.org','@type':'WebPage',name:item.title,description:guide.intro,url:absolute(pathname),inLanguage:'ko-KR',isPartOf:{'@type':'WebSite',name:'뒹굴',url:siteOrigin},mainEntity:{'@type':'FAQPage',mainEntity:faqJson}};
  const body=`<div class="guide-shell"><nav class="guide-nav" aria-label="주요 이동"><a class="guide-brand" href="/">뒹굴</a><span class="guide-breadcrumb"><a href="/">홈</a> / ${escapeHtml(categories[item.cat])} / ${escapeHtml(item.title)}</span></nav><main><header class="guide-hero"><span class="guide-kicker">${escapeHtml(categories[item.cat])} · ${escapeHtml(item.time)}</span><h1>${escapeHtml(item.title)}</h1><img class="guide-cover static-art-fallback" src="/assets/pixel/thumbnails/${item.id}.webp" srcset="/assets/pixel/thumbnails/${item.id}-small.webp 480w, /assets/pixel/thumbnails/${item.id}.webp 960w" sizes="(max-width:640px) 92vw, 920px" width="960" height="640" alt="${escapeHtml(item.title)} 픽셀 일러스트" decoding="async"><p class="guide-lede">${escapeHtml(guide.intro)}</p><div class="guide-meta"><span>${escapeHtml(item.time)}</span><span>${escapeHtml(item.cat==='game'?'모바일 · PC':item.cat==='quiz'?'창작 퀴즈':'나의 속도로')}</span></div><div class="guide-actions"><a class="guide-button" href="/#/detail/${encodeURIComponent(item.id)}">${escapeHtml(item.title)} 시작하기</a><a class="guide-button secondary" href="/">전체 놀거리 보기</a></div></header><section class="guide-section"><h2>게임 규칙</h2><p>${escapeHtml(item.rules)}</p></section><section class="guide-section"><h2>잘 시작하는 세 가지 방법</h2><ol>${guide.tips.map(tip=>`<li>${escapeHtml(tip)}</li>`).join('')}</ol></section><section class="guide-section"><h2>기록과 결과 읽기</h2><p>${escapeHtml(guide.scoring)}</p></section><section class="guide-section"><h2>자주 묻는 질문</h2><div class="guide-faq">${guide.faq.map(([question,answer])=>`<article><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></article>`).join('')}</div></section><section class="guide-section"><h2>다음에 해볼 놀거리</h2><div class="guide-related">${relatedItems(item).map(candidate=>`<a href="/content/${candidate.id}/"><img class="guide-thumb static-art-fallback" src="/assets/pixel/thumbnails/${candidate.id}-small.webp" width="480" height="320" alt="" loading="lazy" decoding="async"><strong>${escapeHtml(candidate.title)}</strong><br><small>${escapeHtml(candidate.desc)}</small></a>`).join('')}</div></section></main>${footer()}</div><script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script>`;
  return pageDocument({head:commonHead({title,description,pathname,type:'article'}),body});
}

const legalPages = {
  about:{title:'뒹굴 소개',description:'짧은 틈에 즐기는 게임, 퀴즈, 자체 성향 테스트와 오락용 운세를 만드는 뒹굴을 소개합니다.',content:`<p>뒹굴은 짧은 틈에 한 판 즐기고 친구와 결과를 이야기할 수 있는 웹 놀이터입니다. 순발력 게임, 창작 퀴즈, 자체 성향 테스트, 오락용 운세까지 21개 콘텐츠를 한곳에 모았습니다.</p><h2>우리가 만드는 기준</h2><ul><li>규칙과 기록 단위를 시작 전에 분명하게 설명합니다.</li><li>친구 도전은 같은 게임 규칙과 문제 버전을 사용합니다.</li><li>성향 결과와 운세 이야기를 사람의 능력이나 미래를 확정하는 판단으로 소개하지 않습니다.</li><li>게임 골드·토큰·장비는 놀이 안의 가상 항목이며 현금 결제나 현금 교환 기능을 두지 않습니다.</li></ul><h2>운영</h2><p>${owner}이 콘텐츠와 서비스를 관리합니다. 오류, 접근성 문제와 콘텐츠 제안은 <a href="${contactUrl}" rel="external">GitHub Issues</a>에서 받습니다.</p>`},
  privacy:{title:'개인정보처리방침',description:'뒹굴의 세션, 프로필, 생일 선택 저장, 기록, 공유와 선택형 분석 도구 처리 방식을 안내합니다.',content:`<p>뒹굴은 서비스를 작동시키는 데 필요한 정보만 다루고, 공개 범위는 이용자가 선택하도록 설계합니다. 이 문서는 ${buildDate} 기준 실제 코드와 출시 준비 상태를 설명합니다.</p><h2>자동으로 만들어지는 세션</h2><p>처음 접속하면 무작위 세션 토큰을 쿠키에 저장합니다. 쿠키 이름은 <code>dw_session</code>이며 HttpOnly, SameSite=Strict, Path=/, 최대 1년 속성을 사용하고 HTTPS에서는 Secure 속성을 붙입니다. 서버에는 원문 토큰 대신 SHA-256 해시를 저장합니다. 이 세션은 같은 브라우저의 게임 진행과 프로필을 연결하는 데 사용됩니다.</p><h2>프로필과 PIN</h2><p>프로필을 만들면 닉네임, 게임 기록, 선택해 등록한 공개 순위 범위, 친구방, 게임 골드·토큰·장비 상태를 처리합니다. 4자리 관리 PIN은 원문으로 저장하지 않고 무작위 salt와 scrypt로 만든 해시를 저장합니다. 복구 코드도 해시로 저장하므로 이용자는 발급된 원문을 직접 안전하게 보관해야 합니다.</p><h2>생일과 개인 기록</h2><p>생년월일·시간·양력 또는 음력 정보는 운세 입력에 사용합니다. ‘기억하기’ 또는 프로필 저장을 명시적으로 선택했을 때만 브라우저나 개인 프로필에 저장합니다. 저장한 생일과 개인 결과 이력은 개인 영역에서 불러오며, 공유 카드와 공개 랭킹에는 원래 생년월일과 시간을 넣지 않습니다. 서버 개인 결과는 최근 100개까지 보관하고 콘텐츠·모드별 개인 최고 기록을 따로 관리합니다.</p><h2>브라우저 저장소</h2><p>프로필을 연결하지 않아도 최근 플레이 이력, 설정, 선택적으로 기억한 생일을 이 브라우저의 localStorage에 저장할 수 있습니다. 브라우저 설정에서 사이트 데이터를 지우면 함께 삭제됩니다. 서버 프로필의 생일과 개인 이력은 앱의 설정 화면에서 각각 지울 수 있습니다.</p><h2>분석과 광고 준비</h2><p>Google Analytics 4는 선택 동의를 받은 경우에만 불러오도록 준비합니다. 동의하지 않은 이용자에게 분석 저장을 켜지 않는 흐름을 출시 전에 확인해야 합니다. Google은 활성화된 설정에 따라 기기·브라우저 정보, 대략적 위치, 이용 세션과 <code>_ga</code> 계열 식별 쿠키를 처리할 수 있습니다. 현재 빌드는 AdSense 사이트 소유권 메타 태그와 ads.txt만 포함하며 자동 광고나 게임 중 광고 단위는 넣지 않습니다.</p><h2>제공·공개·보관</h2><p>이용자가 직접 세계·지역·친구 범위를 골라 등록한 게임·퀴즈 기록만 해당 순위에 표시합니다. 공유 링크는 생성 후 30일 동안 열 수 있습니다. Cloudflare는 호스팅과 세션·저장소 인프라 제공자로, Google은 이용자가 동의한 분석 기능이 실제로 활성화된 경우 처리자로 관여할 수 있습니다.</p><h2>문의</h2><p>정책과 기능 문의는 <a href="${contactUrl}" rel="external">GitHub Issues</a>를 이용해주세요. 공개 게시판이므로 생년월일, PIN, 복구 코드, 세션 값 같은 개인정보나 비밀정보를 적지 마세요. 개인 정보는 먼저 앱 안의 삭제 기능으로 관리해주세요.</p>`},
  terms:{title:'이용약관',description:'뒹굴의 오락 콘텐츠, 기록, 프로필, 가상 게임 항목과 이용 시 지켜야 할 기본 사항을 안내합니다.',content:`<p>뒹굴을 이용하면 아래의 서비스 성격과 기본 이용 기준에 동의하는 것으로 봅니다. 이 약관은 ${buildDate}부터 적용합니다.</p><h2>서비스 성격</h2><p>뒹굴은 게임, 창작 퀴즈, 자체 성향 테스트와 오락용 운세를 제공합니다. 성향 결과는 심리 진단이나 공인 MBTI 검사가 아니고, 운세·타로·사주 이야기는 미래를 확정하지 않습니다. IQ 추리 결과는 표준화된 지능 수치가 아닙니다.</p><h2>중요한 판단</h2><p>사업가 테스트와 다른 콘텐츠는 창업 성공, 투자, 세무, 법률, 의료 또는 직업 적합성에 대한 조언이 아닙니다. 실제 결정에는 상황에 맞는 자료와 필요한 경우 자격 있는 전문가의 검토를 이용해주세요.</p><h2>기록과 커뮤니티 기능</h2><p>공개 순위와 친구방에서는 다른 이용자를 존중하는 닉네임을 사용해야 합니다. 시스템을 우회해 허위 기록을 만들거나 서비스 안정성을 해치는 자동 요청을 보내면 해당 기록이나 접근이 제한될 수 있습니다. 게임 규칙과 문제 버전이 다른 기록은 공정한 비교를 위해 분리될 수 있습니다.</p><h2>가상 항목과 결제</h2><p>골드, 토큰, 차량, 장비와 강화 수치는 게임 안에서만 쓰는 가상 항목입니다. 현재 서비스에는 현금 결제, 유료 뽑기, 환전 또는 현금 가치가 없습니다.</p><h2>이용 가능성과 변경</h2><p>콘텐츠와 규칙은 오류 수정과 개선을 위해 바뀔 수 있습니다. 변경된 규칙은 이전 기록과 구분해 표시하려고 노력합니다. 점검, 장애, 외부 호스팅 사정으로 서비스 일부가 일시적으로 중단될 수 있습니다.</p><h2>문의</h2><p>약관이나 서비스에 관한 문의는 <a href="${contactUrl}" rel="external">GitHub Issues</a>를 이용해주세요. 공개 게시판에 PIN이나 복구 코드를 올리지 마세요.</p>`},
  contact:{title:'뒹굴에 연락하기',description:'뒹굴의 오류, 접근성 문제, 콘텐츠와 개인정보처리방침 관련 문의 방법을 안내합니다.',content:`<p>${owner}은 오류 제보, 접근성 문제, 콘텐츠 제안과 정책 문의를 <a href="${contactUrl}" rel="external">Dunsmile/dwingul GitHub Issues</a>에서 받습니다.</p><p><a class="guide-button" href="${contactUrl}" rel="external">오류 또는 제안 남기기</a></p><h2>제보에 포함하면 좋은 내용</h2><ul><li>문제가 생긴 콘텐츠 이름과 페이지</li><li>기대했던 동작과 실제로 본 동작</li><li>기기 종류와 브라우저 이름</li><li>재현에 필요한 순서</li></ul><h2>공개 게시판 주의</h2><p>Issues는 공개될 수 있습니다. 생년월일, 태어난 시간, 관리 PIN, 복구 코드, 세션 쿠키, 실제 주소처럼 개인을 식별하거나 계정을 복구할 수 있는 정보는 게시하지 마세요. 화면을 첨부할 때도 해당 값이 보이지 않는지 먼저 확인해주세요.</p>`},
};

function legalPage(id,page) {
  const pathname=`/${id}/`;
  const body=`<div class="guide-shell"><nav class="guide-nav"><a class="guide-brand" href="/">뒹굴</a><span class="guide-breadcrumb"><a href="/">홈</a> / ${escapeHtml(page.title)}</span></nav><main class="guide-legal"><header class="guide-hero"><span class="guide-kicker">뒹굴 안내</span><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p><p><small>기준일 ${buildDate}</small></p></header><section class="guide-section">${page.content}</section></main>${footer()}</div>`;
  return pageDocument({head:commonHead({title:`${page.title} | 뒹굴`,description:page.description,pathname}),body});
}

function injectHomeSeo(source) {
  const art=absolute('/assets/pixel/thumbnails/sort.webp');
  const description='방구석에서 가볍게 즐기는 10가지 게임, 3가지 창작 퀴즈, 4가지 자체 성향 테스트와 4가지 오락용 운세. 뒹굴에서 딱 한 판.';
  const catalogLinks=catalog.map(item=>`<li><a href="/content/${item.id}/"><img class="guide-thumb static-art-fallback" src="/assets/pixel/thumbnails/${item.id}-small.webp" width="480" height="320" alt="" loading="lazy" decoding="async"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.desc)}</span></a></li>`).join('');
  const fallback=`<main class="seo-home" aria-label="뒹굴 놀거리 안내"><section><p class="seo-home-kicker">게임 · 퀴즈 · 성향 · 운세</p><h1>심심한 틈, 뒹굴에서 한 판</h1><p>${escapeHtml(description)}</p><p><a class="seo-home-start" href="/#/explore">전체 놀거리 시작하기</a></p></section><section><h2>21가지 놀거리 안내</h2><ul>${catalogLinks}</ul></section><footer><a href="/about/">소개</a><a href="/privacy/">개인정보처리방침</a><a href="/terms/">이용약관</a><a href="/contact/">연락</a></footer></main>`;
  const homeStyle=`<style data-static-home>.seo-home .guide-thumb{width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}.seo-home .static-art-fallback{color:#64503b;background-color:#e5dcc1;background-image:repeating-linear-gradient(0deg,#eee4cb 0 8px,#e5dcc1 8px 16px)}.seo-home{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:56px 0 72px;color:#49382d}.seo-home>section:first-child{padding:34px;border:3px solid #49382d;background:#dfe8ca;box-shadow:7px 7px 0 #baa784}.seo-home h1,.seo-home h2{font-family:var(--pixel-display,system-ui)}.seo-home h1{font-size:clamp(34px,7vw,58px);line-height:1.3}.seo-home-kicker{color:#8e4938;font-weight:800}.seo-home-start{display:inline-flex;min-height:48px;align-items:center;padding:10px 18px;border:2px solid #49382d;background:#40563d;color:white;text-decoration:none;box-shadow:3px 3px 0 #bc6850}.seo-home>section+section{margin-top:42px}.seo-home ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0;list-style:none}.seo-home li a{display:grid;gap:6px;height:100%;padding:17px;border:2px solid #49382d;background:#fffaf0;color:inherit;text-decoration:none;box-shadow:3px 3px 0 #c8b694}.seo-home li span{color:#756b5d;font-size:14px}.seo-home footer{display:flex;gap:18px;flex-wrap:wrap;margin-top:38px;padding-top:18px;border-top:2px solid #49382d}.seo-home footer a{color:inherit}@media(max-width:760px){.seo-home{padding-top:28px}.seo-home ul{grid-template-columns:1fr}.seo-home>section:first-child{padding:24px}}</style>`;
  const structured={'@context':'https://schema.org','@type':'WebSite',name:'뒹굴',url:`${siteOrigin}/`,description,hasPart:catalog.map(item=>({'@type':'WebPage',name:item.title,url:absolute(`/content/${item.id}/`)}))};
  const seo=`<link rel="canonical" href="${siteOrigin}/"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:locale" content="ko_KR"><meta property="og:type" content="website"><meta property="og:site_name" content="뒹굴"><meta property="og:title" content="뒹굴 — 심심한 틈, 한 판만."><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${siteOrigin}/"><meta property="og:image" content="${art}"><meta property="og:image:width" content="960"><meta property="og:image:height" content="640"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${art}"><meta name="google-adsense-account" content="ca-pub-7301223136166743">${homeStyle}<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script>`;
  source=source.replace(/<meta (?:property="og:image"|name="twitter:card") content="[^"]*">/g,'');
  let result=source.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${escapeHtml(description)}">`);
  result=result.replace('</head>',`${seo}</head>`);
  result=result.replace(/<div id="app">\s*<\/div>/,`<div id="app">${fallback}</div>`);
  result=result.replace(/<noscript>[\s\S]*?<\/noscript>/,`<noscript><p style="padding:16px;text-align:center">JavaScript 없이도 위의 21개 이용 안내와 정책 페이지를 읽을 수 있습니다. 게임을 직접 시작하려면 JavaScript를 켜주세요.</p></noscript>`);
  return result;
}

async function copyPublic() {
  await rm(outputDirectory,{recursive:true,force:true});
  await cp(publicDirectory,outputDirectory,{recursive:true,filter(source){
    const relative=path.relative(publicDirectory,source).split(path.sep).join('/');
    return !excludedClientFiles.has(relative);
  }});
}

async function writePage(relative,html) {
  const destination=path.join(outputDirectory,relative,'index.html');
  await mkdir(path.dirname(destination),{recursive:true});
  await writeFile(destination,html,'utf8');
}

async function validateBuild() {
  assert.equal(catalog.length,21,'공개 카탈로그는 정확히 21개여야 합니다.');
  assert.equal(new Set(catalog.map(item=>item.id)).size,21,'카탈로그 ID가 중복됐습니다.');
  assert.deepEqual(Object.keys(guides).sort(),catalog.map(item=>item.id).sort(),'21개 콘텐츠마다 고유 가이드가 필요합니다.');
  for (const excluded of excludedClientFiles) await assert.rejects(stat(path.join(outputDirectory,excluded)),{code:'ENOENT'});

  const home=await readFile(path.join(outputDirectory,'index.html'),'utf8');
  assert.match(home,new RegExp(`<link rel="canonical" href="${siteOrigin}/">`));
  assert.match(home,/name="google-adsense-account" content="ca-pub-7301223136166743"/);
  assert.match(home,/<div id="app"><main class="seo-home"/);
  for (const item of catalog) {
    assert.match(home,new RegExp(`href="/content/${item.id}/"`));
    const html=await readFile(path.join(outputDirectory,'content',item.id,'index.html'),'utf8');
    assert.ok(html.length>3000,`${item.id} 가이드가 너무 짧습니다.`);
    assert.match(html,new RegExp(`<link rel="canonical" href="${absolute(`/content/${item.id}/`)}">`));
    assert.match(html,new RegExp(`href="/#/detail/${item.id}"`));
    assert.match(html,/src="\/js\/telemetry\.js"/);
    assert.equal((html.match(/<article><h3>/g)||[]).length,3,`${item.id} FAQ는 세 개여야 합니다.`);
  }
  for (const id of Object.keys(legalPages)) {
    const html=await readFile(path.join(outputDirectory,id,'index.html'),'utf8');
    assert.match(html,new RegExp(`<link rel="canonical" href="${absolute(`/${id}/`)}">`));
    assert.match(html,/src="\/js\/telemetry\.js"/);
  }
  assert.equal(await readFile(path.join(outputDirectory,'ads.txt'),'utf8'),'google.com, pub-7301223136166743, DIRECT, f08c47fec0942fa0\n');
  assert.match(await readFile(path.join(outputDirectory,'robots.txt'),'utf8'),/Sitemap: https:\/\/dwingul\.com\/sitemap\.xml/);
  const sitemap=await readFile(path.join(outputDirectory,'sitemap.xml'),'utf8');
  assert.equal((sitemap.match(/<url>/g)||[]).length,27,'사이트맵에는 홈, 가이드 목록, 콘텐츠 21개, 안내 4개가 있어야 합니다.');
}

export async function buildSite() {
  await copyPublic();
  const sourceIndex=await readFile(path.join(publicDirectory,'index.html'),'utf8');
  await writeFile(path.join(outputDirectory,'index.html'),injectHomeSeo(sourceIndex),'utf8');
  await writePage('content',contentIndexPage());
  for (const item of catalog) await writePage(path.join('content',item.id),guidePage(item));
  for (const [id,page] of Object.entries(legalPages)) await writePage(id,legalPage(id,page));

  const urls=['/','/content/',...catalog.map(item=>`/content/${item.id}/`),...Object.keys(legalPages).map(id=>`/${id}/`)];
  const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(pathname=>`  <url><loc>${absolute(pathname)}</loc><lastmod>${buildDate}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(outputDirectory,'sitemap.xml'),sitemap,'utf8');
  await writeFile(path.join(outputDirectory,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`,'utf8');
  await writeFile(path.join(outputDirectory,'ads.txt'),'google.com, pub-7301223136166743, DIRECT, f08c47fec0942fa0\n','utf8');
  await validateBuild();
  return {pages:urls.length,contents:catalog.length,output:outputDirectory};
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const result=await buildSite();
  console.log(`site built: ${result.pages} crawlable pages in ${result.output}`);
}
