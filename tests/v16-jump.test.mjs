import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canSpawnJumpHeart, jumpHeal, jumpRunAfterHit } from '../public/js/jump-game.js';
import {
  JUMP_V16_RULES,
  JUMP_V16_STAGES,
  JUMP_V16_STAGE_PATTERN_TYPES,
  jumpStage,
  jumpStageIndex,
  jumpPatternTypeForStage,
  jumpV16NextPatternDistance,
  jumpV16TargetObstaclesPer10s,
  jumpWorldSpeedV13,
  nextHeartMeters,
  jumpPatterns100,
} from '../public/js/jump-patterns.js';

test('v16 has six 1000m stages and each stage raises pattern frequency by 20 percent', () => {
  assert.equal(JUMP_V16_STAGES.length, 6);
  assert.deepEqual([0,999.9,1000,1999.9,2000,3000,4000,5000,99999].map(jumpStageIndex),[0,0,1,1,2,3,4,5,5]);
  assert.deepEqual(JUMP_V16_STAGES.map(stage=>stage.id),['easy','less-easy','normal','hard','expert','master']);
  for(let index=1;index<JUMP_V16_STAGES.length;index+=1) {
    assert.ok(Math.abs(JUMP_V16_STAGES[index].frequencyScale/JUMP_V16_STAGES[index-1].frequencyScale-1.2)<1e-9);
  }
  assert.equal(jumpStage(3100).label,'어려움');
});

test('pattern complexity grows from mostly short obstacles while retaining the full pool', () => {
  assert.deepEqual(JUMP_V16_STAGE_PATTERN_TYPES[0],['basic','basic','basic','wide']);
  assert.equal(JUMP_V16_STAGE_PATTERN_TYPES[0].filter(type=>type==='basic').length/4,.75);
  assert.equal(JUMP_V16_STAGE_PATTERN_TYPES[1].includes('double'),true);
  assert.equal(JUMP_V16_STAGE_PATTERN_TYPES[2].includes('slide'),true);
  assert.deepEqual(new Set(JUMP_V16_STAGE_PATTERN_TYPES.flat()),new Set(['basic','wide','double','slide']));
  assert.equal(jumpPatternTypeForStage(0,()=>0),'basic');
  assert.equal(jumpPatternTypeForStage(0,()=>.99),'wide');
  assert.equal(jumpPatterns100.length,100);
});

test('v16 retains 10 second speed/density growth and family-safe jump gaps', () => {
  assert.equal(jumpWorldSpeedV13(9999),220);
  assert.equal(jumpWorldSpeedV13(10000),244);
  assert.ok(jumpV16TargetObstaclesPer10s(10000,1000)>jumpV16TargetObstaclesPer10s(0,1000));
  assert.ok(jumpV16TargetObstaclesPer10s(10000,1000)>jumpV16TargetObstaclesPer10s(10000,0));
  for(const meters of [0,1000,2000,3000,4000,5000]) for(const pattern of jumpPatterns100) {
    const next=jumpV16NextPatternDistance(pattern,60000,meters);
    const last=Math.max(...pattern.events.map(event=>event.atDistance));
    assert.ok(next>=last+JUMP_V16_RULES.minimumGapByType[pattern.type],`${meters}:${pattern.id}`);
  }
});

test('long-run scheduled cadence rises by stage while every transition keeps its safe clamp', () => {
  const sample=jumpPatterns100.filter(pattern=>pattern.type==='basic').slice(0,12);
  const actual=[];
  for(const meters of [0,1000,2000,3000,4000,5000]) {
    let distance=0,events=0,index=0;
    const speed=jumpWorldSpeedV13(60000);
    while(distance<speed*120) {
      const pattern=sample[index++%sample.length];
      const cycle=jumpV16NextPatternDistance(pattern,60000,meters);
      const last=Math.max(...pattern.events.map(event=>event.atDistance));
      assert.ok(cycle>=last+JUMP_V16_RULES.minimumGapByType.basic);
      distance+=cycle; events+=pattern.events.length;
    }
    actual.push(events/12);
  }
  for(let index=1;index<actual.length;index+=1) assert.ok(actual[index]>=actual[index-1]);
  assert.ok(actual.at(-1)>actual[0]);
});

