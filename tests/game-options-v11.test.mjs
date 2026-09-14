import test from 'node:test';
import assert from 'node:assert/strict';
import {gameSettings,gameMode,gameModeNames} from '../public/js/game-options.js';

test('current rhythm identity and v17 jump defaults and retain explicit supported legacy settings',()=>{
 assert.deepEqual(gameSettings('sequence'),{version:'v11',mode:'rhythm'});
 assert.equal(gameMode('sequence',{}),'rhythm-three-lane-v11');
 assert.deepEqual(gameSettings('sequence',{version:'v9'}),{version:'v9',mode:'rhythm'});
 assert.deepEqual(gameSettings('sequence',{version:'v7'}),{version:'v7',mode:'rhythm'});
 assert.equal(gameMode('sequence',{version:'v9'}),'rhythm-endless-v9');
 assert.equal(gameMode('sequence',{version:'v7'}),'rhythm-relay-v7');
 assert.deepEqual(gameSettings('jump'),{version:'v17'});
 assert.equal(gameMode('jump',{}),'jump-distance-v17');
 for(const version of ['v16','v13','v11','v6','v5','v4']){assert.deepEqual(gameSettings('jump',{version}),{version});assert.equal(gameMode('jump',{version}),`jump-distance-${version}`);}
 assert.equal(gameModeNames['rhythm-three-lane-v11'],'세 갈래 리듬 · 무한 모드');
 assert.equal(gameModeNames['jump-distance-v11'],'멀리 뛰기 · 숲길 거리');
});

test('unknown versions sanitize to current while known city history keeps its identity',()=>{
 assert.equal(gameSettings('sequence',{version:'unknown'}).version,'v11');
 assert.equal(gameSettings('jump',{version:'unknown'}).version,'v17');
 assert.equal(gameSettings('racing',{version:'v6',car:'basic'}).version,'v6');
 assert.equal(gameSettings('racing',{version:'unknown',car:'basic'}).version,'v16');
});
