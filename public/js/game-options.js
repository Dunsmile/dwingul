export const cityCars = [
  {id:'basic',name:'시티 원',subtitle:'모든 감각을 고르게 익히는 첫 차',speed:1,fuel:30,boostDuration:4,boostProc:.08,armor:0,cost:0,color:'#f4bd43',design:'호박빛 소형 해치백',art:'/assets/pixel/illustrated/vehicles/basic.png'},
  {id:'sport',name:'스프린터',subtitle:'짧은 부스터로 단숨에 치고 나가요',speed:1.5,fuel:25,boostDuration:2.75,boostProc:.20,armor:0,cost:50,color:'#ec735f',design:'산호빛 로드스터와 작은 스포일러',art:'/assets/pixel/illustrated/vehicles/sport.png'},
  {id:'touring',name:'롱런',subtitle:'튼튼한 차체와 긴 부스터로 여유롭게',speed:.8,fuel:40,boostDuration:5,boostProc:.10,armor:2,cost:50,color:'#78bba5',design:'세이지색 우드 패널 왜건과 지붕 짐',art:'/assets/pixel/illustrated/vehicles/touring.png'},
  {id:'compact',name:'도토리',subtitle:'가볍고 행운 충전이 잦은 골목 친구',speed:1.05,fuel:30,boostDuration:4.5,boostProc:.18,armor:0,cost:75,color:'#b8794f',design:'도토리빛 마이크로카와 잎사귀 안테나',art:'/assets/pixel/illustrated/vehicles/compact.png'},
  {id:'rally',name:'솔방울 랠리',subtitle:'속도와 방어를 고루 챙긴 비포장 전문가',speed:1.18,fuel:34,boostDuration:4,boostProc:.15,armor:1,cost:100,color:'#5988a9',design:'파란 랠리 해치와 크림 줄무늬 지붕등',art:'/assets/pixel/illustrated/vehicles/rally.png'},
  {id:'pickup',name:'오크 픽업',subtitle:'묵직한 장갑으로 충돌 피해를 줄여요',speed:.88,fuel:44,boostDuration:3.5,boostProc:.08,armor:4,cost:125,color:'#69513c',design:'짙은 참나무색 픽업과 통나무 적재함',art:'/assets/pixel/illustrated/vehicles/pickup.png'},
  {id:'van',name:'모스 캠퍼',subtitle:'가장 넉넉한 연료와 긴 가속 시간',speed:.82,fuel:50,boostDuration:5.5,boostProc:.12,armor:3,cost:150,color:'#647b55',design:'이끼색 캠퍼 밴과 높은 지붕 차양',art:'/assets/pixel/illustrated/vehicles/van.png'},
  {id:'roadster',name:'반딧불 로드스터',subtitle:'충전 행운이 가장 큰 전문가용 차',speed:1.42,fuel:25,boostDuration:2.5,boostProc:.28,armor:0,cost:200,color:'#765c91',design:'보랏빛 오픈톱과 반딧불 전조등',art:'/assets/pixel/illustrated/vehicles/roadster.png'},
];
export function gameSettings(id, raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  if (id === 'sequence') return { version: ['v9','v7'].includes(raw.version) ? raw.version : 'v11', mode: 'rhythm' };
  if (id === 'sort') return { version: 'v5', mode: raw.mode === 'endless' ? 'endless' : 'sprint' };
  if (id === 'typing') return { version:'v5', mode:'rpg', sentenceMode:raw.sentenceMode==='long'?'long':'short', startStage:Number.isInteger(Number(raw.startStage))&&Number(raw.startStage)>=1&&(Number(raw.startStage)-1)%10===0?Number(raw.startStage):1 };
  if (id === 'racing') return { version: ['v4','v5','v6'].includes(raw.version) ? raw.version : 'v7', car: cityCars.some(c => c.id === raw.car) ? raw.car : 'basic' };
  return id === 'jump' ? { version: ['v4','v5','v6','v11'].includes(raw.version) ? raw.version : 'v13' } : {};
}
export function gameMode(id, raw={}) {
  const s=gameSettings(id,raw),v=['v4','v5','v6'].includes(raw?.version)?raw.version:s.version;
  return id==='sequence'?(s.version==='v11'?'rhythm-three-lane-v11':s.version==='v9'?'rhythm-endless-v9':s.version==='v7'?'rhythm-relay-v7':'nine-pad'):id==='sort'?`sort-${s.mode}-${v}`:id==='typing'?(v==='v4'?`typing-${raw.mode==='rpg'?'rpg':'rain'}-v4`:`typing-rpg-v5-${s.sentenceMode==='long'?'long-':''}s${s.startStage}`):id==='racing'?`city-${s.car}-${s.version}`:id==='jump'?`jump-distance-${s.version}`:null;
}
export const gameModeNames = {
  'rhythm-three-lane-v11':'세 갈래 리듬 · 무한 모드', 'rhythm-endless-v9':'무한 리듬 · 100가지 패턴', 'rhythm-relay-v7':'리듬 릴레이 · 8라운드', 'nine-pad':'기억 순서 · 이전 규칙',
  ...Object.fromEntries(cityCars.map(car=>[`city-${car.id}-v7`,`도심 질주 · ${car.name}`])),
  'city-basic-v6':'도심 질주 · 시티 원', 'city-sport-v6':'도심 질주 · 스프린터', 'city-touring-v6':'도심 질주 · 롱런', 'jump-distance-v13':'멀리 뛰기 · 10초 성장', 'jump-distance-v11':'멀리 뛰기 · 숲길 거리', 'jump-distance-v6':'멀리 뛰기 · 여유로운 2단 점프',
  'sort-sprint-v5':'좌우 · 20초 피버', 'sort-endless-v5':'좌우 · 무한 피버', 'city-basic-v5':'도심 질주 · 시티 원', 'city-sport-v5':'도심 질주 · 스프린터', 'city-touring-v5':'도심 질주 · 롱런', 'jump-distance-v5':'멀리 뛰기 · 거리', 'typing-rpg-v5-s1':'타이핑 RPG · 1스테이지 시작',
  'sort-sprint-v4': '좌우 · 10초', 'sort-endless-v4': '좌우 · 무한',
  'typing-rain-v4': '타이포 레인', 'typing-rpg-v4': '타이포 RPG',
  'city-basic-v4': '도심 질주 · 시티 원', 'city-sport-v4': '도심 질주 · 스프린터',
  'city-touring-v4': '도심 질주 · 롱런', 'jump-distance-v4': '멀리 뛰기 · 거리',
};
export const settingsParams = (id, raw) => new URLSearchParams(gameSettings(id, raw)).toString();
