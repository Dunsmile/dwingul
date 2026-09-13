import test from 'node:test';import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {normalizeBirth,birthFields,birthFromForm,fillBirthForm,nicknameOnly} from '../public/js/profile-fields.js';
import {makeResult,testQuestions} from '../public/js/profiles.js';
import {businessResult} from '../public/js/business-test.js';
import {getQuestions,questionMode} from '../public/js/quizzes.js';
import {guessBank,hangulInitials} from '../public/js/guess-bank.js';
import {guessBank as legacyBank} from '../public/js/guess-bank-v3.js';

test('birth text formats, leap dates, partial times and nickname-only tests',()=>{
 for(const birthday of ['20000515','2000-05-15','2000.05.15','2000/05/15'])assert.equal(normalizeBirth({name:'이름',birthday,time:'00:00'}).birthday,'2000-05-15');
 for(const birthday of ['20001301','20010229','20000231','20-05-15','2000-5-15','abcd0501'])assert.throws(()=>normalizeBirth({name:'이름',birthday}));
 for(const time of ['24:00','12:60','NaN:NaN','12:','9:30'])assert.throws(()=>normalizeBirth({name:'이름',birthday:'20000101',time}));
 const fd=new FormData();fd.set('name','밤');fd.set('birthday','20000101');fd.set('birthHour','00');fd.set('birthMinute','00');assert.equal(birthFromForm(fd).time,'00:00');fd.delete('birthMinute');assert.throws(()=>birthFromForm(fd));fd.set('timeUnknown','on');assert.equal(birthFromForm(fd).time,'');
 const separated=new FormData();separated.set('name','낮');separated.set('birthYear','2000');separated.set('birthMonth','5');separated.set('birthDay','15');separated.set('birthHour','23');separated.set('birthMinute','59');assert.deepEqual(birthFromForm(separated),{name:'낮',birthday:'2000-05-15',calendar:'solar',time:'23:59'});
 const fields=birthFields({birthday:'2000-05-15',time:'14:37'});for(const name of ['birthYear','birthMonth','birthDay','birthHour','birthMinute','timeUnknown'])assert.match(fields,new RegExp(`name="${name}"`));assert.doesNotMatch(fields,/name="birthday"/);assert.match(fields,/<option value="37" selected>/);assert.match(fields,/<option value="59"/);
 const elements={name:{},birthYear:{},birthMonth:{},birthDay:{},birthHour:{},birthMinute:{},timeUnknown:{},calendar:{},birthday:{}};fillBirthForm({elements},{name:'기억',birthday:'2001-02-03',calendar:'lunar',time:'04:05'});assert.deepEqual([elements.birthYear.value,elements.birthMonth.value,elements.birthDay.value],['2001','02','03']);assert.equal(elements.birthday.value,'20010203');assert.equal(elements.birthMinute.value,'05');assert.equal(elements.timeUnknown.checked,false);
 for(const id of ['shop','energy','chat','taste'])assert.equal(nicknameOnly(id),true);assert.equal(nicknameOnly('daily'),false);
 const chat=makeResult('chat',{name:'친구'},Array(12).fill(0));assert.equal(chat.birth,null);assert.equal(chat.element,undefined);assert.ok(!JSON.stringify(chat).includes('생일'));
});

test('business result maps every rotated answer, handles ties and gives actionable original results',()=>{
 assert.equal(testQuestions.shop.length,12);for(const q of testQuestions.shop)assert.equal(q.length,5);
 for(let type=0;type<4;type++){const answers=Array.from({length:12},(_,i)=>(type-i%4+4)%4);const result=businessResult('나',answers);assert.equal(result.scores[type],12);assert.equal(result.business[type].percent,100);assert.equal(result.sections.length,6);assert.equal(result.birth,undefined);}
 const tie=businessResult('나',Array(12).fill(0));assert.equal(tie.title,'고르게 살피는 균형 사업가');assert.deepEqual(tie.scores,[3,3,3,3]);assert.throws(()=>businessResult('나',Array(11).fill(0)));assert.throws(()=>businessResult('나',Array(12).fill(4)));
});

