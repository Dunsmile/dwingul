import test from 'node:test';
import assert from 'node:assert/strict';
import {typingHub} from '../public/js/typing-hub.js';
import {RPG_CHARACTERS,RPG_DEFAULT_CHARACTER_ID} from '../public/js/rpg-characters.js';

const profile={
  checkpoints:[1],earnedCheckpoints:[1],recommendedStartStage:1,gold:450,bestCleared:4,configured:true,
  equipped:{},gear:{attack:0,defense:0,heal:0},owned:[],inventory:[],
  selectedCharacter:RPG_DEFAULT_CHARACTER_ID,
  ownedCharacters:[RPG_DEFAULT_CHARACTER_ID,RPG_CHARACTERS[4].id],
};

test('hub exposes a 16-character cosmetic collection with purchase and equip actions',()=>{
  const html=typingHub(profile,new URLSearchParams('panel=characters'));
  assert.equal((html.match(/class="rpg-character-card/g)||[]).length,16);
  assert.equal((html.match(/\/assets\/pixel\/illustrated\/personas\/\d+\.png/g)||[]).length,16);
  assert.match(html,/data-act="rpg-character-equip"[^>]*data-character="flower-healer"/);
  assert.match(html,/data-act="rpg-character-buy"[^>]*data-character="owl-scholar"/);
  assert.match(html,/150골드/);
  assert.match(html,/전투 능력치는 모두 같아요/);
  assert.match(html,/장착 중/);
});

test('play panel identifies the selected woodland character',()=>{
  const html=typingHub({...profile,selectedCharacter:RPG_CHARACTERS[4].id},new URLSearchParams('panel=play'));
  assert.match(html,/꽃토끼 치유사/);
  assert.match(html,/panel=characters/);
});

test('inventory requests illustrated item PNGs while retaining SVG fallbacks',()=>{
  const itemProfile={...profile,owned:['attack-common'],inventory:[{itemId:'attack-common',quantity:1,enhancement:0}]};
  const html=typingHub(itemProfile,new URLSearchParams('panel=gear'));
  assert.match(html,/\/assets\/pixel\/illustrated\/items\/attack-common\.png/);
  assert.match(html,/\/assets\/pixel\/items\/attack-common\.svg/);
});
