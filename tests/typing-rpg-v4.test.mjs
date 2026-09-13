import test from "node:test";
import assert from "node:assert/strict";
import { typingPhrases } from "../public/js/typing-phrases.js";
import {
  RPG_RULES,
  createTypingRpgModel,
  typingRpgDamage,
  typingRpgMonster,
} from "../public/js/legacy/typing-rpg-v4.js";

function seededRandom(seed = 17) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("combat constants and capped scaling match the v4 rules", () => {
  assert.deepEqual(RPG_RULES, {
    maxHp: 100, maxMp: 100, mpPerCorrectCharacter: 2, typoDamage: 2,
    counterEveryMs: 8000, comboPerCharacter: 4, comboDecayPerSecond: 8,
  });
  assert.equal(typingRpgDamage(19), 30);
  assert.equal(typingRpgDamage(20), 34);
  assert.equal(typingRpgDamage(100), 50);
  assert.deepEqual(typingRpgMonster(0), { maxHp: 60, counterDamage: 8 });
  assert.deepEqual(typingRpgMonster(30), { maxHp: 160, counterDamage: 16 });
});

test("the seeded 100-phrase deck has no replacement and reproduces exactly", () => {
  const play = (seed) => {
    const model = createTypingRpgModel({ random: seededRandom(seed) });
    const order = [];
    while (!model.getState().finished) {
      const { target } = model.getState();
      order.push(target);
      model.commitInput(target);
      model.submit();
    }
    return { order, state: model.getState(), result: model.getResult() };
  };
  const first = play(42), repeat = play(42), other = play(43);
  assert.equal(first.order.length, 100);
  assert.equal(new Set(first.order).size, 100);
  assert.deepEqual(new Set(first.order), new Set(typingPhrases));
  assert.deepEqual(first.order, repeat.order);
  assert.notDeepEqual(first.order, other.order);
  assert.equal(first.state.completed, 100);
  assert.equal(first.state.finishReason, "completed");
  assert.equal(first.result.value, 10000 + first.state.defeated * 50);
});

test("committed characters affect MP, accuracy, combo and HP but IME composition does not", () => {
  const model = createTypingRpgModel({ random: seededRandom(), phrases: ["가나다"] });
  assert.equal(model.getState().accuracy, 0);
  model.commitInput("라", { composing: true });
  let state = model.getState();
  assert.equal(state.hp, 100);
  assert.equal(state.mp, 0);
  assert.equal(state.typed, 0);
  assert.equal(state.input, "");
  model.commitInput("라");
  state = model.getState();
  assert.equal(state.hp, 98);
  assert.equal(state.typed, 1);
  assert.equal(state.accuracy, 0);
  assert.equal(state.combo, 0);
  model.clearInput();
  model.commitInput("가나");
  state = model.getState();
  assert.equal(state.hp, 98);
  assert.equal(state.mp, 4);
  assert.equal(state.typed, 3);
  assert.equal(state.correctTyped, 2);
  assert.equal(state.accuracy, 66.7);
  assert.equal(state.combo, 8);
  model.tick(500);
  assert.equal(model.getState().combo, 4);

  const corrected = createTypingRpgModel({ random: seededRandom(), phrases: ["가나다"] });
  corrected.commitInput("가라다");
  corrected.commitInput("가나다");
  assert.equal(corrected.getState().typed, 4, "an unchanged suffix is not charged twice");
  assert.equal(corrected.getState().correctTyped, 3);
});

test("a full-MP heal draft is penalty-free and heals 30 HP on Enter", () => {
  const phrase = "가".repeat(50);
  const model = createTypingRpgModel({ random: seededRandom(), phrases: [phrase] });
  model.commitInput("나".repeat(20));
  model.clearInput();
  model.commitInput(phrase);
  model.clearInput();
  const before = model.getState();
  assert.equal(before.hp, 60);
  assert.equal(before.mp, 100);
  model.commitInput("힐");
  assert.equal(model.getState().typed, before.typed);
  assert.equal(model.getState().hp, before.hp);
  assert.equal(model.submit().type, "heal");
  assert.equal(model.getState().hp, 90);
  assert.equal(model.getState().mp, 0);
});

test("the first counter is warned for eight seconds and HP zero ends the endless fight", () => {
  const model = createTypingRpgModel({ random: seededRandom(), phrases: typingPhrases });
  model.tick(7999);
  assert.equal(model.getState().hp, 100);
  assert.equal(model.getState().counterMs, 1);
  model.tick(1);
  assert.equal(model.getState().hp, 92);
  model.tick(96000);
  const state = model.getState(), result = model.getResult();
  assert.equal(state.finished, true);
  assert.equal(state.finishReason, "hp");
  assert.equal(state.hp, 0);
  assert.equal(result.mode, "typing-rpg-v4");
  assert.equal(result.unit, "점");
  assert.deepEqual(Object.keys(result.details).sort(), ["accuracy", "completed", "defeated", "elapsedMs", "survivedSeconds", "typed"]);
});
