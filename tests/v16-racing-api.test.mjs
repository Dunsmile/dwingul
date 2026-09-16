import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {createCityEngine} from '../public/js/city-engine.js';
import {createCityEngine as createCityV7} from '../public/js/legacy/city-engine-v7.js';
import {seededRandom} from '../public/js/game-random.js';

async function fixture(){
 const app=createApp({dbPath:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
 const api=async(path,data,method=data?'POST':'GET')=>{const response=await fetch(`${base}/api/${path}`,{method,headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return{status:response.status,...await response.json()};};
 return{app,api};
}

function play(engine,limit=180000){for(let elapsed=0;elapsed<limit&&!engine.state.ended;elapsed+=1000)engine.tick(1000);assert.equal(engine.state.ended,true);const s=engine.state;return{coins:s.coins,distance:Math.floor(s.distance),elapsedMs:Math.round(s.seconds*1000),inputs:s.inputs,reason:s.reason};}

test('v16 settlement and ranking stay separate from a stored v7 deterministic replay',async()=>{
 const {app,api}=await fixture();try{
  await api('profile',{nickname:'버전 주행자',pin:'Test-1234-password!'});

  const currentRun=await api('runs',{content:'racing',seed:160,gameSettings:{car:'basic'}});assert.equal(currentRun.status,200);assert.equal(currentRun.gameSettings.version,'v16');
  const currentResult=play(createCityEngine({car:'basic',random:seededRandom(`racing:${currentRun.seed}`)}));
  const currentPaid=await api('garage/settle',{run:currentRun.id,...currentResult});assert.equal(currentPaid.status,200);
  const currentRecord=await api('records',{run:currentRun.id,scopes:['world'],country:'대한민국',result:{value:999999,display:'forged',unit:'wrong',mode:'city-basic-v7',details:currentResult}});assert.equal(currentRecord.status,200);
  const currentRow=app.db.prepare('SELECT value,display,unit,mode FROM records WHERE id=?').get(currentRecord.id);assert.deepEqual({...currentRow},{value:currentResult.distance,display:String(currentResult.distance),unit:'m',mode:'city-basic-v16'});

  const storedRun=await api('runs',{content:'racing',seed:7,gameSettings:{car:'basic'}});assert.equal(storedRun.status,200);app.db.prepare('UPDATE runs SET game_settings=? WHERE id=?').run(JSON.stringify({version:'v7',car:'basic'}),storedRun.id);
  const legacyResult=play(createCityV7({car:'basic',random:seededRandom(`racing:${storedRun.seed}`)}));
  const legacyPaid=await api('garage/settle',{run:storedRun.id,...legacyResult});assert.equal(legacyPaid.status,200);assert.equal((await api('garage/settle',{run:storedRun.id,...legacyResult})).alreadyPaid,true);
  const legacyRecord=await api('records',{run:storedRun.id,scopes:['world'],country:'대한민국',result:{value:0,mode:'city-basic-v16',details:legacyResult}});assert.equal(legacyRecord.status,200);
  const legacyRow=app.db.prepare('SELECT value,display,unit,mode FROM records WHERE id=?').get(legacyRecord.id);assert.deepEqual({...legacyRow},{value:legacyResult.distance,display:String(legacyResult.distance),unit:'m',mode:'city-basic-v7'});

  const currentRanks=await api('rankings?content=racing&scope=world');assert.equal(currentRanks.mode,'city-basic-v16');assert.equal(currentRanks.count,1);assert.deepEqual(new Set(currentRanks.modes),new Set(['city-basic-v7','city-basic-v16']));
  assert.equal((await api('rankings?content=racing&scope=world&mode=city-basic-v7')).count,1);
  assert.equal((await api('rankings?content=racing&scope=world&mode=city-basic-v16')).count,1);
 }finally{await app.close();}
});
