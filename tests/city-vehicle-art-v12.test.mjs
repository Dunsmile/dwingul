import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CITY_TRAFFIC_VIEWS,
  cityTrafficView,
  cityTrafficArtSource,
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

test('trimmed vehicle art ends exactly at the existing wheel-ground anchor', () => {
  const box = { x: 100, y: 200, width: 80, height: 120, floorY: 305 };
  const image = { naturalWidth: 200, naturalHeight: 250 };
  assert.deepEqual(cityVehicleDrawBox(box, image), { x: 100, y: 205, width: 80, height: 100 });
  assert.equal(cityVehicleDrawBox(box, image).y + cityVehicleDrawBox(box, image).height, box.floorY);
  assert.deepEqual(cityVehicleDrawBox(box), { x: 100, y: 185, width: 80, height: 120 });
});

test('racing renderer reports deterministic selected art while retaining legacy fallback', async () => {
  const source = await readFile(new URL('../public/js/city-racing.js', import.meta.url), 'utf8');
  assert.match(source, /cityTrafficView\(center\)/);
  assert.match(source, /cityVehicleDrawBox\(box,cameraImage\)/);
  assert.match(source, /cityVehicleImageReady\(cameraImage\)/);
  assert.match(source, /else if\(legacyImage\?\.complete&&legacyImage\.naturalWidth\)/);
  assert.match(source, /artView:view,artSource:cityTrafficArtSource\(v\.type,view\)/);
  assert.match(source, /playerArt:\{view:'rear',source:cityPlayerArtSource\(s\.car\)\}/);
});
