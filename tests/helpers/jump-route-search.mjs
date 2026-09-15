import {jumpCollides,stepJumpPlayer,tryJump,jumpPlayerBox,jumpObstacleBox} from '../../public/js/jump-physics-v18.js';
export function solve(layout,speed,{maxStates=3500,margin=12,verticalMargin=3,hz=120,worldAt=null,motionAt=null,middleRoute='either'}={}){
 const dt=1/hz,travel=worldAt||((t)=>speed*t),frameCount=worldAt?Math.ceil(15000/1000*hz):Math.ceil(layout.length/speed*hz),position=layout.events.map(e=>({...e,w:e.w+margin*2,h:e.h+verticalMargin*2,y:e.y-verticalMargin,x:140-(e.w+margin*2)/2+e.offset}));
 let nodes=[{y:390,vy:0,jumps:0,duck:false,cost:0,path:null,age:12}];
 let peakStates=0,durationMs=0;
 for(let frame=0;frame<frameCount;frame++){
  const at=frame*dt,t=(frame+1)*dt,map=new Map();durationMs=t*1000;
  const relevant=position.filter(o=>{const x=o.x-travel(t);return x<170&&x+o.w>110;}).map(o=>({...o,x:o.x-travel(t)}));
  for(const n of nodes){
   const choices=['none'];if(frame%(motionAt?2:4)===0){if(n.jumps<2&&n.age>=12)choices.push('jump');if(!n.duck)choices.push('duck');else if(n.y===390)choices.push('release');}
   for(const action of choices){const p={...n,age:Math.min(12,n.age+1)};if(action==='jump'){tryJump(p);p.age=0;}else if(action==='duck')p.duck=true;else if(action==='release')p.duck=false;
    if(action!=='none'){p.cost+=action==='jump'?1:.35;p.path={atMs:at*1000,action,previous:n.path};}
    stepJumpPlayer(p,motionAt?motionAt(t)-motionAt(at):dt,p.duck&&p.y<390);if(relevant.some(o=>{if(jumpCollides(p,o))return true;if(o.kind!=='middle'||middleRoute==='either')return false;const a=jumpPlayerBox(p),b=jumpObstacleBox(o);if(a.x>=b.x+b.w||a.x+a.w<=b.x)return false;return middleRoute==='under'?a.y<b.y+b.h:a.y+a.h>b.y;}))continue;
    const key=[Math.round(p.y/3),Math.round(p.vy/45),p.jumps,+p.duck,p.age].join(':');const prev=map.get(key);if(!prev||p.cost<prev.cost)map.set(key,p);
   }
  }
  nodes=[...map.values()];peakStates=Math.max(peakStates,nodes.length);
  if(nodes.length>maxStates)nodes=nodes.sort((a,b)=>a.cost-b.cost).slice(0,maxStates);
  if(!nodes.length)return null;
  if(travel(t)>=layout.length)break;
 }
 const best=nodes.filter(p=>p.y===390).sort((a,b)=>a.cost-b.cost)[0];if(!best)return null;
 const controls=[];for(let p=best.path;p;p=p.previous)controls.push({atMs:p.atMs,action:p.action});controls.reverse();if(best.duck)controls.push({atMs:durationMs,action:'release'});
 return{controls,peakStates,seconds:durationMs/1000};
}