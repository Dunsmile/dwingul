import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.DW_TEST_URL||'http://127.0.0.1:4179';
assert.equal(new URL(base).port,'4179','immersive RPG QA must use isolated port 4179');
const output='output/v13-rpg';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});const report={views:[],errors:[],interactions:{}};
try{
 for(const viewport of [{width:320,height:568},{width:320,height:700},{width:390,height:844},{width:768,height:900},{width:1440,height:1000}]){
  const page=await browser.newPage({viewport});page.on('pageerror',error=>report.errors.push(String(error)));
  await page.goto(`${base}/?qa=v13rpg#/play/typing?seed=73`,{waitUntil:'domcontentloaded'});await page.addStyleTag({url:'/css/typing-rpg.css'});await page.locator('.typing-rpg').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.typing-rpg__hero-art,.typing-rpg__monster-art')].every(image=>image.complete&&image.naturalWidth>0));
  const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const metric=s=>{const n=document.querySelector(s);return{text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}};return{overflow:document.documentElement.scrollWidth-innerWidth,arena:rect('.typing-rpg__arena'),hud:rect('.typing-rpg__hud'),scene:rect('.typing-rpg__scene'),command:rect('.typing-rpg__command'),player:rect('.typing-rpg__player-hud'),run:rect('.typing-rpg__run-hud'),enemy:rect('.typing-rpg__enemy-hud'),pause:rect('.dg-game__pause'),toolbarDisplay:getComputedStyle(document.querySelector('.dg-game__toolbar')).display,label:metric('.typing-rpg__meter-label'),enemyName:metric('.typing-rpg__enemy-name'),counter:metric('.typing-rpg__counter-text')}});
  assert.ok(layout.overflow<=1,JSON.stringify({viewport,layout}));assert.ok(layout.hud.bottom<=layout.scene.bottom);assert.ok(layout.scene.bottom<=layout.command.top+1);assert.ok(layout.pause.width>=44&&layout.pause.height>=44);assert.equal(layout.toolbarDisplay,'none');if(viewport.width<=780){assert.ok(layout.label.font>=12);assert.ok(layout.enemyName.font>=12);assert.ok(layout.enemyName.scrollWidth<=layout.enemyName.clientWidth+1);assert.match(layout.counter.text,/\d+\.\d초$/);assert.ok(layout.counter.font>=12);}
  const input=page.locator('.typing-rpg__input');await input.focus();assert.equal(await input.evaluate(node=>document.activeElement===node),true);
  const path=`${output}/immersive-${viewport.width}x${viewport.height}.png`;await page.screenshot({path,fullPage:true});report.views.push({viewport,layout,path});await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(`${base}/?qa=v13rpg-actions#/play/typing?seed=91`);await page.addStyleTag({url:'/css/typing-rpg.css'});await page.locator('.typing-rpg__input').waitFor();
 const input=page.locator('.typing-rpg__input');
 await input.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'나'})));await input.fill('나');assert.equal((await page.evaluate(()=>JSON.parse(window.render_game_to_text()))).input,'');await input.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'나'})));assert.equal((await page.evaluate(()=>JSON.parse(window.render_game_to_text()))).input,'나');await input.press('Escape');
 let state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));let drafts=0;while(state.mp<100&&drafts<60){await input.fill(state.target);state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));drafts++;if(state.mp<100)await input.press('Escape');}assert.equal(state.mp,100);await input.press('Escape');await input.fill('틀림');await page.locator('.typing-rpg__submit').click();const hurt=(await page.evaluate(()=>JSON.parse(window.render_game_to_text()))).hp;await input.press('Escape');await input.fill('힐');await page.locator('.typing-rpg__submit').click();state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.equal(state.hp,Math.min(state.maxHp,hurt+15));assert.equal(state.mp,0);report.interactions={compositionDeferred:true,drafts,hurt,healed:state.hp};await page.close();
 assert.deepEqual(report.errors,[]);report.passed=true;
} catch(error){report.passed=false;report.failure=String(error);throw error;} finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log('v13 immersive RPG passed at short/standard 320, 390, 768, and 1440 with readable HUD, attack, heal, IME, and in-arena pause checks');
