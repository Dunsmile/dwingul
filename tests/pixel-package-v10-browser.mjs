import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {rpgItems} from '../public/js/rpg-items.js';

const base=process.env.DW_TEST_URL||'http://127.0.0.1:4186';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('pageerror',error=>errors.push(String(error)));

await page.goto(`${base}/#/detail/typing?panel=play`,{waitUntil:'networkidle'});
await page.click('[data-act="start"]');
await page.waitForSelector('.typing-rpg--pixel .typing-rpg__monster-art');
await page.waitForFunction(()=>[...document.querySelectorAll('.typing-rpg--pixel img')].every(image=>image.complete&&image.naturalWidth>0));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'/tmp/v10-rpg-mobile.png',fullPage:true});

const compact=await browser.newPage({viewport:{width:320,height:700},deviceScaleFactor:1});
await compact.goto(`${base}/#/detail/typing?panel=play`,{waitUntil:'networkidle'});
await compact.click('[data-act="start"]');
await compact.waitForSelector('.typing-rpg--pixel .typing-rpg__monster-art');
assert.equal(await compact.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await compact.screenshot({path:'/tmp/v10-rpg-compact.png',fullPage:true});
await compact.close();

await page.evaluate(async()=>{
 const host=document.createElement('div');host.className='dg-game';host.innerHTML='<div id="v10-boss-stage"></div>';document.body.replaceChildren(host);
 const stage=host.firstElementChild;
 const {createTypingRpg}=await import('/js/typing-rpg.js');
 window.__v10Boss=createTypingRpg({stage,settings:{startStage:10,gear:{attack:0,defense:0,heal:0}},random:()=>.25,listen:(target,type,listener,options)=>target.addEventListener(type,listener,options),setStatus:()=>{},finish:()=>{},isFinished:()=>false,checkpoint:()=>{}});
});
await page.waitForSelector('.typing-rpg--pixel.is-boss');
await page.waitForFunction(()=>document.querySelector('.typing-rpg__monster-art')?.naturalWidth>0);
assert.match(await page.getAttribute('.typing-rpg__monster-art','src'),/boss-01\.svg$/);
await page.screenshot({path:'/tmp/v10-rpg-boss-mobile.png',fullPage:true});

await page.goto(`${base}/`,{waitUntil:'networkidle'});
await page.evaluate(async()=>{
 const {openRpgDraw}=await import('/js/rpg-draw-dialog.js');
 const item={id:'attack-divine-01',slot:'attack',name:'천상의 연필검',rarity:'divine',value:38,image:'/assets/pixel/items/attack-divine-01.svg'};
 window.__v10Draw=openRpgDraw({draw:async()=>({item,items:[{item,duplicate:false}],revealedCount:0}),equip:async()=>({}),onResult:()=>{}});
});
await page.waitForSelector('.draw-reveal');
await page.click('.draw-reveal');
await page.waitForSelector('.rarity-divine .draw-item-icon');
await page.waitForFunction(()=>[...document.querySelectorAll('.draw-reward-art img')].every(image=>image.complete&&image.naturalWidth>0));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'/tmp/v10-rpg-divine-draw-mobile.png',fullPage:true});

const familyIds=['attack-common','attack-common-11','attack-common-21','attack-common-31','attack-common-41','defense-common','defense-common-11','defense-common-21','defense-common-31','defense-common-41','heal-common','heal-common-11','heal-common-21','heal-common-31','heal-common-41'];
const rarityIds=['attack-common','attack-uncommon','attack-rare','attack-legend','attack-divine-01'];
const samples=[...familyIds,...rarityIds].map(id=>rpgItems.find(item=>item.id===id));
assert.ok(samples.every(Boolean));
await page.setViewportSize({width:900,height:900});
await page.setContent(`<style>body{margin:0;background:#fff8e8;color:#49382d;font:700 14px system-ui}main{padding:28px}h1{font-size:22px}.gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.card{display:grid;grid-template-columns:72px 1fr;align-items:center;min-height:86px;padding:8px;border:3px solid #49382d;background:#fffdf4;box-shadow:4px 4px #c9b991}.card img{width:64px;height:64px;image-rendering:pixelated}.card small{display:block;margin-top:4px;color:#765b43}</style><main><h1>RPG 장비 v10 · 15개 형태와 5개 등급</h1><div class="gallery">${samples.map(item=>`<div class="card"><img src="${base}${item.image}"><div>${item.name}<small>${item.slot} · ${item.rarity}</small></div></div>`).join('')}</div></main>`);
await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
await page.screenshot({path:'/tmp/v10-rpg-item-gallery.png',fullPage:true});

const chestNames=['sealed','common-closed','common-open','uncommon-closed','uncommon-open','rare-closed','rare-open','legend-closed','legend-open','divine-closed','divine-open'];
await page.setViewportSize({width:900,height:520});
await page.setContent(`<style>body{margin:0;background:#fff8e8;color:#49382d;font:700 14px system-ui}main{padding:28px}h1{font-size:22px}.gallery{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.card{text-align:center;padding:8px;border:3px solid #49382d;background:#fffdf4;box-shadow:4px 4px #c9b991}.card img{width:112px;height:94px;image-rendering:pixelated}.card small{display:block}</style><main><h1>등급 비공개 봉인 상자와 5등급 개봉 상태</h1><div class="gallery">${chestNames.map(name=>`<div class="card"><img src="${base}/assets/pixel/rpg/chest-${name}.svg"><small>${name}</small></div>`).join('')}</div></main>`);
await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
await page.screenshot({path:'/tmp/v10-rpg-chest-gallery.png',fullPage:true});

const monsterNames=Array.from({length:25},(_,index)=>`monster-${String(index+1).padStart(2,'0')}`);
const bossNames=[1,6,11,16,21].map(number=>`boss-${String(number).padStart(2,'0')}`);
await page.setViewportSize({width:760,height:900});
await page.setContent(`<style>body{margin:0;background:#fff8e8;color:#49382d;font:700 13px system-ui}main{padding:24px}h1{font-size:21px}.gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.card{text-align:center;padding:5px;border:2px solid #49382d;background:#fffdf4;box-shadow:3px 3px #c9b991}.card img{width:96px;height:96px;image-rendering:pixelated}.card small{display:block}</style><main><h1>5종 몬스터 × 5가지 재질과 보스 장식</h1><div class="gallery">${[...monsterNames,...bossNames].map(name=>`<div class="card"><img src="${base}/assets/pixel/rpg/${name}.svg"><small>${name}</small></div>`).join('')}</div></main>`);
await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
assert.equal(await page.evaluate(()=>new Set([...document.images].map(image=>`${image.naturalWidth}x${image.naturalHeight}`)).size),1);
await page.screenshot({path:'/tmp/v10-rpg-portrait-gallery.png',fullPage:true});

const rpgErrors=errors.filter(message=>!message.includes("/css/world.css"));
assert.deepEqual(rpgErrors,[]);
await browser.close();
console.log(`v10 RPG browser smoke: mobile battle, boss, divine chest, item, and portrait galleries passed${errors.length?` (${errors.length} unrelated world.css warning(s))`:''}`);
