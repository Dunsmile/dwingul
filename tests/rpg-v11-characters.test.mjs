import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {
  RPG_CHARACTERS,
  RPG_DEFAULT_CHARACTER_ID,
  RPG_MONSTER_NAMES_25,
  rpgCharacterArtPath,
  rpgMonsterArtPath,
} from '../public/js/rpg-characters.js';
import {createRpgStore} from '../public/js/rpg-store.js';

function setup({legacy=false}={}){
  const db=new DatabaseSync(':memory:');
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY,pin_hash TEXT); CREATE TABLE runs(id TEXT PRIMARY KEY,user_id TEXT,content TEXT,seed TEXT,game_settings TEXT); INSERT INTO users VALUES('u',NULL)");
  if(legacy)db.exec("CREATE TABLE rpg_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),gold INTEGER NOT NULL DEFAULT 0,best_cleared INTEGER NOT NULL DEFAULT 0,equipped TEXT NOT NULL DEFAULT '{}'); INSERT INTO rpg_profiles VALUES('u',1250,21,'{\"attack\":\"attack-common\"}')");
  const fail=message=>{throw new Error(message);};
  return{db,user:{id:'u',pin_hash:null},store:createRpgStore(db,fail)};
}

test('the collection is the exact 4 by 4 woodland cast with stable illustrated paths',()=>{
  assert.equal(RPG_CHARACTERS.length,16);
  assert.equal(new Set(RPG_CHARACTERS.map(character=>character.id)).size,16);
  assert.deepEqual(RPG_CHARACTERS.map(character=>character.index),Array.from({length:16},(_,index)=>index));
  assert.equal(RPG_CHARACTERS[0].id,RPG_DEFAULT_CHARACTER_ID);
  assert.equal(RPG_CHARACTERS[0].price,0);
  assert.ok(RPG_CHARACTERS.slice(1).every(character=>character.price>0));
  assert.deepEqual(RPG_CHARACTERS.map(character=>rpgCharacterArtPath(character.id)),Array.from({length:16},(_,index)=>`/assets/pixel/illustrated/personas/${index}.png`));
  assert.deepEqual(RPG_CHARACTERS.map(character=>character.price),[0,150,150,150,300,300,300,300,600,600,600,600,1000,1000,1000,1000]);
  assert.ok(RPG_CHARACTERS.every(character=>!('attack' in character)&&!('defense' in character)&&!('heal' in character)));
});

test('all 25 monster species have distinct names and repeat by stage',()=>{
  assert.equal(RPG_MONSTER_NAMES_25.length,25);
  assert.equal(new Set(RPG_MONSTER_NAMES_25).size,25);
  assert.deepEqual(RPG_MONSTER_NAMES_25,[
    '숲 슬라임','버섯 고블린','달빛 해파리','이끼 골렘','에메랄드 드래곤','도토리 미믹','꿀벌 기사','솔방울 고슴도치','호박 임프','뿔토끼','수정 달팽이','불꽃 도롱뇽','아홀로틀','태엽 딱정벌레','구름 숫양','등불 유령','산호 게','종이학 마법사','산딸기 박쥐','그루터기 부엉이','그림자 아기늑대','모래 전갈','해바라기 사자','얼음 펭귄','별빛 불사조',
  ]);
  assert.deepEqual(Array.from({length:25},(_,index)=>rpgMonsterArtPath(index+1)),Array.from({length:25},(_,index)=>`/assets/pixel/illustrated/monsters/${String(index+1).padStart(2,'0')}.png`));
  assert.equal(rpgMonsterArtPath(26),rpgMonsterArtPath(1));
});

test('legacy profiles gain the free default while keeping gold, stage and equipment',()=>{
  const{store,user}=setup({legacy:true});
  const profile=store.profile(user);
  assert.equal(profile.gold,1250);
  assert.equal(profile.bestCleared,21);
  assert.equal(profile.equipped.attack,'attack-common');
  assert.equal(profile.selectedCharacter,RPG_DEFAULT_CHARACTER_ID);
  assert.deepEqual(profile.ownedCharacters,[RPG_DEFAULT_CHARACTER_ID]);
});

test('purchase is atomic and retry-safe, and equip only accepts owned characters',()=>{
  const{db,store,user}=setup({legacy:true});
  const target=RPG_CHARACTERS[4];
  assert.throws(()=>store.equipCharacter(user,{characterId:target.id}),/보유한 캐릭터/);
  const purchased=store.purchaseCharacter(user,{characterId:target.id});
  assert.equal(purchased.gold,950);
  assert.equal(purchased.purchase.charged,300);
  assert.ok(purchased.ownedCharacters.includes(target.id));
  const retried=store.purchaseCharacter(user,{characterId:target.id});
  assert.equal(retried.gold,950);
  assert.equal(retried.purchase.charged,0);
  assert.equal(retried.purchase.alreadyOwned,true);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM rpg_characters WHERE user_id=? AND character_id=?').get(user.id,target.id).count,1);
  const equipped=store.equipCharacter(user,{characterId:target.id});
  assert.equal(equipped.selectedCharacter,target.id);
  assert.deepEqual(store.settings(user).gear,equipped.gear);
  assert.equal(store.settings(user).characterId,target.id);
});

test('failed and invalid purchases do not change gold or ownership',()=>{
  const{db,store,user}=setup({legacy:true});
  db.prepare('UPDATE rpg_profiles SET gold=149 WHERE user_id=?').run(user.id);
  assert.throws(()=>store.purchaseCharacter(user,{characterId:RPG_CHARACTERS[1].id}),/골드/);
  assert.throws(()=>store.purchaseCharacter(user,{characterId:'unknown'}),/캐릭터/);
  assert.equal(store.profile(user).gold,149);
  assert.deepEqual(store.profile(user).ownedCharacters,[RPG_DEFAULT_CHARACTER_ID]);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM rpg_characters').get().count,0);
});
