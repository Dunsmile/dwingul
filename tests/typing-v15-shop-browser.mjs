import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {writeFile} from 'node:fs/promises';
const app=createApp({dbPath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.server.address().port}`,report=[];
const api=(p,path)=>p.evaluate(path=>fetch('/api/'+path).then(r=>r.json()),path);
try{for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();try{const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await p.goto(base+'/#/detail/typing?panel=shop&sentenceMode=long');await p.locator('[data-rpg-panel=shop]').waitFor();const {user}=await api(p,'session');
 app.db.prepare('UPDATE rpg_profiles SET gold=1000 WHERE user_id=?').run(user.id);
 app.db.prepare('INSERT INTO rpg_inventory(user_id,item_id,quantity,enhancement)VALUES(?,?,?,?)').run(user.id,'attack-common',3,0);
 await p.reload();await p.locator('[data-rpg-panel=shop]').waitFor();const sceneHeight=await p.locator('.rpg-menu-scene').evaluate(e=>e.clientHeight);
 await p.locator('[data-act=rpg-draw][data-count="10"]').click();
 for(let i=0;i<10;i++){
  await p.locator('.draw-reveal').click();await p.locator('.rpg-draw-dialog.is-revealed').waitFor();
  if(i===0){await p.locator('[data-draw-equip]').click();await p.getByRole('button',{name:'✓ 장착 완료',exact:true}).waitFor();await p.screenshot({path:`output/v15/${name}-draw.png`,fullPage:true});}
  if(i<9)await p.locator('[data-draw-next]').click();else await p.locator('[data-draw-home]').click();
 }
 await p.locator('[data-rpg-panel=menu]').waitFor();assert.ok(p.url().includes('sentenceMode=long'));
 const drawn=await api(p,'rpg');assert.equal(drawn.gold,500);assert.equal(drawn.inventory.reduce((n,x)=>n+x.quantity,0),13);
 await p.getByRole('link',{name:'내 장비',exact:true}).click();await p.locator('[data-rpg-panel=gear]').waitFor();
 await p.getByRole('link',{name:'공격',exact:true}).click();await p.waitForURL(/effect=attack/);await p.locator('.rpg-gear-filters nav a.active').filter({hasText:'공격'}).waitFor();await p.locator('[data-rpg-rarity-filter]').selectOption('common');await p.waitForURL(/rarity=common/);await p.locator('[data-rpg-rarity-filter]').filter({has:p.locator('option[value=common][selected]')}).waitFor();
 await p.locator('[data-act=rpg-enhance][data-item=attack-common]').click();await p.waitForFunction(()=>document.querySelector('[data-act=rpg-delete][data-item=attack-common]')?.dataset.enhancement==='1').catch(async e=>{console.log('enhance debug',await api(p,'rpg'),await p.locator('#toast').innerText(),p.url());await p.screenshot({path:'output/v15/enhance-debug.png',fullPage:true});throw e;});
 const enhanced=await api(p,'rpg');assert.equal(enhanced.inventory.find(x=>x.itemId==='attack-common').enhancement,1);
 await p.locator('[data-act=rpg-delete][data-item=attack-common]').click();await p.locator('#dialog[open]').waitFor();assert.match(await p.locator('#dialog').innerText(),/되돌릴 수 없어요/);
 await p.locator('#confirm-form button[type=submit]').click();await p.locator('#dialog').waitFor({state:'hidden'});
 assert.equal((await api(p,'rpg')).inventory.some(x=>x.itemId==='attack-common'),false);
 assert.equal(await p.locator('.rpg-menu-scene').evaluate(e=>e.clientHeight),sceneHeight);assert.ok(p.url().includes('sentenceMode=long'));
 await p.locator('.rpg-codex summary').click();assert.equal(await p.locator('.rpg-menu-scene').evaluate(e=>e.clientHeight),sceneHeight);await p.screenshot({path:`output/v15/${name}-gear-verified.png`,fullPage:true});
 report.push({engine:name,tenDraws:true,gold:drawn.gold,enhanceDelete:true,modePreserved:true});
 }finally{await browser.close();}
}}finally{await app.close();await writeFile('output/v15/shop-browser.json',JSON.stringify(report,null,2));}
console.log('Chromium/WebKit: ten draws, equip, enhancement, explicit deletion, codex and mode retention passed');
