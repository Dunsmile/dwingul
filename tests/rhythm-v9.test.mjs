import test from "node:test";
import assert from "node:assert/strict";
import {
  RHYTHM_ENDLESS_RULES,
  createRhythmEndlessEngine,
  createRhythmPatterns,
  judgeEndlessRhythmOffset,
} from "../public/js/rhythm-engine.js";

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function advancePhase(engine, expectedPhase) {
  const state = engine.getState();
  assert.equal(state.phase, expectedPhase);
  engine.tick(state.phaseRemainingMs);
}

function playCurrentRoundPerfectly(engine) {
  while (engine.getState().phase !== "respond") {
    const state = engine.getState();
    engine.tick(Math.max(1, state.phaseRemainingMs));
  }
  let state = engine.getState();
  while (state.nextNote) {
    engine.tick(state.nextNote.inMs);
    assert.equal(engine.tap().grade, "perfect");
    state = engine.getState();
  }
  engine.tick(state.phaseRemainingMs);
}

test("a seed produces 100 distinct four-beat patterns in a deterministic random order", () => {
  const first = createRhythmPatterns(seededRandom(41));
  const repeat = createRhythmPatterns(seededRandom(41));
  const other = createRhythmPatterns(seededRandom(42));
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first, other);
  assert.equal(first.length, 100);
  assert.equal(new Set(first.map(({ notes }) => notes.join(","))).size, 100);
  for (const pattern of first) {
    assert.ok(pattern.notes.length >= 3 && pattern.notes.length <= 7);
    assert.ok(pattern.notes.every((beat) => beat >= 0 && beat < 4));
    assert.ok(pattern.notes.every((beat, index) => !index || beat - pattern.notes[index - 1] >= .5));
    assert.equal(pattern.tones.length, pattern.notes.length);
  }
});

test("v9 timing windows are inclusive at 90ms and 175ms", () => {
  assert.deepEqual(judgeEndlessRhythmOffset(-90), { grade: "perfect", timing: "fast" });
  assert.deepEqual(judgeEndlessRhythmOffset(90), { grade: "perfect", timing: "late" });
  assert.deepEqual(judgeEndlessRhythmOffset(-175), { grade: "good", timing: "fast" });
  assert.deepEqual(judgeEndlessRhythmOffset(175), { grade: "good", timing: "late" });
  assert.deepEqual(judgeEndlessRhythmOffset(176), { grade: "miss", timing: "late" });
});

test("every player turn gets a 3 2 1 preparation and a full-beat runway before its first target", () => {
  const engine = createRhythmEndlessEngine({ random: seededRandom(7) });
  engine.start();
  advancePhase(engine, "countin");
  advancePhase(engine, "listen");

  let state = engine.getState();
  assert.equal(state.phase, "prepare");
  assert.equal(state.prepareCount, 3);
  engine.tick(state.beatMs);
  assert.equal(engine.getState().prepareCount, 2);
  engine.tick(state.beatMs);
  assert.equal(engine.getState().prepareCount, 1);
  engine.tick(state.beatMs);

  state = engine.getState();
  assert.equal(state.phase, "respond");
  assert.equal(state.phaseElapsedMs, 0);
  assert.equal(state.nextNote.inMs, state.beatMs);
  assert.ok(state.notes.every((note) => note.atMs >= state.beatMs));
  assert.deepEqual(engine.tap(), { grade: "extra", timing: "fast", diffMs: null });

  const fresh = createRhythmEndlessEngine({ random: seededRandom(7) });
  fresh.start();
  advancePhase(fresh, "countin");
  advancePhase(fresh, "listen");
  advancePhase(fresh, "prepare");
  state = fresh.getState();
  fresh.tick(state.nextNote.inMs);
  assert.deepEqual(fresh.tap(), { grade: "perfect", timing: "exact", diffMs: 0 });
  state = fresh.getState();
  while (state.nextNote) {
    fresh.tick(state.nextNote.inMs);
    fresh.tap();
    state = fresh.getState();
  }
  fresh.tick(state.phaseRemainingMs);
  advancePhase(fresh, "between");
  advancePhase(fresh, "listen");
  assert.equal(fresh.getState().phase, "prepare");
  assert.equal(fresh.getState().prepareCount, 3);
});

test("perfect play continues beyond the first 100-pattern deck and BPM never exceeds 136", () => {
  const engine = createRhythmEndlessEngine({ random: seededRandom(99) });
  engine.start();
  for (let round = 0; round < 105; round += 1) playCurrentRoundPerfectly(engine);
  const state = engine.getState();
  assert.equal(state.finished, false);
  assert.equal(state.roundsCompleted, 105);
  assert.equal(state.patternCycle, 1);
  assert.equal(state.round, 106);
  assert.equal(state.bpm, RHYTHM_ENDLESS_RULES.maxBpm);
  assert.equal(state.energy, RHYTHM_ENDLESS_RULES.initialEnergy);
  assert.equal(state.accuracy, 100);
  assert.equal(state.perfect, state.totalExpected);
  assert.equal(engine.getResult(), null);
});

test("energy loss enters a frozen 900ms game-over hold before publishing the v9 result", () => {
  const engine = createRhythmEndlessEngine({ random: seededRandom(5) });
  engine.start();
  advancePhase(engine, "countin");
  advancePhase(engine, "listen");
  advancePhase(engine, "prepare");
  while (!engine.getState().ending) engine.tap();

  let state = engine.getState();
  const frozen = { elapsedMs: state.elapsedMs, score: state.score, energy: state.energy, extraTaps: state.extraTaps };
  assert.equal(state.phase, "gameover");
  assert.equal(state.finished, false);
  assert.equal(engine.getResult(), null);
  assert.deepEqual(engine.tap(), { grade: "ignored", timing: "gameover", diffMs: null });
  engine.tick(RHYTHM_ENDLESS_RULES.gameOverHoldMs - 1);
  state = engine.getState();
  assert.equal(state.phase, "gameover");
  assert.deepEqual(
    { elapsedMs: state.elapsedMs, score: state.score, energy: state.energy, extraTaps: state.extraTaps },
    frozen,
  );
  engine.tick(1);
  state = engine.getState();
  assert.equal(state.phase, "finished");
  assert.equal(state.finishReason, "energy");
  const result = engine.getResult();
  assert.equal(result.mode, "rhythm-endless-v9");
  assert.equal(result.value, state.score);
  assert.equal(result.details.energy, 0);
});

test("fractional tick partitioning and event streams remain deterministic", () => {
  const a = createRhythmEndlessEngine({ random: seededRandom(17) });
  const b = createRhythmEndlessEngine({ random: seededRandom(17) });
  a.start();
  b.start();
  a.tick(10500);
  for (const ms of [16.7, 33.3, 1250, 2000.25, 4000.75, 3199]) b.tick(ms);
  assert.deepEqual(a.getState(), b.getState());
  assert.deepEqual(a.drainEvents(), b.drainEvents());
});
