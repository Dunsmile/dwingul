import test from 'node:test';
import assert from 'node:assert/strict';
import { createSortModel } from '../public/js/sort-game.js';
import { createTypingRpgModel } from '../public/js/typing-rpg.js';
import { seededRandom } from '../public/js/game-random.js';
import { createApp } from '../server.mjs';

test('stationary queue responds immediately, 20 timely clears trigger 5s fever accepting either side',()=>{
 const m=createSortModel({random:()=>0});for(let n=0;n<20;n++){assert.equal(m.choose('left'),true);m.tick(100);}
 assert.equal(m.state.score,20);assert.equal(m.state.fevers,1);assert.equal(m.state.feverMs,4900);
 const id=m.state.queue[0].key;assert.equal(m.choose('right'),true);assert.equal(m.state.queue[0].key,id+1);assert.equal(m.choose('right'),true);
 m.tick(4900);assert.equal(m.state.feverMs,0);assert.equal(m.choose('right'),false);assert.equal(m.state.mistakes,1);
});
test('combo times out after 1.2s, three mistakes and time limit have different frozen endings',()=>{
 const m=createSortModel({random:()=>0});m.choose('left');m.tick(1200);m.choose('left');assert.equal(m.state.fever,10);m.tick(1201);assert.equal(m.state.fever,0);
 for(let n=0;n<3;n++){m.choose('right');if(n<2)m.tick(160);}
 assert.equal(m.state.phase,'ending');assert.equal(m.state.expression,'cry');const score=m.state.score;m.choose('left');assert.equal(m.state.score,score);m.tick(899);assert.equal(m.state.phase,'ending');m.tick(1);assert.equal(m.state.phase,'finished');
 const t=createSortModel();t.tick(19999);assert.equal(t.state.phase,'playing');t.tick(1);assert.equal(t.state.expression,'smile');assert.equal(t.state.phase,'ending');t.tick(900);assert.equal(t.state.phase,'finished');assert.equal(t.result().mode,'sort-sprint-v5');
 const e=createSortModel({mode:'endless'});e.tick(1200);e.tick(1200);e.tick(1200);assert.equal(e.state.phase,'ending');assert.equal(e.state.mistakes,3);
});
test('RPG checkpoints replay authoritatively, pay once, unlock skips and preserve equipped snapshots',async()=>{
 const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const req=async(p,data)=>{const r=await fetch(base+'/api/'+p,{method:data?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return{status:r.status,...await r.json()};};
 try{
  await req('session');assert.equal((await req('rpg')).gold,0);assert.equal((await req('rpg/draw',{key:'empty-wallet'})).status,400);
  assert.equal((await req('runs',{content:'typing',gameSettings:{startStage:11}})).status,400);
  const attempt=await req('runs',{content:'typing',seed:52,gameSettings:{mode:'rain',gear:{attack:999}}});assert.equal(attempt.gameSettings.mode,'rpg');assert.equal(attempt.gameSettings.gear.attack,0);
  const m=createTypingRpgModel({random:seededRandom('typing:52')});
  while(m.getState().stage<=10){m.tick(600);m.commitInput(m.getState().target);m.submit();}
  const instant=createTypingRpgModel({random:seededRandom('typing:52')});while(instant.getState().stage<=10){instant.commitInput(instant.getState().target);instant.submit();}assert.equal((await req('rpg/progress',{run:attempt.id,...instant.getProgress().details,final:false})).status,400);
  const progress=m.getProgress(),payload={run:attempt.id,...progress.details,final:false};
  assert.equal((await req('rpg/progress',{...payload,actions:[]})).status,400);
  const checkpoint=await req('rpg/progress',payload);assert.equal(checkpoint.status,200,JSON.stringify(checkpoint));assert.equal(checkpoint.gold,120);assert.equal(checkpoint.earned,120);assert.deepEqual(checkpoint.checkpoints,[1]);
  assert.equal((await req('rpg/progress',payload)).earned,0);
  const bad=structuredClone(payload);bad.actions[0][2]='변조';assert.equal((await req('rpg/progress',bad)).status,400);
  await req('profile',{nickname:'타자왕',pin:'1234'});assert.deepEqual((await req('rpg')).checkpoints,[1,11]);
  const draw=await req('rpg/draw',{key:'first-draw-key'});assert.equal(draw.status,200);assert.equal(draw.gold,70);assert.ok(draw.owned.includes(draw.item.id));assert.equal((await req('rpg/draw',{key:'first-draw-key'})).gold,70);
  assert.equal((await req('rpg/equip',{slot:draw.item.slot,itemId:'nonexistent'})).status,400);
  const equipped=await req('rpg/equip',{slot:draw.item.slot,itemId:draw.item.id});assert.ok(equipped.gear[draw.item.slot]>0);
  const skip=await req('runs',{content:'typing',gameSettings:{startStage:11}});assert.equal(skip.gameSettings.startStage,11);assert.deepEqual(skip.gameSettings.gear,equipped.gear);
  const s=createTypingRpgModel({random:seededRandom('typing:'+skip.seed),...skip.gameSettings});assert.equal(s.getState().score,10);
  await req('rpg/equip',{slot:draw.item.slot,itemId:null});assert.deepEqual(JSON.parse(app.db.prepare('SELECT game_settings FROM runs WHERE id=?').get(skip.id).game_settings).gear,equipped.gear);
  const group=await req('groups',{content:'typing',name:'타자 대결',period:'all',gameSettings:{startStage:11}});const challenge=await req('runs',{content:'typing',groupId:group.id});assert.equal(challenge.gameSettings.startStage,1);assert.deepEqual(challenge.gameSettings.gear,{attack:0,defense:0,heal:0});
  m.tick(1000000);const final={run:attempt.id,...m.getResult().details,final:true};assert.equal((await req('rpg/progress',final)).status,200);assert.equal((await req('rpg/progress',final)).earned,0);
  const record=await req('records',{run:attempt.id,scopes:['world'],country:'대한민국',result:{value:999999,display:'999999',unit:'점',mode:'typing-rpg-v5-s11'}});assert.equal(record.status,200);const ranks=await req('rankings?content=typing');assert.equal(ranks.mode,'typing-rpg-v5-s1');assert.equal(ranks.rows[0].display,'110');
 }finally{await app.close();}
});
