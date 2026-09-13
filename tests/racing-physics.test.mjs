import test from "node:test";
import assert from "node:assert/strict";
import { hasPassedPlayer, racingCoinContact, racingCollision } from "../public/js/racing-physics.js";

test("a centered obstacle collides while approaching the player", () => {
  assert.equal(racingCollision(360, { lane: 1, y: 600, passed: false }), true);
});

test("an obstacle in the opposite lane does not collide", () => {
  assert.equal(racingCollision(360, { lane: 0, y: 600, passed: false }), false);
});

test("a player midway between lanes does not collide with either lane", () => {
  const midwayX = (205 + 360) / 2;
  assert.equal(racingCollision(midwayX, { lane: 0, y: 600, passed: false }), false);
  assert.equal(racingCollision(midwayX, { lane: 1, y: 600, passed: false }), false);
});

test("crossing the center still collides this frame, then a passed obstacle stays safe", () => {
  assert.equal(hasPassedPlayer({ lane: 1, y: 626, passed: false }), false);
  assert.equal(hasPassedPlayer({ lane: 1, y: 627, passed: false }), true);
  assert.equal(hasPassedPlayer({ lane: 1, y: 600, passed: true }), false);
  assert.equal(racingCollision(360, { lane: 1, y: 627, passed: false }), true);
  assert.equal(racingCollision(360, { lane: 1, y: 600, passed: true }), false);
  assert.equal(racingCollision(360, { lane: 1, y: 680, passed: true }), false);
});

test("touching an obstacle boundary is a safe graze, but crossing it collides", () => {
  assert.equal(racingCollision(301, { lane: 1, y: 600, passed: false }), false);
  assert.equal(racingCollision(302, { lane: 1, y: 600, passed: false }), true);
  assert.equal(racingCollision(360, { lane: 1, y: 555, passed: false }), false);
  assert.equal(racingCollision(360, { lane: 1, y: 556, passed: false }), true);
});

test("coin contact uses circle-to-player-box intersection", () => {
  assert.equal(racingCoinContact(360, { lane: 1, y: 580 }), true);
  assert.equal(racingCoinContact(310, { lane: 1, y: 624 }), true);
  assert.equal(racingCoinContact(205, { lane: 1, y: 624 }), false);
});
