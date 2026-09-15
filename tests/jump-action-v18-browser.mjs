import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../server.mjs';
const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`,out='output/v18/browser',report={checks:[],errors:[]};
await mkdir(out,{recursive:true});
let runNumber=0;
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=(p,ms)=>p.evaluate(ms=>window.advanceTime(ms),ms);
async function open(p,version='v18'){
 if(version==='v17'){
  await p.goto(`${base}/?qa=18#/`);await p.locator('.cards').first().waitFor();
  await p.evaluate(async()=>{const {mountGame}=await import('/js/games.js');const g=mountGame(document.querySelector('#main'),'jump',{settings:{version:'v17'},seed:1818});window.advanceTime=ms=>g.advanceTime(ms);window.render_game_to_text=()=>JSON.stringify(g.getState());});
 }else await p.goto(`${base}/?qa=18&run=${++runNumber}#/play/jump?seed=1818`);
 await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).id==='jump');await advance(p,0);
}
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{for(const width of [320,390,1440]){
   const p=await browser.newPage({viewport:{width,height:width<500?844:1000},hasTouch:width<500});p.on('pageerror',e=>report.errors.push(e.message));
   await open(p);let s=await state(p);assert.equal(s.rulesVersion,'v18');assert.equal(s.lives,3);assert.equal(s.speed,310);
   const duck=p.getByRole('button',{name:/꾹 눌러 숙이기/}),jump=p.getByRole('button',{name:/점프 · 두 번 가능/});
   await duck.dispatchEvent('pointerdown',{pointerId:10});await jump.dispatchEvent('pointerdown',{pointerId:11});await advance(p,100);assert.equal((await state(p)).player.duck,false);assert.ok((await state(p)).player.y<350);
   await duck.dispatchEvent('pointerdown',{pointerId:10});await advance(p,20);assert.equal((await state(p)).fastFalling,true);
   await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerup',{pointerId:11,bubbles:true})));
   assert.equal((await state(p)).player.duck,true,'other finger release must not cancel slide');
   await advance(p,200);assert.equal((await state(p)).player.y,390);
   await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerup',{pointerId:10,bubbles:true})));
   await p.keyboard.down('ArrowDown');await p.keyboard.press('Space');await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown',key:'ArrowDown',repeat:true,bubbles:true})));await advance(p,100);assert.equal((await state(p)).player.duck,false);
   await p.keyboard.up('ArrowDown');await p.keyboard.down('ArrowDown');await advance(p,180);assert.equal((await state(p)).player.duck,true);await p.keyboard.up('ArrowDown');
   await p.getByRole('button',{name:'일시정지',exact:true}).click();const paused=await state(p);await advance(p,3000);assert.equal((await state(p)).elapsedMs,paused.elapsedMs);
   assert.equal(await p.locator('.dg-game__status').isVisible(),false);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.screenshot({path:`${out}/${name}-${width}-controls.png`});
   await open(p);await p.evaluate(async()=>{
    const {compileJumpCombo,jumpCombos100}=await import('/js/jump-combos-v18.js');window.qaCombos={seen:new Set(),queue:[],ci:0,minimumLives:3};
    window.qaTravel=(meters,stopMs=Infinity)=>{const qa=window.qaCombos;let count=0;while(count++<10000){let s=JSON.parse(render_game_to_text());if(s.distance>=meters||s.elapsedMs>=stopMs-.01)return s;if(s.phase!=='playing')throw Error(`Unexpected end at ${s.distance}`);
     for(const r of s.recipes)if(!qa.seen.has(r.startMs)){qa.seen.add(r.startMs);qa.queue.push(...compileJumpCombo(jumpCombos100.find(p=>p.id===r.id),r.startMs,r.tier,{middleRoute:qa.seen.size%2?'jump':'slide'}).controls);}
     const c=qa.queue[qa.ci];if(!c){advanceTime(16);continue;}if(c.atMs>stopMs){advanceTime(stopMs-s.elapsedMs);return JSON.parse(render_game_to_text());}advanceTime(Math.max(0,c.atMs-s.elapsedMs));
     if(c.action==='jump'){document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));}
     else document.dispatchEvent(new KeyboardEvent(c.action==='duck'?'keydown':'keyup',{key:'ArrowDown',code:'ArrowDown',bubbles:true,cancelable:true}));
     qa.ci++;qa.minimumLives=Math.min(qa.minimumLives,JSON.parse(render_game_to_text()).lives);
    }throw Error('Travel watchdog '+JSON.stringify(JSON.parse(render_game_to_text())));};
   });
   const middleTime=(await state(p)).obstacles.find(o=>o.kind==='middle')?.centerMs;
   if(middleTime){const mid=await p.evaluate(t=>window.qaTravel(Infinity,t),middleTime);assert.equal(mid.lives,3);await p.screenshot({path:`${out}/${name}-${width}-middle.png`});}
   // Real renderer + DOM inputs, including acceleration and all six backgrounds.
   const targets=name==='chromium'&&width===1440?[100,1010,2010,3010,4010,5010,6100]:[180];
   for(const meters of targets){s=await p.evaluate(m=>window.qaTravel(m),meters);assert.equal(s.lives,3);await p.screenshot({path:`${out}/${name}-${width}-${meters}m.png`});}
   assert.equal(await p.evaluate(()=>window.qaCombos.minimumLives),3);
   if(s.distance>=6000){assert.equal(s.speed,630);assert.ok(s.heartsCollected>=5);assert.equal(s.difficultyLevel,5);}
   report.checks.push({engine:name,width,distance:s.distance,patterns:s.patternsSeen,hearts:s.heartsCollected});
   await open(p,'v17');s=await state(p);assert.equal(s.rulesVersion,'v17');assert.equal(s.speed,260);assert.equal(s.lives,3);
   await p.close();
  }}finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await app.close();}
console.log('v18 Chromium/WebKit control, legacy, 6000m and responsive checks passed');
