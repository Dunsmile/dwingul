import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.DW_TEST_URL||'http://127.0.0.1:4181',output='/tmp/dwingul-v16-racing';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),report={errors:[],screenshots:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>report.errors.push(error.message));await page.goto(base);
 const mount=version=>page.evaluate(async version=>{document.body.innerHTML='<main id="root"><section id="stage"></section></main>';const root=document.querySelector('#root'),stage=document.querySelector('#stage'),{createCityRacing}=await import('/js/city-racing.js');let result=null;const removers=[];const game=createCityRacing({root,stage,settings:{version,car:'basic'},random:()=>0,listen(target,type,handler,options){target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));},setStatus(text){window.__status=text;},finish(value){result=value;const card=document.createElement('div');card.className='result-card';card.textContent=value.mode;document.body.append(card);}});window.__racing={game,get state(){return game.getState();},get result(){return result;},destroy(){game.destroy();removers.forEach(remove=>remove());}};},version);
 const state=()=>page.evaluate(()=>window.__racing.state),tick=ms=>page.evaluate(ms=>window.__racing.game.tick(ms),ms);

 await mount('v7');await tick(1000);let legacy=await state();assert.equal(legacy.rulesVersion,'v7');assert.ok(Math.abs(legacy.fuel-29.5)<1e-7);assert.ok(Math.abs(legacy.speed-19.08)<1e-7);
 for(let elapsed=0;elapsed<70000&&!legacy.ended;elapsed+=100){await tick(100);legacy=await state();}assert.equal(legacy.ended,true);assert.equal(await page.locator('.result-card').innerText(),'city-basic-v7');

 await mount('v16');await tick(1000);let current=await state();assert.equal(current.rulesVersion,'v16');assert.ok(Math.abs(current.fuel-28.9)<1e-7);assert.ok(Math.abs(current.speed-18.72)<1e-7);assert.equal(current.playerArt.view,'rear');assert.ok(current.vehicles.every(vehicle=>vehicle.artView==='rear'));
 for(const target of [120,300,500]){while(!current.ended&&current.distance<target){await tick(100);current=await state();}assert.ok(current.distance>=target,`reached ${target}m`);const path=`${output}/grounded-${target}m.png`;await page.screenshot({path,fullPage:true});report.screenshots.push(path);}
 for(let elapsed=0;elapsed<70000&&!current.ended;elapsed+=50){await tick(50);current=await state();}assert.equal(current.ended,true);const stopped={distance:current.distance,seconds:current.seconds};assert.equal(await page.locator('.result-card').count(),0);
 await tick(500);current=await state();assert.equal(current.distance,stopped.distance);assert.equal(current.seconds,stopped.seconds);assert.equal(await page.locator('.result-card').count(),0);await page.screenshot({path:`${output}/stopped-freeze.png`,fullPage:true});report.screenshots.push(`${output}/stopped-freeze.png`);
 await tick(200);assert.equal(await page.locator('.result-card').innerText(),'city-basic-v16');assert.deepEqual(report.errors,[]);report.passed=true;report.stopped=stopped;report.legacy={mode:'city-basic-v7'};report.current={mode:'city-basic-v16'};
}finally{await browser.close();await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));}
console.log('v16 racing browser passed');
