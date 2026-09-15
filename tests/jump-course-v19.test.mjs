import test from 'node:test';import assert from 'node:assert/strict';
import {jumpCoursePools,courseLayout,chooseCourse,jumpWorldTimeV19,jumpWorldDistanceV19,jumpWorldSpeedV19,jumpMotionTimeForWorldV19,jumpWallTimeV19,jumpMotionTimeV19,JUMP_STAGE_TEMPO,jumpCourseStage,jumpTransitionPools,courseSimilarity} from '../public/js/jump-course-v19.js';
import {jumpWorldDistanceV18,jumpWorldSpeedV18} from '../public/js/jump-combos-v18.js';
import {createJumpEngineV19} from '../public/js/jump-engine-v19.js';
import {jumpCollides,tryJump,stepJumpPlayer} from '../public/js/jump-physics-v18.js';
import {seededRandom} from '../public/js/game-random.js';import {solve} from './helpers/jump-route-search.mjs';

export function routeFor(recipe){
 const startMs=Math.ceil(jumpWorldTimeV19(recipe.startWorld)/(1000/60))*(1000/60);const worldAt=t=>jumpWorldDistanceV19(startMs+t*1000)-recipe.startWorld;
 const motionAt=t=>(jumpMotionTimeV19(startMs+t*1000)-jumpMotionTimeV19(startMs))/1000;
 const route=solve(recipe,jumpWorldSpeedV19(startMs),{worldAt,motionAt});
 assert.ok(route,`${recipe.id} at ${startMs}ms`);
 return route.controls.map(c=>({...c,atMs:startMs+c.atMs}));
}
function traverses(layout,speed,controls,hz=60,delay=0,tempo=1){
 const p={y:390,vy:0,jumps:0,duck:false};let index=0;
 for(let t=0;t<layout.length/speed*1000;t+=1000/hz){
  while(index<controls.length&&controls[index].atMs+delay<=t+.001){const a=controls[index++].action;if(a==='jump')tryJump(p);else p.duck=a==='duck';}
  // The live engine also subdivides slow frames.
  const span=1/hz,steps=Math.ceil(span*120);for(let k=0;k<steps;k++){
   stepJumpPlayer(p,span/steps*tempo,p.duck&&p.y<390);
   for(const e of layout.events){const x=140-e.w/2+e.offset-speed*(t/1000+(k+1)*span/steps);if(jumpCollides(p,{...e,x}))return false;}
  }
 }
 return true;
}

test('distance/time are inverse and stage complexity follows the six visible stages',()=>{
 for(let ms=0;ms<400000;ms+=733)assert.ok(Math.abs(jumpWorldTimeV19(jumpWorldDistanceV19(ms))-ms)<.0001);
 assert.equal(jumpWorldSpeedV19(jumpWorldTimeV19(120000)),882);
 assert.deepEqual([0,999,1000,1999,2000,3000,4000,5000,9000].map(jumpCourseStage),[0,0,1,1,2,3,4,5,5]);
});
test('fixed geometry remains fixed as speed increases and late courses fill the viewport',()=>{
 const means=jumpCoursePools.map(pool=>pool.reduce((n,p)=>{const l=courseLayout(p,0);return n+l.events.length/l.length*1000;},0)/pool.length);
 assert.ok(means[5]>means[0]*1.4,JSON.stringify(means));assert.ok(means[5]>4.3);
 for(const pool of jumpCoursePools)for(const p of pool)for(let v=0;v<4;v++){
  const l=courseLayout(p,v);for(let i=1;i<l.events.length;i++)assert.ok(l.events[i].offset>l.events[i-1].offset);
  assert.deepEqual(courseLayout(p,v),l); // no clock/speed input in layout generation
 }
 assert.ok(jumpCoursePools[5].some(p=>p.sequence.includes('SSSSS')));
 const master=jumpCoursePools[5];assert.ok(master.length>=20);assert.ok(master.every(p=>p.sequence.length>=10));
 const bigrams=new Set(master.flatMap(p=>[...p.sequence.slice(1)].map((_,i)=>p.sequence.slice(i,i+2))));assert.ok(bigrams.size>=12);
});
test('the last five action sequences never repeat, regardless of spacing variant',()=>{
 const random=seededRandom('variety');for(let stage=0;stage<6;stage++){const recent=[];for(let i=0;i<100;i++){
  const l=chooseCourse(random,stage,recent);assert.ok(!recent.includes(l.sequence));
  if(jumpCoursePools[stage].some(p=>recent.every(s=>courseSimilarity(s,courseLayout(p,l.variant).sequence)<.78)))assert.ok(recent.every(s=>courseSimilarity(s,l.sequence)<.78));recent.push(l.sequence);if(recent.length>5)recent.shift();
 }}
});
test('every variant and both middle routes work at reachable speeds, with buffered collision boxes and real 60Hz replay',()=>{
 for(const pool of [...jumpCoursePools,...jumpTransitionPools])for(const p of pool)for(let v=0;v<4;v++){
  const speeds=p.stage===0?[310,342,374,406,438,470,630]:p.stage===1?[470,502,534,566,598,630]:p.stage===2?[598,630]:[630];
  const l=courseLayout(p,v);for(const speed of speeds)for(const middleRoute of(p.sequence.includes('M')?['under','above']:['either'])){const tempo=JUMP_STAGE_TEMPO[p.stage],route=solve(l,speed*tempo,{middleRoute,motionAt:tempo>1?t=>t*tempo:null});assert.ok(route,`${l.id} speed${speed} ${middleRoute}`);assert.ok(traverses(l,speed*tempo,route.controls,60,0,tempo),`${l.id} 60Hz speed${speed} ${middleRoute}`);}
 }
});
test('opening has an empty screen, more than four seconds before collision, then normal damage/frozen ending',()=>{
 const e=createJumpEngineV19(seededRandom('start'));assert.ok(e.state.obstacles.every(o=>o.x>1080));
 e.tick(4000);assert.equal(e.state.lives,3);assert.equal(e.state.ending,null);
 for(let i=0;i<1000&&!e.state.ending;i++)e.tick(50);assert.equal(e.state.lives,0);const d=e.state.distance;e.tick(800);assert.equal(e.state.distance,d);assert.ok(e.state.ending.groundedMs>=650);
});
test('fixed-distance long courses join safely through acceleration, all stages and heart corridors',()=>{
 for(let seed=0;seed<5;seed++){
  const e=createJumpEngineV19(seededRandom(`long-${seed}`)),seen=new Set();let controls=[],cursor=0;
  for(let frame=0;frame<30000&&e.state.distance<6500;frame++){
   for(const r of e.state.recipes)if(!seen.has(r.startWorld)){seen.add(r.startWorld);if(r.stage<5)assert.ok(r.endWorld<=(r.stage+1)*20000,`${r.id} crosses stage boundary`);controls.push(...routeFor(r));controls.sort((a,b)=>a.atMs-b.atMs);}
   while(cursor<controls.length&&controls[cursor].atMs<=e.state.elapsedMs+.001)e.input(controls[cursor++].action);
   e.tick(1000/60);assert.equal(e.state.lives,3,`seed${seed} t${e.state.elapsedMs} hit${e.state.obstacles.filter(o=>o.hit).map(o=>o.patternId+':'+o.kind)}`);
  }
  assert.ok(e.state.distance>=6500);assert.ok(e.state.heartsCollected>=5);assert.ok(seen.size>=45);
 }
});
