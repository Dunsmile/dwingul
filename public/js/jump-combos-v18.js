// Patterns are authored as actions. Randomness chooses a complete combination;
// it never shuffles individual obstacles or interrupts a combination midway.
export const JUMP_V18_RULES=Object.freeze({initialSpeed:310,speedStep:32,maxSpeed:630,stepMs:10000,maxLives:3,jumpBufferMs:120,fastFallMinVy:760,fastFallGravity:3200});
export const jumpWorldSpeedV18=ms=>Math.min(630,310+Math.floor(Math.max(0,ms)/10000)*32);
export function jumpWorldDistanceV18(ms){
  let remaining=Math.max(0,ms),distance=0,index=0;
  while(remaining>0){const span=Math.min(remaining,10000);distance+=Math.min(630,310+index*32)*span/1000;remaining-=span;index++;}
  return distance;
}
const templates=[
  ['S','J','D','S'], ['J','S','D','M','J'], ['D','S','J','M'], ['S','J','M','D','S'],
  ['M','J','S','D','J'], ['J','D','S','J','M'], ['S','D','J','S','M','J'], ['J','M','D','S','J','S'],
  ['D','S','J','D','M','J'], ['M','D','S','J','S','D'], ['S','J','D','M','J','S','D'],
  ['J','S','D','J','M','D','S'], ['D','M','J','S','D','J','S'], ['M','J','D','S','J','D','M'],
  ['S','D','J','M','D','S','J','D'], ['J','D','S','J','M','D','J','S'],
  ['D','J','S','D','M','J','D','S'], ['M','D','J','S','D','J','M','D'],
  ['S','J','D','M','J','S','D','J','M','D'], ['D','J','S','D','M','J','D','S','J','D'],
];
const names={S:'슬라이드',J:'점프',D:'2단 점프',M:'위·아래 선택'};
export const jumpCombos100=Object.freeze(templates.flatMap((steps,index)=>Array.from({length:5},(_,variant)=>Object.freeze({
  id:`action-${index+1}-${variant+1}`,type:'action-combo',steps:Object.freeze(steps),variant,
  tier:index<8?Math.floor(index/4):Math.min(5,2+Math.floor((index-8)/3)),label:steps.map(step=>names[step]).join(' → '),
}))));

export function jumpComboTier(elapsedMs,distance){return Math.min(5,Math.max(Math.floor(distance/1000),Math.floor(elapsedMs/22000)));}
export function shuffledJumpCombos(random,tier){
  // Later play replaces short recipes with longer ones instead of accumulating
  // ever more easy recipes in the unlocked pool.
  const pool=jumpCombos100.filter(p=>p.tier<=tier&&p.tier>=Math.max(0,tier-1));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool;
}

// Times refer to obstacle-center contact. The witness controls are used only in
// QA; the runtime collision rules accept any valid route, including either side
// of a middle stone. Every macro ends grounded before the next action begins.
export function compileJumpCombo(pattern,startMs,tier=0,{middleRoute='jump'}={}){
  const events=[],controls=[];let cursor=startMs;
  const padding=Math.max(.025,.09-tier*.018),variation=pattern.variant;
  const add=(kind,center,w,h,y)=>events.push({kind,centerMs:Math.round(center*1000),w,h,y,actionIndex:actionIndex,patternId:pattern.id});
  const input=(at,action)=>controls.push({atMs:Math.round(at*1000),action});
  let actionIndex=0;
  for(const step of pattern.steps){
    const t=cursor/1000;
    if(step==='S'){
      input(t,'duck');add('slide',t+.24,54+variation*2,350,0);input(t+.47,'release');cursor+=(.50+padding)*1000;
    }else if(step==='J'){
      input(t,'jump');add('ground',t+.34,54+variation*3,54+(variation%3)*3,390-(54+(variation%3)*3));
      input(t+.53,'duck');input(t+.74,'release');cursor+=(.78+padding)*1000;
    }else if(step==='D'){
      input(t,'jump');input(t+.20,'jump');add('double',t+.55,54+variation*3,172+(variation%3)*4,390-(172+(variation%3)*4));
      input(t+.74,'duck');input(t+1.07,'release');cursor+=(1.11+padding)*1000;
    }else{
      if(middleRoute==='jump'){input(t,'jump');input(t+.60,'duck');}else input(t,'duck');
      add('middle',t+.405,54+variation*3,54,292);
      input(t+.79,'release');cursor+=(.83+padding)*1000;
    }
    actionIndex++;
  }
  return {id:pattern.id,label:pattern.label,steps:pattern.steps,events,controls,startMs,endMs:Math.round(cursor),nextStartMs:Math.round(cursor+90),tier};
}

export function comboMotionBudget(pattern,tier){
 const compiled=compileJumpCombo(pattern,0,tier),seconds=compiled.nextStartMs/1000;
 const commands=pattern.steps.reduce((n,s)=>n+({S:1,J:2,D:3,M:2}[s]),0);
 return {seconds,obstacles:compiled.events.length,motionActions:commands,motionActionsPerSecond:commands/seconds,keyEvents:compiled.controls.length,keyEventsPerSecond:compiled.controls.length/seconds};
}
