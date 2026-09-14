import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {createCityEngine} from '../public/js/city-engine.js';
import {createCityEngine as createCityV6} from '../public/js/legacy/city-engine-v6.js';
import {cityCars} from '../public/js/game-options.js';
import {seededRandom} from '../public/js/game-random.js';

async function fixture(){
 const app=createApp({dbPath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const req=async(path,data,method=data?'POST':'GET')=>{const response=await fetch(`${base}/api/${path}`,{method,headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return{status:response.status,...await response.json()};};
 return{app,req,get cookie(){return cookie;},set cookie(value){cookie=value;}};
}
function finish(engine,limit=180000){for(let elapsed=0;elapsed<limit&&!engine.state.ended;elapsed+=1000)engine.tick(1000);assert.equal(engine.state.ended,true);return{coins:engine.state.coins,distance:Math.floor(engine.state.distance),elapsedMs:Math.round(engine.state.seconds*1000),inputs:engine.state.inputs,reason:engine.state.reason,hits:engine.state.hits};}

test('all seven purchases use their exact price atomically and remain idempotent',async()=>{
 const f=await fixture();try{
  const session=await f.req('session');await f.req('garage');f.app.db.prepare('UPDATE racing_wallet SET tokens=800 WHERE user_id=?').run(session.user.id);
  let expected=800;
  for(const car of cityCars.slice(1)){const wallet=await f.req('garage/unlock',{car:car.id});expected-=car.cost;assert.equal(wallet.status,200,car.id);assert.equal(wallet.tokens,expected,car.id);assert.ok(wallet.unlocked.includes(car.id));}
  assert.equal(expected,50);const again=await f.req('garage/unlock',{car:'roadster'});assert.equal(again.tokens,50);assert.equal(again.unlocked.filter(id=>id==='roadster').length,1);
  const unknown=await f.req('garage/unlock',{car:'not-a-car'});assert.equal(unknown.status,400);
  f.cookie='';const other=await f.req('session');await f.req('garage');f.app.db.prepare('UPDATE racing_wallet SET tokens=74 WHERE user_id=?').run(other.user.id);const short=await f.req('garage/unlock',{car:'compact'});assert.equal(short.status,400);assert.match(short.error,/75토큰/);
 }finally{await f.app.close();}
});

test('v7 settlement replays new car rules while an existing v6 run keeps its engine',async()=>{
 const f=await fixture();try{
  const session=await f.req('session');await f.req('garage');f.app.db.prepare('UPDATE racing_wallet SET tokens=1000, unlocked=? WHERE user_id=?').run(JSON.stringify(cityCars.map(car=>car.id)),session.user.id);
  const run=await f.req('runs',{content:'racing',seed:19,gameSettings:{car:'roadster'}});assert.equal(run.gameSettings.version,'v7');
  const current=createCityEngine({car:'roadster',random:seededRandom(`racing:${run.seed}`)}),result=finish(current);const paid=await f.req('garage/settle',{run:run.id,...result});
  assert.equal(paid.status,200);assert.equal(paid.earned,result.coins);assert.equal((await f.req('garage/settle',{run:run.id,...result})).alreadyPaid,true);

  const oldRun=await f.req('runs',{content:'racing',seed:4,gameSettings:{car:'basic'}});f.app.db.prepare('UPDATE runs SET game_settings=? WHERE id=?').run(JSON.stringify({version:'v6',car:'basic'}),oldRun.id);
  const legacy=createCityV6({car:'basic',random:seededRandom(`racing:${oldRun.seed}`)}),legacyResult=finish(legacy);const oldPaid=await f.req('garage/settle',{run:oldRun.id,...legacyResult});
  assert.equal(oldPaid.status,200);assert.equal(oldPaid.earned,legacyResult.coins);
 }finally{await f.app.close();}
});
