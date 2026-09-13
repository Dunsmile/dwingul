import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out='output/game-v7';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],report=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
let visitNumber=0;
const visit=async(path,selector='.dg-game')=>{await page.goto('http://localhost:4174/?ui7='+ ++visitNumber +'#/'+path);await page.locator(selector).first().waitFor();};
const until=(fn,arg)=>page.waitForFunction(fn,arg,{polling:20});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const api=p=>page.evaluate(p=>fetch('/api/'+p).then(r=>r.json()),p);
try{
 for(const width of[320,390,1440]){
  await page.setViewportSize({width,height:width===1440?1000:844});await visit('play/racing?seed=15');
  const stable=await page.evaluate(()=>{const rect=()=>{const c=document.querySelector('.city-canvas').getBoundingClientRect(),b=document.querySelector('.city-controls').getBoundingClientRect();return{top:c.top,height:c.height,controls:b.top};};const before=rect();document.querySelector('.dg-game__status').textContent='시티 원 · 12345m · 동전 1234';document.querySelector('.city-lane-status small').textContent='아직 옆에 있어요';document.querySelector('.city-boost-button').textContent='부스터 사용 중';return{before,after:rect()};});assert.deepEqual(stable.before,stable.after);
  if(width<561){await page.setViewportSize({width,height:700});assert.equal((await page.locator('.city-canvas').boundingBox()).height,stable.before.height);await page.setViewportSize({width,height:844});assert.equal(await page.locator('.city-touch-boost').isVisible(),true);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/city-stable-${width}.png`,fullPage:true});report.push({viewport:width,liveTextStable:true});
 }
 // Exact real-input replay reaches full boost; keyboard and touch must send the same action.
 const fixture=JSON.parse(readFileSync('tests/fixtures/city-v6-drive.json'));
 for(const input of['keyboard','touch']){
  await page.setViewportSize({width:input==='touch'?390:1440,height:input==='touch'?844:1000});await visit('play/racing?seed='+fixture.seed);let time=0;
  for(const[at,dir]of fixture.inputs){await advance(at-time);time=at;if(dir===0){if((await state()).boost<10){await page.keyboard.press('ArrowUp');continue;}if(input==='touch')await page.locator('.city-touch-boost').click();else await page.keyboard.press('ArrowUp');assert.equal((await state()).boosting,true);assert.equal((await state()).boosts,1);await page.screenshot({path:`${out}/city-boost-${input}.png`,fullPage:true});break;}await page.keyboard.press(dir<0?'ArrowLeft':'ArrowRight');}
  await page.locator('[data-act=exit]').click();await until(()=>JSON.parse(render_game_to_text()).paused);const stopped=(await state()).seconds;await advance(1000);assert.equal((await state()).seconds,stopped);await page.locator('[data-act=close-dialog]').click();await until(()=>!JSON.parse(render_game_to_text()).paused);report.push({boost:input,modalPause:true});
 }
 await page.setViewportSize({width:390,height:844});await visit('detail/typing?panel=shop','.rpg-hub');await page.locator('.rpg-hub-tabs').scrollIntoViewIfNeeded();const tabY=await page.evaluate(()=>scrollY);await page.getByRole('link',{name:'내 장비',exact:true}).click();await page.locator('.rpg-equipped').waitFor();assert.equal(await page.evaluate(()=>scrollY),tabY);report.push('same-page tab preserves scroll');
 // Earn gold through actual typing, without touching the real user database.
 await visit('play/typing?seed=73');let guard=0;while((await state()).stage<=10&&guard++<150){await advance(700);const s=await state();await page.locator('.typing-rpg__input').fill(s.target);await page.locator('.typing-rpg__input').press('Enter');}
 await until(async()=>(await fetch('/api/rpg').then(r=>r.json())).bestCleared>=10);
 await visit('detail/typing?panel=shop','.rpg-hub');const balance=(await api('rpg')).gold;
 await page.locator('[data-act=rpg-draw]').scrollIntoViewIfNeeded();const drawY=await page.evaluate(()=>scrollY);await page.locator('[data-act=rpg-draw]').click();await page.locator('.is-opening').waitFor();assert.equal(await page.locator('[data-draw-equip]').count(),0);await page.screenshot({path:out+'/gacha-opening.png'});
 await page.locator('.draw-reveal').waitFor();assert.equal(await page.locator('.draw-item-icon').count(),0);await page.locator('.draw-reveal').click();await page.locator('.rpg-draw-dialog.is-revealed').waitFor();const rarity=await page.locator('.rpg-draw-dialog').getAttribute('class');assert.match(rarity,/rarity-(common|uncommon|rare|legend)/);await page.waitForTimeout(350);await page.screenshot({path:out+'/gacha-result.png'});
 const owned=await api('rpg');assert.ok([balance-50,balance-30].includes(owned.gold));await page.locator('[data-draw-equip]').click();await page.getByRole('button',{name:'✓ 장착 완료',exact:true}).waitFor();await page.screenshot({path:out+'/gacha-equipped.png'});const equipped=await api('rpg');assert.ok(Object.values(equipped.equipped).some(Boolean));await page.locator('[data-draw-done]').click();await page.locator('.rpg-draw-dialog').waitFor({state:'detached'});await until(gold=>document.querySelector('.rpg-hub-summary')?.textContent.includes(gold+' 골드'),equipped.gold);assert.equal(await page.evaluate(()=>scrollY),drawY);report.push('opening → manual reveal → rarity outline → equip → close preserves scroll and single charge');
 // Repeated inline equip uses a same-route refresh; focus and position remain.
 await page.getByRole('link',{name:'내 장비',exact:true}).click();await page.locator('.rpg-equipped').waitFor();await page.locator('.rpg-equipped [data-act=rpg-equip]').first().scrollIntoViewIfNeeded();const equipY=await page.evaluate(()=>scrollY);await page.locator('.rpg-equipped [data-act=rpg-equip]').first().click();await until(()=>!document.querySelector('.rpg-equipped [data-act=rpg-equip]'));assert.equal(await page.evaluate(()=>scrollY),equipY);
 // A failed request renders a closable error instead of showing a fabricated item.
 await page.getByRole('link',{name:'뽑기 상점',exact:true}).click();await page.locator('[data-act=rpg-draw]').waitFor();await page.route('**/api/rpg/draw',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'테스트 연결 오류'})}));await page.locator('[data-act=rpg-draw]').click();await page.getByText('테스트 연결 오류',{exact:true}).waitFor();assert.equal(await page.locator('.draw-item-icon').count(),0);await page.locator('[data-draw-done]').click();await page.unroute('**/api/rpg/draw');assert.equal((await api('rpg')).gold,equipped.gold);report.push('draw error has no false item or charge');
 await page.locator('[data-act=rpg-draw]').click();await page.locator('.is-opening').waitFor();await page.locator('.draw-close').click();await page.locator('[data-act=rpg-reveal]').waitFor();assert.equal(await page.locator('.rpg-drop').count(),0);const unopened=(await api('rpg')).gold;await page.locator('[data-act=rpg-reveal]').click();await page.locator('.draw-reveal').click();await page.locator('.rpg-draw-dialog.is-revealed').waitFor();await page.locator('[data-draw-done]').click();assert.equal((await api('rpg')).gold,unopened);report.push('close before reveal → stored unopened chest → reveal without another charge');
 await page.getByRole('link',{name:'홈',exact:true}).last().click();await page.locator('.hero').waitFor();assert.equal(await page.evaluate(()=>scrollY),0);assert.deepEqual(errors,[]);
 writeFileSync(out+'/ui-report.json',JSON.stringify({passed:true,report,errors},null,2));console.log(report);
}catch(error){console.log('DEBUG',await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,gear:document.querySelector('.rpg-equipped')?.innerHTML,hash:location.hash})),errors);throw error;}finally{await browser.close();}
