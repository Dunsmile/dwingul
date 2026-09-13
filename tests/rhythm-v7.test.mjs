import test from "node:test";
import assert from "node:assert/strict";
import {
  RHYTHM_RULES,
  createRhythmEngine,
  createRhythmRounds,
  judgeRhythmOffset,
} from "../public/js/rhythm-engine.js";

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function enterRespond(engine) {
  engine.start();
  let state = engine.getState();
  engine.tick(state.phaseRemainingMs);
  state = engine.getState();
  assert.equal(state.phase, "listen");
  engine.tick(state.phaseRemainingMs);
  assert.equal(engine.getState().phase, "respond");
}

test("eight seeded rounds rise from 96 to 124 BPM and introduce safe offbeats", () => {
  const first = createRhythmRounds(seededRandom(41));
  const repeat = createRhythmRounds(seededRandom(41));
  const other = createRhythmRounds(seededRandom(42));
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first, other);
  assert.deepEqual(first.map(({ bpm }) => bpm), [96, 100, 104, 108, 112, 116, 120, 124]);
  assert.equal(first.length, 8);
  for (const [index, round] of first.entries()) {
    assert.ok(round.notes.length >= 3 && round.notes.length <= 7);
    assert.ok(round.notes.every((beat) => beat >= 0 && beat < 4));
    for (let note = 1; note < round.notes.length; note += 1) {
      assert.ok(round.notes[note] - round.notes[note - 1] >= .5, `round ${index + 1} prevents rapid-tap rewards`);
    }
  }
  assert.equal(first.slice(2).some((round) => round.notes.some((beat) => beat % 1 === .5)), true);
});

test("count-in, listen and respond each preserve the four-beat relay timing", () => {
  const engine = createRhythmEngine({ random: seededRandom(7) });
  assert.equal(engine.getState().phase, "idle");
  assert.equal(engine.start(), true);
  let state = engine.getState();
  assert.equal(state.phase, "countin");
  assert.equal(state.countInBeat, 1);
  assert.equal(state.phaseDurationMs, state.beatMs * 4);
  engine.tick(state.phaseDurationMs - 1);
  assert.equal(engine.getState().phase, "countin");
  engine.tick(1);
  state = engine.getState();
  assert.equal(state.phase, "listen");
  assert.equal(state.phaseDurationMs, state.beatMs * 4);
  engine.tick(state.phaseDurationMs);
  assert.equal(engine.getState().phase, "respond");
});

test("the final 150ms of listening accepts the next downbeat early and the bridge lasts one beat", () => {
  const engine = createRhythmEngine({ random: seededRandom(27) });
  engine.start();
  engine.tick(engine.getState().phaseRemainingMs);
  let state = engine.getState();
  engine.tick(state.phaseRemainingMs - 151);
  assert.equal(engine.tap().timing, "wrong-phase");

  const fair = createRhythmEngine({ random: seededRandom(27) });
  fair.start();
  fair.tick(fair.getState().phaseRemainingMs);
  state = fair.getState();
  fair.tick(state.phaseRemainingMs - 150);
  assert.deepEqual(fair.tap(), { grade: "good", timing: "fast", diffMs: -150 });
  fair.tick(150);
  state = fair.getState();
  assert.equal(state.phase, "respond");
  assert.equal(state.notes[0].status, "hit");
  assert.equal(state.hits, 1);
  while (state.nextNote) {
    fair.tick(state.nextNote.inMs);
    fair.tap();
    state = fair.getState();
  }
  fair.tick(state.phaseRemainingMs);
  state = fair.getState();
  assert.equal(state.phase, "between");
  assert.equal(state.phaseDurationMs, state.beatMs);
});

test("judgment boundaries report perfect, good, fast and late precisely", () => {
  assert.deepEqual(judgeRhythmOffset(-80), { grade: "perfect", timing: "fast" });
  assert.deepEqual(judgeRhythmOffset(0), { grade: "perfect", timing: "exact" });
  assert.deepEqual(judgeRhythmOffset(80), { grade: "perfect", timing: "late" });
  assert.deepEqual(judgeRhythmOffset(-150), { grade: "good", timing: "fast" });
  assert.deepEqual(judgeRhythmOffset(150), { grade: "good", timing: "late" });
  assert.deepEqual(judgeRhythmOffset(151), { grade: "miss", timing: "late" });
});

test("each expected note can score once and rapid, wrong-phase and missed taps cost energy", () => {
  const engine = createRhythmEngine({ random: seededRandom(3) });
  engine.start();
  const energy = engine.getState().energy;
  engine.tap();
  assert.equal(engine.getState().energy, energy - RHYTHM_RULES.extraPenalty);

  engine.tick(engine.getState().phaseRemainingMs);
  engine.tick(engine.getState().phaseRemainingMs);
  let state = engine.getState();
  engine.tick(state.nextNote.inMs);
  assert.equal(engine.tap().grade, "perfect");
  const score = engine.getState().score;
  assert.equal(engine.tap().grade, "extra");
  state = engine.getState();
  assert.equal(state.hits, 1);
  assert.equal(state.score, score);
  assert.equal(state.extraTaps, 2);
  assert.equal(state.combo, 0);

  const next = state.nextNote;
  engine.tick(next.inMs + RHYTHM_RULES.goodWindowMs + 1);
  assert.ok(engine.getState().misses >= 1);
  assert.ok(engine.getState().energy <= energy - RHYTHM_RULES.extraPenalty * 2 - RHYTHM_RULES.missPenalty);
});

test("an exact player completes all eight rounds with a deterministic perfect result", () => {
  const engine = createRhythmEngine({ random: seededRandom(99) });
  engine.start();
  let guard = 0;
  while (!engine.getState().finished && guard++ < 500) {
    const state = engine.getState();
    if (state.phase === "respond" && state.nextNote) {
      engine.tick(state.nextNote.inMs);
      engine.tap();
    } else {
      engine.tick(Math.max(1, state.phaseRemainingMs));
    }
  }
  const state = engine.getState(), result = engine.getResult();
  assert.equal(state.finished, true);
  assert.equal(state.finishReason, "complete");
  assert.equal(state.roundsCompleted, 8);
  assert.equal(state.energy, 100);
  assert.equal(state.accuracy, 100);
  assert.equal(state.perfect, state.totalExpected);
  assert.equal(result.mode, "rhythm-relay-v7");
  assert.equal(result.unit, "점");
  assert.equal(result.value, state.score);
  assert.deepEqual(Object.keys(result.details).sort(), ["accuracy", "elapsedMs", "energy", "extraTaps", "good", "hits", "maxCombo", "misses", "perfect", "roundsCompleted", "totalExpected"]);
});

test("energy reaching zero ends the relay before eight rounds", () => {
  const engine = createRhythmEngine({ random: seededRandom(5) });
  engine.start();
  while (!engine.getState().finished) engine.tap();
  const state = engine.getState(), result = engine.getResult();
  assert.equal(state.finishReason, "energy");
  assert.equal(state.energy, 0);
  assert.equal(state.roundsCompleted, 0);
  assert.ok(state.extraTaps > 0);
  assert.equal(result.details.energy, 0);
});

test("tick partitioning and event output remain deterministic", () => {
  const a = createRhythmEngine({ random: seededRandom(17) });
  const b = createRhythmEngine({ random: seededRandom(17) });
  a.start(); b.start();
  a.tick(7301);
  for (const ms of [16.7, 33.3, 1250, 2000.25, 4000.75]) b.tick(ms);
  assert.deepEqual(a.getState(), b.getState());
  assert.deepEqual(a.drainEvents(), b.drainEvents());
});
