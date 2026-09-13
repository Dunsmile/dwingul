import { cityCars } from '../game-options.js';
import { patternBag } from './city-patterns-v4.js';
export const CITY = Object.freeze({ horizon: 240, acceleration: 1.08, baseSpeed: 18, maxSpeed: 42,
  playerHalfWidth: .27, playerHalfLength: 1.8, carHalfWidth: .32, busHalfWidth: .36,
  laneSeconds: .18, nearGap: .45, fuelPickup: 15, boostDrain: 2 });
export const vehicleLength = v => v.type === 'bus' ? 8 : 4;
export const lateralGap = (x, v) => Math.abs(x - v.lane) - CITY.playerHalfWidth - (v.type === 'bus' ? CITY.busHalfWidth : CITY.carHalfWidth);
export const longitudinalOverlap = v => Math.abs(v.z) < vehicleLength(v) / 2 + CITY.playerHalfLength;
export const cityCollision = (x, v) => longitudinalOverlap(v) && lateralGap(x, v) < 0;
export function citySpeed(car, seconds, boosting = false) { return Math.min(CITY.maxSpeed, CITY.baseSpeed + seconds * CITY.acceleration) * car.speed * (boosting ? 2 : 1); }
export function createCityEngine({ car = 'basic', random = Math.random } = {}) {
  const spec = cityCars.find(c => c.id === car) || cityCars[0], nextPattern = patternBag(random);
  const state = { car: spec.id, lane: 2, x: 2, fuel: spec.fuel, maxFuel: spec.fuel, boost: 0, boosting: false,
    distance: 0, seconds: 0, speed: citySpeed(spec, 0), coins: 0, nearMisses: 0, boosts: 0, ended: false,
    reason: '', inputs: [], vehicles: [], pickups: [], patterns: [], nextAt: 100, flash: '', flashTime: 0, serial: 0 };
  function move(direction) { const next=Math.max(0,Math.min(4,state.lane+Math.sign(direction)));if(!state.ended&&next!==state.lane){state.inputs.push([Math.round(state.seconds*1000),Math.sign(direction)]);state.lane=next;} }
  function boost() { if (!state.ended && !state.boosting && state.boost >= 10 - 1e-8) { state.inputs.push([Math.round(state.seconds*1000),0]); state.boosting = true; state.boosts++; return true; } return false; }
  function nearMiss() { state.nearMisses++; state.boost = Math.min(10, state.boost + 1); state.flash = '아슬아슬! 부스터 +1'; state.flashTime = 1; }
  function pickup(type) { if (type === 'fuel') { state.fuel = Math.min(spec.fuel, state.fuel + 15); state.flash = '연료 +15'; } else { state.coins++; state.flash = '동전 +1'; } state.flashTime = .7; }
  function spawn() {
    const pattern = nextPattern(), count = state.patterns.length;
    state.patterns.push(pattern.id);
    const z = state.nextAt - state.distance;
    pattern.vehicles.forEach(v => state.vehicles.push({ ...v, z: z + v.offset, id: ++state.serial, nearest: Infinity }));
    const lane = pattern.safeLanes[Math.floor(random() * pattern.safeLanes.length)];
    for (const offset of [0, 8]) state.pickups.push({ id: ++state.serial, lane, z: z + offset, type: 'coin' });
    if (count % 3 === 1) state.pickups.push({ id: ++state.serial, lane: pattern.safeLanes[(pattern.safeLanes.indexOf(lane) + 1) % pattern.safeLanes.length], z: z + 3, type: 'fuel' });
    // Spacing uses the *maximum future speed*, including sport + boost. This preserves
    // at least 1.6 seconds between pattern tails even after sudden boost activation.
    const futureFast = citySpeed(spec, state.seconds + 10, true);
    state.nextAt += Math.max(80, futureFast * 1.6 + 24);
  }
  function step(dt) {
    if (state.ended) return;
    const seconds = Math.min(dt, state.fuel);
    state.seconds += seconds; state.speed = citySpeed(spec, state.seconds, state.boosting);
    const distance = state.speed * seconds; state.distance += distance;
    state.fuel = Math.max(0, state.fuel - seconds);
    state.flashTime = Math.max(0, state.flashTime - seconds);
    if (state.boosting) { state.boost = Math.max(0, state.boost - 2 * seconds); if (state.boost <= 1e-8) { state.boost = 0; state.boosting = false; } }
    const change = Math.sign(state.lane - state.x) * Math.min(Math.abs(state.lane - state.x), seconds / CITY.laneSeconds);
    state.x += change;
    while (state.nextAt - state.distance <= CITY.horizon) spawn();
    for (const v of state.vehicles) v.z -= distance;
    // Collision always wins over the reward for safely passing a vehicle.
    if (state.vehicles.some(v => cityCollision(state.x, v))) { state.ended = true; state.reason = 'collision'; return; }
    for (const v of state.vehicles) {
      if (longitudinalOverlap(v)) v.nearest = Math.min(v.nearest, lateralGap(state.x, v));
      if (!v.passed && v.z + vehicleLength(v) / 2 < -CITY.playerHalfLength) { v.passed = true; if (v.nearest >= 0 && v.nearest <= CITY.nearGap) nearMiss(); }
    }
    for (const p of state.pickups) { p.z -= distance; if (!p.taken && Math.abs(p.z) < 2.4 && Math.abs(p.lane - state.x) < .48) { p.taken = true; pickup(p.type); } }
    state.vehicles = state.vehicles.filter(v => v.z > -20);
    state.pickups = state.pickups.filter(p => p.z > -12 && !p.taken);
    if (state.fuel <= 0) { state.ended = true; state.reason = 'fuel'; }
  }
  let pendingMs = 0;
  function tick(ms) { pendingMs += Math.max(0,ms); while(pendingMs >= 4 - 1e-7 && !state.ended) { step(.004); pendingMs -= 4; } }
  return { state, spec, move, boost, tick };
}
