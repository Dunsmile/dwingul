import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
test('restart keeps records and profile, legacy guess topic migrates, preview does not join',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'dwingul-check-')),dbPath=path.join(dir,'test.sqlite');let app,cookie='';
 const start=async()=>{app=createApp({dbPath});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));};
 const api=async(p,method='GET',body,identity=true)=>{const r=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/'+p,{method,headers:{Cookie:identity?cookie:'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(identity&&r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};
 try{await start();const u=await api('profile','POST',{nickname:'보관확인',pin:'1234'}),g=await api('groups','POST',{name:'드라마방',content:'guess',topic:'drama'}),r=await api('runs','POST',{content:'sort',seed:42});await api('records','POST',{run:r.id,scopes:['world'],country:'대한민국',result:{value:12,display:'12',unit:'명',mode:'standard'}});app.db.exec("UPDATE groups SET topic='mixed' WHERE content='guess'; ALTER TABLE groups DROP COLUMN question_version; ALTER TABLE runs DROP COLUMN question_version");await app.close();await start();assert.equal((await api('session')).user.id,u.user.id);assert.equal((await api('records')).records[0].display,'12');assert.equal((await api('groups/'+g.id)).group.topic,'drama');assert.equal((await api('groups/'+g.id)).group.question_version,'v1');assert.equal(app.db.prepare('SELECT question_version FROM runs WHERE id=?').get(r.id).question_version,'v1');const preview=await api('groups/preview','POST',{code:g.code},false);assert.equal(preview.name,'드라마방');assert.equal(preview.joined,false);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM members WHERE group_id=?').get(g.id).n,1);await app.close();app=null;
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});
