import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

async function serve(dbPath){
  const app=createApp({dbPath});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  return{...app,base:`http://127.0.0.1:${app.server.address().port}`};
}

test('character purchase and equip persist through an isolated server restart without changing gear',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'dwingul-rpg-v11-')),dbPath=path.join(directory,'qa.sqlite');
  let app=await serve(dbPath),cookie='';
  const request=async(endpoint,{method='GET',body}={})=>{
    const response=await fetch(`${app.base}/api/${endpoint}`,{method,headers:{cookie,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});
    cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
    return{status:response.status,...await response.json()};
  };
  try{
    const session=await request('session');
    app.db.prepare('INSERT OR IGNORE INTO rpg_profiles(user_id,gold) VALUES(?,?)').run(session.user.id,1000);
    const configured=await request('profile',{method:'POST',body:{nickname:'숲속 타자',pin:'Test-2468-password!'}});
    assert.ok(configured.recovery);
    const before=await request('rpg');
    const purchase=await request('rpg/character/purchase',{method:'POST',body:{characterId:'flower-healer'}});
    assert.equal(purchase.status,200,JSON.stringify(purchase));
    assert.equal(purchase.gold,700);
    assert.deepEqual(purchase.gear,before.gear);
    const retry=await request('rpg/character/purchase',{method:'POST',body:{characterId:'flower-healer'}});
    assert.equal(retry.gold,700);
    assert.equal(retry.purchase.alreadyOwned,true);
    const equipped=await request('rpg/character/equip',{method:'POST',body:{characterId:'flower-healer'}});
    assert.equal(equipped.selectedCharacter,'flower-healer');
    const run=await request('runs',{method:'POST',body:{content:'typing',gameSettings:{startStage:1}}});
    assert.equal(run.gameSettings.characterId,'flower-healer');
    assert.deepEqual(run.gameSettings.gear,before.gear);
    cookie='';
    const recovered=await request('recover',{method:'POST',body:{recovery:configured.recovery,pin:'Test-2468-password!'}});
    assert.equal(recovered.user.id,session.user.id);
    assert.equal((await request('rpg')).selectedCharacter,'flower-healer');
    await app.close();
    app=await serve(dbPath);
    const restored=await request('rpg');
    assert.equal(restored.gold,700);
    assert.equal(restored.selectedCharacter,'flower-healer');
    assert.ok(restored.ownedCharacters.includes('flower-healer'));
  }finally{
    await app.close().catch(()=>{});
    await rm(directory,{recursive:true,force:true});
  }
});
