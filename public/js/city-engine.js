import {cityCars} from './game-options.js';
import {trafficLength,trafficCandidate,hasTrafficPath} from './city-traffic.js';

export const CITY=Object.freeze({
 horizon:240,acceleration:1.08,baseSpeed:18,maxSpeed:42,
 playerHalfWidth:.27,playerHalfLength:1.8,carHalfWidth:.32,busHalfWidth:.36,
 laneSeconds:.012,evadeMin:1,evadeMax:6,
 fuelDrain:.5,fuelPickup:15,collisionDamage:10,collisionImmunity:.9,boostCharge:10,
 coinStartMin:100,coinStartRange:140/3,fuelStartMin:280/3,fuelStartRange:80/3,
 coinGapMin:100,coinGapRange:160/3,fuelGapMin:1100/3,fuelGapRange:100,
});
export const vehicleLength=trafficLength;
export const lateralGap=(x,v)=>Math.abs(x-v.lane)-CITY.playerHalfWidth-(v.type==='bus'?.36:.32);
export const longitudinalOverlap=v=>Math.abs(v.z)<vehicleLength(v)/2+CITY.playerHalfLength;
export const cityCollision=(x,v)=>longitudinalOverlap(v)&&lateralGap(x,v)<0;
export const frontGap=vehicle=>vehicle.z-vehicleLength(vehicle)/2-CITY.playerHalfLength;
export function citySpeed(car,seconds,boosting=false){return Math.min(CITY.maxSpeed,CITY.baseSpeed+seconds*CITY.acceleration)*car.speed*(boosting?2:1);}

