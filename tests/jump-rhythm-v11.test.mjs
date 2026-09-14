import test from "node:test";
import assert from "node:assert/strict";

import {
  JUMP_V11_RULES,
  jumpPatternIntervalMs,
  jumpWorldDelta,
  jumpWorldSpeed,
  jumpPatterns100,
} from "../public/js/jump-patterns.js";
import { JUMP_FLOOR, stepJumpPlayer, tryJump } from "../public/js/jump-game.js";
import {
  RHYTHM_LANES,
  createRhythmLanePatterns,
  createRhythmThreeLaneEngine,
} from "../public/js/rhythm-engine.js";

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function finishPhase(engine, expectedPhase) {
  const state = engine.getState();
  assert.equal(state.phase, expectedPhase);
  engine.tick(state.phaseRemainingMs);
}

test("jump v11 schedules every object on the shared world-distance axis", () => {
  assert.equal(jumpPatterns100.length, 100);
  assert.equal(new Set(jumpPatterns100.map(({ id }) => id)).size, 100);
  for (const pattern of jumpPatterns100) {
    assert.ok(Number.isFinite(pattern.gapAfterDistance), pattern.id);
    for (const obstacle of pattern.events) {
      assert.ok(Number.isFinite(obstacle.atDistance), pattern.id);
      assert.equal(obstacle.speedScale, 1, pattern.id);
    }
  }

  assert.equal(jumpWorldDelta(220, 500), 110);
  assert.equal(jumpWorldDelta(420, 500), 210);
});

test("jump v11 acceleration increases obstacle frequency without unsafe transition gaps", () => {
  const initialSpeed = jumpWorldSpeed(0);
  const maxSpeed = jumpWorldSpeed(1e9);
  assert.equal(initialSpeed, JUMP_V11_RULES.initialSpeed);
  assert.equal(maxSpeed, JUMP_V11_RULES.maxSpeed);

  for (const pattern of jumpPatterns100) {
    const slowInterval = jumpPatternIntervalMs(pattern, initialSpeed);
    const fastInterval = jumpPatternIntervalMs(pattern, maxSpeed);
    assert.ok(fastInterval < slowInterval * .55, `${pattern.id}: ${slowInterval} -> ${fastInterval}`);
    assert.ok(pattern.gapAfterDistance >= JUMP_V11_RULES.minimumGapByType[pattern.type], pattern.id);
  }
  const maxSpeedGapSeconds = Object.fromEntries(Object.entries(JUMP_V11_RULES.minimumGapByType).map(([type, gap]) => [type, gap / maxSpeed]));
  assert.ok(maxSpeedGapSeconds.basic >= .85);
  assert.ok(maxSpeedGapSeconds.wide >= .9);
  assert.ok(maxSpeedGapSeconds.double >= 1.7);
  assert.ok(maxSpeedGapSeconds.slide >= 1);

  const player = { y: JUMP_FLOOR, vy: 0, jumps: 0, duck: false };
  tryJump(player);
  let recoverySeconds = 0;
  let secondJumped = false;
  while (recoverySeconds < 3) {
    if (!secondJumped && recoverySeconds >= .35) { tryJump(player); secondJumped = true; }
    stepJumpPlayer(player, 1 / 1000);
    recoverySeconds += 1 / 1000;
    if (secondJumped && player.y >= JUMP_FLOOR) break;
  }
  assert.ok(maxSpeedGapSeconds.double >= recoverySeconds, `${maxSpeedGapSeconds.double} >= ${recoverySeconds}`);
});

test("rhythm v11 patterns carry deterministic explicit lanes", () => {
  const first = createRhythmLanePatterns(seededRandom(41));
  const repeat = createRhythmLanePatterns(seededRandom(41));
  assert.deepEqual(first, repeat);
  assert.equal(first.length, 100);
  const lanes = new Set(first.flatMap((pattern) => pattern.lanes));
  assert.deepEqual(lanes, new Set(RHYTHM_LANES));
  for (const pattern of first) {
    assert.equal(pattern.lanes.length, pattern.notes.length);
    assert.ok(pattern.lanes.every((lane) => RHYTHM_LANES.includes(lane)));
  }
});

test("countdown and guide inputs are ignored, and a wrong response lane cannot hit a note", () => {
  const engine = createRhythmThreeLaneEngine({ random: seededRandom(7) });
  engine.start();
  let state = engine.getState();
  for (const phase of ["countin", "listen", "prepare"]) {
    assert.equal(state.phase, phase);
    const before = { energy: state.energy, score: state.score, hits: state.hits, extraTaps: state.extraTaps };
    assert.deepEqual(engine.tap("left"), { grade: "ignored", timing: "wrong-phase", diffMs: null, lane: "left" });
    state = engine.getState();
    assert.deepEqual(
      { energy: state.energy, score: state.score, hits: state.hits, extraTaps: state.extraTaps },
      before,
    );
    finishPhase(engine, phase);
    state = engine.getState();
  }

  assert.equal(state.phase, "respond");
  engine.tick(state.nextNote.inMs);
  state = engine.getState();
  const expectedLane = state.nextNote.lane;
  const wrongLane = RHYTHM_LANES.find((lane) => lane !== expectedLane);
  const nextIndex = state.nextNote.index;
  const wrong = engine.tap(wrongLane);
  assert.deepEqual(wrong, { grade: "extra", timing: "wrong-lane", diffMs: 0, lane: wrongLane, expectedLane });
  state = engine.getState();
  assert.equal(state.notes[nextIndex].status, "pending");
  assert.equal(state.hits, 0);
  assert.equal(state.extraTaps, 1);

  engine.tick(120);
  const correct = engine.tap(expectedLane);
  assert.equal(correct.grade, "good");
  assert.equal(correct.lane, expectedLane);
  assert.equal(engine.getState().hits, 1);
});

test("rhythm v11 publishes a distinct record mode while preserving fair timing and ending hold", () => {
  const engine = createRhythmThreeLaneEngine({ random: seededRandom(5) });
  engine.start();
  finishPhase(engine, "countin");
  finishPhase(engine, "listen");
  finishPhase(engine, "prepare");
  while (!engine.getState().ending) {
    const state = engine.getState();
    if (state.phase === "respond" && state.nextNote) {
      engine.tick(state.nextNote.inMs);
      const wrongLane = RHYTHM_LANES.find((lane) => lane !== engine.getState().nextNote.lane);
      engine.tap(wrongLane);
      engine.tick(120);
    } else {
      engine.tick(Math.max(1, state.phaseRemainingMs));
    }
  }
  const frozen = engine.getState();
  engine.tick(899);
  assert.equal(engine.getState().elapsedMs, frozen.elapsedMs);
  engine.tick(1);
  assert.equal(engine.getResult().mode, "rhythm-three-lane-v11");
});

test("rhythm v11 timing, lane assignment, and event output are deterministic across tick partitions", () => {
  const a = createRhythmThreeLaneEngine({ random: seededRandom(17) });
  const b = createRhythmThreeLaneEngine({ random: seededRandom(17) });
  a.start();
  b.start();
  a.tick(10500);
  for (const ms of [16.7, 33.3, 1250, 2000.25, 4000.75, 3199]) b.tick(ms);
  assert.deepEqual(a.getState(), b.getState());
  assert.deepEqual(a.drainEvents(), b.drainEvents());
});
