import test from "node:test";
import assert from "node:assert/strict";
import { jumpPatterns100, shuffledJumpPatterns } from "../public/js/jump-patterns.js";
import {
  JUMP_FLOOR,
  jumpCollides,
  jumpDistanceMeters,
  jumpRunAfterHit,
  stepJumpPlayer,
  tryJump,
} from "../public/js/jump-game-v17.js";

const TYPES = ["basic", "wide", "double", "slide"];

test("100 patterns contain 25 substantive variants of every obstacle family", () => {
  assert.equal(jumpPatterns100.length, 100);
  assert.equal(new Set(jumpPatterns100.map(({ id }) => id)).size, 100);
  for (const type of TYPES) assert.equal(jumpPatterns100.filter((pattern) => pattern.type === type).length, 25);
  const signatures = jumpPatterns100.map(({ id, ...pattern }) => JSON.stringify(pattern));
  assert.equal(new Set(signatures).size, 100);
  for (const pattern of jumpPatterns100) {
    assert.ok(pattern.events.length >= 1 && pattern.events.length <= 3, pattern.id);
    assert.ok(pattern.gapAfterMs >= 1400, pattern.id);
    assert.ok(pattern.events.every((event) => event.kind !== "coin"), pattern.id);
    for (let index = 1; index < pattern.events.length; index += 1) {
      assert.ok(pattern.events[index].atMs - pattern.events[index - 1].atMs >= 1050, pattern.id);
    }
  }
});

function survives(event, strategy) {
  const player = { y: JUMP_FLOOR, vy: 0, jumps: 0, duck: false };
  const obstacle = { ...event, x: 600, passed: false };
  const dt = 1 / 240;
  let firstJump = false;
  let secondJump = false;
  for (let elapsed = 0; elapsed < 4; elapsed += dt) {
    if (strategy === "single" && !firstJump && obstacle.x < (event.kind === "wide" ? 158 + 225 * event.speedScale * .055 : 180)) { tryJump(player); firstJump = true; }
    if (strategy === "double") {
      if (!firstJump && obstacle.x < 280) { tryJump(player); firstJump = true; }
      if (!secondJump && obstacle.x < 180) { tryJump(player); secondJump = true; }
    }
    player.duck = strategy === "slide" && obstacle.x < 310 && obstacle.x + obstacle.w > 80;
    stepJumpPlayer(player, dt);
    obstacle.x -= 225 * (event.speedScale ?? 1) * dt;
    if (jumpCollides(player, obstacle)) return false;
    if (obstacle.x + obstacle.w < 108) return true;
  }
  return false;
}

test("every primary pattern obstacle is physically avoidable by its intended move", () => {
  const strategies = { basic: "single", wide: "single", double: "double", slide: "slide" };
  for (const pattern of jumpPatterns100) {
    assert.equal(survives(pattern.events[0], strategies[pattern.type]), true, pattern.id);
  }
});

test("a seeded shuffle is deterministic and consumes each pattern once", () => {
  const makeRandom = () => {
    let state = 0x6d2b79f5;
    return () => {
      state = Math.imul(state ^ state >>> 15, state | 1);
      state ^= state + Math.imul(state ^ state >>> 7, state | 61);
      return ((state ^ state >>> 14) >>> 0) / 4294967296;
    };
  };
  const first = shuffledJumpPatterns(makeRandom()).map(({ id }) => id);
  const second = shuffledJumpPatterns(makeRandom()).map(({ id }) => id);
  assert.deepEqual(first, second);
  assert.equal(new Set(first).size, 100);
  assert.notDeepEqual(first, jumpPatterns100.map(({ id }) => id));
});

test("the tall barrier requires a second jump", () => {
  const barrier = jumpPatterns100.find(({ type }) => type === "double").events[0];
  assert.equal(survives(barrier, "single"), false);
  assert.equal(survives(barrier, "double"), true);
});

test("the hanging obstacle requires sliding rather than jumping", () => {
  const ceiling = jumpPatterns100.find(({ type }) => type === "slide").events[0];
  assert.equal(survives(ceiling, "double"), false);
  assert.equal(survives(ceiling, "slide"), true);
});

test("distance uses meters and the endless run ends on the second collision", () => {
  assert.equal(jumpDistanceMeters(2250), 112.5);
  const first = jumpRunAfterHit(2);
  assert.deepEqual(first, { lives: 1, finished: false });
  const second = jumpRunAfterHit(first.lives);
  assert.deepEqual(second, { lives: 0, finished: true });
});
