import {atomic} from '../../lib/transaction.js';
import { cityCars, gameSettings } from './game-options.js';
import { createCityEngine as createCityV4 } from './legacy/city-engine-v4.js';
import { createCityEngine as createCityV5 } from './legacy/city-engine-v5.js';
import { createCityEngine as createCityV6 } from './legacy/city-engine-v6.js';
import { createCityEngine as createCityV7 } from './legacy/city-engine-v7.js';
import { createCityEngine } from './city-engine.js';
import { seededRandom } from './game-random.js';
export function createGarageStore(db, fail) {
  db.exec(`CREATE TABLE IF NOT EXISTS racing_wallet(user_id TEXT PRIMARY KEY REFERENCES users(id),tokens INTEGER NOT NULL DEFAULT 0,unlocked TEXT NOT NULL DEFAULT '["basic"]');
    CREATE TABLE IF NOT EXISTS run_rewards(run_id TEXT PRIMARY KEY REFERENCES runs(id),user_id TEXT REFERENCES users(id),coins INTEGER NOT NULL,created INTEGER NOT NULL,distance INTEGER,elapsed_ms INTEGER);`);
  for(const column of ['distance','elapsed_ms'])if(!db.prepare('PRAGMA table_info(run_rewards)').all().some(c=>c.name===column))db.exec(`ALTER TABLE run_rewards ADD COLUMN ${column} INTEGER`);
  const get = (sql,...args) => db.prepare(sql).get(...args);
  const run = (sql,...args) => db.prepare(sql).run(...args);
  function wallet(userId) {
    run('INSERT OR IGNORE INTO racing_wallet(user_id)VALUES(?)',userId);
    const row = get('SELECT * FROM racing_wallet WHERE user_id=?',userId);
    return { tokens: row.tokens, unlocked: JSON.parse(row.unlocked) };
  }
  function requireCar(userId, car) { const spec=cityCars.find(candidate=>candidate.id===car);if(!spec)fail('존재하지 않는 차량이에요.');if (!wallet(userId).unlocked.includes(car)) fail(`이 차량은 잠겨 있어요. 차고에서 ${spec.cost}토큰으로 먼저 열어주세요.`,403); }
  function unlock(userId, car) {
    const spec = cityCars.find(c=>c.id===car); if (!spec || !spec.cost) fail('열 수 있는 차량을 선택해주세요.');
    return atomic(db,()=>{
      const w = wallet(userId);
      if (!w.unlocked.includes(car)) {
        if (w.tokens < spec.cost) fail(`${spec.cost}토큰을 모으면 이 차량을 열 수 있어요.`);
        run('UPDATE racing_wallet SET tokens=tokens-?,unlocked=? WHERE user_id=?',spec.cost,JSON.stringify([...w.unlocked,car]),userId);
      }
      return wallet(userId);
    });
  }
  function settle(userId, data) {
    const attempt = get('SELECT * FROM runs WHERE id=? AND user_id=?',data.run,userId);
    if (!attempt || attempt.content!=='racing' || !attempt.game_settings) fail('정산할 주행을 찾을 수 없어요.');
    const previous = get('SELECT coins FROM run_rewards WHERE run_id=?',attempt.id);
    if (previous) return { earned: previous.coins, alreadyPaid: true, ...wallet(userId) };
    const rawSettings=JSON.parse(attempt.game_settings),version=rawSettings.version;
    if(!['v4','v5','v6','v7','v16'].includes(version))fail('이전 주행은 차고에서 새로 시작해주세요.');
    if(!['v7','v16'].includes(version)&&!['basic','sport','touring'].includes(rawSettings.car))fail('이 차량은 새 주행에서 다시 시작해주세요.');
    const settings = gameSettings('racing',rawSettings), spec = cityCars.find(c=>c.id===settings.car);if(!spec)fail('주행 차량을 확인해주세요.');
    requireCar(userId,spec.id);
    const coins=Number(data.coins), elapsed=Number(data.elapsedMs)/1000, distance=Number(data.distance);
    if (!Number.isInteger(coins)||coins<0||!Number.isFinite(elapsed)||elapsed<=0||elapsed>1800||!Number.isFinite(distance)||distance<0||!Array.isArray(data.inputs)||data.inputs.length>1800) fail('주행 결과를 확인해주세요.');
    const engineForVersion={v4:createCityV4,v5:createCityV5,v6:createCityV6,v7:createCityV7,v16:createCityEngine}[version];
    const replay=engineForVersion({car:spec.id,random:seededRandom(`racing:${attempt.seed}`)});
    let time=0;
    for(const input of data.inputs){
      if(!Array.isArray(input)||input.length!==2||!Number.isInteger(input[0])||input[0]<time||input[0]>Math.round(elapsed*1000)||![0,-1,1].includes(input[1]))fail('주행 조작 기록을 확인해주세요.');
      replay.tick(input[0]-time);time=input[0];if(replay.state.ended)fail('종료 후 조작은 기록할 수 없어요.');
      if(input[1]===0)replay.boost();else replay.move(input[1]);
    }
    replay.tick(Math.round(elapsed*1000)-time+4);
    const verified=replay.state;
    if(!verified.ended||verified.coins!==coins||Math.floor(verified.distance)!==distance||verified.reason!==data.reason)fail('실제 주행과 결과가 일치하지 않아요. 다시 플레이해주세요.');
    return atomic(db,()=>{ wallet(userId); run('INSERT INTO run_rewards(run_id,user_id,coins,created,distance,elapsed_ms) VALUES(?,?,?,?,?,?)',attempt.id,userId,verified.coins,Date.now(),Math.floor(verified.distance),Math.round(verified.seconds*1000));run('UPDATE racing_wallet SET tokens=tokens+? WHERE user_id=?',verified.coins,userId);const result={earned:verified.coins,alreadyPaid:false,...wallet(userId)};return result; });
  }
  return { wallet, requireCar, unlock, settle };
}
