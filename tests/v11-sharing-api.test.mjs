import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {createCityEngine as createCityV6} from '../public/js/legacy/city-engine-v6.js';
import {seededRandom} from '../public/js/game-random.js';

const currentGames=[
  ['jump',{version:'v19'}],
  ['racing',{version:'v16',car:'basic'}],
];
const legacyGames=[
  ['jump',{version:'v18'}],
  ['racing',{version:'v6',car:'basic'}],
];

test('new jump scores use v19 and an in-flight v18 run retains its own ranking mode',async()=>{
 const {app,client}=await fixture();
 try{
  const user=client();await user('profile',{nickname:'연계 기록',pin:'2468'});
  const unversioned=await user('runs',{content:'jump'});
  assert.equal((await user('records',{run:unversioned.id,scopes:['world'],country:'대한민국',result:{value:100,mode:'jump-distance-v19'}})).status,400);
  const current=await user('runs',{content:'jump',gameSettings:{}});assert.equal(current.gameSettings.version,'v19');
  const record=await user('records',{run:current.id,scopes:['world'],country:'대한민국',result:{value:234.5,mode:'jump-distance-v18'}});
  assert.equal(record.status,200);assert.equal(app.db.prepare('SELECT mode FROM records WHERE id=?').get(record.id).mode,'jump-distance-v19');
  const old=await user('runs',{content:'jump',gameSettings:{}});app.db.prepare('UPDATE runs SET game_settings=? WHERE id=?').run(JSON.stringify({version:'v18'}),old.id);
  const oldRecord=await user('records',{run:old.id,scopes:['world'],country:'대한민국',result:{value:6123,mode:'jump-distance-v19'}});assert.equal(oldRecord.status,200);
  assert.equal(app.db.prepare('SELECT mode FROM records WHERE id=?').get(oldRecord.id).mode,'jump-distance-v18');
 }finally{await app.close();}
});

