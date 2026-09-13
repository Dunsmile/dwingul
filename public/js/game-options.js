export const cityCars = [
  { id: 'basic', name: '시티 원', subtitle: '균형 잡힌 첫 드라이브', speed: 1, fuel: 30, cost: 0, color: '#f4bd43' },
  { id: 'sport', name: '스프린터', subtitle: '더 빠르게, 더 멀리', speed: 1.5, fuel: 25, cost: 50, color: '#ec735f' },
  { id: 'touring', name: '롱런', subtitle: '넉넉한 연료로 여유 있게', speed: .8, fuel: 40, cost: 50, color: '#78bba5' },
];
export function gameSettings(id, raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  if (id === 'sequence') return { version: 'v9', mode: 'rhythm' };
  if (id === 'sort') return { version: 'v5', mode: raw.mode === 'endless' ? 'endless' : 'sprint' };
  if (id === 'typing') return { version:'v5', mode:'rpg', startStage:Number.isInteger(Number(raw.startStage))&&Number(raw.startStage)>=1&&(Number(raw.startStage)-1)%10===0?Number(raw.startStage):1 };
  if (id === 'racing') return { version: 'v6', car: cityCars.some(c => c.id === raw.car) ? raw.car : 'basic' };
  return id === 'jump' ? { version: 'v6' } : {};
}
export function gameMode(id, raw={}) {
  const s=gameSettings(id,raw),v=['v4','v5'].includes(raw?.version)?raw.version:s.version;
  return id==='sequence'?(raw?.version==='v9'?'rhythm-endless-v9':raw?.version==='v7'?'rhythm-relay-v7':'nine-pad'):id==='sort'?`sort-${s.mode}-${v}`:id==='typing'?(v==='v4'?`typing-${raw.mode==='rpg'?'rpg':'rain'}-v4`:`typing-rpg-v5-s${s.startStage}`):id==='racing'?`city-${s.car}-${v}`:id==='jump'?`jump-distance-${v}`:null;
}
export const gameModeNames = {
  'rhythm-endless-v9':'무한 리듬 · 100가지 패턴', 'rhythm-relay-v7':'리듬 릴레이 · 8라운드', 'nine-pad':'기억 순서 · 이전 규칙',
  'city-basic-v6':'도심 질주 · 시티 원', 'city-sport-v6':'도심 질주 · 스프린터', 'city-touring-v6':'도심 질주 · 롱런', 'jump-distance-v6':'멀리 뛰기 · 여유로운 2단 점프',
  'sort-sprint-v5':'좌우 · 20초 피버', 'sort-endless-v5':'좌우 · 무한 피버', 'city-basic-v5':'도심 질주 · 시티 원', 'city-sport-v5':'도심 질주 · 스프린터', 'city-touring-v5':'도심 질주 · 롱런', 'jump-distance-v5':'멀리 뛰기 · 거리', 'typing-rpg-v5-s1':'타이핑 RPG · 1스테이지 시작',
  'sort-sprint-v4': '좌우 · 10초', 'sort-endless-v4': '좌우 · 무한',
  'typing-rain-v4': '타이포 레인', 'typing-rpg-v4': '타이포 RPG',
  'city-basic-v4': '도심 질주 · 시티 원', 'city-sport-v4': '도심 질주 · 스프린터',
  'city-touring-v4': '도심 질주 · 롱런', 'jump-distance-v4': '멀리 뛰기 · 거리',
};
export const settingsParams = (id, raw) => new URLSearchParams(gameSettings(id, raw)).toString();
