import {createHash,randomInt} from 'node:crypto';
import {createTypingRpgModel} from './typing-rpg.js';
import {seededRandom} from './game-random.js';
import {rpgItems,chooseRpgItem,gearStats} from './rpg-items.js';
import {RPG_CHARACTERS,RPG_DEFAULT_CHARACTER_ID,rpgCharacter} from './rpg-characters.js';
import {atomic} from '../../lib/transaction.js';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function createRpgStore(db,fail){
 db.exec(`CREATE TABLE IF NOT EXISTS rpg_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),gold INTEGER NOT NULL DEFAULT 0,best_cleared INTEGER NOT NULL DEFAULT 0,equipped TEXT NOT NULL DEFAULT '{}',selected_character TEXT NOT NULL DEFAULT '${RPG_DEFAULT_CHARACTER_ID}');
 CREATE TABLE IF NOT EXISTS rpg_inventory(user_id TEXT REFERENCES users(id),item_id TEXT,PRIMARY KEY(user_id,item_id));
 CREATE TABLE IF NOT EXISTS rpg_characters(user_id TEXT REFERENCES users(id),character_id TEXT NOT NULL,purchased_at INTEGER NOT NULL,PRIMARY KEY(user_id,character_id));
 CREATE TABLE IF NOT EXISTS rpg_progress(run_id TEXT PRIMARY KEY REFERENCES runs(id),gold INTEGER NOT NULL,score INTEGER NOT NULL,best_cleared INTEGER NOT NULL,stage INTEGER NOT NULL,elapsed_ms INTEGER NOT NULL,action_count INTEGER NOT NULL,action_hash TEXT NOT NULL,finished INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS rpg_draws(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),item_id TEXT,duplicate INTEGER,created INTEGER);
 CREATE TABLE IF NOT EXISTS rpg_draw_batches(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),draw_count INTEGER NOT NULL,results TEXT NOT NULL,created INTEGER NOT NULL);`);
 const get=(sql,...a)=>db.prepare(sql).get(...a),all=(sql,...a)=>db.prepare(sql).all(...a),run=(sql,...a)=>db.prepare(sql).run(...a);
 const profileColumns=new Set(all('PRAGMA table_info(rpg_profiles)').map(column=>column.name));
 if(!profileColumns.has('selected_character'))db.exec(`ALTER TABLE rpg_profiles ADD COLUMN selected_character TEXT NOT NULL DEFAULT '${RPG_DEFAULT_CHARACTER_ID}'`);
 const inventoryColumns=new Set(all('PRAGMA table_info(rpg_inventory)').map(column=>column.name));
 if(!inventoryColumns.has('quantity'))db.exec('ALTER TABLE rpg_inventory ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity>=1)');
 if(!inventoryColumns.has('enhancement'))db.exec('ALTER TABLE rpg_inventory ADD COLUMN enhancement INTEGER NOT NULL DEFAULT 0 CHECK(enhancement BETWEEN 0 AND 10)');
 const catalog=new Map(rpgItems.map(item=>[item.id,item]));
 const characterCatalog=new Map(RPG_CHARACTERS.map(character=>[character.id,character]));
 const inventoryFor=userId=>all('SELECT item_id,quantity,enhancement FROM rpg_inventory WHERE user_id=? ORDER BY item_id',userId).map(row=>({itemId:row.item_id,quantity:Number(row.quantity),enhancement:Number(row.enhancement)}));
 function profile(user){run('INSERT OR IGNORE INTO rpg_profiles(user_id)VALUES(?)',user.id);const p=get('SELECT * FROM rpg_profiles WHERE user_id=?',user.id),equipped=JSON.parse(p.equipped),inventory=inventoryFor(user.id),earnedCheckpoints=[1];for(let stage=11;stage<=Math.floor(p.best_cleared/10)*10+1;stage+=10)earnedCheckpoints.push(stage);const checkpoints=user.pin_hash?earnedCheckpoints:[1],ownedSet=new Set([RPG_DEFAULT_CHARACTER_ID,...all('SELECT character_id FROM rpg_characters WHERE user_id=?',user.id).map(row=>row.character_id).filter(id=>characterCatalog.has(id))]),selectedCharacter=ownedSet.has(p.selected_character)?p.selected_character:RPG_DEFAULT_CHARACTER_ID,ownedCharacters=RPG_CHARACTERS.filter(character=>ownedSet.has(character.id)).map(character=>character.id);return{earnedCheckpoints,recommendedStartStage:checkpoints.at(-1),gold:p.gold,bestCleared:p.best_cleared,equipped,gear:gearStats(equipped,inventory),owned:inventory.map(row=>row.itemId),inventory,selectedCharacter,ownedCharacters,configured:!!user.pin_hash,checkpoints};}
 function settings(user,raw={},challenge=false){const p=profile(user),startStage=challenge?1:Number(raw.startStage)||1;if(!p.checkpoints.includes(startStage))fail('클리어한 보스의 다음 구간부터 시작할 수 있어요. 먼저 프로필을 연결해주세요.');return{version:'v5',mode:'rpg',sentenceMode:raw?.sentenceMode==='long'?'long':'short',startStage,gear:challenge?{attack:0,defense:0,heal:0}:p.gear,characterId:p.selectedCharacter};}
 const inflate=(rows,user)=>{const items=rows.map(row=>({item:catalog.get(row.itemId),duplicate:!!row.duplicate}));return{item:items[0]?.item,duplicate:items[0]?.duplicate??false,items,revealedCount:0,...profile(user)};};
 function priorDraw(user,key,count){
  const batch=get('SELECT * FROM rpg_draw_batches WHERE id=?',key);
  if(batch){if(batch.user_id!==user.id||batch.draw_count!==count)fail('다시 시도해주세요.');return inflate(JSON.parse(batch.results),user);}
  const old=get('SELECT * FROM rpg_draws WHERE id=?',key);
  if(old){if(old.user_id!==user.id||count!==1)fail('다시 시도해주세요.');return inflate([{itemId:old.item_id,duplicate:!!old.duplicate}],user);}
 }
 function draw(user,keyOrRequest,countArg=1){
  const request=typeof keyOrRequest==='object'&&keyOrRequest?keyOrRequest:null;
  const key=request?.key??keyOrRequest,count=Number(request?.count??countArg);
  if(typeof key!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(key)||![1,10].includes(count))fail('뽑기 요청을 다시 시도해주세요.');
  const existing=priorDraw(user,key,count);if(existing)return existing;
  return atomic(db,()=>{
   const raced=priorDraw(user,key,count);if(raced)return raced;
   const p=profile(user),cost=count*50;if(p.gold<cost)fail(`장비 ${count}회 뽑기에는 ${cost}골드가 필요해요.`);
   const rows=[];
   for(let index=0;index<count;index++){
    const item=chooseRpgItem(()=>randomInt(0,1000000)/1000000);
    const current=get('SELECT quantity FROM rpg_inventory WHERE user_id=? AND item_id=?',user.id,item.id),duplicate=!!current;
    run('INSERT INTO rpg_inventory(user_id,item_id,quantity,enhancement) VALUES(?,?,1,0) ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=quantity+1',user.id,item.id);
    rows.push({itemId:item.id,duplicate});
   }
   run('UPDATE rpg_profiles SET gold=gold-? WHERE user_id=?',cost,user.id);
   if(count===1)run('INSERT INTO rpg_draws(id,user_id,item_id,duplicate,created) VALUES(?,?,?,?,?)',key,user.id,rows[0].itemId,rows[0].duplicate?1:0,Date.now());
   else run('INSERT INTO rpg_draw_batches(id,user_id,draw_count,results,created) VALUES(?,?,?,?,?)',key,user.id,count,JSON.stringify(rows),Date.now());
   return inflate(rows,user);
  });
 }
 function equip(user,{slot,itemId}){if(!['attack','defense','heal'].includes(slot))fail('장비 종류를 확인해주세요.');const p=profile(user);if(itemId&&!rpgItems.some(i=>i.id===itemId&&i.slot===slot&&p.owned.includes(itemId)))fail('보유한 장비만 장착할 수 있어요.');p.equipped[slot]=itemId||null;run('UPDATE rpg_profiles SET equipped=? WHERE user_id=?',JSON.stringify(p.equipped),user.id);return profile(user);}
 function enhance(user,{itemId}={}){
  if(!catalog.has(itemId))fail('강화할 장비를 확인해주세요.');
  return atomic(db,()=>{
   const row=get('SELECT quantity,enhancement FROM rpg_inventory WHERE user_id=? AND item_id=?',user.id,itemId);
   if(!row)fail('보유한 장비만 강화할 수 있어요.');if(row.enhancement>=10)fail('이미 최대 강화 단계예요.');if(row.quantity<3)fail('강화하려면 같은 기본 장비 여분 2개가 필요해요.');
   run('UPDATE rpg_inventory SET quantity=quantity-2,enhancement=enhancement+1 WHERE user_id=? AND item_id=?',user.id,itemId);
   return profile(user);
  });
 }
 function discard(user,{itemId}={}){
  if(!catalog.has(itemId))fail('삭제할 장비를 확인해주세요.');
  return atomic(db,()=>{
   const row=get('SELECT 1 FROM rpg_inventory WHERE user_id=? AND item_id=?',user.id,itemId);if(!row)fail('보유한 장비만 삭제할 수 있어요.');
   const p=profile(user);for(const slot of Object.keys(p.equipped))if(p.equipped[slot]===itemId)p.equipped[slot]=null;
   run('UPDATE rpg_profiles SET equipped=? WHERE user_id=?',JSON.stringify(p.equipped),user.id);run('DELETE FROM rpg_inventory WHERE user_id=? AND item_id=?',user.id,itemId);
   return profile(user);
  });
 }
 function purchaseCharacter(user,{characterId}={}){
  if(!characterCatalog.has(characterId))fail('캐릭터를 확인해주세요.');
  const character=rpgCharacter(characterId);
  return atomic(db,()=>{
   const current=profile(user),alreadyOwned=character.id===RPG_DEFAULT_CHARACTER_ID||!!get('SELECT 1 FROM rpg_characters WHERE user_id=? AND character_id=?',user.id,character.id);
   if(alreadyOwned)return{...current,purchase:{characterId:character.id,charged:0,alreadyOwned:true}};
   if(current.gold<character.price)fail(`${character.name}을(를) 데려오려면 ${character.price}골드가 필요해요.`);
   run('INSERT INTO rpg_characters(user_id,character_id,purchased_at) VALUES(?,?,?)',user.id,character.id,Date.now());
   run('UPDATE rpg_profiles SET gold=gold-? WHERE user_id=?',character.price,user.id);
   return{...profile(user),purchase:{characterId:character.id,charged:character.price,alreadyOwned:false}};
  });
 }
 function equipCharacter(user,{characterId}={}){
  if(!characterCatalog.has(characterId))fail('캐릭터를 확인해주세요.');
  return atomic(db,()=>{
   profile(user);
   if(characterId!==RPG_DEFAULT_CHARACTER_ID&&!get('SELECT 1 FROM rpg_characters WHERE user_id=? AND character_id=?',user.id,characterId))fail('보유한 캐릭터만 선택할 수 있어요.');
   run('UPDATE rpg_profiles SET selected_character=? WHERE user_id=?',characterId,user.id);
   return profile(user);
  });
 }
 function progress(user,data){const attempt=get('SELECT * FROM runs WHERE id=? AND user_id=?',data.run,user.id);if(!attempt||attempt.content!=='typing')fail('진행 중인 모험을 찾을 수 없어요.');const config=JSON.parse(attempt.game_settings||'{}');if(config.version!=='v5')fail('타이핑 마스터를 새로 시작해주세요.');
  const previous=get('SELECT * FROM rpg_progress WHERE run_id=?',attempt.id);if(previous?.finished)return{...profile(user),earned:0,finished:true,score:previous.score,stage:previous.stage};
  const actions=data.actions,elapsed=Number(data.elapsedMs);if(!Array.isArray(actions)||actions.length>50000||!Number.isInteger(elapsed)||elapsed<0||elapsed>7200000)fail('모험 기록을 확인해주세요.');
  if(previous&&(actions.length<previous.action_count||elapsed<previous.elapsed_ms||digest(actions.slice(0,previous.action_count))!==previous.action_hash))fail('저장된 모험에 이어서 진행해주세요.');
  const model=createTypingRpgModel({random:seededRandom(`typing:${attempt.seed}`),startStage:config.startStage,gear:config.gear,sentenceMode:config.sentenceMode});let time=0;
  for(const a of actions){if(!Array.isArray(a)||!Number.isInteger(a[0])||a[0]<time||a[0]>elapsed||!['input','clear','submit'].includes(a[1]))fail('입력 기록을 확인해주세요.');model.tick(a[0]-time);time=a[0];if(model.getState().finished)fail('종료 후 입력은 기록할 수 없어요.');if(a[1]==='input'){if(typeof a[2]!=='string'||a[2].length>100)fail('입력 길이를 확인해주세요.');model.commitInput(a[2]);}else if(a[1]==='clear')model.clearInput();else model.submit();}
  model.tick(elapsed-time);const outcome=model.getProgress(),s=model.getState(),d=outcome.details;const final=data.final===true;
  // Broad human-input ceiling, independent of the submitted score or gold.
  if(elapsed<Math.max(d.completed*250,s.correctTyped*15))fail('너무 짧은 시간의 입력 기록이에요. 직접 문장을 입력해 다시 도전해주세요.');
  if(final&&!s.finished)fail('모험이 아직 끝나지 않았어요.');if(!final&&d.bestClearedStage<1)fail('몬스터를 클리어한 뒤 저장할 수 있어요.');
  const earned=d.gold-(previous?.gold||0);if(earned<0)fail('저장된 모험을 확인해주세요.');
  return atomic(db,()=>{profile(user);run('UPDATE rpg_profiles SET gold=gold+?,best_cleared=MAX(best_cleared,?) WHERE user_id=?',earned,d.bestClearedStage,user.id);run('INSERT INTO rpg_progress(run_id,gold,score,best_cleared,stage,elapsed_ms,action_count,action_hash,finished) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET gold=excluded.gold,score=excluded.score,best_cleared=excluded.best_cleared,stage=excluded.stage,elapsed_ms=excluded.elapsed_ms,action_count=excluded.action_count,action_hash=excluded.action_hash,finished=excluded.finished',attempt.id,d.gold,outcome.value,d.bestClearedStage,d.currentStage??d.stage,elapsed,actions.length,digest(actions),final?1:0);return{...profile(user),earned,finished:final,score:outcome.value,stage:d.currentStage??d.stage};});
 }
 return{profile,settings,draw,equip,enhance,discard,purchaseCharacter,equipCharacter,progress};
}
