import {enhancedItemValue,rpgItems,RPG_SLOTS,RPG_RARITIES} from './rpg-items.js';
import {esc} from './catalog.js';

const rarityById=new Map(RPG_RARITIES.map(rarity=>[rarity.id,rarity]));
const itemById=new Map(rpgItems.map(item=>[item.id,item]));
const effectNames={all:'전체',attack:'공격',defense:'방어',heal:'회복'};

function route(params,changes={}){
 const next=new URLSearchParams(params);for(const [key,value] of Object.entries(changes)){if(value===null)next.delete(key);else next.set(key,value);}
 return `#/detail/typing?${next}`;
}
function inventoryRows(profile){
 if(Array.isArray(profile.inventory))return profile.inventory;
 return (profile.owned||[]).map(itemId=>({itemId,quantity:1,enhancement:0}));
}
function lastDrawState(lastDraw){
 if(!lastDraw)return null;
 const items=Array.isArray(lastDraw.items)?lastDraw.items:[{item:lastDraw.item,duplicate:!!lastDraw.duplicate}];
 const revealedCount=Number.isInteger(lastDraw.revealedCount)?lastDraw.revealedCount:(lastDraw.revealed?items.length:0);
 return{...lastDraw,items,revealedCount};
}

export function typingHub(profile,params,lastDraw,profileFields='',startControl=''){
 const panel=['play','shop','gear'].includes(params.get('panel'))?params.get('panel'):'play',requested=Number(params.get('startStage')),start=profile.checkpoints.includes(requested)?requested:(profile.recommendedStartStage||profile.checkpoints.at(-1)||1);
 const nav=`<nav class="rpg-hub-tabs" aria-label="타이핑 마스터 메뉴">${[['play','게임 시작'],['shop','뽑기 상점'],['gear','내 장비']].map(([id,name])=>`<a class="${id===panel?'active':''}" href="#/detail/typing?panel=${id}&startStage=${start}">${name}</a>`).join('')}</nav>`;
 const header=`<div class="rpg-hub-summary"><span>최고 클리어 <b>${profile.bestCleared} 스테이지</b></span><strong>● ${profile.gold} 골드</strong></div>`;
 const gearStat=`<div class="rpg-gear-stats"><span>공격 +${profile.gear.attack}</span><span>방어 +${profile.gear.defense}</span><span>회복 +${profile.gear.heal}</span></div>`;
 let body='';
 if(panel==='play')body=`<div class="rpg-hub-intro"><span class="rpg-book" aria-hidden="true">⌨</span><h2>한 문장씩, 더 높은 스테이지로.</h2><p>10스테이지마다 보스가 기다려요.<br>장비를 챙기고 나만의 기록에 도전하세요.</p></div>${gearStat}<label class="field">어디서 시작할까요?<select name="rpg-stage">${(profile.earnedCheckpoints||profile.checkpoints).map(n=>`<option value="${n}" ${profile.checkpoints.includes(n)?'':'disabled'} ${n===start?'selected':''}>${Math.floor((n-1)/10)+1}탄 · ${n}스테이지부터${profile.checkpoints.includes(n)?'':' · 프로필 저장 후 열림'}</option>`).join('')}</select></label><p class="small muted">어디서 시작해도 10점부터. 처치마다 10점이 더해져요.</p>`;
 if(panel==='shop'){
  const saved=lastDrawState(lastDraw),pending=saved&&saved.revealedCount<saved.items.length,last=saved?.items[Math.max(0,saved.items.length-1)]?.item;
  body=`<div class="rpg-hub-intro"><span class="rpg-book" aria-hidden="true">✦</span><h2>다음 모험을 위한 장비 상자</h2><p>같은 장비도 여분으로 쌓여요.<br>여분 두 개로 대표 장비를 강화할 수 있어요.</p></div><div class="rpg-draw-options"><button type="button" class="button primary" data-act="rpg-draw" data-count="1" ${profile.gold<50||pending?'disabled':''}>1회 · 50골드</button><button type="button" class="button" data-act="rpg-draw" data-count="10" ${profile.gold<500||pending?'disabled':''}>10회 · 500골드</button></div>${pending?`<button type="button" class="button full" data-act="rpg-reveal">보관한 상자 이어 열기 · ${saved.items.length-saved.revealedCount}개 남음 · 추가 골드 없음</button>`:last&&saved.revealedCount>=saved.items.length?`<div class="rpg-drop rarity-${last.rarity}" role="status"><span>${rarityById.get(last.rarity).name} · ${RPG_SLOTS[last.slot]}</span><h2>${esc(last.name)}</h2><b>${RPG_SLOTS[last.slot]} 효과 +${last.value}</b><p>장비가 내 장비함에 수량으로 추가됐어요.</p><a class="text-link" href="#/detail/typing?panel=gear">장비 확인하기 →</a></div>`:''}<p class="small muted">${RPG_RARITIES.map(r=>`${r.name} ${r.chance}%`).join(' · ')}<br>각 등급 안의 모든 장비는 같은 확률로 나와요.</p>`;
 }
 if(panel==='gear')body=gearPanel(profile,params,gearStat);
 const playStart=panel==='play'&&startControl?`<div class="rpg-start-control">${startControl}</div>`:'';
 return `<section class="rpg-hub panel stack-sm">${header}${nav}${body}${playStart}${rpgProfileCard(profile,profileFields)}</section>`;
}

