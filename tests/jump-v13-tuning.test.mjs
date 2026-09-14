import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JUMP_V13_RULES,jumpDifficultyLevel,jumpTargetObstaclesPer10s,jumpWorldSpeed,jumpWorldSpeedV11,jumpWorldSpeedV13,jumpV13NextPatternDistance,jumpPatterns100} from '../public/js/jump-patterns.js';

test('v13 difficulty and target cadence step forever while speed has a fair cap',()=>{
 assert.deepEqual([0,9999,10000,19999,20000,60000,90000].map(jumpDifficultyLevel),[0,0,1,1,2,6,9]);
 assert.deepEqual([0,10000,20000,30000,40000,90000].map(jumpTargetObstaclesPer10s),[5,6,7,8,9,14]);
 assert.deepEqual([0,9999,10000,20000,60000,90000].map(jumpWorldSpeedV13),[220,220,244,268,364,420]);
 assert.equal(JUMP_V13_RULES.speedStep,24);
});

test('v11 continuous speed remains frozen independently of v13',()=>{
 assert.equal(jumpWorldSpeedV11(0),220);
 assert.equal(jumpWorldSpeedV11(10000),240);
 assert.equal(jumpWorldSpeedV11(100000),420);
 assert.equal(jumpWorldSpeed(10000),240);
});

test('v13 scheduling raises cadence without violating each pattern safe gap',()=>{
 for(const pattern of jumpPatterns100){
  const early=jumpV13NextPatternDistance(pattern,0),late=jumpV13NextPatternDistance(pattern,40000);
  const last=Math.max(...pattern.events.map(event=>event.atDistance));
  assert.ok(early>=last+JUMP_V13_RULES.minimumGapByType[pattern.type],pattern.id);
  assert.ok(late>=last+JUMP_V13_RULES.minimumGapByType[pattern.type],pattern.id);
  assert.ok(late/jumpWorldSpeedV13(40000)<=early/jumpWorldSpeedV13(0)+1e-9,pattern.id);
 }
});

test('current jump publishes v13 while legacy wrapper pins v11',async()=>{
 const [current,legacy]=await Promise.all([readFile(new URL('../public/js/jump-game.js',import.meta.url),'utf8'),readFile(new URL('../public/js/legacy/jump-game-v11.js',import.meta.url),'utf8')]);
 assert.match(current,/mode: `jump-distance-\$\{version\}`/);
 assert.match(current,/version='v13'/);
 assert.match(legacy,/createJumpV11/);
});
