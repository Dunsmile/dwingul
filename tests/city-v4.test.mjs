import test from 'node:test';
import assert from 'node:assert/strict';
import { cityPatterns,patternBag } from '../public/js/city-patterns.js';
import { createCityEngine,citySpeed,cityCollision,vehicleLength,CITY } from '../public/js/legacy/city-engine-v4.js';
import { cityCars,gameSettings,gameMode } from '../public/js/game-options.js';
import { seededRandom } from '../public/js/game-random.js';
import { createCityEngine as createCurrentCity } from '../public/js/city-engine.js';
import { createApp } from '../server.mjs';
test('100 distinct traffic patterns keep at least two open lanes and use cars/buses',()=>{
 assert.equal(cityPatterns.length,100);assert.equal(new Set(cityPatterns.map(p=>JSON.stringify(p.vehicles))).size,100);
 for(const p of cityPatterns){assert.ok([2,3].includes(p.vehicles.length));assert.ok(p.safeLanes.length>=2);for(const lane of p.safeLanes)assert.ok(!p.vehicles.some(v=>v.lane===lane));assert.ok(Math.max(...p.vehicles.map(v=>v.offset+vehicleLength(v)))<=20);}
 const bag=patternBag(seededRandom('patterns'));assert.equal(new Set(Array.from({length:100},()=>bag().id)).size,100);
 assert.equal(vehicleLength({type:'bus'}),2*vehicleLength({type:'car'}));
});
test('vehicle multipliers, 1.5x acceleration, one fuel/sec, +15 pickup capped',()=>{
 assert.equal(CITY.acceleration,1.08);for(const car of cityCars){assert.equal(citySpeed(car,0),18*car.speed);assert.equal(citySpeed(car,10,true),(18+10*1.08)*car.speed*2);const e=createCityEngine({car:car.id});e.state.nextAt=1e9;e.tick(1000);assert.ok(Math.abs(e.state.fuel-(car.fuel-1))<1e-7);e.state.fuel=10;e.state.pickups=[{lane:2,z:.2,type:'fuel'}];e.tick(4);assert.ok(Math.abs(e.state.fuel-24.996)<1e-7);e.state.pickups=[{lane:2,z:.2,type:'fuel'}];e.tick(4);assert.ok(Math.abs(e.state.fuel-Math.min(car.fuel,39.992))<1e-7);}
});
test('boost requires ten, lasts five seconds, near misses extend it once per vehicle',()=>{
 const e=createCityEngine();e.state.nextAt=1e9;assert.equal(e.boost(),false);e.state.boost=10;assert.equal(e.boost(),true);e.tick(1000);assert.ok(Math.abs(e.state.boost-8)<1e-7);
 e.state.vehicles=[{id:1,type:'car',lane:1,z:3,nearest:Infinity}];e.tick(400);assert.equal(e.state.nearMisses,1);assert.ok(Math.abs(e.state.boost-8.2)<1e-6);e.tick(100);assert.equal(e.state.nearMisses,1);e.tick(4000);assert.equal(e.state.boosting,false);
 const f=createCityEngine();f.state.nextAt=1e9;f.state.boost=10;f.boost();f.tick(4996);assert.equal(f.state.boosting,true);f.tick(4);assert.equal(f.state.boosting,false);
});
test('collision and near miss use world position, fully passed vehicles cannot hit sideways',()=>{
 assert.equal(cityCollision(2,{lane:2,z:0,type:'car'}),true);assert.equal(cityCollision(3,{lane:2,z:0,type:'car'}),false);
 assert.equal(cityCollision(2,{lane:2,z:-4,type:'car'}),false);assert.equal(cityCollision(2,{lane:2,z:-4,type:'bus'}),true);
 const e=createCityEngine();e.state.nextAt=1e9;e.state.vehicles=[{id:1,type:'car',lane:2,z:2,nearest:Infinity}];e.tick(4);assert.equal(e.state.reason,'collision');assert.equal(e.state.nearMisses,0);
 const f=createCityEngine();f.state.nextAt=1e9;f.state.vehicles=[{type:'car',lane:2,z:-5,nearest:Infinity}];f.tick(20);assert.equal(f.state.ended,false);
});
test('input replay is deterministic across frame sizes and distance integrates speed',()=>{
 const a=createCityEngine({random:seededRandom('racing:4')}),b=createCityEngine({random:seededRandom('racing:4')});
 for(let i=0;i<60;i++)a.tick(1000/60);b.tick(1000);assert.equal(a.state.distance,b.state.distance);assert.ok(a.state.distance>18.5&&a.state.distance<18.6);
 a.move(-1);b.move(-1);for(let i=0;i<180;i++)a.tick(1000/60);b.tick(3000);assert.deepEqual(a.state,b.state);
});
test('garage validates replay, settles once independently of rankings, unlocks atomically, fixes challenge options',async()=>{
 const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const req=async(p,data)=>{const r=await fetch(base+'/api/'+p,{method:data?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return{status:r.status,...await r.json()};};
 try{
  const session=await req('session');assert.equal((await req('garage')).tokens,0);
  assert.equal((await req('runs',{content:'racing',gameSettings:{car:'sport'}})).status,403);
  const fake=await req('runs',{content:'racing',seed:4,gameSettings:{car:'basic'}});assert.equal((await req('garage/settle',{run:fake.id,coins:4,elapsedMs:0,distance:0,inputs:[]})).status,400);
  const attempt=await req('runs',{content:'racing',seed:4,gameSettings:{car:'basic'}}),e=createCurrentCity({random:seededRandom('racing:4')});e.tick(30000);
  assert.equal(e.state.ended,true);const result={run:attempt.id,coins:e.state.coins,distance:Math.floor(e.state.distance),elapsedMs:Math.round(e.state.seconds*1000),inputs:e.state.inputs,reason:e.state.reason};
  const paid=await req('garage/settle',result);assert.equal(paid.status,200);assert.equal((await req('garage/settle',result)).alreadyPaid,true);
  await req('profile',{nickname:'운전자',pin:'Test-1234!'});assert.equal((await req('records',{run:attempt.id,scopes:['world'],country:'대한민국',result:{value:999999,mode:'city-sport-v4',display:'999999',unit:'m'}})).status,200);
  const ranks=await req('rankings?content=racing');assert.equal(ranks.mode,'city-basic-v16');assert.equal(ranks.rows[0].display,String(result.distance));
  app.db.prepare('UPDATE racing_wallet SET tokens=100 WHERE user_id=?').run(session.user.id);
  assert.equal((await req('garage/unlock',{car:'sport'})).tokens,50);assert.equal((await req('garage/unlock',{car:'sport'})).tokens,50);assert.equal((await req('garage/unlock',{car:'touring'})).tokens,0);
  assert.deepEqual((await req('garage')).unlocked,['basic','sport','touring']);assert.equal((await req('garage/unlock',{car:'coming-soon'})).status,400);
  const group=await req('groups',{name:'무한 도전',content:'sort',gameSettings:{mode:'endless'},period:'all'});
  const grouped=await req('runs',{content:'sort',groupId:group.id,seed:3,gameSettings:{mode:'sprint'}});assert.equal(grouped.gameSettings.mode,'endless');assert.equal(grouped.gameSettings.version,'v5');assert.equal((await req('records',{run:grouped.id,scopes:['friends'],groupId:group.id,result:{value:240,display:'240',mode:'sort-sprint-v4',unit:'명'}})).status,200);assert.equal((await req('groups/'+group.id)).ranking.mode,'sort-endless-v5');
  const share=await req('shares',{content:'typing',kind:'challenge',seed:19,payload:{gameSettings:{mode:'rpg'}}});
  const shared=await req('runs',{content:'typing',shareId:share.id,seed:7,gameSettings:{mode:'rain'}});assert.equal(shared.seed,19);assert.equal(shared.gameSettings.mode,'rpg');
  const boundary=createCityEngine();boundary.move(-1);boundary.move(-1);for(let i=0;i<2000;i++)boundary.move(-1);assert.equal(boundary.state.inputs.length,2);
  assert.equal(gameMode('sort',gameSettings('sort',{mode:'invalid'})),'sort-sprint-v5');
 }finally{await app.close();}
});
