import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CITY_TRAFFIC_VIEWS,
  cityTrafficView,
  cityTrafficArtSource,
  cityTrafficRearSource,
  cityPlayerArtSource,
  cityVehicleDrawBox,
} from '../public/js/city-vehicle-art.js';

const projected = (lane, scale = 1) => ({ x: 500 + (lane - 2) * 164 * scale, scale });

test('near traffic selects all five authored camera views from projected position', () => {
  assert.deepEqual(CITY_TRAFFIC_VIEWS, ['left-edge', 'left', 'front', 'right', 'right-edge']);
  assert.deepEqual([0, 1, 2, 3, 4].map(lane => cityTrafficView(projected(lane))), CITY_TRAFFIC_VIEWS);
});

test('traffic converges to a symmetric front view near the vanishing point', () => {
  assert.equal(cityTrafficView(projected(0, .3)), 'front');
  assert.equal(cityTrafficView(projected(4, .3)), 'front');
  assert.equal(cityTrafficView(projected(0, .5)), 'left');
  assert.equal(cityTrafficView(projected(4, .5)), 'right');
});

test('vehicle art paths are closed over four traffic types and eight player cars', () => {
  assert.equal(cityTrafficArtSource('bus', 'right-edge'), '/assets/pixel/scenes/traffic-bus-right-edge.png');
  assert.equal(cityPlayerArtSource('roadster'), '/assets/pixel/scenes/player-roadster-rear.png');
  assert.equal(cityTrafficArtSource('bike', 'front'), null);
  assert.equal(cityTrafficArtSource('car', 'rear'), null);
  assert.equal(cityPlayerArtSource('../basic'), null);
});

test('v13 traffic uses one authored rear view for every vehicle type', () => {
  assert.equal(cityTrafficRearSource('car'), '/assets/pixel/scenes/player-basic-rear.png');
  assert.equal(cityTrafficRearSource('van'), '/assets/pixel/scenes/player-van-rear.png');
  assert.equal(cityTrafficRearSource('truck'), '/assets/pixel/scenes/player-pickup-rear.png');
  assert.equal(cityTrafficRearSource('bus'), '/assets/pixel/scenes/traffic-bus-rear.png');
  assert.equal(cityTrafficRearSource('bike'), null);
});

test('trimmed vehicle art ends exactly at the existing wheel-ground anchor', () => {
  const box = { x: 100, y: 200, width: 80, height: 120, floorY: 305 };
  const image = { naturalWidth: 200, naturalHeight: 250 };
  assert.deepEqual(cityVehicleDrawBox(box, image), { x: 100, y: 205, width: 80, height: 100 });
  assert.equal(cityVehicleDrawBox(box, image).y + cityVehicleDrawBox(box, image).height, box.floorY);
  assert.deepEqual(cityVehicleDrawBox(box), { x: 100, y: 185, width: 80, height: 120 });
});

test('racing renderer reports deterministic selected art with a rear-only geometric fallback', async () => {
  const source = await readFile(new URL('../public/js/city-racing.js', import.meta.url), 'utf8');
  assert.match(source, /cityTrafficRearSource\(type\)/);
  assert.match(source, /cityVehicleDrawBox\(box,cameraImage\)/);
  assert.match(source, /cityVehicleImageReady\(cameraImage\)/);
  assert.doesNotMatch(source, /legacyImage|illustrated\/traffic/);
  assert.match(source, /else uprightFallback/);
  assert.match(source, /artView:'rear',artSource:cityTrafficRearSource\(v\.type\)/);
  assert.match(source, /playerArt:\{view:'rear',source:cityPlayerArtSource\(s\.car\)\}/);
});
