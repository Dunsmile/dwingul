import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {seedLaunchTransfers} from '../server/launch-transfer.js';

const hash=value=>createHash('sha256').update(value).digest('hex');

async function listen(app){await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${app.server.address().port}`;}

function client(base,initialCookie=''){
 let cookie=initialCookie;
 return{get cookie(){return cookie;},async request(route,method='GET',body){
  const response=await fetch(`${base}/api/${route}`,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json',Origin:base})},body:body===undefined?undefined:JSON.stringify(body)});
  const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
  return{status:response.status,setCookie,...await response.json()};
 }};
}

test('real local API advertises, links, claims, persists, and rejects reuse of a launch transfer',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'dwingul-launch-api-')),dbPath=path.join(directory,'isolated.sqlite');
 const oldSecret='a'.repeat(48),legacyId='legacy-guest-01';let app;
 try{
  const setup=new DatabaseSync(dbPath);
  setup.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE,nickname TEXT DEFAULT '뒹굴러',pin_hash TEXT,salt TEXT,recovery_hash TEXT)");
  setup.prepare('INSERT INTO users(id,token_hash,nickname) VALUES(?,?,?)').run(legacyId,hash(oldSecret),'출시 전 손님');
  const localTickets=seedLaunchTransfers(setup,{now:Date.now(),randomBytes:size=>Buffer.alloc(size,7)});setup.close();

  app=createApp({dbPath,localTickets});
  app.db.prepare("INSERT INTO rpg_profiles(user_id,gold,best_cleared,equipped) VALUES(?,?,?,?)").run(legacyId,375,12,JSON.stringify({attack:'attack-common'}));
  app.db.prepare('INSERT INTO rpg_inventory(user_id,item_id,quantity,enhancement) VALUES(?,?,?,?)').run(legacyId,'attack-common',4,2);
  let base=await listen(app);
  const local=client(base,`dw_session=${oldSecret}`),availability=await local.request('launch-transfer');
  assert.deepEqual({status:availability.status,available:availability.available},{status:200,available:true});
  const link=await local.request('launch-transfer','POST',{}),ticket=localTickets[legacyId];
  assert.equal(link.status,200);assert.equal(link.url,`https://dwingul.com/#/transfer/${ticket}`);assert.equal(link.setCookie,null);

  const online=client(base),claimed=await online.request('launch-transfer/claim','POST',{ticket});
  assert.equal(claimed.status,200);assert.deepEqual(claimed.user,{id:legacyId,nickname:'출시 전 손님',configured:false});
  assert.match(claimed.setCookie,/^dw_session=[a-f0-9]{48}; HttpOnly; SameSite=Strict; Path=\/; Max-Age=31536000/);
  const profile=await online.request('profile'),rpg=await online.request('rpg');
  assert.equal(profile.user.id,legacyId);assert.equal(profile.user.nickname,'출시 전 손님');
  assert.equal(rpg.gold,375);assert.equal(rpg.bestCleared,12);assert.deepEqual(rpg.inventory,[{itemId:'attack-common',quantity:4,enhancement:2}]);

  const retry=await client(base).request('launch-transfer/claim','POST',{ticket});
  assert.equal(retry.status,409);assert.match(retry.error,/이미 사용/);
  const claimedCookie=online.cookie;
  await app.close();app=null;

  app=createApp({dbPath,localTickets});base=await listen(app);
  const restored=client(base,claimedCookie),persistedProfile=await restored.request('profile'),persistedRpg=await restored.request('rpg');
  assert.equal(persistedProfile.user.id,legacyId);assert.equal(persistedRpg.gold,375);assert.deepEqual(persistedRpg.inventory,[{itemId:'attack-common',quantity:4,enhancement:2}]);
 }finally{if(app)await app.close();rmSync(directory,{recursive:true,force:true});}
});
