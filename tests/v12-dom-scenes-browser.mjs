import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://localhost:4174',out='output/v12-dom-scenes';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),report={views:[],errors:[],interactions:[]};
const state=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=(page,ms)=>page.evaluate(ms=>window.advanceTime(ms),ms);
async function shot(page,id,width,phase){const path=out+'/'+id+'-'+width+'-'+phase+'.png';await page.locator('.dg-game').screenshot({path});report.views.push(path);}
try{
for(const width of [320,390,1440]){
 const page=await browser.newPage({viewport:{width,height:width<600?844:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const id of ['memory','color','timing','typing','sequence','numbers']){
  await page.goto(base+'/?qa=dom-scenes-v12#/play/'+id+'?seed=v12');
  await page.locator('.dg-game').waitFor();await page.waitForFunction(()=>typeof window.advanceTime==='function');
  await advance(page,0);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' overflow '+width);
  await shot(page,id,width,'initial');
  if(id==='memory'){
   while((await state(page)).round<8){let s=await state(page);if(s.phase==='show')await advance(page,s.phaseMs+1);s=await state(page);for(const n of s.targets)await page.locator('.dg-game__memory-cell').nth(n).click();await advance(page,660);}
   assert.equal((await state(page)).gridSize,7);await shot(page,id,width,'49-lit');let s=await state(page);await advance(page,s.phaseMs+1);
   await page.locator('.dg-game__memory-cell').nth(s.targets[0]).click();await page.locator('.dg-game__memory-cell').nth(Array.from({length:49},(_,i)=>i).find(i=>!s.targets.includes(i))).click();
   assert.equal((await state(page)).errors,1);await shot(page,id,width,'chosen-wrong');
  }
  if(id==='color'){
   for(let n=0;n<30;n++)await page.locator('.dg-game__color-cell').nth((await state(page)).targetIndex).click();
   const s=await state(page);assert.equal(s.gridSize,7);assert.equal(s.colorDelta,4);
   const colors=await page.locator('.dg-game__color-cell').evaluateAll(nodes=>nodes.map(n=>{const c=getComputedStyle(n);return {color:c.backgroundColor,image:c.backgroundImage,filter:c.filter,opacity:c.opacity}}));
   assert.equal(new Set(colors.map(c=>c.color)).size,2);assert.ok(colors.every(c=>c.image==='none'&&c.filter==='none'&&c.opacity==='1'));
   await shot(page,id,width,'49-min-delta');
  }
  if(id==='timing'){await page.locator('.dg-game__primary').click();await advance(page,2130);assert.equal((await state(page)).displayedTime,'2.13');await shot(page,id,width,'running');}
  if(id==='typing'){const s=await state(page);await page.locator('.typing-rpg__input').fill(s.target);await page.locator('.typing-rpg__input').press('Enter');assert.ok((await state(page)).correctTyped>0);await shot(page,id,width,'attack');}
  if(id==='sequence'){await page.locator('[data-ui=start]').click();await advance(page,2700);assert.equal((await state(page)).phase,'listen');await shot(page,id,width,'listen');}
  if(id==='numbers'){await page.locator('.dg-game__number-cell').getByText('1',{exact:true}).count();await page.locator('.dg-game__number-cell').filter({hasText:/^1$/}).click();assert.equal((await state(page)).next,2);}
  report.interactions.push({id,width,passed:true});
 }
 await page.close();
}
assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
console.log('v12 DOM scenes passed: '+report.views.length+' active/start screenshots, '+report.interactions.length+' scenarios');
