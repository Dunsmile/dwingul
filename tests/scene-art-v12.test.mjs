import {assetUrl} from '../public/js/asset-delivery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  SCENE_ART_SOURCES,
  clearSceneArtCache,
  sceneImage,
  sceneImageReady,
  scenePattern,
} from '../public/js/scene-art.js';

test('scene art exposes only the approved PNG namespace', () => {
  assert.equal(SCENE_ART_SOURCES['jump-forest'], '/assets/pixel/scenes/jump-forest.png');
  assert.equal(SCENE_ART_SOURCES['city-prop-cottage'], '/assets/pixel/scenes/city-prop-cottage.png');
  for (const source of Object.values(SCENE_ART_SOURCES)) {
    assert.match(source, /^\/assets\/pixel\/scenes\/[a-z0-9-]+\.png$/);
  }
  assert.equal(sceneImage('../outside'), null);
});

test('scene images are cached and failures remain an undrawable fallback', () => {
  clearSceneArtCache();
  const priorImage = globalThis.Image;
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; }
  }
  globalThis.Image = FakeImage;
  try {
    const first = sceneImage('jump-ground');
    assert.equal(first, sceneImage('jump-ground'));
    assert.equal(first.src, assetUrl('/assets/pixel/scenes/jump-ground.png'));
    assert.equal(sceneImageReady(first), false);
    first.complete = true;
    first.naturalWidth = 384;
    first.naturalHeight = 96;
    assert.equal(sceneImageReady(first), true);
    first.naturalWidth = 0;
    assert.equal(sceneImageReady(first), false);
  } finally {
    globalThis.Image = priorImage;
    clearSceneArtCache();
  }
});

test('scene patterns are cached per canvas context and image', () => {
  clearSceneArtCache();
  const image = { complete: true, naturalWidth: 256, naturalHeight: 256 };
  let calls = 0;
  const pattern = { id: 'road' };
  const context = { createPattern(candidate, repeat) { calls += 1; assert.equal(candidate, image); assert.equal(repeat, 'repeat'); return pattern; } };
  assert.equal(scenePattern(context, image), pattern);
  assert.equal(scenePattern(context, image), pattern);
  assert.equal(calls, 1);
  assert.equal(scenePattern({ createPattern: () => ({}) }, image) === pattern, false);
});

test('game renderers keep functional geometry above optional scene art', async () => {
  const [jump, sort, city] = await Promise.all([
    readFile(new URL('../public/js/jump-game.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/sort-game.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/city-racing.js', import.meta.url), 'utf8'),
  ]);
  assert.match(jump, /drawSceneTileX\(pen,groundImage,JUMP_FLOOR,CANVAS_HEIGHT-JUMP_FLOOR,scroll,viewWidth\)/);
  assert.match(jump, /pen\.drawImage\(image,obstacle\.x,obstacle\.kind==='slide'\?0:obstacle\.y,obstacle\.w/);
  assert.match(sort, /drawSceneCover\(g,lodge,0,0,W,H/);
  assert.match(city, /project\(side<0\?-1\.35:5\.35,z\)/);
  assert.match(city, /ground\(-\.5,4\.5,280,-22,'#7b7767'\).*scenePattern/s);
  assert.match(city, /for\(let lane=\.5;lane<4;lane\+\+\).*project\(lane,z\)/s);
});
