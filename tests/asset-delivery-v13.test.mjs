import test from 'node:test';import assert from 'node:assert/strict';
import {assetUrl,warmImage,readyImage} from '../public/js/asset-delivery.js';
import {gameAssetSources,prepareGameAssets} from '../public/js/game-assets.js';
import {DELIVERY_ASSETS} from '../public/js/asset-manifest.js';

test('critical assets contain only selected car rears and required gameplay sprites',()=>{
 const cars=gameAssetSources('racing',{car:'rally'});assert.ok(cars.includes('/assets/pixel/scenes/player-rally-rear.png'));assert.ok(cars.includes('/assets/pixel/scenes/traffic-bus-rear.png'));assert.ok(!cars.some(s=>/traffic-.*-(front|left|right)/.test(s)));assert.ok(!cars.includes('/assets/pixel/scenes/player-sport-rear.png'));const jump=gameAssetSources('jump');assert.equal(jump.filter(s=>s.includes('jump-obstacle')).length,4);assert.ok(gameAssetSources('typing',{characterId:'owl-aviator',startStage:11}).some(s=>s.endsWith('duel-hero-15.png')));
});
test('delivery paths are content-addressed and leave unknown paths unchanged',()=>{
 assert.match(assetUrl('/assets/pixel/woodland-pets.png'),/^\/assets\/delivery\/woodland-pets-[a-f0-9]{12}\.webp$/);assert.equal(assetUrl('/unlisted.png'),'/unlisted.png');const atlas=DELIVERY_ASSETS['/assets/pixel/woodland-pets.png'];assert.ok(atlas.bytes<atlas.originalBytes*.4);
});
test('warmup waits for decode, shares requests, retries failures, and aborts gates',async()=>{
 const OldImage=globalThis.Image,images=[];globalThis.Image=class{constructor(){images.push(this);this.naturalWidth=16;}decode(){return this.decodingPromise||Promise.resolve();}set src(v){this.url=v;}};
 try{const a=warmImage('/test-unique-v13.png'),b=warmImage('/test-unique-v13.png');assert.equal(a,b);assert.equal(images.length,1);let decode;images[0].decodingPromise=new Promise(r=>decode=r);images[0].onload();let done=false;a.then(()=>done=true);await Promise.resolve();assert.equal(done,false);decode();assert.equal(await a,true);assert.equal(readyImage('/test-unique-v13.png'),images[0]);
 const failed=warmImage('/test-failed-v13.png');images[1].onerror();assert.equal(await failed,false);const retry=warmImage('/test-failed-v13.png');assert.equal(images.length,3);images[2].onload();assert.equal(await retry,true);
 const timed=await warmImage('/test-timeout-v13.png',{timeoutMs:2});assert.equal(timed,false);
 const controller=new AbortController();controller.abort();assert.equal((await prepareGameAssets('sort',{}, {signal:controller.signal})).aborted,true);
 }finally{globalThis.Image=OldImage;}
});
