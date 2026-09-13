import {RPG_RARITIES,RPG_SLOTS} from './rpg-items.js';
import {esc} from './catalog.js';

export function normalizeRpgDraw(out={}){
 const items=(Array.isArray(out.items)&&out.items.length?out.items:[{item:out.item,duplicate:!!out.duplicate}]).map(row=>row?.item?{item:row.item,duplicate:!!row.duplicate}:{item:row,duplicate:false}).filter(row=>row.item);
 return{...out,item:out.item||items[0]?.item,duplicate:out.duplicate??items[0]?.duplicate??false,items,revealedCount:Math.max(0,Math.min(items.length,Number(out.revealedCount)||0))};
}
export const isExtraShakeRarity=rarity=>['rare','legend','divine'].includes(rarity);

// The server owns charging, inventory writes and idempotency. This view reveals a
// completed result in order and mutates revealedCount so a closed batch can resume.
export async function openRpgDraw({draw,equip,onResult,onReveal=()=>{},stored=false}) {
 const modal=document.createElement('dialog');
 modal.className='rpg-draw-dialog';
 modal.setAttribute('aria-labelledby','draw-title');
 modal.innerHTML='<button type="button" class="draw-close" aria-label="상자 닫기">×</button><div class="draw-body" aria-live="polite"></div>';
 const body=modal.querySelector('.draw-body'),origin={x:scrollX,y:scrollY,route:location.hash},opener=document.activeElement;
 let closed=false,changed=false,pendingEquip=Promise.resolve(),result;
 const routeChanged=()=>modal.close();window.addEventListener('hashchange',routeChanged);
 const done=new Promise(resolve=>modal.addEventListener('close',()=>{closed=true;window.removeEventListener('hashchange',routeChanged);document.body.classList.remove('draw-open');modal.remove();if(location.hash===origin.route){if(opener?.isConnected)opener.focus({preventScroll:true});window.scrollTo({left:origin.x,top:origin.y,behavior:'instant'});}resolve();},{once:true}));
 modal.querySelector('.draw-close').addEventListener('click',()=>modal.close());
 document.body.append(modal);document.body.classList.add('draw-open');
 body.innerHTML='<div class="draw-kicker">나의 다음 모험</div><h2 id="draw-title">두근두근,<br>상자를 준비하고 있어요!</h2><div class="draw-chest is-opening" aria-hidden="true"><i></i><b>✦</b></div><p>어떤 장비가 기다리고 있을까요?</p><div class="draw-footer">상자 안의 반짝임을 모으는 중…</div>';
 modal.showModal();
 const animation=new Promise(resolve=>setTimeout(resolve,stored?0:matchMedia('(prefers-reduced-motion: reduce)').matches?150:1200));
 try {
  const [out]=await Promise.all([draw(),animation]);
  result=normalizeRpgDraw(out);changed=true;onResult(result);
  if(!closed)showReady();
 } catch(error) {
  if(!closed){body.innerHTML=`<div class="draw-kicker">상자를 확인하지 못했어요</div><h2 id="draw-title">잠시 후 다시 시도해주세요.</h2><p role="alert">${esc(error.message)}</p><button type="button" class="button" data-draw-done>닫기</button>`;body.querySelector('[data-draw-done]').addEventListener('click',()=>modal.close());}
 }
 await done;await pendingEquip.catch(()=>{});return changed;

 function showReady(){
  if(closed)return;
  if(result.revealedCount>=result.items.length){modal.close();return;}
  const number=result.revealedCount+1,total=result.items.length;
  modal.className='rpg-draw-dialog';
  body.innerHTML=`<div class="draw-kicker">${total>1?`${number} / ${total}`:'준비됐어요!'}</div><h2 id="draw-title">이번 상자에는…?</h2><button type="button" class="draw-reveal"><span class="draw-chest is-ready" aria-hidden="true"><i></i><b>✦</b></span><strong>터치해서 결과보기</strong></button><p>${total>1?'한 개씩 차례로 확인해요.':'상자를 눌러 나의 장비를 확인하세요.'}</p>`;
  const reveal=body.querySelector('.draw-reveal');reveal.focus({preventScroll:true});reveal.addEventListener('click',showItem,{once:true});
 }
 function showItem(){
  const index=result.revealedCount,row=result.items[index],item=row.item,rarity=RPG_RARITIES.find(candidate=>candidate.id===item.rarity);
  result.revealedCount=index+1;onReveal(result,index);
  modal.className=`rpg-draw-dialog is-revealed rarity-${item.rarity}${isExtraShakeRarity(item.rarity)?' has-extra-shake':''}`;
  const more=result.revealedCount<result.items.length;
  body.innerHTML=`<div class="draw-kicker">${result.items.length>1?`${result.revealedCount} / ${result.items.length} · `:''}${rarity.name} · ${RPG_SLOTS[item.slot]}</div><img class="draw-item-icon" src="${item.image||`/assets/pixel/items/${item.id}.svg`}" alt="" width="108" height="108"><h2 id="draw-title">${esc(item.name)}</h2><div class="draw-effect">${{attack:'공격력',defense:'방어력',heal:'회복량'}[item.slot]} +${item.value}</div><p>${row.duplicate?'같은 장비가 여분으로 추가됐어요.':'새 장비가 내 장비함에 추가됐어요.'}<br>${more?`${result.items.length-result.revealedCount}개의 상자가 남았어요.`:'모든 상자를 확인했어요.'}</p><p class="draw-error" role="alert"></p><div class="draw-actions"><button type="button" class="button" data-draw-equip>바로 장착</button>${more?'<button type="button" class="button primary" data-draw-next>다음 상자</button>':result.items.length>1?'<button type="button" class="button primary" data-draw-home>타이핑 홈으로</button>':'<button type="button" class="button primary" data-draw-done>확인</button>'}</div>`;
  const equipButton=body.querySelector('[data-draw-equip]');equipButton.focus({preventScroll:true});
  body.querySelector('[data-draw-next]')?.addEventListener('click',showReady);
  body.querySelector('[data-draw-done]')?.addEventListener('click',()=>modal.close());
  body.querySelector('[data-draw-home]')?.addEventListener('click',()=>{modal.close();location.hash='#/detail/typing';});
  equipButton.addEventListener('click',async()=>{
   equipButton.disabled=true;equipButton.textContent='장착 중…';
   try{pendingEquip=equip(item);await pendingEquip;if(closed)return;equipButton.textContent='✓ 장착 완료';}
   catch(error){if(closed)return;body.querySelector('.draw-error').textContent=error.message;equipButton.disabled=false;equipButton.textContent='다시 장착';}
  });
 }
}
