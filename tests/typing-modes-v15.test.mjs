import test from 'node:test';
import assert from 'node:assert/strict';
import {createTypingRpgModel,typingRpgDamage} from '../public/js/typing-rpg.js';
import {gameSettings,gameMode,settingsParams} from '../public/js/game-options.js';
import {seededRandom} from '../public/js/game-random.js';

test('long sentences use a separate record key and survive settings round trips',()=>{
 const settings=gameSettings('typing',{sentenceMode:'long',startStage:11,attackMultiplier:999});
 assert.equal(settings.sentenceMode,'long');
 assert.equal(settings.attackMultiplier,undefined);
 assert.equal(gameMode('typing',settings),'typing-rpg-v5-long-s11');
 assert.equal(gameMode('typing',{startStage:11}),'typing-rpg-v5-s11');
 assert.deepEqual(gameSettings('typing',Object.fromEntries(new URLSearchParams(settingsParams('typing',settings)))),settings);
 assert.equal(gameSettings('typing',{sentenceMode:'invalid'}).sentenceMode,'short');
});

test('long mode doubles the entire final attack, with the same counter and healing rules',()=>{
 for(const combo of [0,19,20,100])assert.equal(typingRpgDamage(combo,{attack:7},'long'),typingRpgDamage(combo,{attack:7})*2);
 const common={phrases:['작은 한 걸음도 이어 가면 먼 곳에 닿는다'],gear:{attack:7},startStage:10};
 const short=createTypingRpgModel(common),long=createTypingRpgModel({...common,sentenceMode:'long'});
 short.commitInput(short.getState().target);long.commitInput(long.getState().target);
 assert.equal(long.submit().amount,short.submit().amount*2);
 assert.equal(long.getState().counterEveryMs,short.getState().counterEveryMs);
 assert.equal(long.getState().counterDamage,short.getState().counterDamage);
 assert.equal(long.getProgress().mode,'typing-rpg-v5-long-s10');
});

test('250 long phrases are deterministic, non-repeating within a deck and at its boundary',()=>{
 const make=()=>createTypingRpgModel({sentenceMode:'long',random:seededRandom('long-v15'),gear:{attack:999}});
 const a=make(),b=make(),seen=[];
 for(let i=0;i<501;i++){
  const target=a.getState().target;assert.equal(target,b.getState().target);
  assert.ok([...target].length>=20&&[...target].length<=30,target);seen.push(target);
  for(const model of [a,b]){model.commitInput(target);model.submit();}
 }
 assert.equal(new Set(seen.slice(0,250)).size,250);
 assert.equal(new Set(seen.slice(250,500)).size,250);
 assert.notEqual(seen[249],seen[250]);
 assert.equal(createTypingRpgModel().getState().phraseCount,100);
});
