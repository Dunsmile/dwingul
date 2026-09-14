import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../public/js/city-racing.js',import.meta.url),'utf8');

test('city renderer uses upright illustrated player and traffic sprites with a geometric fallback',()=>{
 assert.match(source,/vehicleSpriteBox/);
 assert.match(source,/illustratedImage\(player\?engine\.spec\.art/);
 for(const type of ['car','van','truck','bus'])assert.match(source,new RegExp(`traffic/${type}\\.png`));
 assert.match(source,/uprightFallback/);
 assert.doesNotMatch(source,/drawWorldQuad/);
 assert.match(source,/projection:'upright-illustrated-2\.5D'/);
});

test('city renderer reports the v7 mode and recoverable damage details',()=>{
 assert.match(source,/mode:`city-\$\{s\.car\}-v7`/);
 assert.match(source,/hits:s\.hits/);
 assert.match(source,/boostProcs:s\.boostProcs/);
 assert.match(source,/충돌 -\$\{10-engine\.spec\.armor\} 연료/);
});
