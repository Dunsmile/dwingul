import test from 'node:test';
import assert from 'node:assert/strict';
import {JUMP_FLOOR,jumpCollides,stepJumpPlayer,tryJump} from '../public/js/jump-game.js';
import {JUMP_V17_RULES,jumpPatternsV17,jumpV17PatternsForStage,jumpV17TargetObstaclesPer10s,jumpWorldSpeedV17} from '../public/js/jump-patterns.js';

function landingMs(fastAt=Infinity){const player={y:JUMP_FLOOR,vy:0,jumps:0,duck:false};tryJump(player);for(let ms=1;ms<2000;ms+=1){stepJumpPlayer(player,.001,ms>=fastAt);if(player.y===JUMP_FLOOR)return ms;}return Infinity;}

test('fast fall cuts airtime and lands in the held slide state',()=>{
  const normal=landingMs(),fast=landingMs(300);
  assert.ok(normal>=805&&normal<=820,normal);assert.ok(fast>=440&&fast<=460,fast);assert.ok(fast<normal*.57);
  const player={y:JUMP_FLOOR,vy:0,jumps:0,duck:false};tryJump(player);player.duck=true;
  for(let i=0;i<500&&player.y<JUMP_FLOOR;i+=1)stepJumpPlayer(player,.001,true);
  assert.equal(player.y,JUMP_FLOOR);assert.equal(player.duck,true);
});

test('v17 is substantially faster and denser while retaining ten-second escalation',()=>{
  assert.deepEqual([0,9999,10000,20000,80000].map(jumpWorldSpeedV17),[260,260,288,316,480]);
  assert.ok(jumpV17TargetObstaclesPer10s(0,0)>=7);
  assert.ok(jumpV17TargetObstaclesPer10s(10000,0)>jumpV17TargetObstaclesPer10s(0,0));
  assert.ok(jumpV17TargetObstaclesPer10s(10000,5000)>jumpV17TargetObstaclesPer10s(10000,0)*2.4);
});

test('every random pattern boundary leaves explicit reaction and landing slack at max speed',()=>{
  const minimum={basic:460,'slide-chain':400,'single-double':540,'jump-slide':500,'master-chain':680};
  for(const pattern of jumpPatternsV17){
    const recovery=JUMP_V17_RULES.chainRecoveryDistance[pattern.type];assert.ok(recovery>=minimum[pattern.type],pattern.id);
    assert.ok(recovery/JUMP_V17_RULES.maxSpeed*1000>=833,pattern.id);
  }
  assert.ok(JUMP_V17_RULES.chainRecoveryDistance.basic/JUMP_V17_RULES.maxSpeed*1000>landingMs());
});

test('stages progressively unlock one through five slides and skill chains',()=>{
  assert.equal(jumpPatternsV17.length,100);assert.equal(new Set(jumpPatternsV17.map(pattern=>pattern.id)).size,100);
  assert.ok(jumpV17PatternsForStage(0).some(p=>p.id.startsWith('dash-')));
  for(let count=1;count<=5;count+=1){const first=jumpPatternsV17.find(p=>p.id.startsWith(`slide-chain-${count}-`));assert.equal(first.events.length,count);assert.ok(jumpV17PatternsForStage(Math.max(0,count-1)).includes(first));}
  assert.equal(jumpV17PatternsForStage(0,9999).some(p=>p.type==='single-double'),false);
  assert.equal(jumpV17PatternsForStage(0,10000).filter(p=>p.type==='single-double').length,3);
  assert.equal(jumpV17PatternsForStage(1).filter(p=>p.type==='jump-slide').length,3);
  assert.equal(jumpV17PatternsForStage(2).some(p=>p.type==='single-double'),true);
  assert.equal(jumpV17PatternsForStage(3).some(p=>p.type==='jump-slide'),true);
  assert.equal(jumpV17PatternsForStage(5).some(p=>p.type==='master-chain'),true);
});

function traverse(pattern,speed,{jump1=-Infinity,jump2=-Infinity,duckAt=-Infinity}={}){
  const player={y:JUMP_FLOOR,vy:0,jumps:0,duck:false};const obstacles=pattern.events.map(event=>({...event,x:700+event.atDistance,passed:false}));
  let firstDone=false,secondDone=false;
  for(let frame=0;frame<8*60;frame+=1){const lead=obstacles[0].x;
    if(!firstDone&&lead<jump1){tryJump(player);firstDone=true;}
    if(!secondDone&&lead<jump2){tryJump(player);secondDone=true;}
    player.duck=pattern.type==='slide-chain'||lead<duckAt;
    stepJumpPlayer(player,1/60,player.duck&&player.y<JUMP_FLOOR-.01);
    for(const obstacle of obstacles){obstacle.x-=speed/60;if(jumpCollides(player,obstacle))return false;if(obstacle.x+obstacle.w<116)obstacle.passed=true;}
    if(obstacles.every(obstacle=>obstacle.passed))return true;
  }return false;
}

function hasTechnique(pattern,speed){
  if(pattern.type==='slide-chain')return traverse(pattern,speed);
  const jumps=pattern.type==='basic'?[...Array(31)].map((_,i)=>150+i*10):[...Array(29)].map((_,i)=>180+i*10);
  for(const jump1 of jumps){
    if(pattern.type==='basic'&&traverse(pattern,speed,{jump1}))return true;
    for(let jump2=jump1-10;jump2>=-40;jump2-=10){
      if(pattern.type==='single-double'&&traverse(pattern,speed,{jump1,jump2}))return true;
      for(let duckAt=140;duckAt>=-180;duckAt-=20)if(traverse(pattern,speed,{jump1,jump2,duckAt}))return true;
    }
  }return false;
}

test('every dense v17 pattern has a 60fps technique at every stepped speed',()=>{
  for(const speed of [260,288,316,344,372,400,428,456,480])for(const pattern of jumpPatternsV17)assert.equal(hasTechnique(pattern,speed),true,`${speed}:${pattern.id}`);
});
