import test from "node:test";
import assert from "node:assert/strict";
import { typingPhrases } from "../public/js/typing-phrases.js";
import {
  RPG_PALETTE_25,
  RPG_RULES,
  createTypingRpgModel,
  typingRpgDamage,
  typingRpgMonster,
  typingRpgPalette,
} from "../public/js/typing-rpg.js";

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function submitTarget(model) {
  const target = model.getState().target;
  model.commitInput(target);
  return model.submit();
}

function defeatCurrent(model) {
  const before = model.getState().defeated;
  let guard = 0;
  while (model.getState().defeated === before && guard++ < 20) submitTarget(model);
  assert.equal(model.getState().defeated, before + 1);
}

test("stage, boss and gear formulas follow the v5 contract", () => {
  assert.equal(RPG_RULES.baseHeal, 15);
  assert.deepEqual(typingRpgMonster(1, { defense: 9 }), {
    stage: 1, boss: false, maxHp: 60, counterEveryMs: 10000, rawCounterDamage: 5, counterDamage: 1,
  });
  assert.deepEqual(typingRpgMonster(10, { defense: 5 }), {
    stage: 10, boss: true, maxHp: 300, counterEveryMs: 15000, rawCounterDamage: 28, counterDamage: 23,
  });
  assert.equal(typingRpgMonster(40).maxHp, 480);
  assert.equal(typingRpgDamage(19, { attack: 7 }), 37);
  assert.equal(typingRpgDamage(100, { attack: 7 }), 57);
});

test("the 25-color palette cycles while preserving 25 distinct stages", () => {
  assert.equal(RPG_PALETTE_25.length, 25);
  assert.equal(new Set(RPG_PALETTE_25).size, 25);
  assert.equal(typingRpgPalette(1), RPG_PALETTE_25[0]);
  assert.equal(typingRpgPalette(25), RPG_PALETTE_25[24]);
  assert.equal(typingRpgPalette(26), RPG_PALETTE_25[0]);
});

test("the phrase deck loops forever without repeats within or across a boundary", () => {
  const model = createTypingRpgModel({ random: seededRandom(77), gear: { attack: 999 } });
  const seen = [];
  for (let index = 0; index < 201; index += 1) {
    seen.push(model.getState().target);
    submitTarget(model);
  }
  assert.equal(new Set(seen.slice(0, 100)).size, 100);
  assert.equal(new Set(seen.slice(100, 200)).size, 100);
  assert.notEqual(seen[99], seen[100]);
  assert.equal(model.getState().finished, false);
  assert.equal(model.getState().completed, 201);
  assert.deepEqual(new Set(seen.slice(0, 100)), new Set(typingPhrases));
});

test("a kill advances stage, resets its timer, and only current-run kills award score and gold", () => {
  const normal = createTypingRpgModel({ random: seededRandom(), gear: { attack: 100 } });
  normal.tick(9000);
  defeatCurrent(normal);
  let state = normal.getState();
  assert.equal(state.stage, 2);
  assert.equal(state.counterMs, 10000);
  assert.equal(state.score, 20);
  assert.equal(state.gold, 10);
  assert.equal(state.bestClearedStage, 1);

  const boss = createTypingRpgModel({ random: seededRandom(), startStage: 10, gear: { attack: 999 } });
  assert.equal(boss.getState().score, 10, "skipped stages do not award score");
  assert.equal(boss.getState().boss, true);
  defeatCurrent(boss);
  state = boss.getState();
  assert.equal(state.stage, 11);
  assert.equal(state.counterMs, 10000);
  assert.equal(state.score, 20);
  assert.equal(state.gold, 30);
  assert.equal(state.bestClearedStage, 10);
  const progress = boss.getProgress();
  assert.equal(progress.finished, false);
  assert.equal(progress.details.gold, 30);
  assert.equal(progress.details.bestClearedStage, 10);
  assert.equal(progress.details.actions.length, state.actionCount);
  assert.ok(progress.details.actions.length > 0);
});

test("healing restores 15 plus gear, and input logs are quantized and replayable", () => {
  const phrase = "가".repeat(50);
  const model = createTypingRpgModel({ random: seededRandom(), phrases: [phrase], gear: { heal: 5, defense: 99 } });
  model.tick(17);
  const typo = "다".repeat(15);
  model.commitInput(typo, { composing: true });
  model.commitInput(typo);
  model.commitInput(typo);
  model.clearInput();
  model.commitInput(phrase);
  model.clearInput();
  model.tick(8);
  model.commitInput("힐");
  model.submit();
  const state = model.getState();
  assert.equal(state.elapsedMs, 20);
  assert.equal(state.hp, 90);
  assert.equal(state.mp, 0);
  assert.equal(state.actionCount, 6);
  assert.deepEqual(state.lastRecordedAction, [20, "submit"]);

  model.tick(2000000);
  const result = model.getResult();
  assert.equal(result.mode, "typing-rpg-v5-s1");
  assert.deepEqual(result.details.actions.slice(0, 3), [[10, "input", typo], [10, "clear"], [10, "input", phrase]]);
  assert.ok(result.details.actions.every(([time]) => time % 10 === 0));

  const replay = createTypingRpgModel({ random: seededRandom(), phrases: [phrase], gear: { heal: 5, defense: 99 } });
  for (const [time, type, text] of result.details.actions) {
    replay.tick(time - replay.getState().elapsedMs);
    if (type === "input") replay.commitInput(text);
    if (type === "clear") replay.clearInput();
    if (type === "submit") replay.submit();
  }
  replay.tick(result.details.elapsedMs - replay.getState().elapsedMs);
  assert.deepEqual(replay.getResult(), result);
});

test("10 ms fixed steps make time, combo and counters independent of tick partitioning", () => {
  const make = () => {
    const model = createTypingRpgModel({ random: seededRandom(9) });
    model.commitInput(model.getState().target.slice(0, 5));
    return model;
  };
  const whole = make(), split = make();
  whole.tick(20030);
  for (const ms of [17, 3, 9999, 4, 10007]) split.tick(ms);
  assert.deepEqual(split.getState(), whole.getState());
});

test("HP zero is the only ending and result exposes the replay audit fields", () => {
  const model = createTypingRpgModel({ random: seededRandom(), startStage: 10, gear: { defense: 0 } });
  model.tick(120000);
  const state = model.getState(), result = model.getResult();
  assert.equal(state.finished, true);
  assert.equal(state.finishReason, "hp");
  assert.equal(state.bestClearedStage, 0);
  assert.equal(result.value, 10);
  assert.equal(result.unit, "점");
  assert.equal(result.mode, "typing-rpg-v5-s10");
  assert.deepEqual(Object.keys(result.details).sort(), ["accuracy", "actions", "bestClearedStage", "completed", "currentStage", "defeated", "elapsedMs", "gold", "stage", "startStage", "survivedSeconds", "typed"]);
});
