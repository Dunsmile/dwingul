import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {gameSettings,gameMode} from '../public/js/game-options.js';
import {currentGameModes} from '../public/js/catalog.js';

test('new rhythm runs and friend rooms use v9, while v7 and nine-pad results remain separately ranked',async()=>{
 const app=createApp({dbPath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const req=async(path,data)=>{const r=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return{status:r.status,...await r.json()};};
 try{
  assert.equal(currentGameModes.sequence,'rhythm-endless-v9');assert.equal(gameMode('sequence',gameSettings('sequence')),'rhythm-endless-v9');assert.equal(gameMode('sequence',{version:'v7'}),'rhythm-relay-v7');assert.equal(gameMode('sequence',{}),'nine-pad');
  await req('profile',{nickname:'리듬 모험가',pin:'1234'});
  const room=await req('groups',{name:'우리의 박자',content:'sequence',period:'all'});assert.equal(room.status,200);
  const a=await req('runs',{content:'sequence',seed:73,groupId:room.id});assert.equal(a.gameSettings.version,'v9');
  const record=await req('records',{run:a.id,result:{value:1234,mode:'nine-pad',unit:'단계'},scopes:['world','friends'],country:'대한민국',groupId:room.id});assert.equal(record.status,200);
  const saved=(await req('records')).records[0];assert.equal(saved.mode,'rhythm-endless-v9');assert.equal(saved.unit,'점');
  const b=await req('runs',{content:'sequence',groupId:room.id});assert.equal(b.seed,a.seed);
  app.db.prepare('UPDATE groups SET game_settings=? WHERE id=?').run('{}',room.id);
  assert.equal((await req('runs',{content:'sequence',groupId:room.id})).status,400);
  const v7=await req('runs',{content:'sequence',seed:7});app.db.prepare('UPDATE runs SET game_settings=? WHERE id=?').run('{"version":"v7","mode":"rhythm"}',v7.id);
  assert.equal((await req('records',{run:v7.id,result:{value:70,mode:'nine-pad'},scopes:['world'],country:'대한민국'})).status,200);
  const old=await req('runs',{content:'sequence',seed:4});app.db.prepare('UPDATE runs SET game_settings=? WHERE id=?').run('{}',old.id);
  assert.equal((await req('records',{run:old.id,result:{value:4,mode:'nine-pad'},scopes:['world'],country:'대한민국'})).status,200);
  const records=(await req('records')).records;assert.ok(records.some(r=>r.mode==='rhythm-relay-v7'&&r.unit==='점'));assert.ok(records.some(r=>r.mode==='nine-pad'&&r.unit==='단계'));
  const ranks=await req('rankings?content=sequence&scope=world');assert.equal(ranks.mode,'rhythm-endless-v9');assert.equal(ranks.rows[0].unit,'점');assert.deepEqual(new Set(ranks.modes),new Set(['rhythm-endless-v9','rhythm-relay-v7','nine-pad']));
  assert.equal((await req('rankings?content=sequence&scope=world&mode=rhythm-relay-v7')).count,1);assert.equal((await req('rankings?content=sequence&scope=world&mode=nine-pad')).count,1);
  for(const version of ['v7','v6'])assert.equal((await req('runs',{content:'sequence',gameSettings:{version}})).status,400);
  const oldShare=await req('shares',{content:'sequence',kind:'challenge',seed:7,payload:{gameSettings:{version:'v9',mode:'rhythm'}}});assert.equal(oldShare.status,200);app.db.prepare('UPDATE shares SET payload=? WHERE id=?').run('{"gameSettings":{"version":"v7","mode":"rhythm"}}',oldShare.id);
  assert.equal((await req('runs',{content:'sequence',shareId:oldShare.id})).status,400);
 }finally{await app.close();}
});