test('same-initial distractors preserve exact shape while old seeded quiz remains available',()=>{
 for(const q of guessBank)for(const option of q.options){assert.equal(hangulInitials(option),q.initials);assert.deepEqual(option.split(' ').map(x=>x.length),q.canonicalAnswer.split(' ').map(x=>x.length));}
 const old=getQuestions('guess','drama',42,'pool-100-v3'),fresh=getQuestions('guess','drama',42);assert.deepEqual(old.map(q=>q.id),fresh.map(q=>q.id));assert.notDeepEqual(old[0].options,fresh[0].options);for(const q of old)assert.deepEqual([...q.options].sort(),[...legacyBank.find(x=>x.id===q.id).options].sort());assert.notEqual(questionMode('guess','drama','pool-100-v3'),questionMode('guess','drama'));
});

test('one profile preserves identity, private birth/history/bests, recovers without exposing or merging another user',async()=>{
 const app=createApp({dbPath:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 function client(){let cookie='';return async(path,method='GET',data)=>{const res=await fetch(base+'/api/'+path,{method,headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,...await res.json()};};}
 const a=client(),b=client(),recovered=client();
 try{
  const guest=await a('session'),uid=guest.user.id;await a('rpg');await a('garage');
  assert.equal((await a('profile/birth','PUT',{name:'나',birthday:'20000101'})).status,400);
  const created=await a('profile','POST',{nickname:'공통프로필',pin:'2468'});assert.equal(created.user.id,uid);assert.equal((await a('rpg')).configured,true);
  const birth={name:'나',birthday:'2000-01-01',calendar:'solar',time:'00:00'};assert.deepEqual((await a('profile/birth','PUT',birth)).birth,birth);
  assert.equal((await a('profile/birth','PUT',{...birth,calendar:'leap',birthday:'2023-03-01'})).status,400);
  const items=Array.from({length:100},(_,i)=>({id:'play-'+i,content:'jump',value:i===0?999:i,mode:'jump-v6',display:String(i===0?999:i),unit:'m',at:Date.now()-100000+i,details:{inputs:[1,2],actions:[3]},birthday:'19990101',pin:'0000',run:'secret'}));
  await a('history','POST',{items});await a('history','POST',{items:[{...items[1],id:'later',at:Date.now()}]});
  let saved=await a('profile');assert.equal(saved.history.length,100);assert.equal(saved.bests[0].value,999);assert.ok(!saved.history.some(r=>r.id==='play-0'));assert.ok(!JSON.stringify(saved.history).includes('secret'));assert.ok(!JSON.stringify(saved.history).includes('19990101'));
  const last=saved.history[0];await a('history','POST',{items:[{...last,value:100000}]});assert.equal((await a('profile')).bests[0].value,999,'same event cannot overwrite best');
  assert.deepEqual((await a('records')).records,[],'private history never auto-publishes');
  await b('profile','POST',{nickname:'다른사람',pin:'1357'});await b('profile/birth','PUT',{...birth,name:'타인',birthday:'20020503'});assert.deepEqual((await b('profile')).history,[]);
  assert.equal((await b('profile/birth','PUT',{...birth,user_id:uid})).status,200);assert.equal((await a('profile')).birth.birthday,birth.birthday);
  const restored=await recovered('recover','POST',{recovery:created.recovery,pin:'2468'});assert.equal(restored.user.id,uid);const restoredState=await recovered('profile');assert.deepEqual(restoredState.birth,birth);assert.equal(restoredState.history.length,100);assert.equal((await recovered('garage')).unlocked.length,1);assert.equal((await recovered('rpg')).configured,true);
  const old=await a('profile');assert.equal(old.user.configured,false);assert.equal(old.birth,null);assert.deepEqual(old.history,[]);
  const share=await recovered('shares','POST',{content:'character',payload:{title:'캐릭터',birthday:birth.birthday,time:birth.time}});assert.ok(!JSON.stringify(await recovered('shares/'+share.id)).includes(birth.birthday));
  await recovered('profile/birth','DELETE');assert.equal((await recovered('profile')).birth,null);assert.equal((await recovered('profile')).history.length,100);await recovered('history','DELETE');saved=await recovered('profile');assert.deepEqual(saved.history,[]);assert.deepEqual(saved.bests,[]);assert.equal((await recovered('rpg')).configured,true);
 }finally{await app.close();}
});
