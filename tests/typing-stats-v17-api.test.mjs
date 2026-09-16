import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {seededRandom} from '../public/js/game-random.js';
import {createTypingRpgModel} from '../public/js/typing-rpg.js';
import {createTypingInput} from '../public/js/typing-input.js';

test('short/long confirmed attempts replay on the server and stats survive profile recovery without drafts', async () => {
  const app = createApp({dbPath:':memory:'});
  await new Promise(resolve => app.server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const client = () => {
    let cookie = '';
    return async (path, body) => {
      const response = await fetch(`${base}/api/${path}`, {method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
      cookie = response.headers.get('set-cookie')?.split(';')[0] || cookie;
      return {status:response.status,...await response.json()};
    };
  };
  try {
    const api=client(),profile=await api('profile',{nickname:'타수 확인',pin:'Test-1357!'}),expected=[];
    for(const sentenceMode of ['short','long']) {
      const run=await api('runs',{content:'typing',seed:1703,gameSettings:{sentenceMode}});
      const model=createTypingRpgModel({random:seededRandom(`typing:${run.seed}`),...run.gameSettings}),input=createTypingInput(model);
      input.edit('ㅂ',{composing:true}); input.submit();
      const target=model.getState().target; input.edit('잘못'); input.edit(target); model.tick(2000); input.submit();
      assert.equal(model.getState().typingStats.accuracy,100);
      input.edit('틀린 문장'); input.submit(); model.tick(2000000);
      const outcome=model.getResult();
      const settled=await api('rpg/progress',{run:run.id,...outcome.details,final:true,typingStats:{cpm:99999,accuracy:100}});
      assert.equal(settled.status,200,JSON.stringify(settled));
      assert.deepEqual(settled.typingStats,outcome.details.typingStats);
      assert.equal(settled.score,outcome.value);
      const result={...outcome,content:'typing',id:`v17-${sentenceMode}`,at:Date.now(),title:'타이핑 마스터',gameSettings:run.gameSettings};
      result.details.typingStats.rawInput='private text must not persist';
      assert.equal((await api('history',{items:[result]})).status,200);
      expected.push({id:result.id,stats:settled.typingStats});
      const retry=await api('rpg/progress',{run:run.id,...outcome.details,final:true});
      assert.equal(retry.status,200); assert.equal(retry.earned,0);
    }
    const badRun=await api('runs',{content:'typing',gameSettings:{sentenceMode:'short'}});
    const badModel=createTypingRpgModel({random:seededRandom(`typing:${badRun.seed}`),...badRun.gameSettings});
    for(let i=0;i<10;i++){badModel.captureDraft('가'.repeat(100));badModel.captureDraft('');}
    badModel.tick(2000000);
    const rejected=await api('rpg/progress',{run:badRun.id,...badModel.getResult().details,final:true});
    assert.equal(rejected.status,400);
    const legacyRun=await api('runs',{content:'typing'});
    const legacyModel=createTypingRpgModel({random:seededRandom(`typing:${legacyRun.seed}`),...legacyRun.gameSettings});
    for(let i=0;i<1000;i++){legacyModel.commitInput(legacyModel.getState().target[0]);legacyModel.clearInput();}
    legacyModel.tick(100000);
    const legacyRejected=await api('rpg/progress',{run:legacyRun.id,...legacyModel.getProgress().details,final:false});
    assert.equal(legacyRejected.status,400);
    assert.match(legacyRejected.error,/너무 빠른 입력/);
    const recovered=client(); assert.equal((await recovered('recover',{recovery:profile.recovery,pin:'Test-1357!'})).status,200);
    const saved=await recovered('profile');
    for(const {id,stats} of expected){
      const item=saved.history.find(item=>item.id===id);
      assert.deepEqual(item.details.typingStats,stats);
      assert.equal(item.details.actions,undefined);
      assert.equal(item.details.typingStats.rawInput,undefined);
    }
  } finally { await app.close(); }
});
