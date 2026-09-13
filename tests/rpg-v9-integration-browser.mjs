import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {rpgItems} from '../public/js/rpg-items.js';

const base=process.env.BASE_URL||'http://localhost:4174';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.setDefaultTimeout(8000);
page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});

const first=rpgItems.find(item=>item.id==='attack-common'),rare=rpgItems.find(item=>item.id==='defense-rare');
let profile={earnedCheckpoints:[1],recommendedStartStage:1,gold:1000,bestCleared:0,equipped:{attack:first.id},gear:{attack:6,defense:0,heal:0},owned:[first.id,rare.id],inventory:[{itemId:first.id,quantity:3,enhancement:1},{itemId:rare.id,quantity:1,enhancement:0}],configured:false,checkpoints:[1]};
let drawBody=null,enhanceBody=null,discardBody=null;
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
await page.route('**/api/rpg**',async route=>{
 const request=route.request(),path=new URL(request.url()).pathname,data=request.postDataJSON?.()||{};
 if(path==='/api/rpg/draw'){
  drawBody=data;profile={...profile,gold:500};
  return json(route,{...profile,item:first,duplicate:false,items:Array.from({length:10},(_,index)=>({item:index===1?rare:first,duplicate:index>0})),revealedCount:0});
 }
 if(path==='/api/rpg/enhance'){
  enhanceBody=data;profile={...profile,gear:{...profile.gear,attack:6},inventory:profile.inventory.map(row=>row.itemId===data.itemId?{...row,quantity:1,enhancement:2}:row)};return json(route,profile);
 }
 if(path==='/api/rpg/discard'){
  discardBody=data;profile={...profile,equipped:{...profile.equipped,attack:null},gear:{...profile.gear,attack:0},owned:profile.owned.filter(id=>id!==data.itemId),inventory:profile.inventory.filter(row=>row.itemId!==data.itemId)};return json(route,profile);
 }
 if(path==='/api/rpg/equip')return json(route,profile);
 if(path==='/api/rpg/progress')return json(route,{...profile,earned:0,finished:true,score:0,stage:1});
 return json(route,profile);
});
await page.route('**/api/shares**',route=>{
 const request=route.request(),path=new URL(request.url()).pathname;
 if(request.method()==='POST')return json(route,{id:'v9-personality-share'});
 if(path==='/api/shares/legacy-taste')return json(route,{content:'taste',kind:'challenge',seed:42,payload:{name:'이전 친구',title:'이전 취향 결과',display:'이전 취향 결과',unit:'',answers:Array(8).fill(0),scores:[2,2,2,2]}});
 return json(route,{error:'공유 결과를 찾을 수 없어요.'},404);
});

