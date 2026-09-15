import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../server.mjs';
const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`,out='output/v20',report={views:[],errors:[]};await mkdir(out,{recursive:true});
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
try{for(const [name,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch();try{for(const width of [320,390,1440]){
  const p=await browser.newPage({viewport:{width,height:width<500?844:900},isMobile:width<500,hasTouch:width<500});p.on('pageerror',e=>report.errors.push({name,width,error:e.message}));
  let starts=0;p.on('request',r=>{if(new URL(r.url()).pathname==='/api/runs'&&r.method()==='POST')starts++;});
  await p.goto(base+'/#/detail/typing');await p.locator('[data-rpg-panel=menu]').waitFor();
  await p.locator('.rpg-title-buttons .rpg-start').click();await p.locator('[data-rpg-panel=settings]').waitFor({timeout:3000});assert.equal(starts,0,'opening settings must not create a run');
  await p.locator('[name=rpg-sentence-mode][value=long]').check();await p.waitForURL(/sentenceMode=long/);
  await p.locator('.rpg-menu-back').click();await p.locator('[data-rpg-panel=menu]').waitFor();
  await p.locator('.rpg-title-buttons .rpg-start').click();await p.locator('[data-rpg-panel=settings]').waitFor();assert.equal(await p.locator('[name=rpg-sentence-mode][value=long]').isChecked(),true);assert.equal(starts,0);
  await p.screenshot({path:`${out}/${name}-${width}-settings.png`,fullPage:true});
  const confirm=p.locator('.rpg-panel-footer .rpg-start');assert.equal(await confirm.isVisible(),true);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await confirm.click();await p.locator('.typing-rpg__input').waitFor();await p.evaluate(()=>advanceTime(0));assert.equal(starts,1);assert.equal((await state(p)).sentenceMode,'long');assert.equal((await state(p)).attackMultiplier,2);
  const inputStyle=await p.locator('.typing-rpg__input').evaluate(e=>getComputedStyle(e).userSelect);assert.equal(inputStyle,'text');
  await p.goto(base+'/?qa=touch-v20#/play/jump');await p.locator('.dg-game--jump-v19').waitFor();await p.waitForFunction(()=>JSON.parse(render_game_to_text()).id==='jump');await p.evaluate(()=>advanceTime(0));
  const guards=await p.locator('.dg-game__split-controls').evaluate(e=>{
   const nodes=[e,...e.querySelectorAll('button'),document.querySelector('canvas')];return nodes.map(n=>{const s=getComputedStyle(n);return {userSelect:s.userSelect,webkitUserSelect:s.getPropertyValue('-webkit-user-select'),callout:s.getPropertyValue('-webkit-touch-callout'),touchAction:s.touchAction,contextBlocked:!n.dispatchEvent(new Event('contextmenu',{bubbles:true,cancelable:true})),selectionBlocked:!n.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))};});
  });
  assert.ok(guards.every(s=>s.userSelect==='none'&&s.touchAction==='none'&&s.contextBlocked&&s.selectionBlocked));if(name==='webkit')assert.ok(guards.every(s=>s.webkitUserSelect==='none'));
  // Playwright runs desktop WebKit with mobile emulation; this property is iOS-only.
  const nativeCalloutSupported=await p.evaluate(()=>CSS.supports('-webkit-touch-callout','none'));if(nativeCalloutSupported)assert.ok(guards.every(s=>s.callout==='none'));
  // A long press must keep sliding and must not select its Korean button label.
  await p.locator('.dg-game__split-controls button').first().dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',isPrimary:true});
  await p.evaluate(()=>advanceTime(1400));assert.equal((await state(p)).player.duck,true);assert.equal(await p.evaluate(()=>getSelection().toString()),'');
  await p.locator('.dg-game__split-controls button').last().dispatchEvent('pointerdown',{pointerId:42,pointerType:'touch',isPrimary:false});await p.evaluate(()=>advanceTime(100));let s=await state(p);assert.equal(s.player.jumps,1);assert.equal(s.player.duck,false);
  await p.locator('.dg-game__split-controls button').first().dispatchEvent('pointerdown',{pointerId:43,pointerType:'touch',isPrimary:true});await p.evaluate(()=>advanceTime(180));assert.equal((await state(p)).player.duck,true);
  await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerup',{pointerId:42,bubbles:true})));assert.equal((await state(p)).player.duck,true);
  await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerup',{pointerId:43,bubbles:true})));assert.equal((await state(p)).player.duck,false);
  await p.getByRole('button',{name:'일시정지',exact:true}).click();const before=(await state(p)).elapsedMs;await p.evaluate(()=>advanceTime(1000));assert.equal((await state(p)).elapsedMs,before);
  const outside=await p.locator('.footer').evaluate(e=>({selection:!e.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true})),menu:!e.dispatchEvent(new Event('contextmenu',{bubbles:true,cancelable:true})),callout:getComputedStyle(e).getPropertyValue('-webkit-touch-callout')}));assert.equal(outside.selection,false);assert.equal(outside.menu,false);assert.notEqual(outside.callout,'none');
  await p.screenshot({path:`${out}/${name}-${width}-touch.png`,fullPage:true});report.views.push({name,width,starts,guards,outside,nativeCalloutSupported});await p.close();
 }}finally{await browser.close();}
}assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await writeFile(`${out}/browser.json`,JSON.stringify(report,null,2));await app.close();}
console.log('v20 setup-first navigation and scoped touch controls pass 6 Chromium/WebKit views');