export function createCityEngine({car='basic',random=Math.random}={}){
 const spec=cityCars.find(candidate=>candidate.id===car)||cityCars[0],boostDrain=CITY.boostCharge/spec.boostDuration;
 const state={car:spec.id,lane:2,x:2,fuel:spec.fuel,maxFuel:spec.fuel,boost:0,boosting:false,distance:0,seconds:0,speed:citySpeed(spec,0),coins:0,nearMisses:0,boosts:0,boostProcs:0,hits:0,lastDamage:0,immunity:0,contactIds:[],ended:false,reason:'',inputs:[],vehicles:[],pickups:[],patterns:[],nextAt:60,nextCoinAt:CITY.coinStartMin+random()*CITY.coinStartRange,nextFuelAt:CITY.fuelStartMin+random()*CITY.fuelStartRange,flash:'',flashTime:0,serial:0,evadeCandidates:[],generated:0};
 const maximumSpeed=CITY.maxSpeed*spec.speed*2;

 function move(direction){const next=Math.max(0,Math.min(4,state.lane+Math.sign(direction)));if(state.ended||next===state.lane)return;
  state.inputs.push([Math.round(state.seconds*1000),Math.sign(direction)]);
  if(Math.abs(state.x-state.lane)<.15)for(const vehicle of state.vehicles){const gap=frontGap(vehicle);if(!vehicle.evaded&&vehicle.lane===state.lane&&gap>=CITY.evadeMin-1e-8&&gap<=CITY.evadeMax+1e-8)state.evadeCandidates.push({id:vehicle.id,from:state.lane,to:next,gap,expires:state.seconds+.1});}
  state.lane=next;
 }
 function boost(){if(!state.ended&&!state.boosting&&state.boost>=CITY.boostCharge-1e-8){state.inputs.push([Math.round(state.seconds*1000),0]);state.boosting=true;state.boosts++;return true;}return false;}
 function near(vehicle,candidate){vehicle.evaded=true;state.nearMisses++;state.boost=Math.min(CITY.boostCharge,state.boost+1);state.flash=`아슬아슬 회피! ${candidate.gap.toFixed(1)}m · +1`;state.flashTime=1;}
 function pickup(type){
  if(type==='fuel'){state.fuel=Math.min(spec.fuel,state.fuel+CITY.fuelPickup);state.flash=`연료 +${CITY.fuelPickup}`;}
  else{state.coins++;const proc=random()<spec.boostProc;if(proc){state.boost=Math.min(CITY.boostCharge,state.boost+1);state.boostProcs++;}state.flash=proc?'동전 +1 · 부스터 +1':'동전 +1';}
  state.flashTime=.7;
 }
 function damageOverlaps(){let damaged=false;const previous=new Set(state.contactIds),current=[];
  for(const vehicle of state.vehicles){if(!cityCollision(state.x,vehicle))continue;current.push(vehicle.id);if(previous.has(vehicle.id)||damaged||state.immunity>1e-8)continue;const damage=Math.max(1,CITY.collisionDamage-spec.armor);state.fuel=Math.max(0,state.fuel-damage);state.hits++;state.lastDamage=damage;state.immunity=CITY.collisionImmunity;state.flash=`충돌 -${damage} 연료 · 잠깐 보호`;state.flashTime=1;damaged=true;
  }state.contactIds=current;
  return damaged;
 }
 function spawnVehicle(){const z=state.nextAt-state.distance;let accepted=null;
  for(let attempt=0;attempt<24;attempt++){const candidate=trafficCandidate(random,z);if(state.vehicles.some(vehicle=>vehicle.lane===candidate.lane&&Math.abs(vehicle.z-z)<(vehicleLength(vehicle)+vehicleLength(candidate))/2+4))continue;
   if(hasTrafficPath([...state.vehicles,candidate],{startLane:state.x,maxSpeed:maximumSpeed,horizon:z+14})){accepted=candidate;break;}}
  if(accepted){state.vehicles.push({...accepted,id:++state.serial,evaded:false});state.generated++;state.patterns.push(`${accepted.lane}:${accepted.type}:${Math.round(state.nextAt)}`);if(state.patterns.length>25)state.patterns.shift();}
  const gap=8+random()*26+(random()<.13?12+random()*12:0);state.nextAt+=gap;
 }
 function spawnPickup(type,worldZ){const z=worldZ-state.distance,free=[0,1,2,3,4].filter(lane=>!state.vehicles.some(vehicle=>vehicle.lane===lane&&Math.abs(vehicle.z-z)<vehicleLength(vehicle)/2+7));if(free.length)state.pickups.push({id:++state.serial,lane:free[Math.floor(random()*free.length)],z,type});}
 function step(dt){if(state.ended)return;const seconds=Math.min(dt,state.fuel/CITY.fuelDrain);state.seconds+=seconds;state.speed=citySpeed(spec,state.seconds,state.boosting);const distance=state.speed*seconds;state.distance+=distance;state.fuel=Math.max(0,state.fuel-CITY.fuelDrain*seconds);state.flashTime=Math.max(0,state.flashTime-seconds);state.immunity=Math.max(0,state.immunity-seconds);
  if(state.boosting){state.boost=Math.max(0,state.boost-boostDrain*seconds);if(state.boost<=1e-8){state.boost=0;state.boosting=false;}}
  state.x+=Math.sign(state.lane-state.x)*Math.min(Math.abs(state.lane-state.x),seconds/CITY.laneSeconds);
  for(const vehicle of state.vehicles)vehicle.z-=distance;for(const item of state.pickups)item.z-=distance;
  const damaged=damageOverlaps();
  if(!damaged)for(const candidate of state.evadeCandidates){const vehicle=state.vehicles.find(item=>item.id===candidate.id);if(vehicle&&!vehicle.evaded&&state.lane===candidate.to&&Math.abs(state.x-candidate.to)<.02&&state.seconds<=candidate.expires&&frontGap(vehicle)<=CITY.evadeMax)near(vehicle,candidate);}
  state.evadeCandidates=state.evadeCandidates.filter(candidate=>candidate.expires>state.seconds&&state.vehicles.some(vehicle=>vehicle.id===candidate.id&&!vehicle.evaded));
  for(const item of state.pickups)if(!item.taken&&Math.abs(item.z)<2.4&&Math.abs(item.lane-state.x)<.48){item.taken=true;pickup(item.type);}
  state.vehicles=state.vehicles.filter(vehicle=>vehicle.z>-20);state.pickups=state.pickups.filter(item=>item.z>-12&&!item.taken);
  while(state.nextAt-state.distance<=CITY.horizon)spawnVehicle();
  while(state.nextCoinAt-state.distance<=CITY.horizon-15){spawnPickup('coin',state.nextCoinAt);state.nextCoinAt+=CITY.coinGapMin+random()*CITY.coinGapRange;}
  while(state.nextFuelAt-state.distance<=CITY.horizon-15){spawnPickup('fuel',state.nextFuelAt);state.nextFuelAt+=CITY.fuelGapMin+random()*CITY.fuelGapRange;}
  if(state.fuel<=0){state.ended=true;state.reason='fuel';}
 }
 let pendingMs=0;function tick(ms){pendingMs+=Math.max(0,ms);while(pendingMs>=4-1e-7&&!state.ended){step(.004);pendingMs-=4;}}
 return{state,spec,move,boost,tick};
}