function gearPanel(profile,params,gearStat){
 const inventory=inventoryRows(profile),total=inventory.reduce((sum,row)=>sum+row.quantity,0),owned=new Set(inventory.map(row=>row.itemId));
 const effect=effectNames[params.get('effect')]?params.get('effect'):'all',rarity=rarityById.has(params.get('rarity'))?params.get('rarity'):'all';
 const filtered=inventory.map(row=>({...row,item:itemById.get(row.itemId)})).filter(row=>row.item&&(effect==='all'||row.item.slot===effect)&&(rarity==='all'||row.item.rarity===rarity));
 const pages=Math.max(1,Math.ceil(filtered.length/6)),page=Math.min(pages,Math.max(1,Number(params.get('page'))||1)),visible=filtered.slice((page-1)*6,page*6);
 const filters=`<div class="rpg-gear-filters"><nav aria-label="장비 효과">${Object.entries(effectNames).map(([id,name])=>`<a class="${effect===id?'active':''}" href="${route(params,{panel:'gear',effect:id,page:'1'})}">${name}</a>`).join('')}</nav><label>등급<select data-rpg-rarity-filter>${['all',...RPG_RARITIES.map(row=>row.id)].map(id=>`<option value="${id}" data-href="${route(params,{panel:'gear',rarity:id,page:'1'})}" ${rarity===id?'selected':''}>${id==='all'?'전체 등급':rarityById.get(id).name}</option>`).join('')}</select></label></div>`;
 const equipped=`<div class="rpg-equipped">${Object.entries(RPG_SLOTS).map(([slot,name])=>{const item=itemById.get(profile.equipped[slot]),row=inventory.find(candidate=>candidate.itemId===item?.id);return`<article><span>${name}</span><strong>${item?`${esc(item.name)} +${row?.enhancement||0}`:'장착하지 않음'}</strong>${item?`<button class="text-link" type="button" data-act="rpg-equip" data-slot="${slot}" data-item="">해제</button>`:''}</article>`;}).join('')}</div>`;
 const rows=visible.length?`<div class="rpg-inventory">${visible.map(({item,quantity,enhancement})=>{
  const isEquipped=profile.equipped[item.slot]===item.id,value=enhancedItemValue(item,enhancement),canEnhance=quantity>=3&&enhancement<10;
  return `<article class="rarity-${item.rarity}"><img src="${item.image}" alt="" width="46" height="46"><div class="rpg-item-copy"><small>${rarityById.get(item.rarity).name} · ${RPG_SLOTS[item.slot]}</small><strong>${esc(item.name)} <em>+${enhancement}</em></strong><span>효과 +${value} · 수량 ${quantity}${quantity>1?' · 기본 여분 '+(quantity-1)+'개':''}</span></div><div class="rpg-item-actions"><button class="button" type="button" data-act="rpg-equip" data-slot="${item.slot}" data-item="${item.id}" ${isEquipped?'disabled':''}>${isEquipped?'장착 중':'장착'}</button><button class="button" type="button" data-act="rpg-enhance" data-item="${item.id}" data-quantity="${quantity}" data-enhancement="${enhancement}" ${canEnhance?'':'disabled'}>${enhancement>=10?'강화 완료':'강화'}</button><button class="text-link danger" type="button" data-act="rpg-delete" data-item="${item.id}" data-name="${esc(item.name)}" data-quantity="${quantity}" data-enhancement="${enhancement}" data-equipped="${isEquipped}">삭제</button></div></article>`;
 }).join('')}</div>`:'<p class="small muted">선택한 조건의 장비가 없어요.</p>';
 const pagination=pages>1?`<nav class="rpg-pagination" aria-label="장비 페이지">${Array.from({length:pages},(_,index)=>index+1).map(number=>`<a class="${page===number?'active':''}" href="${route(params,{panel:'gear',page:String(number)})}" aria-label="${number}페이지">${number}</a>`).join('')}</nav>`:'';
 const codex=`<details class="rpg-codex"><summary>장비 도감 · ${owned.size}/312</summary><div class="rpg-codex-grid">${rpgItems.map(item=>`<span class="rpg-codex-item ${owned.has(item.id)?'is-owned':''} rarity-${item.rarity}" data-item="${item.id}" title="${owned.has(item.id)?'획득':'아직 만나지 못한 장비'} · ${esc(item.name)}"><img src="${item.image}" alt="" width="24" height="24" loading="lazy"><span>${owned.has(item.id)?'✓':'?'} ${esc(item.name)}</span></span>`).join('')}</div></details>`;
 return `${gearStat}${equipped}<div class="rpg-inventory-heading"><h3>보유 장비 · ${inventory.length}종 · 총 ${total}개</h3><p>같은 기본 장비 여분 2개로 +1 강화해요. 최대 +10.</p></div>${filters}${rows}${pagination}${codex}`;
}

