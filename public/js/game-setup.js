import { cityCars, gameSettings } from './game-options.js';
const choices = {
  sort: [['sprint','20초 모드','끊기지 않는 연속 입력으로 피버에 도전!'],['endless','무한 모드','갈수록 빨라져요. 실수 3번이면 끝!']],
};
export function setupMarkup(id, raw, garage={tokens:0,unlocked:['basic']}, index) {
  const settings=gameSettings(id,raw);
  if(choices[id])return `<fieldset class="play-settings"><legend>어떤 모드로 할까요?</legend><div class="mode-choices">${choices[id].map(([value,name,desc])=>`<label class="mode-choice"><input type="radio" name="game-mode" value="${value}" ${settings.mode===value?'checked':''}><span><strong>${name}</strong><small>${desc}</small></span></label>`).join('')}</div></fieldset>`;
  if(id!=='racing')return '';
  const i=index??cityCars.findIndex(c=>c.id===settings.car), car=cityCars[i], unlocked=car&&garage.unlocked.includes(car.id);
  return `<section class="garage panel stack-sm" data-car-index="${i}"><div class="between"><span class="eyebrow">MY GARAGE</span><strong class="token-balance">● ${garage.tokens} 토큰</strong></div><div class="garage-selector"><button class="garage-arrow" type="button" data-act="car-prev" aria-label="이전 차량">←</button><div class="garage-car"><div class="car-illustration ${car?'':'car-soon'}" data-decorative-frame style="--car-color:${car?.color||'#c5ccc6'}" aria-hidden="true">${car?`<img data-decorative-image src="${car.art}" width="512" height="512" alt="" decoding="async">`:''}</div><span class="small muted">${i+1} / ${cityCars.length}</span><h2>${car?.name||'차량 준비 중'}</h2><p class="small muted">${car?.subtitle||'다음 드라이브를 준비하고 있어요.'}</p></div><button class="garage-arrow" type="button" data-act="car-next" aria-label="다음 차량">→</button></div>${car?`<div class="garage-spec"><span>속도 <b>×${car.speed}</b></span><span>연료 <b>${car.fuel}칸</b></span><span>충돌 피해 <b>-${10-car.armor}</b></span></div><div class="garage-spec garage-spec-secondary"><span>부스터 <b>${car.boostDuration}초</b></span><span>충전 행운 <b>${Math.round(car.boostProc*100)}%</b></span><span>${unlocked?'✓ 사용 가능':`🔒 ${car.cost}토큰`}</span></div>${unlocked?'':`<button class="button full" type="button" data-act="unlock-car" data-car="${car.id}" ${garage.tokens<car.cost?'disabled':''}>${garage.tokens<car.cost?`${car.cost-garage.tokens}토큰 더 모으면 열려요`:`${car.cost}토큰으로 차량 열기`}</button>`}<input type="hidden" name="game-car" value="${car.id}">`:''}<p class="small muted">동전을 주우면 표시된 확률로 부스터가 1칸 충전돼요. 충돌하면 연료가 줄고 잠깐 보호받으며, 연료가 0이 되면 주행이 끝나요.</p></section>`;
}
export function groupSettingsMarkup(id,garage) {
  if(choices[id])return `<label>게임 모드<select name="gameMode">${choices[id].map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label>`;
  if(id==='typing')return '<p class="small muted">친구 도전은 기본 장비·1스테이지로 같은 조건에서 시작해요.</p>';
  if(id==='racing')return `<label>같이 탈 차량<select name="gameCar">${cityCars.map(c=>`<option value="${c.id}" ${garage&&!garage.unlocked.includes(c.id)?'disabled':''}>${c.name} · 속도 ×${c.speed} / 연료 ${c.fuel} / 충돌 -${10-c.armor}</option>`).join('')}</select></label><p class="small muted">친구도 이 차량이 열려 있어야 참여할 수 있어요. 차량별 부스터 시간과 충전 행운은 차고에서 확인할 수 있어요.</p>`;
  return '';
}
