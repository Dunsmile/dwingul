import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../server.mjs';

const app=createApp({dbPath:':memory:'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.server.address().port}`,out='output/v15';
await mkdir(out,{recursive:true});
const report={views:[],errors:[]};
const views=[{width:1440,height:900},{width:1280,height:720},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:568}];
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const bounds=p=>p.evaluate(()=>{
 const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}:null};
 return {overflow:document.documentElement.scrollWidth-innerWidth,arena:rect('.typing-rpg__arena'),input:rect('.typing-rpg__input'),scene:rect('.rpg-menu-scene'),scroll:rect('.rpg-panel-scroll'),target:rect('.typing-rpg__target'),arenaOverflow:document.querySelector('.typing-rpg__arena')?.scrollHeight-document.querySelector('.typing-rpg__arena')?.clientHeight,targetOverflow:document.querySelector('.typing-rpg__target')?.scrollHeight-document.querySelector('.typing-rpg__target')?.clientHeight};
});
async function api(p,path,body){return p.evaluate(async({path,body})=>{const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body&&JSON.stringify(body)});return {status:r.status,...await r.json()};},{path,body});}
try{
 for(const [engineName,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{for(const viewport of views){
   const p=await browser.newPage({viewport});p.on('pageerror',e=>report.errors.push(`${engineName}: ${e.message}`));
   await p.goto(base+'/#/detail/typing');await p.locator('.rpg-title-screen').waitFor();await p.evaluate(()=>document.fonts.ready);
   const session=await api(p,'session');app.db.prepare('UPDATE rpg_profiles SET gold=1000,best_cleared=20 WHERE user_id=?').run(session.user.id);
   await p.reload();await p.locator('.rpg-title-screen').waitFor();const menu=await bounds(p);assert.ok(menu.overflow<=1);assert.ok(await p.locator('.rpg-start').isVisible());
   assert.equal(await p.locator('.rpg-title-copy h1').evaluate(e=>getComputedStyle(e).color),'rgb(255, 242, 201)');
   await p.screenshot({path:`${out}/${engineName}-menu-${viewport.width}.png`,fullPage:true});
   await p.locator('.rpg-title-buttons .rpg-start').click();await p.locator('[name=rpg-sentence-mode][value=long]').check();await p.waitForURL(/sentenceMode=long/);await p.locator('[name=rpg-sentence-mode][value=long]:checked').waitFor();
   await p.locator('.rpg-mode-help summary').click();assert.equal((await bounds(p)).scene.height,menu.scene.height);
   await p.locator('.rpg-menu-back').click();await p.locator('[data-rpg-panel=menu]').waitFor();
   for(const [label,panel] of [['뽑기 상점','shop'],['내 장비','gear'],['캐릭터','characters'],['프로필 · 저장','profile']]){
    await p.getByRole('link',{name:label,exact:true}).click();await p.locator(`[data-rpg-panel=${panel}]`).waitFor();assert.ok(p.url().includes('sentenceMode=long'));
    const box=await bounds(p);assert.equal(box.scene.height,menu.scene.height);assert.ok(box.overflow<=1,`${engineName}/${viewport.width}/${panel}`);
    if(panel==='characters'){
     const buy=p.locator('[data-act=rpg-character-buy]').filter({visible:true}).first();
     const purchased=await buy.getAttribute('data-character');await buy.click();await p.locator(`[data-act=rpg-character-equip][data-character="${purchased}"]`).click();
     await p.waitForFunction(()=>document.querySelectorAll('.rpg-character-card.is-selected').length===1);
    }
    if(panel==='profile'){
     assert.equal(await p.locator('.rpg-save-card').getAttribute('open'),null);
     await p.locator('.rpg-save-card summary').click();await p.locator('[name=nickname]').fill('메뉴 검증');await p.locator('[name=pin]').fill('2468');
     await p.locator('#rpg-profile-form button[type=submit]').click();await p.locator('.rpg-save-card.is-saved').waitFor();
     assert.ok(p.url().includes('sentenceMode=long'));assert.equal((await api(p,'rpg')).bestCleared,20);
    }
    if([390,1440].includes(viewport.width))await p.screenshot({path:`${out}/${engineName}-${panel}-${viewport.width}.png`,fullPage:true});
    await p.locator('.rpg-menu-back').click();await p.locator('[data-rpg-panel=menu]').waitFor();
   }
   await p.locator('.rpg-title-buttons .rpg-start').click();await p.locator('[name=rpg-stage]').selectOption('11');await p.waitForURL(/startStage=11/);await p.locator('[name=rpg-stage]').waitFor();
   await p.screenshot({path:`${out}/${engineName}-settings-${viewport.width}.png`,fullPage:true});
   await p.locator('.rpg-start').click();await p.locator('.typing-rpg__input').waitFor();await p.evaluate(()=>window.advanceTime(0));
   const initial=await state(p);assert.equal(initial.sentenceMode,'long');assert.equal(initial.attackMultiplier,2);assert.equal(initial.startStage,11);assert.equal(initial.phraseCount,250);
   const gauges=await p.locator('.typing-rpg__gauge').evaluateAll(nodes=>nodes.map(e=>({height:e.getBoundingClientRect().height,radius:getComputedStyle(e).borderRadius,fill:getComputedStyle(e.firstElementChild).backgroundColor,now:e.getAttribute('aria-valuenow'),max:e.getAttribute('aria-valuemax')})));
   const valueRows=await p.locator('.typing-rpg__meter-value').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).gridRowStart));assert.deepEqual(valueRows,['1','1']);assert.deepEqual(gauges.map(x=>x.height),[11,11,11]);assert.ok(gauges.every(x=>x.radius==='0px'));assert.equal(gauges[0].fill,gauges[2].fill);assert.equal(gauges[2].now,gauges[2].max);
   const before=await bounds(p);assert.ok(before.overflow<=1);assert.ok(before.targetOverflow<=1);assert.ok(before.arenaOverflow<=1,JSON.stringify(before));if(viewport.width>780)assert.ok(before.arena.height<=560);
   await p.locator('.typing-rpg__details summary').click();const open=await bounds(p);assert.equal(open.arena.height,before.arena.height);assert.equal(open.input.y-open.arena.y,before.input.y-before.arena.y);await p.locator('.typing-rpg__details summary').click();
   await p.getByRole('button',{name:'일시정지',exact:true}).click();const paused=await state(p);await p.evaluate(()=>window.advanceTime(30000));assert.equal((await state(p)).elapsedMs,paused.elapsedMs);await p.getByRole('button',{name:'계속하기',exact:true}).click();
   await p.locator('.typing-rpg__input').fill('ㅅ');assert.equal((await state(p)).hp,100);await p.locator('.typing-rpg__input').fill(initial.target);assert.equal((await state(p)).hp,100);
   await p.locator('.typing-rpg__input').press('Enter');const attacked=await state(p);assert.equal(attacked.completed,1);assert.equal(attacked.hp,100);assert.ok(attacked.lastAction.amount>=60);
   await p.screenshot({path:`${out}/${engineName}-battle-${viewport.width}.png`,fullPage:true});
   report.views.push({engine:engineName,viewport,menu,battle:before,gauges,damage:attacked.lastAction.amount});await p.close();
  }}finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error);throw error;}finally{await writeFile(`${out}/browser.json`,JSON.stringify(report,null,2));await app.close();}
console.log('v15 title/menu/settings/profile/character and long combat: 12 Chromium/WebKit views passed');
