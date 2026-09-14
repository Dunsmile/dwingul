import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../server.mjs';
const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`,out='output/v17/jump-compat',report={checks:[],errors:[]};
await mkdir(out,{recursive:true});
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=(p,ms)=>p.evaluate(ms=>window.advanceTime(ms),ms);
try {
 for(const [name,engine] of Object.entries({chromium,webkit})) {
  const browser=await engine.launch();
  try {for(const width of [390,1440])for(const version of ['v16','v17']) {
   const p=await browser.newPage({viewport:{width,height:900}});p.on('pageerror',e=>report.errors.push(e.message));
   if(version==='v16'){
    await p.goto(`${base}/?compat=17#/`);await p.locator('.cards').first().waitFor();
    await p.evaluate(async()=>{const {mountGame}=await import('/js/games.js');const instance=mountGame(document.querySelector('#main'),'jump',{settings:{version:'v16'},seed:1717});window.advanceTime=ms=>instance.advanceTime(ms);window.render_game_to_text=()=>JSON.stringify(instance.getState());});
   }else await p.goto(`${base}/?compat=17#/play/jump?version=${version}&seed=1717`);
   await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).id==='jump');
   await advance(p,0);let s=await state(p);assert.equal(s.rulesVersion,version);assert.equal(s.lives,3);
   assert.equal(s.speed,version==='v17'?260:220);
   await p.keyboard.press('Space');await advance(p,300);await p.keyboard.down('ArrowDown');await advance(p,20);
   s=await state(p);assert.ok(s.player.y<390);
   if(version==='v17'){assert.equal(s.fastFalling,true);assert.ok(s.player.vy>0);}
   await advance(p,200);s=await state(p);
   if(version==='v17'){assert.equal(s.player.y,390);assert.equal(s.player.duck,true);}
   else assert.ok(s.player.y<390);
   await p.keyboard.up('ArrowDown');
   await p.getByRole('button',{name:'일시정지',exact:true}).click();const before=await state(p);await advance(p,5000);assert.equal((await state(p)).elapsedMs,before.elapsedMs);
   assert.equal(await p.locator('.dg-game__status').isVisible(),false);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.screenshot({path:`${out}/${name}-${width}-${version}.png`});report.checks.push({engine:name,width,version});await p.close();
  }}finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await app.close();}
console.log('8 jump Chromium/WebKit current/legacy control checks passed');
