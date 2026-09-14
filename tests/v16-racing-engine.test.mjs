import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CITY,createCityEngine,citySpeed} from '../public/js/city-engine.js';
import {CITY as V7_CITY,createCityEngine as createV7} from '../public/js/legacy/city-engine-v7.js';
import {cityCars} from '../public/js/game-options.js';
import {seededRandom} from '../public/js/game-random.js';

const close=(actual,expected,epsilon=1e-7)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
function quiet(engine){engine.state.nextAt=engine.state.nextCoinAt=engine.state.nextFuelAt=1e9;return engine;}

test('v16 fuel has visible depletion and bounded recovery for all eight car traits',()=>{
 assert.equal(cityCars.length,8);assert.equal(CITY.fuelDrain,1.1);assert.equal(CITY.fuelPickup,8);
 for(const car of cityCars){const engine=quiet(createCityEngine({car:car.id}));engine.tick(5000);close(engine.state.fuel,car.fuel-5.5);engine.state.pickups=[{id:1,lane:2,z:.2,type:'fuel'}];engine.tick(4);assert.ok(engine.state.fuel<=car.fuel);close(engine.state.fuel,Math.min(car.fuel,car.fuel-5.504+8));}
});

test('speed grows with elapsed play time before reaching its explicit cap',()=>{
 for(const car of cityCars){assert.ok(citySpeed(car,10)>citySpeed(car,0),car.id);assert.ok(citySpeed(car,30)>citySpeed(car,10),car.id);assert.equal(citySpeed(car,100),CITY.maxSpeed*car.speed);}
});

test('v16 fuel pickups are delayed and spaced so one pickup cannot erase its interval drain',()=>{
 const engine=createCityEngine({random:seededRandom('v16-pickups')});engine.state.nextAt=engine.state.nextCoinAt=1e9;
 assert.ok(engine.state.nextFuelAt>=220&&engine.state.nextFuelAt<280);engine.state.nextFuelAt=200;const first=engine.state.nextFuelAt;engine.tick(4);const gap=engine.state.nextFuelAt-first;assert.ok(gap>=650&&gap<850);assert.ok(gap/CITY.maxSpeed*CITY.fuelDrain>CITY.fuelPickup);
});

test('frozen v7 keeps its exact balance independently of v16',()=>{
 assert.equal(V7_CITY.fuelDrain,.5);assert.equal(V7_CITY.fuelPickup,15);assert.equal(V7_CITY.acceleration,1.08);
 const engine=quiet(createV7({car:'basic'}));engine.tick(1000);close(engine.state.fuel,29.5);close(engine.state.speed,19.08);
});

test('renderer grounds scenery to full road distance, shows contact shadows, and delays v16 result',async()=>{
 const source=await readFile(new URL('../public/js/city-racing.js',import.meta.url),'utf8');
 assert.match(source,/i\*17-s\.distance\)\%330/);assert.doesNotMatch(source,/s\.distance\*\.5/);assert.match(source,/g\.ellipse\(p\.x,p\.y/);
 assert.match(source,/resultFreezeMs>=650/);assert.match(source,/mode:`city-\$\{s\.car\}-\$\{rulesVersion\}`/);assert.match(source,/v7:createCityV7,v16:createCityEngine/);
});
