import test from 'node:test';
import assert from 'node:assert/strict';
import {getQuestions,questionMode,questionVersion} from '../public/js/quizzes.js';
import {typingPhrases} from '../public/js/typing-phrases.js';
import {createApp} from '../server.mjs';
import {JUMP_FLOOR,jumpCollides,jumpPlayerBox,stepJumpPlayer,tryJump} from '../public/js/jump-game.js';

test('100 original typing phrases are distinct and fit a short brick',()=>{
  assert.equal(typingPhrases.length,100);assert.equal(new Set(typingPhrases).size,100);
  for(const text of typingPhrases){assert.equal(text,text.trim());assert.ok(text.length<=13);}
});
test('quiz draws have no repeats, vary with seed and reproduce for friends',()=>{
  for(const [id,topic,count]of [['guess','drama',10],['guess','anime',10],['guess','game',10],['iq','mixed',20]]){
    const seen=new Set();
    for(let seed=0;seed<100;seed++){
      const questions=getQuestions(id,topic,seed);assert.equal(questions.length,count);
      assert.equal(new Set(questions.map(q=>q.id)).size,count);
      assert.deepEqual(questions,getQuestions(id,topic,seed));
      questions.forEach(q=>seen.add(q.id));
      if(id==='iq')for(const category of ['수열','행렬','공간','논리'])assert.equal(questions.filter(q=>q.category===category).length,5);
    }
    assert.equal(seen.size,100);
    const a=getQuestions(id,topic,12),b=getQuestions(id,topic,13),ids=new Set(a.map(q=>q.id));
    assert.ok(b.filter(q=>!ids.has(q.id)).length>=Math.floor(count/2));
  }
});
test('runner geometry distinguishes jump, standing and crouched cloud contact',()=>{
  const p={y:JUMP_FLOOR,vy:0,jumps:0,duck:false};
  const cloud={x:112,y:278,w:98,h:67},ground={x:112,y:333,w:70,h:57};
  assert.equal(jumpCollides(p,cloud),true);p.duck=true;assert.equal(jumpCollides(p,cloud),false);assert.equal(jumpCollides(p,ground),true);
  assert.ok(tryJump(p));stepJumpPlayer(p,.2);assert.equal(jumpCollides(p,ground),false);
  assert.ok(tryJump(p));assert.equal(tryJump(p),false);
  for(let i=0;i<100;i++)stepJumpPlayer(p,.016);
  assert.equal(p.y,JUMP_FLOOR);assert.equal(p.jumps,0);
  assert.ok(tryJump(p));assert.equal(jumpPlayerBox(p).w,48);
});
test('quiz versions keep server grading and friend challenges consistent',async()=>{
  const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;let cookie='';
  async function api(path,body){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};}
  try{
    await api('profile',{nickname:'문항검증',pin:'Test-1234!'});
    for(const [content,topic]of [['iq','mixed'],['guess','drama']]){
      for(const version of ['v1',questionVersion(content)]){
        const attempt=await api('runs',{content,topic,seed:42,questionVersion:version});
        assert.equal(attempt.questionVersion,version);
        const qs=getQuestions(content,topic,42,version);
        const record=await api('records',{run:attempt.id,scopes:['world'],country:'대한민국',result:{value:0,details:{answers:qs.map(q=>q.answer)}}});
        assert.equal(record.status,200);
        const stored=app.db.prepare('SELECT value,mode FROM records WHERE id=?').get(record.id);
        assert.equal(stored.value,qs.length);assert.equal(stored.mode,questionMode(content,topic,version));
      }
      const ranking=await api('rankings?scope=world&content='+content);assert.equal(ranking.mode,questionMode(content,topic));assert.equal(ranking.modes.length,2);
      const group=await api('groups',{name:'같은문제',content,topic});const {group:g}=await api('groups/'+group.id);assert.equal(g.question_version,questionVersion(content));
      const old=await api('runs',{content,topic,seed:g.seed,questionVersion:'v1'});
      assert.equal((await api('records',{run:old.id,scopes:['friends'],groupId:g.id,result:{value:0,details:{answers:getQuestions(content,topic,g.seed,'v1').map(q=>q.answer)}}})).status,400);
      const fresh=await api('runs',{content,topic,seed:g.seed,questionVersion:g.question_version});
      assert.equal((await api('records',{run:fresh.id,scopes:['friends'],groupId:g.id,result:{value:0,details:{answers:getQuestions(content,topic,g.seed).map(q=>q.answer)}}})).status,200);
      const share=await api('shares',{content,seed:42,kind:'challenge',payload:{category:topic,questionVersion:questionVersion(content)}});
      assert.equal((await api('shares/'+share.id)).payload.questionVersion,questionVersion(content));
    }
    assert.equal((await api('runs',{content:'iq',questionVersion:'unknown'})).status,400);
  }finally{await app.close();}
});