function survivesAtSpeedCap(event, type) {
  const strategy=type==='double'?'double':type==='slide'?'slide':'single';
  for(let first=520;first>=150;first-=10) for(let second=first-20;second>=100;second-=10) {
    const player={y:390,vy:0,jumps:0,duck:false};
    const obstacle={...event,x:600,passed:false};
    let jumped=false,doubleJumped=false,safe=true;
    for(let elapsed=0;elapsed<4;elapsed+=1/480) {
      if(strategy==='single'&&!jumped&&obstacle.x<first){tryJumpForTest(player);jumped=true;}
      if(strategy==='double') {
        if(!jumped&&obstacle.x<first){tryJumpForTest(player);jumped=true;}
        if(!doubleJumped&&obstacle.x<second){tryJumpForTest(player);doubleJumped=true;}
      }
      player.duck=strategy==='slide'&&obstacle.x<320&&obstacle.x+obstacle.w>75;
      stepPlayerForTest(player,1/480); obstacle.x-=JUMP_V16_RULES.maxSpeed/480;
      if(collidesForTest(player,obstacle)){safe=false;break;}
      if(obstacle.x+obstacle.w<108)break;
    }
    if(safe)return true;
  }
  return false;
}

function tryJumpForTest(player){if(player.jumps>=2)return;player.duck=false;player.vy=player.jumps===1?-700:-610;player.jumps+=1;}
function stepPlayerForTest(player,seconds){player.vy+=(player.jumps===2?1250:1500)*seconds;player.y=Math.min(390,player.y+player.vy*seconds);if(player.y>=390){player.vy=0;player.jumps=0;}}
function collidesForTest(player,o){const a={x:116,y:player.y-(player.duck&&player.y>=389.99?31:65),w:48,h:player.duck&&player.y>=389.99?27:61},b={x:o.x+6,y:o.y+6,w:o.w-12,h:o.h-12};return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

test('every obstacle family remains avoidable at the maximum world speed',()=>{
  for(const pattern of jumpPatterns100) assert.equal(survivesAtSpeedCap(pattern.events[0],pattern.type),true,pattern.id);
});

test('v16 starts with three health, loses one per hit, and hearts recover one up to three', () => {
  assert.deepEqual(jumpRunAfterHit(3),{lives:2,finished:false});
  assert.deepEqual(jumpRunAfterHit(1),{lives:0,finished:true});
  assert.equal(jumpHeal(1),2);
  assert.equal(jumpHeal(2),3);
  assert.equal(jumpHeal(3),3);
});

test('heart spacing remains approximately 1000m', () => {
  assert.equal(nextHeartMeters(0,()=>0,true),900);
  assert.ok(nextHeartMeters(0,()=>.999999,true)<1100);
  assert.equal(nextHeartMeters(1000,()=>.5),2000);
});

test('heart waits for a clear corridor after all pattern events', () => {
  const player={y:390,vy:0,jumps:0,duck:false};
  assert.equal(canSpawnJumpHeart([],0,player),true);
  assert.equal(canSpawnJumpHeart([],1,player),false);
  assert.equal(canSpawnJumpHeart([{x:500,w:50,hit:false,passed:false}],0,player),false);
  assert.equal(canSpawnJumpHeart([{x:40,w:50,hit:false,passed:true}],0,player),true);
  assert.equal(canSpawnJumpHeart([{x:500,w:50,hit:true,passed:false}],0,player),true);
});

test('runtime exposes resilient input, pause cleanup, heart, stage and ending state', async () => {
  const source=await readFile(new URL('../public/js/jump-game.js',import.meta.url),'utf8');
  assert.match(source,/version='v16'/);
  assert.match(source,/jumpBufferMs = JUMP_V16_RULES\.jumpBufferMs/);
  assert.match(source,/heldJumpKeys\.add/);
  assert.match(source,/onPause\(paused\) \{ if \(paused\) clearHeld\(\); \}/);
  assert.match(source,/heartsCollected/);
  assert.match(source,/nextPatternDistance=Math\.max\(nextPatternDistance,canvas\.width-PLAYER_DRAW_X\+360\)/);
  assert.match(source,/jump-stage-\$\{index\+1\}-ground/);
  assert.match(source,/stageIndex:/);
  assert.match(source,/if\(ending\)\{stepJumpPlayer/);
});
