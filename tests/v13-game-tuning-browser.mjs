import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.DW_TEST_URL||'http://localhost:4178',output='/tmp/dwingul-v13-game-tuning';await mkdir(output,{recursive:true});
const browser=await chromium.launch(),report={screenshots:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>report.errors.push(error.message));
 const visit=async id=>{await page.goto(`${base}/?qa=finalgames#/play/${id}?seed=19`);await page.locator('.dg-game').waitFor();await page.waitForFunction(()=>typeof window.advanceTime==='function');await page.evaluate(()=>window.advanceTime(0));};
 await visit('jump');await page.evaluate(()=>window.advanceTime(100));let state=JSON.parse(await page.evaluate(()=>window.render_game_to_text()));assert.equal(state.rulesVersion,'v13');assert.equal(state.difficultyLevel,0);await page.screenshot({path:`${output}/jump-v13-mobile.png`});report.screenshots.push(`${output}/jump-v13-mobile.png`);
 await visit('memory');await page.addStyleTag({url:`${base}/css/play-tuning-v13.css`});await page.evaluate(()=>window.advanceTime(0));const lit=page.locator('.dg-game__memory-cell.is-lit').first();await lit.waitFor();assert.equal(await lit.evaluate(node=>getComputedStyle(node).opacity),'1');assert.equal(await lit.evaluate(node=>getComputedStyle(node).filter),'none');await page.screenshot({path:`${output}/memory-preview-mobile.png`});report.screenshots.push(`${output}/memory-preview-mobile.png`);
 await visit('racing');await page.evaluate(()=>window.advanceTime(700));state=JSON.parse(await page.evaluate(()=>window.render_game_to_text()));assert.ok(state.vehicles.length>0);assert.ok(state.vehicles.every(vehicle=>vehicle.artView==='rear'));await page.keyboard.press('ArrowRight');assert.equal(JSON.parse(await page.evaluate(()=>window.render_game_to_text())).lane,3);await page.screenshot({path:`${output}/racing-rear-mobile.png`});report.screenshots.push(`${output}/racing-rear-mobile.png`);
 await page.setViewportSize({width:1440,height:950});for(const id of ['jump','memory','racing']){await visit(id);if(id==='memory')await page.addStyleTag({url:`${base}/css/play-tuning-v13.css`});await page.evaluate(ms=>window.advanceTime(ms),id==='racing'?700:100);if(id==='racing')assert.ok(JSON.parse(await page.evaluate(()=>window.render_game_to_text())).vehicles.every(vehicle=>vehicle.artView==='rear'));if(id==='memory')assert.equal(await page.locator('.dg-game__memory-cell.is-lit').first().evaluate(node=>getComputedStyle(node).opacity),'1');const path=`${output}/${id}-desktop.png`;await page.screenshot({path});report.screenshots.push(path);}
 assert.deepEqual(report.errors,[]);report.passed=true;await page.close();
}finally{await browser.close();await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));}
console.log('v13 game tuning browser passed');
