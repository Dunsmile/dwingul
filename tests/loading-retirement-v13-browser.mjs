import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createApp} from '../server.mjs';

const port=4178,base=`http://127.0.0.1:${port}`,output='output/loading-retirement-v13';
await mkdir(output,{recursive:true});
const app=createApp({dbPath:':memory:'});
await new Promise(resolve=>app.server.listen(port,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const report={birth:null,runCleanup:null,rapidRoute:null,archivedShare:null,errors:[]};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

try{
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(String(error)));
  const lunarRequested=deferred(),releaseLunar=deferred();let profileBirthWrites=0;
  await page.route('**/js/lunar.js',async route=>{const response=await route.fetch();lunarRequested.resolve();await releaseLunar.promise;await route.fulfill({response});});
  page.on('request',request=>{if(request.url().includes('/api/profile/birth')&&request.method()==='PUT')profileBirthWrites++;});
  await page.goto(`${base}/?qa=stale-birth#/play/daily`);
  const form=page.locator('#birth-form');await form.waitFor();
  await form.locator('[name=name]').fill('느린달력');await form.locator('[name=birthYear]').fill('2000');await form.locator('[name=birthMonth]').fill('5');await form.locator('[name=birthDay]').fill('15');await form.locator('[name=useConsent]').check();await form.locator('[name=remember]').check();
  await form.locator('button[type=submit]').click();await lunarRequested.promise;
  await page.evaluate(()=>{location.hash='#/';});await page.locator('.hero').waitFor();releaseLunar.resolve();await page.waitForTimeout(200);
  const stored=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('dw:birth')).map(key=>localStorage.getItem(key)));
  assert.deepEqual(stored,[]);assert.equal(profileBirthWrites,0);assert.equal(await page.locator('dialog[open]').count(),0);assert.match(page.url(),/#\/$/);
  report.birth={delayedCalendar:true,stayedHome:true,dialogs:0,storedBirthRows:0,profileBirthWrites};
  await page.screenshot({path:`${output}/stale-birth-stayed-home.png`});await context.close();
 }

 {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(String(error)));
  const accepted=deferred(),release=deferred();let createdRun;
  await page.route('**/api/runs',async route=>{if(route.request().method()!=='POST')return route.continue();const response=await route.fetch();createdRun=(await response.json()).id;accepted.resolve();await release.promise;await route.fulfill({response});});
  await page.goto(`${base}/?qa=orphan-cleanup#/play/sort`);await accepted.promise;
  assert.ok(app.db.prepare('SELECT id FROM runs WHERE id=?').get(createdRun));
  await page.evaluate(()=>{location.hash='#/';});await page.locator('.hero').waitFor();release.resolve();
  for(let i=0;i<50&&app.db.prepare('SELECT id FROM runs WHERE id=?').get(createdRun);i++)await page.waitForTimeout(20);
  assert.equal(app.db.prepare('SELECT id FROM runs WHERE id=?').get(createdRun),undefined);
  report.runCleanup={acceptedBeforeNavigation:true,cleanupDeletedOwnedRow:true,stayedHome:true};await context.close();
 }

 {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(String(error)));
  const accepted=deferred(),release=deferred();let delayed=true,staleRun;
  await page.route('**/api/runs',async route=>{if(route.request().method()!=='POST'||!delayed)return route.continue();delayed=false;const response=await route.fetch();staleRun=(await response.json()).id;accepted.resolve();await release.promise;await route.fulfill({response});});
  await page.goto(`${base}/?qa=rapid-route#/play/sort`);await accepted.promise;
  await page.evaluate(()=>{location.hash='#/play/jump?seed=19';});release.resolve();
  await page.locator('.dg-game').waitFor();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
  const state=JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
  assert.equal(state.rulesVersion,'v13');assert.match(await page.locator('.game-top').innerText(),/뒹굴 멀리 뛰기/);
  for(let i=0;i<50&&app.db.prepare('SELECT id FROM runs WHERE id=?').get(staleRun);i++)await page.waitForTimeout(20);
  assert.equal(app.db.prepare('SELECT id FROM runs WHERE id=?').get(staleRun),undefined);
  const currentRuns=app.db.prepare('SELECT content FROM runs').all().map(row=>row.content);assert.deepEqual(currentRuns,['jump']);
  report.rapidRoute={mounted:'jump',rulesVersion:state.rulesVersion,remainingRuns:currentRuns,staleRunDeleted:true};
  await page.screenshot({path:`${output}/rapid-route-jump.png`});await context.close();
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.goto(base);
  const share=await page.evaluate(async()=>{const response=await fetch('/api/shares',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:'sequence',kind:'result',seed:11,payload:{name:'옛기록',display:'23',unit:'패턴'}})});return response.json();});
  await page.goto(`${base}/?qa=archived-share#/s/${share.id}`);const panel=page.locator('main .panel');await panel.waitFor();
  assert.match(await panel.innerText(),/보관된 결과/);assert.match(await panel.innerText(),/23/);assert.equal(await panel.locator('a[href*="play/sequence"]').count(),0);
  report.archivedShare={visible:true,display:'23',replayLinks:0};await page.screenshot({path:`${output}/archived-result-share.png`});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);throw error;}finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await app.close();}
console.log('v13 loading/retirement browser regressions passed');
