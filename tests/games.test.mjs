import test from "node:test";
import assert from "node:assert/strict";
import { colorGridSize, memoryRoundConfig, mountGame } from "../public/js/games.js";

test("color stages change at the exact round boundaries", () => {
  const cases = [
    [0, 2], [1, 2], [2, 3], [5, 3], [6, 4], [9, 4],
    [10, 5], [15, 5], [16, 6], [23, 6], [24, 7], [99, 7],
  ];
  for (const [correct, size] of cases) assert.equal(colorGridSize(correct), size);
});

test("mountGame reports a clear error for a non-DOM container", () => {
  assert.throws(() => mountGame(null, "sort"), /DOM/);
});

test("memory expands board and recall targets without unbounded flash speed", () => {
  for (const [round,size,count] of [[1,5,3],[3,5,5],[4,6,6],[7,6,9],[8,7,10],[30,7,16]]) {
    const config=memoryRoundConfig(round); assert.equal(config.size,size); assert.equal(config.targetCount,count); assert.ok(config.showMs>=750 && config.showMs<=1200);
  }
});
