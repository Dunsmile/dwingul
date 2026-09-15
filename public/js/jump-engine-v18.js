import {JUMP_V18_RULES,jumpWorldSpeedV18,jumpWorldDistanceV18,jumpComboTier,shuffledJumpCombos,compileJumpCombo} from './jump-combos-v18.js';
import {JUMP_FLOOR,jumpPlayerBox,jumpCollides,stepJumpPlayer,tryJump,jumpDistanceMeters,jumpRunAfterHit,jumpHeal} from './jump-physics-v18.js';
import {jumpStageIndex,nextHeartMeters} from './jump-patterns-v17.js';

// The renderer and collision simulation share one world clock. Contact times
// become world positions using the integral of speed, including speed changes.
export function createJumpEngineV18(random=Math.random){
 const player={y:JUMP_FLOOR,vy:0,jumps:0,duck:false},obstacles=[],hearts=[],recipes=[];
 const state={player,obstacles,hearts,recipes,elapsedMs:0,worldDistance:0,distance:0,avoided:0,lives:3,invincibleMs:0,
  ending:null,patternsSeen:0,nextHeartAt:nextHeartMeters(0,random,true),heartsCollected:0,jumpBufferMs:0};
 let deck=[],deckTier=-1,nextStart=1500,previous=null,nextId=1;
 const position=(centerMs,w)=>140-w/2+jumpWorldDistanceV18(centerMs)-state.worldDistance;
 function choose(tier){
  if(!deck.length||tier!==deckTier){deck=shuffledJumpCombos(random,tier);deckTier=tier;}
  // A boundary must ask for a new decision: neither duplicate recipes nor a
  // slide/middle pair that can collapse into holding the same key.
  const isHeld=s=>s==='S'||s==='M';
  const allowed=p=>p.id!==previous?.id&&p.steps.join('')!==previous?.steps.join('')&&!(isHeld(previous?.steps.at(-1))&&isHeld(p.steps[0]));
  let index=deck.findIndex(allowed);
  if(index<0){deck=shuffledJumpCombos(random,tier);index=deck.findIndex(allowed);}
  return deck.splice(index,1)[0];
 }
 function schedule(){
  while(nextStart<state.elapsedMs+4000){
   if(jumpDistanceMeters(jumpWorldDistanceV18(nextStart))>=state.nextHeartAt){
    const centerMs=nextStart+250;hearts.push({centerMs,x:position(centerMs,28),y:JUMP_FLOOR-35,w:28,h:32});
    state.nextHeartAt=nextHeartMeters(state.nextHeartAt,random);nextStart+=650;
   }
   const tier=jumpComboTier(nextStart,jumpDistanceMeters(jumpWorldDistanceV18(nextStart))),pattern=choose(tier);
   const compiled=compileJumpCombo(pattern,nextStart,tier);
   // QA witnesses never enter live state. The player has to read the obstacles.
   const {controls,...recipe}=compiled;recipes.push(recipe);
   for(const event of compiled.events)obstacles.push({...event,id:nextId++,patternType:'action-combo',stageIndex:jumpStageIndex(jumpDistanceMeters(jumpWorldDistanceV18(event.centerMs))),x:position(event.centerMs,event.w),hit:false,passed:false});
   state.patternsSeen++;nextStart=compiled.nextStartMs;previous=pattern;
  }
 }
 function clearHeld(){player.duck=false;state.jumpBufferMs=0;}
 function input(action){
  if(state.ending)return;
  if(action==='jump'){player.duck=false;if(!tryJump(player))state.jumpBufferMs=JUMP_V18_RULES.jumpBufferMs;}
  else if(action==='duck'){state.jumpBufferMs=0;player.duck=true;}
  else if(action==='release')player.duck=false;
 }
 function step(ms){
  if(state.ending){stepJumpPlayer(player,ms/1000);if(player.y>=JUMP_FLOOR-.01)state.ending.groundedMs+=ms;return;}
  const oldWorld=state.worldDistance;state.elapsedMs+=ms;state.worldDistance=jumpWorldDistanceV18(state.elapsedMs);
  state.distance=jumpDistanceMeters(state.worldDistance);const delta=state.worldDistance-oldWorld;
  state.invincibleMs=Math.max(0,state.invincibleMs-ms);
  const airborne=player.y<JUMP_FLOOR-.01;
  stepJumpPlayer(player,ms/1000,player.duck&&airborne);
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
  while(recipes[0]?.nextStartMs<state.elapsedMs-300)recipes.shift();
  schedule();
 }
 schedule();
 return {state,input,clearHeld,tick(ms){
  // Bounded steps keep collision and fast-fall response stable on slower phones.
  let remaining=Math.max(0,ms);while(remaining>0){const span=Math.min(1000/120,remaining);step(span);remaining-=span;}
 },getState(){return {...state,player:{...player},obstacles:obstacles.map(o=>({...o})),hearts:hearts.map(h=>({...h})),recipes:recipes.map(r=>({...r})),playerBox:jumpPlayerBox(player),phase:state.ending?'ending':'playing',score:state.distance,maxLives:3,
  speed:jumpWorldSpeedV18(state.elapsedMs),difficultyLevel:jumpComboTier(state.elapsedMs,state.distance),rulesVersion:'v18',patternCount:100,
  currentPatternId:recipes.find(r=>r.nextStartMs>state.elapsedMs)?.id,currentPatternType:'action-combo',nextPatternStartMs:nextStart,
  stageIndex:jumpStageIndex(state.distance),fastFalling:player.duck&&player.y<JUMP_FLOOR-.01};}};
}
