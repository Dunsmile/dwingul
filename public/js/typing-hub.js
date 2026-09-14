import {enhancedItemValue,rpgItems,RPG_SLOTS,RPG_RARITIES} from './rpg-items.js';
import {RPG_CHARACTERS,RPG_CHARACTER_TIERS,RPG_DEFAULT_CHARACTER_ID,rpgCharacter,rpgCharacterArtPath,rpgCharacterFallbackPath} from './rpg-characters.js';
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
 params=new URLSearchParams(params);
 const selected=rpgCharacter(profile.selectedCharacter||RPG_DEFAULT_CHARACTER_ID);
 const panel=['settings','shop','gear','characters','profile'].includes(params.get('panel'))?params.get('panel'):'menu';
 const requested=Number(params.get('startStage')),start=profile.checkpoints.includes(requested)?requested:(profile.recommendedStartStage||profile.checkpoints.at(-1)||1);
 const sentenceMode=params.get('sentenceMode')==='long'?'long':'short',modeName=sentenceMode==='long'?'긴 문장 · 공격 ×2':'짧은 문장 · 공격 ×1';
 params.set('startStage',String(start));params.set('sentenceMode',sentenceMode);
 const names={menu:'타이핑 마스터',settings:'모험 설정',shop:'뽑기 상점',gear:'내 장비',characters:'캐릭터',profile:'프로필 · 저장'};
 const header=`<header class="rpg-menu-top"><span>최고 클리어 <b>${profile.bestCleared} 스테이지</b></span><strong>● ${profile.gold} 골드</strong></header>`;
 const gearStat=`<div class="rpg-gear-stats"><span>공격 +${profile.gear.attack}</span><span>방어 +${profile.gear.defense}</span><span>회복 +${profile.gear.heal}</span></div>`;
 const startInput=`<input type="hidden" name="rpg-stage" value="${start}">`;
 const startButton=startControl||`<button type="button" class="button primary full rpg-start" data-act="start" data-id="typing" data-context="${esc(params.toString())}">모험 시작하기 →</button>`;
 const links=[['settings','모험 설정'],['shop','뽑기 상점'],['gear','내 장비'],['characters','캐릭터'],['profile','프로필 · 저장']];
 let body='';
 if(panel==='menu')body=`<div class="rpg-title-screen"><div class="rpg-title-copy"><span>DWINGUL · FOREST ADVENTURE</span><h1>타이핑 마스터</h1><p>한 문장으로 시작하는 숲속 모험</p></div><nav class="rpg-title-buttons" aria-label="타이핑 마스터 메뉴">${startInput}${startButton}${links.map(([id,name])=>`<a class="button rpg-menu-button" href="${route(params,{panel:id})}">${name}</a>`).join('')}</nav><div class="rpg-title-current"><strong>${modeName}</strong><span>${start}스테이지부터 · ${esc(selected.name)}</span></div></div>`;
 if(panel==='settings')body=`<fieldset class="rpg-sentence-options"><legend>어떤 문장으로 모험할까요?</legend>${[['short','짧은 문장','가볍게 한 문장씩 · 기본 공격 ×1'],['long','긴 문장','20–30자 속담·지혜 문장 250개 · 공격 ×2']].map(([value,label,description])=>`<label class="rpg-sentence-option"><input type="radio" name="rpg-sentence-mode" data-rpg-setting value="${value}" ${sentenceMode===value?'checked':''}><span><strong>${label}</strong><small>${description}</small></span></label>`).join('')}</fieldset><label class="field">시작 스테이지<select name="rpg-stage" data-rpg-setting>${(profile.earnedCheckpoints||profile.checkpoints).map(n=>`<option value="${n}" ${profile.checkpoints.includes(n)?'':'disabled'} ${n===start?'selected':''}>${Math.floor((n-1)/10)+1}탄 · ${n}스테이지부터${profile.checkpoints.includes(n)?'':' · 프로필 저장 후 열림'}</option>`).join('')}</select></label><p class="small">어디서 시작해도 10점부터. 처치마다 10점이 더해져요.</p>${gearStat}<details class="rpg-mode-help"><summary>모드별 규칙과 문장 안내</summary><p>긴 문장은 장비와 콤보를 합한 공격력이 2배예요. 몬스터 반격과 회복량은 같아요. 순위는 문장 모드·시작 스테이지별로 비교하고, 골드·장비·열린 스테이지는 함께 사용해요.</p><p>긴 문장 길이는 공백을 포함해 20–30자예요. 전통 속담을 다듬은 문장과 뒹굴이 쓴 지혜 문장을 사용하며, 현대 인물의 명언을 인용하지 않아요.</p></details>`;
 if(panel==='shop'){
  const saved=lastDrawState(lastDraw),pending=saved&&saved.revealedCount<saved.items.length,last=saved?.items[Math.max(0,saved.items.length-1)]?.item;
  body=`<div class="rpg-hub-intro"><span class="rpg-book" aria-hidden="true">✦</span><h2>다음 모험을 위한 장비 상자</h2><p>같은 장비도 여분으로 쌓여요.<br>여분 두 개로 대표 장비를 강화할 수 있어요.</p></div><div class="rpg-draw-options"><button type="button" class="button primary" data-act="rpg-draw" data-count="1" ${profile.gold<50||pending?'disabled':''}>1회 · 50골드</button><button type="button" class="button" data-act="rpg-draw" data-count="10" ${profile.gold<500||pending?'disabled':''}>10회 · 500골드</button></div>${pending?`<button type="button" class="button full" data-act="rpg-reveal">보관한 상자 이어 열기 · ${saved.items.length-saved.revealedCount}개 남음 · 추가 골드 없음</button>`:last&&saved.revealedCount>=saved.items.length?`<div class="rpg-drop rarity-${last.rarity}" role="status"><span>${rarityById.get(last.rarity).name} · ${RPG_SLOTS[last.slot]}</span><h2>${esc(last.name)}</h2><b>${RPG_SLOTS[last.slot]} 효과 +${last.value}</b><p>장비가 내 장비함에 수량으로 추가됐어요.</p><a class="text-link" href="${route(params,{panel:'gear'})}">장비 확인하기 →</a></div>`:''}<p class="small muted">${RPG_RARITIES.map(r=>`${r.name} ${r.chance}%`).join(' · ')}<br>각 등급 안의 모든 장비는 같은 확률로 나와요.</p>`;
 }
 if(panel==='gear')body=gearPanel(profile,params,gearStat);
 if(panel==='characters')body=characterPanel(profile);
 if(panel==='profile')body=rpgProfileCard(profile,profileFields,params);
 const content=panel==='menu'?body:`<div class="rpg-menu-panel"><div class="rpg-panel-heading"><a class="button rpg-menu-back" href="${route(params,{panel:'menu'})}" aria-label="타이핑 마스터 메뉴로">← 메뉴</a><h1>${names[panel]}</h1></div><div class="rpg-panel-scroll stack-sm" tabindex="0" aria-label="${names[panel]} 내용">${body}</div><div class="rpg-panel-footer"><span>${modeName} · ${start}스테이지</span>${panel==='settings'?startButton:''}</div></div>`;
 return `<section class="rpg-hub rpg-menu-scene" data-rpg-panel="${panel}">${header}${content}</section>`;
}

