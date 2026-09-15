import {jumpWorldDistanceV18,jumpWorldSpeedV18} from './jump-combos-v18.js';


export function jumpMotionTimeForWorldV19(pixels){
 let remaining=Math.max(0,pixels),time=0;
 for(let index=0;index<10;index++){const speed=310+index*32,span=speed*10;if(remaining<=span)return time+remaining/speed*1000;remaining-=span;time+=10000;}
 return time+remaining/630*1000;
}
// Late stages run the same physical course at a faster rhythm. Both world and
// vertical motion share this clock, so clearable jump arcs never get stretched.
export const JUMP_STAGE_TEMPO=Object.freeze([1,1,1.08,1.16,1.24,1.40]);
const motionBounds=[0,1,2,3,4,5].map(i=>jumpMotionTimeForWorldV19(i*20000));
const wallBounds=[0];for(let i=1;i<6;i++)wallBounds[i]=wallBounds[i-1]+(motionBounds[i]-motionBounds[i-1])/JUMP_STAGE_TEMPO[i-1];
export function jumpMotionTimeV19(ms){let i=5;while(i>0&&ms<wallBounds[i])i--;return motionBounds[i]+(ms-wallBounds[i])*JUMP_STAGE_TEMPO[i];}
export function jumpWallTimeV19(ms){let i=5;while(i>0&&ms<motionBounds[i])i--;return wallBounds[i]+(ms-motionBounds[i])/JUMP_STAGE_TEMPO[i];}
export const jumpWorldDistanceV19=ms=>jumpWorldDistanceV18(jumpMotionTimeV19(ms));
export const jumpWorldSpeedV19=ms=>{const t=jumpMotionTimeV19(ms);let i=5;while(i>0&&t<motionBounds[i])i--;return jumpWorldSpeedV18(t)*JUMP_STAGE_TEMPO[i];};
export const jumpWorldTimeV19=pixels=>jumpWallTimeV19(jumpMotionTimeForWorldV19(pixels));
export const jumpCourseStage=distance=>Math.min(5,Math.floor(Math.max(0,distance)/1000));
export const JUMP_V19_RULES=Object.freeze({startDistance:1050,lookAhead:1500,maxLives:3,jumpBufferMs:120});
// Gap sizes are world pixels, independent of current or predicted speed. Rows
// are authored transitions; SS/JJ/JD/DD are deliberately contiguous clusters.
const GAPS={SS:108,SJ:245,SD:325,SM:205,JJ:115,JD:155,JM:145,JS:218,DJ:145,DD:145,DM:170,DS:242,MJ:145,MD:170,MM:130,MS:215};
const SHAPES={S:{kind:'slide',w:62,h:350,y:0},J:{kind:'ground',w:62,h:58,y:332},D:{kind:'double',w:60,h:174,y:216},M:{kind:'middle',w:60,h:54,y:292}};
const pools=[
 ['SSJ','JJS','JDS','SJS','MJS','DSS','SJDS','JSSJ'],
 ['SSJDS','JJSJS','MJDS','SJDSS','DSJJS','MJJDS','JSSDS','SDSJS','JDSSJ'],
 ['MJDSSJS','JDSJDS','SSJJDS','DJSSJDS','SJJDSDSS','MDSSJJS','JSDJSDS','MJDSJSS','JDSSMJS','DSJJDS'],
 ['MJDSSJSDSS','JDSJDSJS','SSJJDSDSS','DJSSJDSJS','SJJDSDSSSJ','MDSSJJDS','JSDJSDSJ','MJDSJSSDS','JDSSMJDSS','DSJJDSJS','MDDSSJDS','SJDMJSDS'],
 ['MJDSSJSDSS','JDSJDSJSDS','SSJJDSDSSJ','DJSSJDSJDS','SJJDSDSSJS','MDSSJJDSJS','JSDJSDSJD','MJDSJSSDSJ','JDSSMJDSS','DSJJDSJSSSS','MDDSSJDSJS','SJDMJSDSJS','JDDSSMJSDS','MSJJDSDJSS','DJSJMJDSS','JJDSMJSDSS'],
 ['MJDSSSDJDSDSJS','DSDSDSJDSDSDS','SSSSSJJDSDSDJS','DDDSDSJSSSDSJD','SJJDDSSDSDSJDS','MDSSSSJJDSDSJS','JSDSDSDSDSJD','MJDSJSSSSSDSJD','JDSSMJDSDSDS','DSJJDSJSSSDSDS','MDDSSDSJDSDSJS','SJDMJSDSDSJDS','JDDSSMJSDSJDS','MSJJDSDJSSSDS','DJSJMJDSDSJS','JJDSMJSDSDSJ','MJDSSDJSSDSDS','JSSSMJDSSJDS','SDJJSSMJDSDS','MJJDSJSDSJDS'],
];
export const JUMP_STAGE_CONFIG=Object.freeze([
 {label:'1탄 · 적응',gapScale:1.32,lead:300,tail:210},
 {label:'2탄 · 연속',gapScale:1.18,lead:300,tail:190},
 {label:'3탄 · 고난도',gapScale:1.06,lead:280,tail:180},
 {label:'4탄 · 급전환',gapScale:.98,lead:280,tail:165},
 {label:'5탄 · 초고수',gapScale:.93,lead:270,tail:160},
 {label:'6탄 · 마스터',gapScale:.86,lead:240,tail:160},
].map(Object.freeze));
export const jumpCoursePools=Object.freeze(pools.map((pool,stage)=>Object.freeze(pool.map((sequence,index)=>Object.freeze({id:`course-${stage+1}-${index+1}`,sequence,stage})))));
export function courseLayout(template,variant=0){
 const config=JUMP_STAGE_CONFIG[template.stage];let offset=Math.max(config.lead,template.sequence[0]==='D'?300:0);
 const events=[...template.sequence].map((symbol,i)=>{
  // Four different, nonperiodic spacing arrangements, not a speed multiplier.
  const variation=variant===0?1:[.96,1.03,1.01,.98][(i*7+variant)%4];
  if(i){
   const pair=template.sequence[i-1]+symbol;
   const afterMiddle=template.sequence[i-1]==='M';
   const minimum={SD:355,SJ:template.stage===5?230:240,DS:235,JS:template.stage===5?205:215,SM:310,DM:285,JM:245,MS:235,JD:145,DD:140,DJ:140}[pair]||(afterMiddle?(symbol==='D'?355:symbol==='J'?220:0):0);
   offset+=Math.max(minimum,Math.round(GAPS[pair]*config.gapScale*variation));
  }
  return {...SHAPES[symbol],offset,symbol,index:i};
 });
 // In master courses, low crates immediately precede selected tall barriers.
 // One correctly timed double jump clears the cluster; the extra silhouette
 // increases visual density without adding an impossible third jump.
 if(template.stage===5){const extra=[];for(let i=1;i<events.length;i++)if(events[i].symbol==='D'&&events[i-1].symbol==='S')extra.push({...SHAPES.J,offset:events[i].offset-72,symbol:'J',cluster:true});events.push(...extra);events.sort((a,b)=>a.offset-b.offset);events.forEach((e,i)=>e.index=i);}
 return {id:`${template.id}-${variant}`,templateId:template.id,sequence:events.map(e=>e.symbol).join(''),stage:template.stage,variant,events,length:events.at(-1).offset+config.tail};
}
// Similar-looking strings count as repetitions too, even if their endings differ.
export function courseSimilarity(a,b){
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
 return 1-row[b.length]/Math.max(a.length,b.length,1);
}
export const jumpTransitionPools=Object.freeze(jumpCoursePools.map((_,stage)=>Object.freeze(['JS','DS','SSJ'].map((sequence,index)=>Object.freeze({id:`bridge-${stage+1}-${index+1}`,stage,sequence})))));
export function chooseCourse(random,stage,recent=[],maxLength=Infinity){
 const variant=Math.floor(random()*4);
 let layouts=jumpCoursePools[stage].map(p=>courseLayout(p,variant)).filter(l=>l.length<=maxLength);
 if(!layouts.length)layouts=jumpTransitionPools[stage].map(p=>courseLayout(p,variant)).filter(l=>l.length<=maxLength);
 if(!layouts.length)return null;
 const unseen=layouts.filter(p=>!recent.includes(p.sequence));if(unseen.length)layouts=unseen;
 const difference=p=>recent.length?Math.min(...recent.map(s=>1-courseSimilarity(s,p.sequence))):1;
 let candidates=layouts.filter(p=>difference(p)>.22);
 // Tiny early-stage/transition pools can run out. Prefer the least similar
 // remaining sequence instead of falling back to uniform repeat selection.
 if(!candidates.length){const best=Math.max(...layouts.map(difference));candidates=layouts.filter(p=>difference(p)>=best-.001);}
 return candidates[Math.floor(random()*candidates.length)];
}
