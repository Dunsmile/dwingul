import { cityCars, gameSettings } from './game-options.js';
const choices = {
  sort: [['sprint','20초 모드','끊기지 않는 연속 입력으로 피버에 도전!'],['endless','무한 모드','갈수록 빨라져요. 실수 3번이면 끝!']],
};
export function setupMarkup(id, raw, garage={tokens:0,unlocked:['basic']}, index) {
  const settings=gameSettings(id,raw);
  if(choices[id])return `<fieldset class="play-settings"><legend>어떤 모드로 할까요?</legend><div class="mode-choices">${choices[id].map(([value,name,desc])=>`<label class="mode-choice"><input type="radio" name="game-mode" value="${value}" ${settings.mode===value?'checked':''}><span><strong>${name}</strong><small>${desc}</small></span></label>`).join('')}</div></fieldset>`;
  if(id!=='racing')return '';
  const i=index??cityCars.findIndex(c=>c.id===settings.car), car=cityCars[i], unlocked=car&&garage.unlocked.includes(car.id);
  return `<section class="garage panel stack-sm" data-car-index="${i}"><div class="between"><span class="eyebrow">MY GARAGE</span><strong class="token-balance">● ${garage.tokens} 토큰</strong></div><div class="garage-selector"><button class="garage-arrow" type="button" data-act="car-prev" aria-label="이전 차량">←</button><div class="garage-car"><div class="car-illustration ${car?'':'car-soon'}" style="--car-color:${car?.color||'#c5ccc6'}" aria-hidden="true"><i></i><b></b></div><span class="small muted">${i+1}번 차량</span><h2>${car?.name||'Coming soon'}</h2><p class="small muted">${car?.subtitle||'다음 드라이브를 준비하고 있어요.'}</p></div><button class="garage-arrow" type="button" data-act="car-next" aria-label="다음 차량">→</button></div>${car?`<div class="garage-spec"><span>속도 <b>×${car.speed}</b></span><span>연료 <b>${car.fuel}칸</b></span><span>${unlocked?'✓ 사용 가능':'🔒 50토큰'}</span></div>${unlocked?'':`<button class="button full" type="button" data-act="unlock-car" data-car="${car.id}" ${garage.tokens<car.cost?'disabled':''}>${garage.tokens<car.cost?`${50-garage.tokens}토큰 더 모으면 열려요`:'50토큰으로 차량 열기'}</button>`}<input type="hidden" name="game-car" value="${car.id}">`:''}<p class="small muted">플레이에서 모은 동전이 토큰으로 남아요. 차량 2·3번은 각각 50토큰으로 열 수 있어요.</p></section>`;
}
export function groupSettingsMarkup(id,garage) {
  if(choices[id])return `<label>게임 모드<select name="gameMode">${choices[id].map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label>`;
  if(id==='typing')return '<p class="small muted">친구 도전은 기본 장비·1스테이지로 같은 조건에서 시작해요.</p>';
  if(id==='racing')return `<label>같이 탈 차량<select name="gameCar">${cityCars.map(c=>`<option value="${c.id}" ${garage&&!garage.unlocked.includes(c.id)?'disabled':''}>${c.name} · 속도 ×${c.speed} / 연료 ${c.fuel}</option>`).join('')}</select></label><p class="small muted">친구도 이 차량이 열려 있어야 참여할 수 있어요.</p>`;
  return '';
}
