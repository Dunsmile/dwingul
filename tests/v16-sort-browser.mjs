import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.DW_TEST_URL||'http://localhost:4183';
const output='output/v16-sort';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const report={passed:false,screenshots:[],errors:[],checks:[]};

async function open(viewport,seed=31,mode='sprint'){
 const page=await browser.newPage({viewport});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(`${base}/?qa=v16-sort#/play/sort?seed=${seed}&mode=${mode}`);
 await page.locator('.dg-game__canvas').waitFor();
 await page.waitForFunction(()=>typeof window.advanceTime==='function'&&typeof window.render_game_to_text==='function');
 await page.evaluate(()=>window.advanceTime(0));
 await page.evaluate(()=>document.fonts.ready);
 return page;
}
const state=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const correct=async page=>{const current=await state(page);await page.keyboard.press(current.queue[0].side==='left'?'ArrowLeft':'ArrowRight');};

try{
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:1440,height:900}]){
  const page=await open(viewport);
  const initial=await state(page),nextKey=initial.queue[1].key;
  await correct(page);
  const start=await state(page);
  assert.equal(start.queue[0].key,nextKey);
  assert.equal(start.queue[0].visualIndex,1);
  await page.evaluate(()=>window.advanceTime(86));
  const middle=await state(page);
  assert.ok(middle.queue[0].visualIndex>0&&middle.queue[0].visualIndex<1);
  const path=`${output}/fill-${viewport.width}.png`;
  await page.screenshot({path,fullPage:true});report.screenshots.push(path);
  await page.evaluate(()=>window.advanceTime(200));
  assert.equal((await state(page)).queue[0].visualIndex,0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  report.checks.push(`${viewport.width}px fill animation and layout`);
  await page.close();
 }

 const rapid=await open({width:390,height:844},47);
 const before=(await state(rapid)).score;
 for(let index=0;index<12;index+=1)await correct(rapid);
 assert.equal((await state(rapid)).score,before+12);
 assert.ok((await state(rapid)).queue[0].visualIndex>0);
 await rapid.evaluate(()=>window.advanceTime(80));
 await rapid.screenshot({path:`${output}/rapid-burst.png`,fullPage:true});report.screenshots.push(`${output}/rapid-burst.png`);
 for(let index=12;index<20;index+=1){await correct(rapid);await rapid.evaluate(()=>window.advanceTime(100));}
 assert.ok((await state(rapid)).feverMs>0);
 await rapid.screenshot({path:`${output}/fever.png`,fullPage:true});report.screenshots.push(`${output}/fever.png`);
 await rapid.evaluate(()=>window.advanceTime(20000));
 assert.equal((await state(rapid)).expression,'smile');
 await rapid.screenshot({path:`${output}/smile-ending.png`,fullPage:true});report.screenshots.push(`${output}/smile-ending.png`);
 await rapid.close();

 const mistakes=await open({width:320,height:740},51,'endless');
 for(let index=0;index<3;index+=1){const current=await state(mistakes);await mistakes.keyboard.press(current.queue[0].side==='left'?'ArrowRight':'ArrowLeft');}
 const ended=await state(mistakes);assert.equal(ended.mistakes,3);assert.equal(ended.expression,'cry');assert.equal(ended.phase,'ending');
 await mistakes.screenshot({path:`${output}/cry-ending.png`,fullPage:true});report.screenshots.push(`${output}/cry-ending.png`);
 await mistakes.evaluate(()=>window.advanceTime(900));
 await mistakes.locator('.result-number').waitFor();
 await mistakes.close();
 report.checks.push('12 zero-time inputs, fever, smile ending, three rapid mistakes and cry ending');
 assert.deepEqual(report.errors,[]);
 report.passed=true;
}finally{
 await browser.close();
 await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report,null,2));
