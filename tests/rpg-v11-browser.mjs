import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.DW_TEST_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Failed to load resource'))errors.push(message.text());});

await page.goto(base,{waitUntil:'domcontentloaded'});
await page.evaluate(async()=>{
  const {typingHub}=await import('/js/typing-hub.js');
  const {RPG_DEFAULT_CHARACTER_ID}=await import('/js/rpg-characters.js');
  const profile={checkpoints:[1],earnedCheckpoints:[1],recommendedStartStage:1,gold:450,bestCleared:4,configured:true,equipped:{},gear:{attack:0,defense:0,heal:0},owned:[],inventory:[],selectedCharacter:RPG_DEFAULT_CHARACTER_ID,ownedCharacters:[RPG_DEFAULT_CHARACTER_ID,'flower-healer']};
  document.body.innerHTML=typingHub(profile,new URLSearchParams('panel=characters'));
});
await page.waitForSelector('.rpg-character-card');
assert.equal(await page.locator('.rpg-character-card').count(),16);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'/tmp/v11-rpg-characters-390.png',fullPage:true});

await page.setViewportSize({width:320,height:700});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'/tmp/v11-rpg-characters-320.png',fullPage:true});

await page.setViewportSize({width:390,height:844});
await page.evaluate(async()=>{
  const host=document.createElement('div');host.className='dg-game';host.innerHTML='<div class="dg-game__stage"></div>';document.body.replaceChildren(host);
  const {createTypingRpg}=await import('/js/typing-rpg.js');
  window.__v11Game=createTypingRpg({stage:host.firstElementChild,settings:{startStage:25,gear:{attack:0,defense:0,heal:0},characterId:'owl-aviator'},random:()=>.25,listen:(target,type,listener,options)=>target.addEventListener(type,listener,options),setStatus:()=>{},finish:()=>{},isFinished:()=>false,checkpoint:()=>{}});
});
await page.waitForSelector('.typing-rpg--pixel .typing-rpg__monster-art');
await page.waitForFunction(()=>document.querySelector('.typing-rpg__monster-art')?.complete&&document.querySelector('.typing-rpg__monster-art')?.naturalWidth>0);
assert.equal(await page.getAttribute('.typing-rpg__hero-art','data-asset'),'/assets/pixel/scenes/duel-hero-15.png');
assert.equal(await page.getAttribute('.typing-rpg__monster-art','data-asset'),'/assets/pixel/scenes/duel-monster-25.png');
assert.equal(await page.locator('.typing-rpg__details').evaluate(node=>node.open),false);
assert.match(await page.locator('.typing-rpg__hud').innerText(),/스테이지[\s\S]*25/);
assert.match(await page.locator('.typing-rpg__hud').innerText(),/골드[\s\S]*0/);
assert.doesNotMatch(await page.locator('.typing-rpg__hud').innerText(),/콤보|속도|정확도|처치|문장/);
const before=await page.evaluate(()=>window.__v11Game.getState());
await page.locator('.typing-rpg__input').fill(before.target);
await page.locator('.typing-rpg__submit').click();
assert.equal((await page.evaluate(()=>window.__v11Game.getState())).completed,1);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'/tmp/v11-rpg-battle-390.png',fullPage:true});

const integrated=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
let integratedProfile={checkpoints:[1],earnedCheckpoints:[1],recommendedStartStage:1,gold:450,bestCleared:4,configured:true,equipped:{},gear:{attack:0,defense:0,heal:0},owned:[],inventory:[],selectedCharacter:'leaf-cloak-traveler',ownedCharacters:['leaf-cloak-traveler','flower-healer']};
const calls=[];
await integrated.route('**/api/rpg**',async route=>{
  const url=new URL(route.request().url()),body=route.request().postDataJSON?.()||{};
  if(url.pathname==='/api/rpg/character/purchase'){
    calls.push(['purchase',body.characterId]);
    integratedProfile={...integratedProfile,gold:300,ownedCharacters:[...integratedProfile.ownedCharacters,'owl-scholar'],purchase:{characterId:'owl-scholar',charged:150,alreadyOwned:false}};
  }else if(url.pathname==='/api/rpg/character/equip'){
    calls.push(['equip',body.characterId]);
    integratedProfile={...integratedProfile,selectedCharacter:body.characterId};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(integratedProfile)});
});
await integrated.goto(`${base}/#/detail/typing?panel=characters`,{waitUntil:'domcontentloaded'});
await integrated.waitForSelector('[data-act="rpg-character-buy"][data-character="owl-scholar"]');
await integrated.click('[data-act="rpg-character-buy"][data-character="owl-scholar"]');
await integrated.waitForSelector('[data-act="rpg-character-equip"][data-character="owl-scholar"]');
await integrated.click('[data-act="rpg-character-equip"][data-character="owl-scholar"]');
await integrated.waitForFunction(()=>document.querySelector('.rpg-character-card.is-selected strong')?.textContent.includes('부엉이 학자'));
assert.deepEqual(calls,[['purchase','owl-scholar'],['equip','owl-scholar']]);
await integrated.close();

assert.deepEqual(errors,[]);
await browser.close();
console.log('v11 RPG browser: 16-character collection, compact HUD, selected hero and species 25 passed');
