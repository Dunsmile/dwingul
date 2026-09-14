import {chromium} from 'playwright';
import {catalog} from '../public/js/catalog.js';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://localhost:4174',dir='output/play-polish-v11';await mkdir(dir,{recursive:true});
const browser=await chromium.launch(),errors=[],report={screens:[],errors};
try{
 for(const width of [320,390,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:width<500?844:1000}});
  page.on('pageerror',e=>errors.push(String(e)));
  for(const route of ['/',...catalog.map(c=>'/detail/'+c.id),'/explore']){
   await page.goto(base+'/?qa=v11#'+route);
   await page.locator('main h1').first().waitFor();
   if(route.startsWith('/detail/'))await page.locator('[data-act="start"]').waitFor();
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.complete?Promise.resolve():new Promise(resolve=>{i.addEventListener('load',resolve,{once:true});i.addEventListener('error',resolve,{once:true});})));});
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,badImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth&&i.offsetParent!==null&&!i.hidden).map(i=>i.src)}));
   assert.ok(layout.overflow<=1,route+' at '+width+' overflow '+layout.overflow);assert.deepEqual(layout.badImages,[],route+' bad images');
   report.screens.push({route,width,...layout});
   if([390,1440].includes(width)&&['/','/detail/racing','/detail/typing','/explore'].includes(route))await page.screenshot({path:dir+'/layout-'+width+'-'+(route.replaceAll('/','_')||'home')+'.png',fullPage:true});
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(String(e)));
 for(const id of ['guess','timing','chat']){
  await page.goto(base+'/?qa=recent#/play/'+id);
  await page.waitForFunction(()=>document.querySelector('.question,.dg-game,#profile-form,.form-guide'));
 }
 await page.goto(base+'/?qa=recent#/explore');await page.locator('.service-art').first().waitFor();
 report.recent=await page.locator('.service-art').evaluateAll(nodes=>nodes.slice(0,3).map(n=>n.dataset.art));assert.deepEqual(report.recent,['chat','timing','guess']);
 await page.goto(base+'/?qa=recent#/');await page.locator('.hero').waitFor();
 assert.match(await page.locator('footer').innerText(),/© 2026 DWINGUL/);
 assert.ok(await page.locator('a[href^="mailto:poilkjmnb122@gmail.com"]').count()>=2);
 report.heroFont=await page.locator('.hero-copy h1').evaluate(el=>getComputedStyle(el).fontFamily);assert.doesNotMatch(report.heroFont,/Galmuri/);
 await page.goto(base+'/?qa=garage#/detail/racing');await page.locator('[data-act="car-next"]').waitFor();
 report.garage=[];
 for(let i=0;i<8;i++){report.garage.push(await page.locator('[data-car-index]').getAttribute('data-car-index'));await page.locator('[data-act="car-next"]').click();}
 assert.deepEqual(report.garage,['0','1','2','3','4','5','6','7']);assert.equal(await page.locator('[data-car-index]').getAttribute('data-car-index'),'0');
 await page.goto(base+'/?qa=city#/play/racing');await page.locator('canvas').waitFor();await page.evaluate(()=>window.advanceTime(1500));await page.screenshot({path:dir+'/city-upright-mobile.png',fullPage:true});
 report.city=JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
 await page.goto(base+'/?qa=rpg#/play/typing?mode=rpg');await page.locator('.typing-rpg').waitFor();await page.screenshot({path:dir+'/typing-illustrated-mobile.png',fullPage:true});
 await page.goto(base+'/artbook/');await page.locator('#gallery figure').first().waitFor();report.artbookGroups=await page.locator('#filters button').allTextContents();
 for(const group of ['타로','장비','상자','몬스터']){const button=page.locator('#filters button').filter({hasText:group}).first();if(await button.count()){await button.click();await page.screenshot({path:dir+'/artbook-'+group+'.png',fullPage:true});}}
 assert.deepEqual(errors,[]);report.passed=true;
}finally{await browser.close();await writeFile(dir+'/responsive-art-report.json',JSON.stringify(report,null,2));}
console.log('V11 responsive + recent + gallery flow passed: '+report.screens.length+' layouts');