export function rpgProfileCard(profile,fields=''){
 if(!profile)return '';
 const next=(profile.earnedCheckpoints||profile.checkpoints||[1]).at(-1),chapter=Math.floor((next-1)/10)+1;
 if(profile.configured)return `<section class="rpg-save-card is-saved"><strong>✓ 프로필에 기록·골드·장비가 저장되어 있어요</strong><p>몬스터를 클리어할 때마다 자동 저장해요.</p>${next>1?`<a class="text-link" href="#/detail/typing?startStage=${next}">${chapter}탄 · ${next}스테이지부터 이어하기 →</a>`:''}<a class="text-link" href="#/settings">복구 코드 확인·보관 →</a></section>`;
 return `<details class="rpg-save-card"><summary>현재 기록과 장비를 프로필에 저장</summary><p>최고 ${profile.bestCleared}스테이지 클리어 · ${profile.gold}골드 · 장비 ${profile.owned?.length||0}종</p>${next>1?`<p class="rpg-unlock-note">1탄 보스 이후의 기록이 있어요. 저장하면 ${chapter}탄(${next}스테이지)부터 시작할 수 있어요.</p>`:'<p>지금은 이 브라우저에 임시로 연결돼 있어요. 프로필을 만들면 현재 진행과 아이템을 그대로 이어받아요.</p>'}<form id="rpg-profile-form" class="fields">${fields}<p class="form-error" role="alert"></p><button type="submit" class="button primary full">프로필 만들고 현재 정보 저장</button></form><a href="#/recover" class="text-link">기존 프로필 복구하기 →</a></details>`;
}