async function fixture(){
  const app=createApp({dbPath:':memory:'});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const client=()=>{
    let cookie='';
    return async(path,body,method=body===undefined?'GET':'POST')=>{
      const response=await fetch(`${base}/api/${path}`,{method,headers:{Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
      cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
      return{status:response.status,...await response.json()};
    };
  };
  return{app,client};
}

test('latest sequence, jump and racing groups keep one seed and exact settings for every member',async()=>{
  const {app,client}=await fixture();
  try{
    const owner=client(),friend=client();
    await owner('profile',{nickname:'방장',pin:'2468'});
    await friend('profile',{nickname:'친구',pin:'1357'});
    for(const [content,settings] of currentGames){
      const created=await owner('groups',{name:`${content} v11 방`,content,period:'all',gameSettings:settings});
      assert.equal(created.status,200,content);
      const detail=await owner(`groups/${created.id}`);
      assert.deepEqual(JSON.parse(detail.group.game_settings),settings,content);
      assert.equal((await friend('groups/join',{code:created.code})).status,200,content);
      for(const participant of [owner,friend]){
        const run=await participant('runs',{content,seed:detail.group.seed+1,groupId:created.id,gameSettings:settings});
        assert.equal(run.status,200,content);
        assert.equal(run.seed,detail.group.seed,content);
        assert.deepEqual(run.gameSettings,settings,content);
      }
    }
  }finally{await app.close();}
});

test('latest game challenge shares preserve their seed and settings when opened',async()=>{
  const {app,client}=await fixture();
  try{
    const sender=client(),recipient=client();
    for(let index=0;index<currentGames.length;index++){
      const [content,settings]=currentGames[index],seed=710+index;
      const created=await sender('shares',{content,kind:'challenge',seed,payload:{name:'초대한 친구',gameSettings:settings}});
      assert.equal(created.status,200,content);
      const shared=await recipient(`shares/${created.id}`);
      assert.equal(shared.status,200,content);
      assert.equal(shared.seed,seed,content);
      assert.deepEqual(shared.payload.gameSettings,settings,content);
      const run=await recipient('runs',{content,seed:999,shareId:created.id,gameSettings:settings});
      assert.equal(run.status,200,content);
      assert.equal(run.seed,seed,content);
      assert.deepEqual(run.gameSettings,settings,content);
    }
  }finally{await app.close();}
});

test('new challenges reject explicit old rules and stored old invitations cannot start as current',async()=>{
  const {app,client}=await fixture();
  try{
    const user=client();
    await user('profile',{nickname:'버전 검증',pin:'1234'});
    for(let index=0;index<legacyGames.length;index++){
      const [content,oldSettings]=legacyGames[index],currentSettings=currentGames[index][1];
      const direct=await user('runs',{content,seed:800+index,gameSettings:oldSettings});
      assert.equal(direct.status,400,`${content} direct old run`);

      const oldGroup=await user('groups',{name:`${content} 이전 규칙`,content,period:'all',gameSettings:oldSettings});
      assert.equal(oldGroup.status,400,`${content} old group creation`);
      const oldShare=await user('shares',{content,kind:'challenge',seed:820+index,payload:{gameSettings:oldSettings}});
      assert.equal(oldShare.status,400,`${content} old share creation`);

      const group=await user('groups',{name:`${content} 저장 행 검증`,content,period:'all',gameSettings:currentSettings});
      assert.equal(group.status,200,content);
      app.db.prepare('UPDATE groups SET game_settings=? WHERE id=?').run(JSON.stringify(oldSettings),group.id);
      const groupRun=await user('runs',{content,groupId:group.id,gameSettings:currentSettings});
      assert.equal(groupRun.status,400,`${content} stored old group`);
      assert.match(groupRun.error,/게임 규칙/);

      const share=await user('shares',{content,kind:'challenge',seed:840+index,payload:{gameSettings:currentSettings}});
      assert.equal(share.status,200,content);
      const row=app.db.prepare('SELECT payload FROM shares WHERE id=?').get(share.id),payload=JSON.parse(row.payload);
      payload.gameSettings=oldSettings;
      app.db.prepare('UPDATE shares SET payload=? WHERE id=?').run(JSON.stringify(payload),share.id);
      const shareRun=await user('runs',{content,shareId:share.id,gameSettings:currentSettings});
      assert.equal(shareRun.status,400,`${content} stored old share`);
      assert.match(shareRun.error,/게임 규칙/);

      if(content!=='sequence'){
        const unversionedGroup=await user('groups',{name:`${content} 무버전 행`,content,period:'all',gameSettings:currentSettings});
        assert.equal(unversionedGroup.status,200,content);
        app.db.prepare('UPDATE groups SET game_settings=NULL WHERE id=?').run(unversionedGroup.id);
        assert.equal((await user('runs',{content,groupId:unversionedGroup.id,gameSettings:currentSettings})).status,400,`${content} unversioned group`);

        const unversionedShare=await user('shares',{content,kind:'challenge',seed:860+index,payload:{gameSettings:currentSettings}});
        assert.equal(unversionedShare.status,200,content);
        const stored=JSON.parse(app.db.prepare('SELECT payload FROM shares WHERE id=?').get(unversionedShare.id).payload);
        delete stored.gameSettings;
        app.db.prepare('UPDATE shares SET payload=? WHERE id=?').run(JSON.stringify(stored),unversionedShare.id);
        assert.equal((await user('runs',{content,shareId:unversionedShare.id,gameSettings:currentSettings})).status,400,`${content} unversioned share`);
      }
    }
  }finally{await app.close();}
});

test('a stored v6 city run settles only through its original deterministic engine',async()=>{
  const {app,client}=await fixture();
  try{
    const user=client(),attempt=await user('runs',{content:'racing',seed:44,gameSettings:{version:'v16',car:'basic'}});
    assert.equal(attempt.status,200);
    app.db.prepare('UPDATE runs SET game_settings=? WHERE id=?').run(JSON.stringify({version:'v6',car:'basic'}),attempt.id);
    const legacy=createCityV6({car:'basic',random:seededRandom(`racing:${attempt.seed}`)});
    legacy.tick(30000);
    const state=legacy.state;
    assert.equal(state.ended,true);
    const settled=await user('garage/settle',{run:attempt.id,coins:state.coins,distance:Math.floor(state.distance),elapsedMs:Math.round(state.seconds*1000),inputs:state.inputs,reason:state.reason});
    assert.equal(settled.status,200);
    assert.equal(settled.earned,state.coins);
    assert.equal((await user('garage/settle',{run:attempt.id,coins:state.coins,distance:Math.floor(state.distance),elapsedMs:Math.round(state.seconds*1000),inputs:state.inputs,reason:state.reason})).alreadyPaid,true);
  }finally{await app.close();}
});
