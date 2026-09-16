import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {catalog,currentGameModes} from '../public/js/catalog.js';
import {gameMode,gameModeNames,gameSettings} from '../public/js/game-options.js';
import {makeResult,compareResults} from '../public/js/profiles.js';

test('catalog and game options select three-lane rhythm v11 while retaining legacy names',()=>{
 assert.equal(catalog.some(item=>item.id==='sequence'),false);
 for(const id of ['chat','taste']){const item=catalog.find(entry=>entry.id===id);assert.equal(item.time,'12문항');assert.match(item.rules,/네 가지 축/);}
 assert.equal(currentGameModes.sequence,'rhythm-three-lane-v11');
 assert.equal(gameMode('sequence',gameSettings('sequence')),'rhythm-three-lane-v11');
 assert.equal(gameMode('sequence',{version:'v9',mode:'rhythm'}),'rhythm-endless-v9');
 assert.equal(gameMode('sequence',{version:'v7',mode:'rhythm'}),'rhythm-relay-v7');
 assert.equal(gameModeNames['rhythm-three-lane-v11'],'세 갈래 리듬 · 무한 모드');
 assert.equal(gameModeNames['rhythm-endless-v9'],'무한 리듬 · 100가지 패턴');
 assert.equal(gameModeNames['rhythm-relay-v7'],'리듬 릴레이 · 8라운드');
 assert.equal(gameModeNames['nine-pad'],'기억 순서 · 이전 규칙');
});

test('profile integration rejects cross-version taste comparison without rewriting legacy results',()=>{
 const current=makeResult('taste',{name:'새 취향'},Array(12).fill(0));
 const legacyA={content:'taste',name:'예전A',answers:Array(8).fill(0)};
 const legacyB={content:'taste',name:'예전B',answers:Array(8).fill(1)};
 assert.equal(compareResults(legacyA,legacyB).version,'legacy-v8');
 assert.throws(()=>compareResults(current,legacyA),/버전/);
});

test('private profile history keeps sanitized v9 axes and negative scores while legacy payload stays untagged',async()=>{
 const app=createApp({dbPath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const req=async(path,method='GET',data)=>{const response=await fetch(`${base}/api/${path}`,{method,headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return{status:response.status,...await response.json()};};
 try{
  await req('profile','POST',{nickname:'축보관함',pin:'Test-2468-password!'});
  const current={...makeResult('taste',{name:'새 취향'},Array(12).fill(1)),id:'axes-result',at:Date.now()};
  current.personality.axes.invented={label:'삽입',code:'X',normalized:99};
  const legacy={id:'legacy-result',content:'taste',name:'옛 취향',title:'옛 결과',subtitle:'8개 선택',answers:[0,1,0,1,0,1,0,1],scores:[4,4,4,4],display:'옛 결과',unit:'',at:Date.now()-1};
  assert.equal((await req('history','POST',{items:[current,legacy]})).status,200);
  const state=await req('profile');const savedCurrent=state.history.find(item=>item.id==='axes-result'),savedLegacy=state.history.find(item=>item.id==='legacy-result');
  assert.equal(savedCurrent.testVersion,'axes-v9');assert.equal(savedCurrent.sprite,current.sprite);assert.deepEqual(savedCurrent.scores,current.scores);assert.deepEqual(Object.keys(savedCurrent.personality.axes),Object.keys(current.personality.axes).filter(key=>key!=='invented'));assert.ok(Object.values(savedCurrent.personality.axes).every(axis=>axis.normalized>=-1&&axis.normalized<=1));
  assert.equal(Object.hasOwn(savedLegacy,'testVersion'),false);assert.deepEqual(savedLegacy.answers,legacy.answers);assert.deepEqual(savedLegacy.scores,legacy.scores);
 }finally{await app.close();}
});
