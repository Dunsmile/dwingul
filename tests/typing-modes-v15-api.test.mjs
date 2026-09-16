import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {seededRandom} from '../public/js/game-random.js';
import {createTypingRpgModel} from '../public/js/typing-rpg.js';

async function fixture(){
  const app=createApp({dbPath:':memory:'});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const client=()=>{
    let cookie='';
    return async(path,body,method=body===undefined?'GET':'POST')=>{
      const response=await fetch(`${base}/api/${path}`,{
        method,
        headers:{Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/json'})},
        body:body===undefined?undefined:JSON.stringify(body),
      });
      cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
      return{status:response.status,...await response.json()};
    };
  };
  return{app,client};
}

function replayFixture(attempt,{checkpoint=false}={}){
  const model=createTypingRpgModel({
    random:seededRandom(`typing:${attempt.seed}`),
    startStage:attempt.gameSettings.startStage,
    gear:attempt.gameSettings.gear,
    sentenceMode:attempt.gameSettings.sentenceMode,
  });
  const before=model.getState().defeated;
  while(model.getState().defeated===before){
    model.commitInput(model.getState().target);
    model.submit();
  }
  model.tick(2000);
  const saved=checkpoint?structuredClone(model.getProgress()):null;
  model.tick(2000000);
  assert.equal(model.getState().finished,true);
  return{saved,final:model.getProgress()};
}

const progressBody=(run,progress,extra={})=>({
  run,
  actions:progress.details.actions,
  elapsedMs:progress.details.elapsedMs,
  ...extra,
});

test('a recovered profile retains long-mode history and bests without input logs or equipment snapshots',async()=>{
 const {app,client}=await fixture();
 try{
  const user=client(),created=await user('profile',{nickname:'긴 문장 보관',pin:'Test-2468-password!'});
  const result={id:'long-history-v15',content:'typing',at:Date.now(),title:'타이핑 마스터',mode:'typing-rpg-v5-long-s11',value:30,display:'30',unit:'점',gameSettings:{version:'v5',mode:'rpg',sentenceMode:'long',startStage:11,gear:{attack:999},attackMultiplier:999},details:{stage:13,actions:[[0,'input','개인 입력 기록']]}};
  assert.equal((await user('history',{items:[result]})).status,200);
  const recovered=client();assert.equal((await recovered('recover',{recovery:created.recovery,pin:'Test-2468-password!'})).status,200);
  const profile=await recovered('profile'),saved=profile.history.find(x=>x.id===result.id);
  assert.equal(saved.gameSettings.sentenceMode,'long');assert.equal(saved.gameSettings.startStage,11);assert.equal(saved.mode,result.mode);
  assert.equal(saved.gameSettings.gear,undefined);assert.equal(saved.gameSettings.attackMultiplier,undefined);assert.equal(saved.details.actions,undefined);
  assert.equal(profile.bests.find(x=>x.mode===result.mode).gameSettings.sentenceMode,'long');
 }finally{await app.close();}
});

test('a long run checkpoints, replays, settles and registers its authoritative long score',async()=>{
  const {app,client}=await fixture();
  try{
    const user=client();
    await user('profile',{nickname:'긴 문장 검증',pin:'Test-2468-password!'});
    const profile=await user('rpg');
    app.db.prepare('UPDATE rpg_profiles SET best_cleared=10 WHERE user_id=(SELECT id FROM users WHERE nickname=?)').run('긴 문장 검증');

    const attempt=await user('runs',{content:'typing',seed:1515,gameSettings:{sentenceMode:'long',startStage:11,gear:{attack:999}}});
    assert.equal(attempt.status,200);
    assert.deepEqual(attempt.gameSettings,{version:'v5',mode:'rpg',sentenceMode:'long',startStage:11,gear:{attack:0,defense:0,heal:0},characterId:profile.selectedCharacter});

    const played=replayFixture(attempt,{checkpoint:true});
    const checkpoint=await user('rpg/progress',progressBody(attempt.id,played.saved,{final:false,sentenceMode:'short',score:999999}));
    assert.equal(checkpoint.status,200,JSON.stringify(checkpoint));
    assert.equal(checkpoint.finished,false);
    assert.equal(checkpoint.score,played.saved.value);
    assert.equal(checkpoint.bestCleared,11);
    assert.ok(checkpoint.earned>0);

    const settled=await user('rpg/progress',progressBody(attempt.id,played.final,{final:true,sentenceMode:'short',score:999999}));
    assert.equal(settled.status,200,JSON.stringify(settled));
    assert.equal(settled.finished,true);
    assert.equal(settled.score,played.final.value);
    assert.equal(settled.earned,played.final.details.gold-played.saved.details.gold);

    const record=await user('records',{run:attempt.id,scopes:['world'],country:'대한민국',result:{value:999999,display:'조작',unit:'개',mode:'typing-rpg-v5-s11'}});
    assert.equal(record.status,200,JSON.stringify(record));
    const row=app.db.prepare('SELECT value,display,unit,mode FROM records WHERE id=?').get(record.id);
    assert.deepEqual({...row},{value:played.final.value,display:String(played.final.value),unit:'점',mode:'typing-rpg-v5-long-s11'});
  }finally{await app.close();}
});

test('invalid and omitted sentence modes stay on the legacy short key while rankings remain separated',async()=>{
  const {app,client}=await fixture();
  try{
    const user=client();
    await user('profile',{nickname:'모드 분리 검증',pin:'Test-1357-password!'});
    const attempts=[];
    for(const gameSettings of [{sentenceMode:'invalid'},{}]){
      const attempt=await user('runs',{content:'typing',seed:1600+attempts.length,gameSettings});
      assert.equal(attempt.gameSettings.sentenceMode,'short');
      const played=replayFixture(attempt).final;
      const settled=await user('rpg/progress',progressBody(attempt.id,played,{final:true,sentenceMode:'long'}));
      assert.equal(settled.status,200,JSON.stringify(settled));
      const record=await user('records',{run:attempt.id,scopes:['world'],country:'대한민국',result:{value:0,mode:'typing-rpg-v5-long-s1'}});
      assert.equal(record.status,200,JSON.stringify(record));
      attempts.push({attempt,played,record});
    }
    const long=await user('runs',{content:'typing',seed:1610,gameSettings:{sentenceMode:'long'}});
    const longPlayed=replayFixture(long).final;
    assert.equal((await user('rpg/progress',progressBody(long.id,longPlayed,{final:true}))).status,200);
    assert.equal((await user('records',{run:long.id,scopes:['world'],country:'대한민국',result:{value:0}})).status,200);

    const shortRanks=await user('rankings?content=typing&scope=world&mode=typing-rpg-v5-s1');
    const longRanks=await user('rankings?content=typing&scope=world&mode=typing-rpg-v5-long-s1');
    const allRanks=await user('rankings?content=typing&scope=world');
    assert.equal(shortRanks.count,1);
    assert.equal(longRanks.count,1);
    assert.deepEqual(new Set(allRanks.modes),new Set(['typing-rpg-v5-s1','typing-rpg-v5-long-s1']));
  }finally{await app.close();}
});

test('long rooms and challenge shares preserve the mode with stage-one baseline gear',async()=>{
  const {app,client}=await fixture();
  try{
    const owner=client(),friend=client();
    await owner('profile',{nickname:'긴 문장 방장',pin:'Test-1234-password!'});
    await friend('profile',{nickname:'긴 문장 친구',pin:'Test-5678-password!'});
    const ownerProfile=await owner('rpg');
    app.db.prepare('UPDATE rpg_profiles SET best_cleared=10 WHERE user_id=(SELECT id FROM users WHERE nickname=?)').run('긴 문장 방장');

    const group=await owner('groups',{name:'긴 문장 모험방',content:'typing',period:'all',gameSettings:{sentenceMode:'long',startStage:11,gear:{attack:999}}});
    assert.equal(group.status,200,JSON.stringify(group));
    const detail=await owner(`groups/${group.id}`),groupSettings=JSON.parse(detail.group.game_settings);
    assert.deepEqual(groupSettings,{version:'v5',mode:'rpg',sentenceMode:'long',startStage:1,gear:{attack:0,defense:0,heal:0},characterId:ownerProfile.selectedCharacter});
    assert.equal((await friend('groups/join',{code:group.code})).status,200);
    const groupRun=await friend('runs',{content:'typing',groupId:group.id,gameSettings:{sentenceMode:'short',startStage:11,gear:{attack:999}}});
    assert.deepEqual(groupRun.gameSettings,groupSettings);

    const share=await owner('shares',{content:'typing',kind:'challenge',seed:1717,payload:{gameSettings:{sentenceMode:'long',startStage:11,gear:{attack:999}}}});
    assert.equal(share.status,200,JSON.stringify(share));
    const opened=await friend(`shares/${share.id}`);
    assert.deepEqual(opened.payload.gameSettings,groupSettings);
    const shareRun=await friend('runs',{content:'typing',shareId:share.id,seed:999,gameSettings:{sentenceMode:'short'}});
    assert.equal(shareRun.seed,1717);
    assert.deepEqual(shareRun.gameSettings,groupSettings);
  }finally{await app.close();}
});
