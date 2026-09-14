import test from 'node:test';
import assert from 'node:assert/strict';
import {cityCars,gameMode,gameModeNames,gameSettings} from '../public/js/game-options.js';
import {setupMarkup,groupSettingsMarkup} from '../public/js/game-setup.js';

const expected=[
 ['basic',1,30,4,.08,0,0],['sport',1.5,25,2.75,.20,0,50],['touring',.8,40,5,.10,2,50],
 ['compact',1.05,30,4.5,.18,0,75],['rally',1.18,34,4,.15,1,100],['pickup',.88,44,3.5,.08,4,125],
 ['van',.82,50,5.5,.12,3,150],['roadster',1.42,25,2.5,.28,0,200],
];

test('eight stable vehicles expose complete balanced simulation and purchase specs',()=>{
 assert.equal(cityCars.length,8);assert.equal(new Set(cityCars.map(car=>car.id)).size,8);
 assert.deepEqual(cityCars.map(car=>[car.id,car.speed,car.fuel,car.boostDuration,car.boostProc,car.armor,car.cost]),expected);
 for(const car of cityCars){assert.ok(car.name&&car.subtitle&&car.design);assert.equal(car.art,`/assets/pixel/illustrated/vehicles/${car.id}.png`);assert.ok(car.fuel>CITY_DAMAGE(car));}
});

function CITY_DAMAGE(car){return 10-car.armor;}

test('new starts use v16 while historical modes keep their version identity',()=>{
 assert.deepEqual(gameSettings('racing',{car:'roadster'}),{version:'v16',car:'roadster'});
 assert.deepEqual(gameSettings('racing',{car:'unknown'}),{version:'v16',car:'basic'});
 assert.equal(gameMode('racing',{car:'roadster'}),'city-roadster-v16');
 assert.equal(gameMode('racing',{version:'v7',car:'roadster'}),'city-roadster-v7');
 assert.equal(gameMode('racing',{version:'v6',car:'basic'}),'city-basic-v6');
 for(const car of cityCars){assert.equal(gameModeNames[`city-${car.id}-v16`],`도심 질주 · ${car.name} · 연료 도전`);assert.equal(gameModeNames[`city-${car.id}-v7`],`도심 질주 · ${car.name}`);}
});

test('garage markup explains every material stat and exact price before purchase',()=>{
 const garage={tokens:90,unlocked:['basic']};
 for(const car of cityCars){const html=setupMarkup('racing',{car:car.id},garage);assert.match(html,new RegExp(`/assets/pixel/illustrated/vehicles/${car.id}\\.png`));assert.match(html,new RegExp(`연료 <b>${car.fuel}`));assert.match(html,new RegExp(`충돌 피해 <b>-${10-car.armor}`));assert.match(html,new RegExp(`부스터 <b>${car.boostDuration}`));assert.match(html,new RegExp(`충전 행운 <b>${Math.round(car.boostProc*100)}%`));if(car.cost)assert.match(html,new RegExp(`${car.cost}토큰`));}
 const group=groupSettingsMarkup('racing',{unlocked:cityCars.map(car=>car.id)});for(const car of cityCars)assert.match(group,new RegExp(`${car.name}[^<]*속도 ×${car.speed}[^<]*연료 ${car.fuel}[^<]*충돌 -${10-car.armor}`));
});
