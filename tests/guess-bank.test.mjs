import test from "node:test";
import assert from "node:assert/strict";
import { guessBank, hangulInitials } from "../public/js/guess-bank.js";

test("guess bank contains exactly 100 original questions per category", () => {
  assert.equal(guessBank.length, 300);
  for (const category of ["drama", "anime", "game"]) {
    assert.equal(guessBank.filter((question) => question.category === category).length, 100);
  }
});

test("guess questions have unique ids and canonical answers", () => {
  assert.equal(new Set(guessBank.map((question) => question.id)).size, 300);
  assert.equal(new Set(guessBank.map((question) => question.canonicalAnswer)).size, 300);
  for (const question of guessBank) {
    assert.match(question.canonicalAnswer, /[가-힣]/u, `${question.id} needs a Hangul syllable for a playable initial clue`);
  }
});

test("each guess has four unique choices and a valid answer", () => {
  for (const question of guessBank) {
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options).size, 4, question.id);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, question.id);
    assert.equal(question.options[question.answer], question.canonicalAnswer, question.id);
    assert.ok(question.explain.includes(question.canonicalAnswer), question.id);
  }
});

test("initial clues are derived from the canonical spelling match all four choices", () => {
  for (const question of guessBank) {
    assert.equal(question.initials, hangulInitials(question.canonicalAnswer), question.id);
    assert.ok(question.prompt.includes(question.initials), question.id);
    assert.equal(
      question.options.filter((option) => hangulInitials(option) === question.initials).length,
      4,
      question.id,
    );
  }
});

test("hangulInitials preserves word boundaries, Latin spelling, and digits", () => {
  assert.equal(hangulInitials("응답하라 1988"), "ㅇㄷㅎㄹ 1988");
  assert.equal(hangulInitials("몽키 D. 루피"), "ㅁㅋ D. ㄹㅍ");
  assert.equal(hangulInitials("SKY 캐슬"), "SKY ㅋㅅ");
});
