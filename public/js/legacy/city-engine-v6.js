import {cityCars} from '../game-options.js';
import {trafficLength,trafficCandidate,hasTrafficPath} from '../city-traffic.js';
export const CITY=Object.freeze({horizon:240,acceleration:1.08,baseSpeed:18,maxSpeed:42,playerHalfWidth:.27,playerHalfLength:1.8,carHalfWidth:.32,busHalfWidth:.36,laneSeconds:.012,evadeMin:1,evadeMax:6,fuelDrain:2,fuelPickup:15,boostDrain:2});
export const vehicleLength=trafficLength;
export const lateralGap=(x,v)=>Math.abs(x-v.lane)-CITY.playerHalfWidth-(v.type==='bus'?.36:.32);
export const longitudinalOverlap=v=>Math.abs(v.z)<vehicleLength(v)/2+CITY.playerHalfLength;
export const cityCollision=(x,v)=>longitudinalOverlap(v)&&lateralGap(x,v)<0;
export const frontGap=v=>v.z-vehicleLength(v)/2-CITY.playerHalfLength;
export function citySpeed(car,seconds,boosting=false){return Math.min(CITY.maxSpeed,CITY.baseSpeed+seconds*CITY.acceleration)*car.speed*(boosting?2:1);}
export function createCityEngine({car='basic',random=Math.random}={}){
 const spec=cityCars.find(c=>c.id===car)||cityCars[0];
 const state={car:spec.id,lane:2,x:2,fuel:spec.fuel,maxFuel:spec.fuel,boost:0,boosting:false,distance:0,seconds:0,speed:citySpeed(spec,0),coins:0,nearMisses:0,boosts:0,ended:false,reason:'',inputs:[],vehicles:[],pickups:[],patterns:[],nextAt:60,nextCoinAt:150+random()*70,nextFuelAt:140+random()*40,flash:'',flashTime:0,serial:0,evadeCandidates:[],generated:0};
 const maximumSpeed=CITY.maxSpeed*spec.speed*2;
 function move(direction){const next=Math.max(0,Math.min(4,state.lane+Math.sign(direction)));if(state.ended||next===state.lane)return;
  state.inputs.push([Math.round(state.seconds*1000),Math.sign(direction)]);
  if(Math.abs(state.x-state.lane)<.15)for(const v of state.vehicles){const gap=frontGap(v);if(!v.evaded&&v.lane===state.lane&&gap>=CITY.evadeMin-1e-8&&gap<=CITY.evadeMax+1e-8)state.evadeCandidates.push({id:v.id,from:state.lane,to:next,gap,expires:state.seconds+.1});}
  state.lane=next;
 }
 function boost(){if(!state.ended&&!state.boosting&&state.boost>=10-1e-8){state.inputs.push([Math.round(state.seconds*1000),0]);state.boosting=true;state.boosts++;return true;}return false;}
 function near(v,candidate){v.evaded=true;state.nearMisses++;state.boost=Math.min(10,state.boost+1);state.flash=`아슬아슬 회피! ${candidate.gap.toFixed(1)}m · +1`;state.flashTime=1;}
 function pickup(type){if(type==='fuel'){state.fuel=Math.min(spec.fuel,state.fuel+15);state.flash='연료 +15';}else{state.coins++;state.flash='동전 +1';}state.flashTime=.7;}
 function spawnVehicle(){const z=state.nextAt-state.distance;let accepted=null;
  for(let attempt=0;attempt<24;attempt++){const candidate=trafficCandidate(random,z);if(state.vehicles.some(v=>v.lane===candidate.lane&&Math.abs(v.z-z)<(vehicleLength(v)+vehicleLength(candidate))/2+4))continue;
   if(hasTrafficPath([...state.vehicles,candidate],{startLane:state.x,maxSpeed:maximumSpeed,horizon:z+14})){accepted=candidate;break;}}
  if(accepted){state.vehicles.push({...accepted,id:++state.serial,evaded:false});state.generated++;state.patterns.push(`${accepted.lane}:${accepted.type}:${Math.round(state.nextAt)}`);if(state.patterns.length>25)state.patterns.shift();}
  // Individual vehicles can repeat a lane, arrive close together, or leave a breathing gap.
  const gap=8+random()*26+(random()<.13?12+random()*12:0);state.nextAt+=gap;
 }
 function spawnPickup(type,worldZ){const z=worldZ-state.distance,free=[0,1,2,3,4].filter(lane=>!state.vehicles.some(v=>v.lane===lane&&Math.abs(v.z-z)<vehicleLength(v)/2+7));
  if(free.length)state.pickups.push({id:++state.serial,lane:free[Math.floor(random()*free.length)],z,type});
 }
 function step(dt){if(state.ended)return;const seconds=Math.min(dt,state.fuel/CITY.fuelDrain);state.seconds+=seconds;state.speed=citySpeed(spec,state.seconds,state.boosting);const distance=state.speed*seconds;state.distance+=distance;state.fuel=Math.max(0,state.fuel-2*seconds);state.flashTime=Math.max(0,state.flashTime-seconds);
  if(state.boosting){state.boost=Math.max(0,state.boost-2*seconds);if(state.boost<=1e-8){state.boost=0;state.boosting=false;}}
  state.x+=Math.sign(state.lane-state.x)*Math.min(Math.abs(state.lane-state.x),seconds/CITY.laneSeconds);
  for(const v of state.vehicles)v.z-=distance;for(const p of state.pickups)p.z-=distance;
  if(state.vehicles.some(v=>cityCollision(state.x,v))){state.ended=true;state.reason='collision';return;}
  for(const candidate of state.evadeCandidates){const v=state.vehicles.find(v=>v.id===candidate.id);if(v&&!v.evaded&&state.lane===candidate.to&&Math.abs(state.x-candidate.to)<.02&&state.seconds<=candidate.expires&&frontGap(v)<=CITY.evadeMax)near(v,candidate);}
  state.evadeCandidates=state.evadeCandidates.filter(c=>c.expires>state.seconds&&state.vehicles.some(v=>v.id===c.id&&!v.evaded));
  for(const p of state.pickups)if(!p.taken&&Math.abs(p.z)<2.4&&Math.abs(p.lane-state.x)<.48){p.taken=true;pickup(p.type);}
  state.vehicles=state.vehicles.filter(v=>v.z>-20);state.pickups=state.pickups.filter(p=>p.z>-12&&!p.taken);
  while(state.nextAt-state.distance<=CITY.horizon)spawnVehicle();
  while(state.nextCoinAt-state.distance<=CITY.horizon-15){spawnPickup('coin',state.nextCoinAt);state.nextCoinAt+=150+random()*80;}
  while(state.nextFuelAt-state.distance<=CITY.horizon-15){spawnPickup('fuel',state.nextFuelAt);state.nextFuelAt+=550+random()*150;}
  if(state.fuel<=0){state.ended=true;state.reason='fuel';}
 }
 let pendingMs=0;function tick(ms){pendingMs+=Math.max(0,ms);while(pendingMs>=4-1e-7&&!state.ended){step(.004);pendingMs-=4;}}
 return{state,spec,move,boost,tick};
}
