import { chromium } from 'playwright';
import { createApp } from '../server.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`,browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync('output/game-v4',{recursive:true});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text())),advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const start=async(mode)=>{await page.goto(base+'/#/detail/typing?seed=19&mode='+mode);await page.locator('[data-act=start]').waitFor();await page.locator('[data-act=start]').click();await page.locator('.dg-game').waitFor();await advance(0);};
try{
 await start('rpg');let s=await state();assert.equal(s.hp,100);const input=page.locator('.typing-rpg__input');
 // Korean composition must not damage HP while the syllable is being assembled.
 await input.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value='ㅎ';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});assert.equal((await state()).hp,100);
 await input.evaluate(el=>{el.value=JSON.parse(window.render_game_to_text()).target;el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));});await input.press('Enter');assert.equal((await state()).completed,1);
 const seen=new Set([s.target]);while((await state()).mp<100){s=await state();assert.ok(!seen.has(s.target));seen.add(s.target);await input.fill(s.target);await input.press('Enter');}
 await input.press('Escape');await advance(8000);s=await state();assert.ok(s.hp<100);await input.fill('힐');assert.equal((await state()).hp,s.hp);await input.press('Enter');assert.equal((await state()).hp,100);assert.equal((await state()).mp,0);
 await page.locator('.dg-game__pause').click();s=await state();await advance(16000);assert.equal((await state()).hp,s.hp);assert.equal((await state()).counterMs,s.counterMs);assert.equal(await input.isDisabled(),true);await page.locator('.dg-game__pause').click();
 await page.screenshot({path:'output/game-v4/rpg-desktop.png'});
 await input.fill('틀');assert.ok((await state()).hp<100);await input.press('Escape');assert.equal((await state()).input,'');
 // Complete all 100 distinct phrases through the actual input and submit events.
 const completed=await page.evaluate(()=>{let seen=[],s=JSON.parse(window.render_game_to_text());while(s.target){seen.push(s.target);const input=document.querySelector('.typing-rpg__input'),form=document.querySelector('.typing-rpg__form');input.value=s.target;input.dispatchEvent(new InputEvent('input',{bubbles:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));s=JSON.parse(window.render_game_to_text());if(!s.target)break;}return seen;});
 assert.equal(new Set([...seen,...completed]).size,100);await page.locator('.result-number').waitFor();assert.match(await page.locator('.result-number').innerText(),/점/);await page.locator('.result-card a[href*="detail/typing"]').click();assert.equal(await page.locator('[name=game-mode][value=rpg]').isChecked(),true);
 await start('rpg');await advance(110000);await page.locator('.result-number').waitFor();assert.equal(await page.locator('.result-number').innerText(),'0점');
 await start('rain');const rain=await page.evaluate(()=>{let seen=[];for(let t=0;t<230000;t+=40){const s=JSON.parse(window.render_game_to_text());if(!s.blocks)break;for(const b of s.blocks){seen.push(b.text);const el=document.querySelector('.dg-game__typing-input');el.value=b.text;document.querySelector('.dg-game__typing-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}window.advanceTime(40);}return seen;});assert.equal(rain.length,100);assert.equal(new Set(rain).size,100);await page.locator('.result-number').waitFor();assert.equal(await page.locator('.result-number').innerText(),'100개');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:width===1440?900:844});await start('rpg');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const b=await input.boundingBox();assert.ok(b.y+b.height<844,'RPG input visible '+width);await page.screenshot({path:`output/game-v4/rpg-${width}.png`});}
 assert.deepEqual(errors,[]);writeFileSync('output/game-v4/typing-report.json',JSON.stringify({passed:true,ime:true,heal:true,pause:true,defeat:true,rpg100:true,rain100:true,errors},null,2));console.log('TYPING_V4_BROWSER_PASSED');
}finally{await browser.close();await app.close();}
