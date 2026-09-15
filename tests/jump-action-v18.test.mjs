import test from 'node:test';
import assert from 'node:assert/strict';
import {jumpCombos100,compileJumpCombo,jumpWorldDistanceV18,jumpWorldSpeedV18,shuffledJumpCombos,comboMotionBudget} from '../public/js/jump-combos-v18.js';
import {jumpPlayerBox,jumpObstacleBox,jumpCollides,stepJumpPlayer,tryJump} from '../public/js/jump-physics-v18.js';
import {createJumpEngineV18} from '../public/js/jump-engine-v18.js';
import {seededRandom} from '../public/js/game-random.js';

test('100 whole action recipes force jump/slide changes, including six distinct tiers',()=>{
 assert.equal(jumpCombos100.length,100);assert.equal(new Set(jumpCombos100.map(p=>p.id)).size,100);
 assert.deepEqual([...new Set(jumpCombos100.map(p=>p.tier))],[0,1,2,3,4,5]);
 for(const p of jumpCombos100){assert.ok(p.steps.includes('S'));assert.ok(p.steps.includes('J'));assert.ok(p.steps.includes('D'));assert.ok(p.steps.length>=4);}
 const mastered=shuffledJumpCombos(seededRandom('master'),5);assert.ok(mastered.every(p=>p.tier>=4&&p.steps.length>=8));
 assert.ok(mastered.every(p=>comboMotionBudget(p,5).motionActionsPerSecond>=2.25));
});

function traverse(pattern,startMs,tier,route,shift,hz){
 const recipe=compileJumpCombo(pattern,startMs,tier,{middleRoute:route}),p={y:390,vy:0,jumps:0,duck:false};let ci=0;
 const dt=1000/hz;
 for(let t=startMs-200;t<recipe.nextStartMs+100;t+=dt){
  while(ci<recipe.controls.length&&recipe.controls[ci].atMs+shift<=t+.01){const a=recipe.controls[ci++].action;if(a==='jump')tryJump(p);else p.duck=a==='duck';}
  stepJumpPlayer(p,dt/1000,p.duck&&p.y<390);
  for(const e of recipe.events){const o={...e,x:140-e.w/2+jumpWorldDistanceV18(e.centerMs)-jumpWorldDistanceV18(t+dt)};if(jumpCollides(p,o))return {p,o,t};}
 }
 return null;
}
test('all recipes survive both middle routes at every stepped speed and speed boundary, with 66ms input tolerance',()=>{
 for(const hz of [60,120])for(const start of [1500,9800,19800,29800,39800,49800,59800,69800,79800,89800,99800,140000])for(const tier of [0,5])for(const route of ['jump','slide'])for(const shift of [-33,0,33])for(const p of jumpCombos100){
  assert.equal(traverse(p,start,tier,route,shift,hz),null,`${p.id} ${start} tier${tier} ${route} shift${shift} ${hz}fps`);
 }
});
test('middle rune collides when standing but can be passed underneath or jumped over',()=>{
 const event=compileJumpCombo(jumpCombos100.find(p=>p.steps.includes('M')),0,5).events.find(e=>e.kind==='middle');
 const obstacle={...event,x:140-event.w/2};
 assert.equal(jumpCollides({y:390,vy:0,jumps:0,duck:false},obstacle),true);
 assert.equal(jumpCollides({y:390,vy:0,jumps:0,duck:true},obstacle),false);
 assert.equal(jumpCollides({y:290,vy:0,jumps:1,duck:false},obstacle),false);
 assert.ok(jumpPlayerBox({y:390,duck:true}).y-jumpObstacleBox(obstacle).y-jumpObstacleBox(obstacle).h>=15);
});
test('standing still, holding slide, or repeating jump cannot bypass action recipes',()=>{
 for(const strategy of ['stand','duck','jump'])for(let seed=0;seed<20;seed++){
  const e=createJumpEngineV18(seededRandom(`hold-${seed}`));if(strategy==='duck')e.input('duck');
  for(let frame=0;frame<2400&&!e.state.ending;frame++){if(strategy==='jump'&&frame%12===0)e.input('jump');e.tick(1000/60);}
  assert.ok(e.state.ending,`${strategy}:${seed}`);assert.ok(e.state.distance<600,`${strategy}:${seed} ran ${e.state.distance}`);
 }
});
test('jump takes priority over a held slide; a fresh slide input fast-falls and clears jump buffering',()=>{
 const e=createJumpEngineV18(seededRandom('input'));e.input('duck');e.input('jump');e.tick(100);
 assert.ok(e.state.player.y<345);assert.equal(e.state.player.duck,false);
 e.input('jump');e.input('jump');assert.ok(e.state.jumpBufferMs>0);
 e.input('duck');assert.equal(e.state.jumpBufferMs,0);e.tick(200);
 assert.equal(e.state.player.y,390);assert.equal(e.state.player.duck,true);
});
test('1000 seeded pattern boundaries preserve physical routes, heart corridors and fixed world timing',()=>{
 let total=0;
 for(let seed=0;seed<4;seed++){
  const e=createJumpEngineV18(seededRandom(`continuity-${seed}`));const seen=new Set();let queue=[];let ci=0,previous=null,completed=0;
  for(let frame=0;completed<250&&frame<250000;frame++){
   for(const r of e.state.recipes)if(!seen.has(r.startMs)){
    seen.add(r.startMs);const p=jumpCombos100.find(p=>p.id===r.id),route=seen.size%2?'jump':'slide';
    queue.push(...compileJumpCombo(p,r.startMs,r.tier,{middleRoute:route}).controls);
    if(previous){assert.notEqual(previous.id,r.id);assert.notEqual(previous.steps.join(''),r.steps.join(''));const held=x=>x==='S'||x==='M';assert.equal(held(previous.steps.at(-1))&&held(r.steps[0]),false);}
    previous=r;
   }
   while(ci<queue.length&&queue[ci].atMs<=e.state.elapsedMs+.01)e.input(queue[ci++].action);
   e.tick(1000/60);assert.equal(e.state.lives,3,`seed ${seed} t ${e.state.elapsedMs} ${e.state.obstacles.filter(o=>o.hit).map(o=>o.patternId+':'+o.kind)}`);
   completed=seen.size-e.state.recipes.length;
   assert.equal(e.state.worldDistance,jumpWorldDistanceV18(e.state.elapsedMs));
  }
  assert.ok(completed>=250);assert.ok(e.state.distance>6000);assert.ok(e.state.heartsCollected>=5);assert.equal(jumpWorldSpeedV18(e.state.elapsedMs),630);total+=completed;
 }
 assert.ok(total>=1000);
});
test('three collisions freeze travel before ending, independent of a slow render frame',()=>{
 const e=createJumpEngineV18(seededRandom('end'));for(let i=0;i<500&&!e.state.ending;i++)e.tick(100);
 assert.equal(e.state.lives,0);const d=e.state.distance,t=e.state.elapsedMs;e.tick(700);
 assert.equal(e.state.distance,d);assert.equal(e.state.elapsedMs,t);assert.ok(e.state.ending.groundedMs>=650);
});
