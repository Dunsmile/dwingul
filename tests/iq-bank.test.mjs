import test from "node:test";
import assert from "node:assert/strict";
import { iqBank } from "../public/js/iq-bank.js";

const categories = ["수열", "행렬", "공간", "논리"];
const reviewedAnswers = {
  수열: ["19", "162", "25", "28", "5", "21", "32", "63", "23", "10", "42", "125", "15", "19", "145", "66", "36", "5", "720", "40", "25", "5", "73", "38", "21"],
  행렬: ["14", "24", "15", "9", "12", "○", "노랑", "2", "13", "8", "13", "12", "15", "12", "8", "22", "5", "↑", "5", "●", "19", "3", "64", "○", "67"],
  공간: ["→", "←", "↖", "24개", "8개", "12개", "6개", "1개", "4개", "10", "동쪽 2칸, 북쪽 2칸", "동쪽", "3시", "↙", "3면", "7회", "4번", "완전히 겹친다", "직사각형 1개와 원 2개", "3개", "가로 3cm, 세로 5cm", "4개", "D", "남", "4개"],
  논리: ["루루는 파랗다", "다온", "3개", "C가 A보다 먼저다", "2번", "비가 오지 않았다", "주스", "아라만 진실", "화요일", "장미는 꽃이다", "24살", "나", "3명", "40분", "321", "A가 C보다 무겁다", "고모", "정원사", "2번과 3번", "A와 7", "어떤 화가는 여행가다", "A-B-C", "초록 추", "A 상자", "6번"],
};

test("IQ bank has exactly 25 original questions in each category", () => {
  assert.equal(iqBank.length, 100);
  for (const category of categories) {
    assert.equal(iqBank.filter((question) => question.category === category).length, 25);
  }
  assert.equal(new Set(iqBank.map((question) => question.id)).size, 100);
  assert.equal(new Set(iqBank.map((question) => question.prompt)).size, 100);
});

test("the independently reviewed answer key matches every question", () => {
  for (const category of categories) {
    const questions = iqBank.filter((question) => question.category === category);
    assert.deepEqual(questions.map((question) => question.options[question.answer]), reviewedAnswers[category]);
  }
});

test("every question has four distinct choices and one valid answer", () => {
  for (const question of iqBank) {
    assert.match(question.id, /^(seq|mat|spa|log)-\d{2}$/);
    assert.ok(categories.includes(question.category), question.id);
    assert.equal(typeof question.prompt, "string", question.id);
    assert.ok(question.prompt.trim().length >= 8, question.id);
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options).size, 4, question.id);
    assert.ok(question.options.every((option) => typeof option === "string" && option.trim()), question.id);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, question.id);
    assert.equal(typeof question.explain, "string", question.id);
    assert.ok(question.explain.trim().length >= 15, question.id);
    assert.ok(question.explain.includes(question.options[question.answer]), `${question.id} explanation should name its answer`);
  }
});

test("matrix questions provide complete 3 by 3 display grids", () => {
  for (const question of iqBank.filter(({ category }) => category === "행렬")) {
    assert.equal(question.grid?.length, 3, question.id);
    assert.ok(question.grid.every((row) => row.length === 3), question.id);
    assert.ok(question.grid.flat().every((cell) => typeof cell === "string" && cell.length > 0), question.id);
    assert.equal(question.grid.flat().filter((cell) => cell === "?").length, 1, question.id);
  }
});

test("correct choices are balanced across all four positions", () => {
  for (const category of categories) {
    const counts = [0, 1, 2, 3].map((position) => iqBank.filter((question) => question.category === category && question.answer === position).length);
    assert.ok(counts.every((count) => count >= 6 && count <= 7), `${category}: ${counts.join(",")}`);
  }
});

test("copy stays within an entertainment puzzle claim", () => {
  for (const question of iqBank) {
    assert.doesNotMatch(`${question.prompt} ${question.explain}`, /정식\s*IQ|지능\s*지수|임상|진단/);
  }
});
