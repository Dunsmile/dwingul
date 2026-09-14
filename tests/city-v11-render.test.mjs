import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cityTrafficRearSource} from '../public/js/city-vehicle-art.js';

const source=await readFile(new URL('../public/js/city-racing.js',import.meta.url),'utf8');

test('city renderer uses upright illustrated player and traffic sprites with a geometric fallback',()=>{
 assert.match(source,/vehicleSpriteBox/);
 assert.match(source,/player\?cityPlayerArtSource\(s\.car\):cityTrafficRearSource\(type\)/);
 for(const type of ['car','van','truck','bus'])assert.match(cityTrafficRearSource(type),/-rear\.png$/);
 assert.match(source,/uprightFallback/);
 assert.doesNotMatch(source,/drawWorldQuad/);
 assert.match(source,/projection:'upright-illustrated-2\.5D'/);
});

test('city renderer reports the selected historical or current mode and recoverable damage details',()=>{
 assert.match(source,/mode:`city-\$\{s\.car\}-\$\{rulesVersion\}`/);
 assert.match(source,/version:rulesVersion/);
 assert.match(source,/hits:s\.hits\|\|0/);
 assert.match(source,/boostProcs:s\.boostProcs\|\|0/);
 assert.match(source,/충돌 -\$\{10-engine\.spec\.armor\} 연료/);
});
