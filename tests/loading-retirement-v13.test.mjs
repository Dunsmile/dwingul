import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';

async function fixture(){
 const app=createApp({dbPath:':memory:'});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${app.server.address().port}/api/`;
 const client=()=>{let cookie='';return async(path,method='GET',body)=>{const response=await fetch(base+path,{method,headers:{cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};};};
 return {app,client};
}

test('unstarted run cleanup is owner-only and preserves progressed or finished runs',async()=>{
 const {app,client}=await fixture();
 try{
  const owner=client(),other=client();
  const clean=await owner('runs','POST',{content:'sort'});
  assert.equal((await other(`runs/${clean.id}`,'DELETE')).status,200);
  assert.ok(app.db.prepare('SELECT id FROM runs WHERE id=?').get(clean.id),'another user cannot delete the run');
  await owner(`runs/${clean.id}`,'DELETE');
  assert.equal(app.db.prepare('SELECT id FROM runs WHERE id=?').get(clean.id),undefined);

  const progressed=await owner('runs','POST',{content:'typing'});
  app.db.prepare('INSERT INTO rpg_progress VALUES(?,?,?,?,?,?,?,?,?)').run(progressed.id,1,1,0,1,1,1,'hash',0);
  await owner(`runs/${progressed.id}`,'DELETE');
  assert.ok(app.db.prepare('SELECT id FROM runs WHERE id=?').get(progressed.id),'progressed run is preserved');

  const rewarded=await owner('runs','POST',{content:'racing'});
  const ownerId=app.db.prepare('SELECT user_id FROM runs WHERE id=?').get(rewarded.id).user_id;
  app.db.prepare('INSERT INTO run_rewards VALUES(?,?,?,?,?,?)').run(rewarded.id,ownerId,0,Date.now(),1,1);
  await owner(`runs/${rewarded.id}`,'DELETE');
  assert.ok(app.db.prepare('SELECT id FROM runs WHERE id=?').get(rewarded.id),'rewarded run is preserved');

  const finished=await owner('runs','POST',{content:'sort'});
  app.db.prepare('UPDATE runs SET finished=1 WHERE id=?').run(finished.id);
  await owner(`runs/${finished.id}`,'DELETE');
  assert.ok(app.db.prepare('SELECT id FROM runs WHERE id=?').get(finished.id),'finished run is preserved');
 }finally{await app.close();}
});

test('retired rooms deny new membership while archived result shares remain readable',async()=>{
 const {app,client}=await fixture();
 try{
  const owner=client(),joiner=client();
  const ownerProfile=await owner('profile','POST',{nickname:'보관방장',pin:'1234'});
  await joiner('profile','POST',{nickname:'새참가자',pin:'5678'});
  app.db.prepare('INSERT INTO groups(id,owner,name,content,code,seed,period,created,topic,question_version,game_settings) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('old-room',ownerProfile.user.id,'옛 리듬방','sequence','OLD1',7,'all',Date.now(),'mixed','v1',JSON.stringify({version:'v11'}));
  app.db.prepare('INSERT INTO members VALUES(?,?,?,0)').run('old-room',ownerProfile.user.id,Date.now());
  assert.equal((await joiner('groups/preview','POST',{code:'OLD1'})).status,410);
  assert.equal((await joiner('groups/join','POST',{code:'OLD1'})).status,410);
  assert.equal(app.db.prepare('SELECT count(*) count FROM members WHERE group_id=?').get('old-room').count,1);

  const share=await owner('shares','POST',{content:'sequence',kind:'result',seed:7,payload:{name:'보관방장',display:'18',unit:'패턴'}});
  assert.equal(share.status,200);
  const archived=await joiner(`shares/${share.id}`);
  assert.equal(archived.status,200);
  assert.equal(archived.kind,'result');
  assert.equal(archived.payload.display,'18');
 }finally{await app.close();}
});
