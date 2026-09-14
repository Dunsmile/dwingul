import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY,createCityEngine,vehicleLength} from '../public/js/legacy/city-engine-v7.js';
import {cityProjection,vehicleFootprint,vehicleSpriteBox} from '../public/js/city-projection.js';
import {cityCars} from '../public/js/game-options.js';
import {seededRandom} from '../public/js/game-random.js';

const closeTo=(actual,expected,epsilon=1e-7)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} should be within ${epsilon} of ${expected}`);
function quietEngine(options={}){const engine=createCityEngine({random:seededRandom('city-v11-quiet'),...options});engine.state.nextAt=engine.state.nextCoinAt=engine.state.nextFuelAt=1e9;return engine;}
const touching=(id=1,overrides={})=>({id,lane:2,type:'car',z:0,evaded:false,contacting:false,...overrides});

test('v7 uses fuel as recoverable health with one hit per overlap and immunity',()=>{
 assert.equal(CITY.fuelDrain,.5);
 assert.equal(CITY.collisionDamage,10);
 assert.ok(CITY.collisionImmunity>=.8&&CITY.collisionImmunity<=1);
 const engine=quietEngine(),start=engine.state.fuel;
 engine.state.vehicles=[touching(1),touching(2)];
 engine.tick(4);
 closeTo(engine.state.fuel,start-10-CITY.fuelDrain*.004);
 assert.equal(engine.state.hits,1);
 assert.deepEqual(engine.state.contactIds,[1,2]);
 assert.equal(engine.state.ended,false);
 engine.tick(4);
 closeTo(engine.state.fuel,start-10-CITY.fuelDrain*.008);
 assert.equal(engine.state.hits,1,'the same overlap cannot deal repeated damage');

 engine.state.vehicles[0].z=30;engine.state.vehicles[1].z=30;engine.tick(4);
 assert.deepEqual(engine.state.contactIds,[]);
 engine.state.immunity=0;engine.state.vehicles[0].z=0;engine.tick(4);
 assert.equal(engine.state.hits,2,'leaving and entering contact starts a new overlap');

 const protectedEngine=quietEngine();protectedEngine.state.immunity=.5;protectedEngine.state.vehicles=[touching(3)];
 const protectedFuel=protectedEngine.state.fuel;protectedEngine.tick(4);
 closeTo(protectedEngine.state.fuel,protectedFuel-CITY.fuelDrain*.004);
 assert.equal(protectedEngine.state.hits,0);
 protectedEngine.state.immunity=0;protectedEngine.tick(4);
 assert.equal(protectedEngine.state.hits,0,'contact begun during immunity stays protected until separation');
});

test('armor mitigates collision damage and an empty tank ends with the fuel reason',()=>{
 const armored=quietEngine({car:'pickup'});armored.state.vehicles=[touching()];armored.tick(4);
 closeTo(armored.state.fuel,armored.spec.fuel-(CITY.collisionDamage-armored.spec.armor)-CITY.fuelDrain*.004);
 assert.equal(armored.state.lastDamage,6);
 const empty=quietEngine();empty.state.fuel=5;empty.state.vehicles=[touching()];empty.tick(4);
 assert.equal(empty.state.fuel,0);assert.equal(empty.state.ended,true);assert.equal(empty.state.reason,'fuel');
});

test('fuel drain, fuel recovery and pickup density use the v7 rules',()=>{
 for(const car of cityCars){const engine=quietEngine({car:car.id});engine.tick(1000);closeTo(engine.state.fuel,car.fuel-.5);}
 const engine=createCityEngine({random:seededRandom('city-v11-pickups')});engine.state.nextAt=1e9;
 assert.ok(engine.state.nextCoinAt>=100&&engine.state.nextCoinAt<150);
 assert.ok(engine.state.nextFuelAt>=93&&engine.state.nextFuelAt<121);
 const firstCoin=engine.state.nextCoinAt,firstFuel=engine.state.nextFuelAt;engine.tick(4);
 const coinGap=engine.state.nextCoinAt-firstCoin,fuelGap=engine.state.nextFuelAt-firstFuel;
 assert.ok(coinGap>=100&&coinGap<154);assert.ok(fuelGap>=366&&fuelGap<467);
 const recovery=quietEngine();recovery.state.fuel=1;recovery.state.pickups=[{id:9,lane:2,z:.2,type:'fuel'}];recovery.tick(4);
 closeTo(recovery.state.fuel,1-CITY.fuelDrain*.004+CITY.fuelPickup);
});

test('coin boost proc and each boost duration remain deterministic',()=>{
 const proc=quietEngine({car:'roadster',random:()=>0});proc.state.pickups=[{id:1,lane:2,z:.2,type:'coin'}];proc.tick(4);
 assert.equal(proc.state.coins,1);assert.equal(proc.state.boost,1);assert.equal(proc.state.boostProcs,1);
 const miss=quietEngine({car:'roadster',random:()=>.999});miss.state.pickups=[{id:1,lane:2,z:.2,type:'coin'}];miss.tick(4);
 assert.equal(miss.state.coins,1);assert.equal(miss.state.boost,0);assert.equal(miss.state.boostProcs,0);
 for(const spec of cityCars){const engine=quietEngine({car:spec.id});engine.state.boost=10;assert.equal(engine.boost(),true);engine.tick(Math.round(spec.boostDuration*1000)-4);assert.equal(engine.state.boosting,true,spec.id);engine.tick(8);assert.equal(engine.state.boosting,false,spec.id);}
});

test('seeded v7 runs replay with identical damage, pickups and procs',()=>{
 const play=engine=>{let elapsed=0;for(const [at,direction] of [[500,-1],[900,1],[1400,1],[1900,-1]]){engine.tick(at-elapsed);engine.move(direction);elapsed=at;}engine.tick(3100-elapsed);};
 const a=createCityEngine({car:'rally',random:seededRandom('racing:city-v11-replay')});play(a);
 const b=createCityEngine({car:'rally',random:seededRandom('racing:city-v11-replay')});let elapsed=0;for(const [at,direction] of a.state.inputs){b.tick(at-elapsed);direction===0?b.boost():b.move(direction);elapsed=at;}b.tick(3100-elapsed);
 assert.deepEqual(b.state,a.state);
});

test('upright sprites keep a visible road footprint and an exact wheel-floor anchor',()=>{
 const project=cityProjection(630);
 for(const type of ['car','van','truck','bus']){const vehicle={lane:2,z:20,type};const floor=vehicleFootprint(vehicle,project),box=vehicleSpriteBox(vehicle,project);closeTo(box.floorY,Math.max(...floor.map(point=>point.y)));assert.ok(box.y<box.floorY);assert.ok(box.height>box.width*.95);assert.equal(box.length,vehicleLength(vehicle));}
 const player=vehicleSpriteBox({lane:2,z:0,type:'basic'},project,{player:true});assert.equal(player.length,CITY.playerHalfLength*2);assert.ok(player.floorY<player.y+player.height,'transparent pixels extend below the wheel anchor');
});
