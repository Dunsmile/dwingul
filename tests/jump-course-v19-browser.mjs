import {jumpWorldDistanceV18,jumpWorldSpeedV18} from '../public/js/jump-combos-v18.js';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {jumpWorldTimeV19,jumpWorldDistanceV19,jumpWorldSpeedV19,jumpMotionTimeV19} from '../public/js/jump-course-v19.js';
import {solve} from './helpers/jump-route-search.mjs';
import {createApp} from '../server.mjs';
const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`,out='output/v19/browser',report={checks:[],errors:[]};
await mkdir(out,{recursive:true});
let runNumber=0;
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=(p,ms)=>p.evaluate(ms=>window.advanceTime(ms),ms);
async function open(p,version='v19'){
 if(version==='v18'){
  await p.goto(`${base}/?qa=19#/`);await p.locator('.cards').first().waitFor();
  await p.evaluate(async()=>{const {mountGame}=await import('/js/games.js');const g=mountGame(document.querySelector('#main'),'jump',{settings:{version:'v18'},seed:1919});window.advanceTime=ms=>g.advanceTime(ms);window.render_game_to_text=()=>JSON.stringify(g.getState());});
 }else await p.goto(`${base}/?qa=19&run=${++runNumber}#/play/jump?seed=1919`);
 await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).id==='jump');await advance(p,0);
}
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{for(const width of [320,390,1440]){
   const p=await browser.newPage({viewport:{width,height:width<500?844:1000},hasTouch:width<500});p.on('pageerror',e=>report.errors.push(e.message));
   await p.exposeFunction('courseRoute',recipe=>{const startMs=Math.ceil(jumpWorldTimeV19(recipe.startWorld)/(1000/60))*(1000/60);const route=solve(recipe,jumpWorldSpeedV19(startMs),{worldAt:t=>jumpWorldDistanceV19(startMs+t*1000)-recipe.startWorld,motionAt:t=>(jumpMotionTimeV19(startMs+t*1000)-jumpMotionTimeV19(startMs))/1000});if(!route)throw Error('Unsolved '+recipe.id);return route.controls.map(c=>({...c,atMs:startMs+c.atMs}));});
   await open(p);let s=await state(p);assert.equal(s.rulesVersion,'v19');assert.equal(s.lives,3);assert.equal(s.speed,310);
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
    window.qaCourse={seen:new Set(),queue:[],ci:0,minimumLives:3};
    window.qaTravel=async meters=>{const qa=window.qaCourse;let count=0;while(count++<10000){let s=JSON.parse(render_game_to_text());if(s.distance>=meters)return s;if(s.phase!=='playing')throw Error(`Unexpected end at ${s.distance}`);
     for(const r of s.recipes)if(!qa.seen.has(r.startWorld)){qa.seen.add(r.startWorld);qa.queue.push(...await window.courseRoute(r));qa.queue.sort((a,b)=>a.atMs-b.atMs);}
     const c=qa.queue[qa.ci];if(!c){advanceTime(16);continue;}advanceTime(Math.max(0,c.atMs-s.elapsedMs));
     if(c.action==='jump'){document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));}
     else document.dispatchEvent(new KeyboardEvent(c.action==='duck'?'keydown':'keyup',{key:'ArrowDown',code:'ArrowDown',bubbles:true,cancelable:true}));
     qa.ci++;qa.minimumLives=Math.min(qa.minimumLives,JSON.parse(render_game_to_text()).lives);
    }throw Error('Travel watchdog');};
   });
   // Real renderer + DOM inputs, including acceleration and all six backgrounds.
   const targets=((name==='chromium'&&width>=390)||(name==='webkit'&&width===390))?[100,1100,2100,3100,4100,5200,6500]:[180];
   for(const meters of targets){s=await p.evaluate(m=>window.qaTravel(m),meters);assert.equal(s.lives,3);await p.screenshot({path:`${out}/${name}-${width}-${meters}m.png`});}
   assert.equal(await p.evaluate(()=>window.qaCourse.minimumLives),3);
   if(s.distance>=6000){assert.equal(s.speed,882);assert.ok(s.heartsCollected>=5);assert.equal(s.difficultyLevel,5);}
   report.checks.push({engine:name,width,distance:s.distance,patterns:s.patternsSeen,hearts:s.heartsCollected});
   await open(p,'v18');s=await state(p);assert.equal(s.rulesVersion,'v18');assert.equal(s.speed,310);assert.equal(s.lives,3);
   await p.close();
  }}finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await app.close();}
console.log('v19 Chromium/WebKit control, legacy, 6500m and responsive checks passed');