try{
 await page.goto(`${base}/?rpgV9=${Date.now()}#/detail/typing?panel=shop`);await page.locator('.rpg-hub').waitFor();
 await page.locator('[data-act="rpg-draw"][data-count="10"]').click();await page.locator('.draw-reveal').waitFor();
 assert.deepEqual(drawBody,{key:drawBody?.key,count:10});assert.equal(typeof drawBody.key,'string');
 await page.locator('.draw-reveal').click();await page.getByText('1 / 10 · 일반 · 무기',{exact:true}).waitFor();
 await page.locator('.draw-close').click();await page.getByRole('button',{name:/이어 열기 · 9개 남음/}).waitFor();
 await page.getByRole('button',{name:/이어 열기/}).click();await page.getByText('2 / 10',{exact:true}).waitFor();
 await page.locator('.draw-reveal').click();assert.match(await page.locator('.rpg-draw-dialog').getAttribute('class'),/has-extra-shake/);
 for(let number=3;number<=10;number++){
  await page.locator('[data-draw-next]').click();await page.getByText(`${number} / 10`,{exact:true}).waitFor();await page.locator('.draw-reveal').click();
 }
 await page.locator('[data-draw-home]').click();await page.waitForURL(/#\/detail\/typing$/);await page.locator('.rpg-hub').waitFor();

 await page.goto(`${base}/?rpgV9gear=${Date.now()}#/detail/typing?panel=gear`);await page.locator('.rpg-inventory').waitFor();
 await page.locator('[data-rpg-rarity-filter]').scrollIntoViewIfNeeded();const filterY=await page.evaluate(()=>scrollY);await page.locator('[data-rpg-rarity-filter]').selectOption('rare');await page.waitForURL(/rarity=rare/);await page.locator('[data-item="defense-rare"]').first().waitFor();assert.equal(await page.evaluate(()=>scrollY),filterY);
 await page.locator('[data-rpg-rarity-filter]').selectOption('common');await page.waitForURL(/rarity=common/);
 await page.locator('[data-act="rpg-enhance"][data-item="attack-common"]').scrollIntoViewIfNeeded();const enhanceY=await page.evaluate(()=>scrollY);await page.locator('[data-act="rpg-enhance"][data-item="attack-common"]').click();await page.getByText('효과 +6 · 수량 1',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>scrollY),enhanceY);assert.deepEqual(enhanceBody,{itemId:first.id});
 await page.locator('[data-act="rpg-delete"][data-item="attack-common"]').click();
 assert.match(await page.locator('#dialog').innerText(),/나무 연필검/);assert.match(await page.locator('#dialog').innerText(),/수량 1개/);assert.match(await page.locator('#dialog').innerText(),/강화 \+2/);assert.match(await page.locator('#dialog').innerText(),/장착도 해제/);
 await page.getByRole('button',{name:'취소'}).click();assert.equal(discardBody,null);
 await page.locator('[data-act="rpg-delete"][data-item="attack-common"]').click();await page.getByRole('button',{name:'확인하고 진행'}).click();await page.locator('.rpg-inventory article:has([data-item="attack-common"])').waitFor({state:'detached'});assert.deepEqual(discardBody,{itemId:first.id});

 await page.goto(`${base}/?rhythmV9app=${Date.now()}#/play/sequence?seed=317`);await page.locator('.rhythm-game').waitFor();await page.locator('.rhythm-game__start').click();await page.evaluate(()=>window.advanceTime(120000));await page.locator('.result-card').waitFor();
 assert.match(await page.locator('.result-card').innerText(),/리듬 릴레이 · 무한 모드/);assert.match(await page.locator('.rhythm-result-stats').innerText(),/완료 패턴/);

 await page.goto(`${base}/?typingV9cta=${Date.now()}#/play/typing?seed=73`);await page.locator('.typing-rpg').waitFor();await page.evaluate(()=>window.advanceTime(2000000));await page.locator('.result-card').waitFor();await page.getByRole('link',{name:'홈으로 가기',exact:true}).waitFor();

 await page.goto(`${base}/?personalityV9share=${Date.now()}#/play/taste`);await page.locator('#birth-form [name="name"]').fill('새 취향');await page.locator('#birth-form button[type="submit"]').click();for(let index=0;index<12;index++)await page.locator('[data-act="answer"]').first().click();await page.locator('.result-card').waitFor();
 const shareRequest=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/shares'&&request.method()==='POST');await page.getByRole('button',{name:'친구와 함께 비교',exact:true}).click();const shared=(await shareRequest).postDataJSON();assert.equal(shared.payload.testVersion,'axes-v9');assert.equal(shared.payload.answers.length,12);
 await page.goto(`${base}/?personalityMixed=${Date.now()}#/play/taste?seed=42&share=legacy-taste`);await page.locator('#birth-form [name="name"]').fill('새 취향');await page.locator('#birth-form button[type="submit"]').click();for(let index=0;index<12;index++)await page.locator('[data-act="answer"]').first().click();await page.locator('.result-card').waitFor();await page.getByRole('button',{name:'친구와 비교 보기',exact:true}).click();await page.getByRole('link',{name:/새 취향 검사 시작하기/}).waitFor();
 assert.deepEqual(errors,[]);console.log({passed:true,drawCount:drawBody.count,resumedAt:2,enhanced:enhanceBody.itemId,discarded:discardBody.itemId,rhythmMode:'rhythm-endless-v9',typingCta:'홈으로 가기',personalityVersion:shared.payload.testVersion,mixedVersionFallback:true});
}catch(error){console.log(await page.locator('body').innerText(),errors);throw error;}finally{await browser.close();}
