import {JUMP_V19_RULES,jumpMotionTimeV19,jumpWorldSpeedV19,jumpWorldDistanceV19,jumpCourseStage,chooseCourse} from './jump-course-v19.js';
import {JUMP_FLOOR,jumpPlayerBox,jumpCollides,stepJumpPlayer,tryJump,jumpDistanceMeters,jumpRunAfterHit,jumpHeal} from './jump-physics-v18.js';
import {jumpStageIndex,nextHeartMeters} from './jump-patterns-v17.js';

// Fixed world positions: speed only changes arrival time, never obstacle gaps.
export function createJumpEngineV19(random=Math.random){
 const player={y:JUMP_FLOOR,vy:0,jumps:0,duck:false},obstacles=[],hearts=[],recipes=[];
 const state={player,obstacles,hearts,recipes,elapsedMs:0,worldDistance:0,distance:0,avoided:0,lives:3,invincibleMs:0,
  ending:null,patternsSeen:0,nextHeartAt:nextHeartMeters(0,random,true),heartsCollected:0,jumpBufferMs:0};
 let nextStart=JUMP_V19_RULES.startDistance,nextId=1;const recent=[];
 const position=(centerWorld,w)=>140-w/2+centerWorld-state.worldDistance;
 function schedule(){
  while(nextStart<state.worldDistance+JUMP_V19_RULES.lookAhead){
   if(jumpDistanceMeters(nextStart)>=state.nextHeartAt){
    const centerWorld=nextStart+180;hearts.push({centerWorld,x:position(centerWorld,28),y:JUMP_FLOOR-35,w:28,h:32});
    state.nextHeartAt=nextHeartMeters(state.nextHeartAt,random);nextStart+=420;
   }
   const stage=jumpCourseStage(jumpDistanceMeters(nextStart));
   const boundary=stage<5?(stage+1)*20000:Infinity;
   const layout=chooseCourse(random,stage,recent,boundary-nextStart);
   // Never cut an action cluster in half at a stage boundary. A short bridge
   // finishes the old stage; any remaining gap becomes the transition respite.
   if(!layout){nextStart=boundary;continue;}
   const recipe={...layout,startWorld:nextStart,endWorld:nextStart+layout.length};recipes.push(recipe);
   recent.push(layout.sequence);if(recent.length>5)recent.shift();
   for(const event of layout.events){const centerWorld=nextStart+event.offset;obstacles.push({...event,centerWorld,id:nextId++,patternId:layout.id,patternType:'spatial-course',stageIndex:jumpCourseStage(jumpDistanceMeters(centerWorld)),x:position(centerWorld,event.w),hit:false,passed:false});}
   state.patternsSeen++;nextStart=recipe.endWorld;
  }
 }
 function clearHeld(){player.duck=false;state.jumpBufferMs=0;}
 function input(action){
  if(state.ending)return;
  if(action==='jump'){player.duck=false;if(!tryJump(player))state.jumpBufferMs=JUMP_V19_RULES.jumpBufferMs;}
  else if(action==='duck'){state.jumpBufferMs=0;player.duck=true;}
  else if(action==='release')player.duck=false;
 }
 function step(ms){
  if(state.ending){stepJumpPlayer(player,ms/1000);if(player.y>=JUMP_FLOOR-.01)state.ending.groundedMs+=ms;return;}
  const oldWorld=state.worldDistance,oldMotion=jumpMotionTimeV19(state.elapsedMs);state.elapsedMs+=ms;state.worldDistance=jumpWorldDistanceV19(state.elapsedMs);
  state.distance=jumpDistanceMeters(state.worldDistance);const delta=state.worldDistance-oldWorld;
  state.invincibleMs=Math.max(0,state.invincibleMs-ms);
  const airborne=player.y<JUMP_FLOOR-.01;
  stepJumpPlayer(player,(jumpMotionTimeV19(state.elapsedMs)-oldMotion)/1000,player.duck&&airborne);
  if(state.jumpBufferMs>0){state.jumpBufferMs=Math.max(0,state.jumpBufferMs-ms);if(airborne&&player.y>=JUMP_FLOOR-.01){tryJump(player);state.jumpBufferMs=0;}}
  for(const obstacle of obstacles){
   obstacle.x-=delta;
   if(!obstacle.hit&&!obstacle.passed&&!state.invincibleMs&&jumpCollides(player,obstacle)){
    obstacle.hit=true;const hit=jumpRunAfterHit(state.lives);state.lives=hit.lives;state.invincibleMs=650;
    if(hit.finished){state.ending={groundedMs:0};state.invincibleMs=0;clearHeld();return;}
   }
   if(!obstacle.passed&&obstacle.x+obstacle.w<116){obstacle.passed=true;if(!obstacle.hit)state.avoided++;}
  }
  for(let i=hearts.length-1;i>=0;i--){
   const h=hearts[i];h.x-=delta;const b=jumpPlayerBox(player);
   if(b.x<h.x+h.w&&b.x+b.w>h.x&&b.y<h.y+h.h&&b.y+b.h>h.y){state.lives=jumpHeal(state.lives);state.heartsCollected++;hearts.splice(i,1);}
   else if(h.x+h.w<0)hearts.splice(i,1);
  }
  while(obstacles[0]?.x+obstacles[0]?.w<-30)obstacles.shift();
  while(recipes[0]?.endWorld<state.worldDistance-100)recipes.shift();
  schedule();
 }
 schedule();
 return {state,input,clearHeld,tick(ms){
  // Bounded steps keep collision and fast-fall response stable on slower phones.
  let remaining=Math.max(0,ms);while(remaining>0){const span=Math.min(1000/120,remaining);step(span);remaining-=span;}
 },getState(){return {...state,player:{...player},obstacles:obstacles.map(o=>({...o})),hearts:hearts.map(h=>({...h})),recipes:recipes.map(r=>({...r})),playerBox:jumpPlayerBox(player),phase:state.ending?'ending':'playing',score:state.distance,maxLives:3,
  speed:jumpWorldSpeedV19(state.elapsedMs),difficultyLevel:jumpCourseStage(state.distance),rulesVersion:'v19',recentCourses:[...recent],
  currentPatternId:recipes.find(r=>r.endWorld>state.worldDistance)?.id,currentPatternType:'spatial-course',nextPatternStartWorld:nextStart,
  stageIndex:jumpStageIndex(state.distance),fastFalling:player.duck&&player.y<JUMP_FLOOR-.01};}};
}
