import test from "node:test";
import assert from "node:assert/strict";
import {
  CITY,
  cityCollision,
  createCityEngine,
  frontGap,
  vehicleLength,
} from "../public/js/legacy/city-engine-v6.js";
import { hasTrafficPath, trafficLength } from "../public/js/city-traffic.js";
import { cityCars } from "../public/js/game-options.js";
import { seededRandom } from "../public/js/game-random.js";

function closeTo(actual, expected, epsilon = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be within ${epsilon} of ${expected}`);
}

function quietEngine(options = {}) {
  const engine = createCityEngine({ random: seededRandom("city-v5-test"), ...options });
  engine.state.nextAt = 1e9;
  engine.state.nextCoinAt = 1e9;
  engine.state.nextFuelAt = 1e9;
  return engine;
}

function vehicleAtGap(id, gap, overrides = {}) {
  const vehicle = { id, lane: 2, type: "car", z: 0, evaded: false, ...overrides };
  vehicle.z = gap + vehicleLength(vehicle) / 2 + CITY.playerHalfLength;
  return vehicle;
}

test("fuel drains two per second and a fuel pickup adds 15 without exceeding each car tank", () => {
  assert.equal(CITY.fuelDrain, 2);
  assert.equal(CITY.fuelPickup, 15);
  for (const car of cityCars) {
    const engine = quietEngine({ car: car.id });
    engine.tick(1000);
    closeTo(engine.state.fuel, car.fuel - 2);

    engine.state.fuel = 1;
    engine.state.pickups = [{ id: 1, lane: 2, z: .2, type: "fuel" }];
    engine.tick(4);
    closeTo(engine.state.fuel, 15.992);

    engine.state.fuel = car.fuel - 5;
    engine.state.pickups = [{ id: 2, lane: 2, z: .2, type: "fuel" }];
    engine.tick(4);
    closeTo(engine.state.fuel, car.fuel);
  }
});

test("only a same-lane evasive change at a 1–6 m front gap awards one near miss", () => {
  for (const gap of [1, 2, 3, 4.5, 6]) {
    const engine = quietEngine();
    engine.state.vehicles = [vehicleAtGap(1, gap)];
    engine.move(-1);
    engine.tick(12);
    assert.equal(engine.state.nearMisses, 1, `${gap} m should reward the lane change`);
    assert.equal(engine.state.boost, 1);
    assert.equal(engine.state.vehicles[0].evaded, true);

    engine.state.lane = 2;
    engine.state.x = 2;
    engine.state.vehicles[0].z = vehicleAtGap(1, 1.5).z;
    engine.move(-1);
    engine.tick(12);
    assert.equal(engine.state.nearMisses, 1, "one vehicle cannot reward twice");
  }

  const parallel = quietEngine();
  parallel.state.vehicles = [vehicleAtGap(1, 1.5, { lane: 1 })];
  parallel.tick(600);
  assert.equal(parallel.state.nearMisses, 0, "passing alongside a vehicle is not an evasive move");

  const early = quietEngine();
  early.state.vehicles = [vehicleAtGap(1, 7)];
  early.move(-1);
  early.tick(700);
  assert.equal(early.state.nearMisses, 0, "an early lane change outside six meters is not rewarded");

  const fast = quietEngine({ car: "sport" });
  fast.state.seconds = 30; fast.state.speed = 126; fast.state.boost = 10; fast.boost();
  fast.state.vehicles = [vehicleAtGap(1, 7)]; fast.move(1); fast.tick(12);
  assert.equal(fast.state.nearMisses, 0, "7 m is too early even if boosted travel crosses 6 m during the change");

  const collision = quietEngine();
  collision.state.vehicles = [{ id: 1, lane: 2, type: "car", z: 0, evaded: false }];
  collision.tick(4);
  assert.equal(collision.state.reason, "collision");
  assert.equal(collision.state.nearMisses, 0, "collision takes precedence over any reward");
});

test("a near miss while boosting extends the active boost by half a second", () => {
  const engine = quietEngine();
  engine.state.boost = 10;
  assert.equal(engine.boost(), true);
  engine.tick(1000);
  closeTo(engine.state.boost, 8);

  engine.state.vehicles = [vehicleAtGap(1, 2)];
  engine.move(-1);
  engine.tick(12);
  assert.equal(engine.state.nearMisses, 1);
  closeTo(engine.state.boost, 8.976);
  engine.tick(4000);
  assert.equal(engine.state.boosting, true, "the earned point keeps boost active past five seconds");
  closeTo(engine.state.boost, .976);
  engine.tick(488);
  assert.equal(engine.state.boosting, false);
  assert.equal(engine.state.boost, 0);
});

test("collision and path geometry use the physical length of every vehicle type", () => {
  assert.deepEqual(["car", "van", "truck", "bus"].map((type) => trafficLength({ type })), [4, 5, 6, 8]);
  assert.equal(vehicleLength({ type: "bus" }), 8);
  assert.equal(vehicleLength({ type: "bus" }), vehicleLength({ type: "car" }) * 2);
  assert.equal(cityCollision(2, { lane: 2, z: 5, type: "car" }), false);
  assert.equal(cityCollision(2, { lane: 2, z: 5, type: "bus" }), true);
  assert.equal(frontGap({ lane: 2, z: 8, type: "car" }), 4.2);
  assert.equal(frontGap({ lane: 2, z: 8, type: "bus" }), 2.2);
});

test("a seeded drive replays to an identical world and input log", () => {
  const finishAt = 2000;
  const planned = [[400, -1], [800, 1], [1200, 1], [1600, -1]];
  const original = createCityEngine({ random: seededRandom("racing:city-v5-replay") });
  let time = 0;
  for (const [at, direction] of planned) {
    original.tick(at - time);
    original.move(direction);
    time = at;
  }
  original.tick(finishAt - time);
  assert.ok(original.state.generated > 0);

  const replay = createCityEngine({ random: seededRandom("racing:city-v5-replay") });
  time = 0;
  for (const [at, direction] of original.state.inputs) {
    replay.tick(at - time);
    direction === 0 ? replay.boost() : replay.move(direction);
    time = at;
  }
  replay.tick(finishAt - time);
  assert.deepEqual(replay.state, original.state);
});

test("individual traffic has varied gaps and repeated lanes while every tested seed retains a path", () => {
  const gaps = new Set();
  let repeatedLane = false;
  let sawBus = false;
  for (let seed = 0; seed < 20; seed += 1) {
    const engine = createCityEngine({ car: "sport", random: seededRandom(`traffic-v5:${seed}`) });
    engine.tick(4);
    assert.ok(engine.state.generated >= 5);
    const lanes = engine.state.vehicles.map(({ lane }) => lane);
    if (lanes.some((lane, index) => index > 0 && lane === lanes[index - 1])) repeatedLane = true;
    if (engine.state.vehicles.some(({ type }) => type === "bus")) sawBus = true;
    const positions = engine.state.vehicles.map(({ z }) => z).sort((a, b) => a - b);
    for (let index = 1; index < positions.length; index += 1) {
      const gap = positions[index] - positions[index - 1];
      assert.ok(gap >= 8 - 1e-8);
      gaps.add(gap.toFixed(2));
    }
    assert.equal(hasTrafficPath(engine.state.vehicles, {
      startLane: engine.state.x,
      maxSpeed: CITY.maxSpeed * engine.spec.speed * 2,
      horizon: CITY.horizon,
    }), true, `seed ${seed} must retain a reachable lane sequence`);
  }
  assert.equal(repeatedLane, true, "traffic may naturally repeat a lane");
  assert.equal(sawBus, true);
  assert.ok(gaps.size >= 20, "vehicles use individual random spacing rather than a fixed wave gap");
});

test("coin and fuel pickups use their intended common and rare distance intervals", () => {
  const engine = createCityEngine({ random: seededRandom("pickup-v5") });
  engine.state.nextAt = 1e9;
  assert.ok(engine.state.nextCoinAt >= 150 && engine.state.nextCoinAt < 220);
  assert.ok(engine.state.nextFuelAt >= 140 && engine.state.nextFuelAt < 180);

  const firstCoinAt = engine.state.nextCoinAt, firstFuelAt = engine.state.nextFuelAt;
  engine.tick(4);
  const coinGap = engine.state.nextCoinAt - firstCoinAt;
  assert.ok(coinGap >= 150 && coinGap < 230);
  assert.ok(engine.state.pickups.some(({ type }) => type === "coin"));
  assert.equal(engine.state.pickups.some(({ type }) => type === "fuel"), true);

  const fuelGap = engine.state.nextFuelAt - firstFuelAt;
  assert.ok(fuelGap >= 550 && fuelGap < 700);
  assert.ok(engine.state.pickups.some(({ type }) => type === "fuel"));
  assert.ok(fuelGap > coinGap * 2, "fuel pickups remain substantially rarer than coins");
});