function artWithFallback(primary,fallback,alt,size=96){
 return `<span class="rpg-art-frame" data-decorative-frame style="--rpg-art-fallback:url('${fallback}')"${alt?` role="img" aria-label="${esc(alt)}"`:''}><img src="${primary}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" data-decorative-image></span>`;
}

function characterPanel(profile){
 const selected=rpgCharacter(profile.selectedCharacter||RPG_DEFAULT_CHARACTER_ID),owned=new Set([RPG_DEFAULT_CHARACTER_ID,...(profile.ownedCharacters||[])]);
 return `<div class="rpg-character-heading"><div><h2>숲속 모험 친구</h2><p>좋아하는 모습을 골라 함께 모험하세요.</p></div><span>${owned.size} / ${RPG_CHARACTERS.length}</span></div><p class="rpg-character-fairness">캐릭터는 모습과 수집 등급만 달라요. 전투 능력치는 모두 같아요.</p><div class="rpg-character-grid">${RPG_CHARACTERS.map(character=>{
  const isOwned=owned.has(character.id),isSelected=selected.id===character.id,disabled=!isOwned&&profile.gold<character.price;
  const action=isOwned?'rpg-character-equip':'rpg-character-buy',label=isSelected?'장착 중':isOwned?'선택하기':`${character.price}골드`;
  return `<article class="rpg-character-card rarity-${character.tier} ${isSelected?'is-selected':''}">${artWithFallback(rpgCharacterArtPath(character.id),rpgCharacterFallbackPath(character.id),character.name)}<div class="rpg-character-copy"><small>${RPG_CHARACTER_TIERS[character.tier]} · 꾸미기</small><strong>${esc(character.name)}</strong></div><button type="button" class="button ${isSelected?'':'primary'}" data-act="${action}" data-character="${character.id}" ${isSelected||disabled?'disabled':''}>${label}</button></article>`;
 }).join('')}</div>`;
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
  return `<article class="rarity-${item.rarity}">${artWithFallback(`/assets/pixel/illustrated/items/${item.id}.png`,item.image,'',46)}<div class="rpg-item-copy"><small>${rarityById.get(item.rarity).name} · ${RPG_SLOTS[item.slot]}</small><strong>${esc(item.name)} <em>+${enhancement}</em></strong><span>효과 +${value} · 수량 ${quantity}${quantity>1?' · 기본 여분 '+(quantity-1)+'개':''}</span></div><div class="rpg-item-actions"><button class="button" type="button" data-act="rpg-equip" data-slot="${item.slot}" data-item="${item.id}" ${isEquipped?'disabled':''}>${isEquipped?'장착 중':'장착'}</button><button class="button" type="button" data-act="rpg-enhance" data-item="${item.id}" data-quantity="${quantity}" data-enhancement="${enhancement}" ${canEnhance?'':'disabled'}>${enhancement>=10?'강화 완료':'강화'}</button><button class="text-link danger" type="button" data-act="rpg-delete" data-item="${item.id}" data-name="${esc(item.name)}" data-quantity="${quantity}" data-enhancement="${enhancement}" data-equipped="${isEquipped}">삭제</button></div></article>`;
 }).join('')}</div>`:'<p class="small muted">선택한 조건의 장비가 없어요.</p>';
 const pagination=pages>1?`<nav class="rpg-pagination" aria-label="장비 페이지">${Array.from({length:pages},(_,index)=>index+1).map(number=>`<a class="${page===number?'active':''}" href="${route(params,{panel:'gear',page:String(number)})}" aria-label="${number}페이지">${number}</a>`).join('')}</nav>`:'';
 const codex=`<details class="rpg-codex"><summary>장비 도감 · ${owned.size}/312</summary><div class="rpg-codex-grid">${rpgItems.map(item=>`<span class="rpg-codex-item ${owned.has(item.id)?'is-owned':''} rarity-${item.rarity}" data-item="${item.id}" title="${owned.has(item.id)?'획득':'아직 만나지 못한 장비'} · ${esc(item.name)}">${artWithFallback(`/assets/pixel/illustrated/items/${item.id}.png`,item.image,'',24)}<span>${owned.has(item.id)?'✓':'?'} ${esc(item.name)}</span></span>`).join('')}</div></details>`;
 return `${gearStat}${equipped}<div class="rpg-inventory-heading"><h3>보유 장비 · ${inventory.length}종 · 총 ${total}개</h3><p>같은 기본 장비 여분 2개로 +1 강화해요. 최대 +10.</p></div>${filters}${rows}${pagination}${codex}`;
}

export function rpgProfileCard(profile,fields='',params=new URLSearchParams()){
 if(!profile)return '';
 const next=(profile.earnedCheckpoints||profile.checkpoints||[1]).at(-1),chapter=Math.floor((next-1)/10)+1;
 if(profile.configured)return `<section class="rpg-save-card is-saved"><strong>✓ 프로필에 기록·골드·장비가 저장되어 있어요</strong><p>몬스터를 클리어할 때마다 자동 저장해요.</p>${next>1?`<a class="text-link" href="${route(params,{panel:'menu',startStage:next})}">${chapter}탄 · ${next}스테이지부터 이어하기 →</a>`:''}<a class="text-link" href="#/settings">복구 코드 확인·보관 →</a></section>`;
 return `<details class="rpg-save-card"><summary>현재 기록과 장비를 프로필에 저장</summary><p>최고 ${profile.bestCleared}스테이지 클리어 · ${profile.gold}골드 · 장비 ${profile.owned?.length||0}종</p>${next>1?`<p class="rpg-unlock-note">1탄 보스 이후의 기록이 있어요. 저장하면 ${chapter}탄(${next}스테이지)부터 시작할 수 있어요.</p>`:'<p>지금은 이 브라우저에 임시로 연결돼 있어요. 프로필을 만들면 현재 진행과 아이템을 그대로 이어받아요.</p>'}<form id="rpg-profile-form" class="fields">${fields}<p class="form-error" role="alert"></p><button type="submit" class="button primary full">프로필 만들고 현재 정보 저장</button></form><a href="#/recover" class="text-link">기존 프로필 복구하기 →</a></details>`;
}
