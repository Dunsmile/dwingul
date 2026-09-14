import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.DWINGUL_TEST_URL || "http://localhost:4174";
if (new URL(baseUrl).port !== "4174") throw new Error("V11 browser QA is restricted to isolated localhost:4174");
const output = "output/play-polish-v11";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
await page.addInitScript(() => {
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
});

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = (ms) => page.evaluate((amount) => window.advanceTime(amount), ms);
const finishPhase = async (phase) => {
  const current = await state();
  assert.equal(current.phase, phase);
  await advance(current.phaseRemainingMs);
};
const keyForLane = { left: "ArrowLeft", center: "Enter", right: "ArrowRight" };

const report = { rhythm: {}, jump: {}, errors };
try {
  await page.goto(`${baseUrl}/?v11rhythm=${Date.now()}#/play/sequence?seed=317`);
  await page.locator(".rhythm-game").waitFor();
  await page.getByRole("button", { name: "세 방향 리듬 시작", exact: true }).click();
  let current = await state();
  assert.equal(current.phase, "countin");
  assert.equal(await page.locator(".rhythm-game__tap:enabled").count(), 0);
  const inert = { energy: current.energy, score: current.score, hits: current.hits, extraTaps: current.extraTaps };
  for (const key of ["Space", "Enter", "ArrowLeft", "KeyA", "ArrowRight", "KeyD"]) await page.keyboard.press(key);
  current = await state();
  assert.deepEqual(
    { energy: current.energy, score: current.score, hits: current.hits, extraTaps: current.extraTaps },
    inert,
  );
  await finishPhase("countin");
  await page.keyboard.press("Space");
  assert.equal((await state()).extraTaps, 0);
  await finishPhase("listen");
  await page.keyboard.press("Enter");
  assert.equal((await state()).extraTaps, 0);
  await finishPhase("prepare");
  assert.equal(await page.locator(".rhythm-game__tap:enabled").count(), 3);

  let verifiedWrongLane = false;
  let verifiedCenterEnter = false;
  while ((await state()).phase === "respond" && (!verifiedWrongLane || !verifiedCenterEnter)) {
    current = await state();
    if (!current.nextNote) break;
    await advance(current.nextNote.inMs);
    current = await state();
    const lane = current.nextNote.lane;
    if (lane !== "center" && !verifiedWrongLane) {
      const noteIndex = current.nextNote.index;
      const beforeExtra = current.extraTaps;
      await page.locator(`.rhythm-game__tap[data-lane="${lane}"]`).focus();
      await page.keyboard.press("Space");
      current = await state();
      assert.equal(current.lastJudgment.timing, "wrong-lane");
      assert.equal(current.lastJudgment.lane, "center");
      assert.equal(current.notes[noteIndex].status, "pending");
      assert.equal(current.extraTaps, beforeExtra + 1);
      await advance(120);
      await page.keyboard.press(keyForLane[lane]);
      assert.equal((await state()).notes[noteIndex].status, "hit");
      verifiedWrongLane = true;
    } else {
      await page.keyboard.press(keyForLane[lane]);
      current = await state();
      assert.equal(current.lastJudgment.lane, lane);
      if (lane === "center") verifiedCenterEnter = true;
    }
  }
  assert.equal(verifiedWrongLane, true);
  assert.equal(verifiedCenterEnter, true);
  current = await state();
  if (current.phase === "respond" && current.nextNote) {
    await advance(current.nextNote.inMs);
    current = await state();
    const pointerIndex = current.nextNote.index;
    await page.locator(`.rhythm-game__tap[data-lane="${current.nextNote.lane}"]`).click();
    assert.equal((await state()).notes[pointerIndex].status, "hit");
  }
  const rhythmLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    pads: [...document.querySelectorAll(".rhythm-game__tap")].map((node) => {
      const box = node.getBoundingClientRect();
      return { lane: node.dataset.lane, left: box.left, right: box.right, height: box.height };
    }),
    focused: document.activeElement?.className,
  }));
  assert.equal(rhythmLayout.overflow, false);
  assert.ok(rhythmLayout.pads.every(({ left, right, height }) => left >= 0 && right <= 391 && height >= 44));
  await page.screenshot({ path: `${output}/rhythm-three-lanes-390.png`, fullPage: false });
  report.rhythm = { inertGuideInputs: true, wrongLaneRejected: true, spaceFixedCenter: true, enterCenterAccepted: true, pointerLaneAccepted: true, rhythmLayout };

  await page.goto(`${baseUrl}/?v11jump=${Date.now()}#/play/jump?seed=317`);
  await page.locator("canvas").waitFor();
  current = await state();
  assert.equal(current.phase, "playing");
  assert.ok(current.obstacles.length > 0);
  const obstacleId = current.obstacles[0].id;
  const startX = current.obstacles[0].x;
  const startWorld = current.worldDistance;
  await advance(400);
  current = await state();
  const movedObstacle = current.obstacles.find(({ id }) => id === obstacleId);
  assert.ok(movedObstacle);
  const objectTravel = startX - movedObstacle.x;
  const floorTravel = current.worldDistance - startWorld;
  assert.ok(Math.abs(objectTravel - floorTravel) < 1e-7, `${objectTravel} versus ${floorTravel}`);

  const groundedY = current.player.y;
  await page.keyboard.press("Space");
  await advance(120);
  current = await state();
  assert.equal(current.player.jumps, 1);
  assert.ok(current.player.y < groundedY);
  await page.keyboard.press("Space");
  assert.equal((await state()).player.jumps, 2);
  await page.keyboard.down("ArrowDown");
  await advance(1500);
  current = await state();
  assert.equal(current.player.duck, true);
  await page.keyboard.up("ArrowDown");
  assert.equal((await state()).player.duck, false);
  const jumpLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    canvas: (() => { const box = document.querySelector("canvas").getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; })(),
  }));
  assert.equal(jumpLayout.overflow, false);
  await page.screenshot({ path: `${output}/jump-world-distance-390.png`, fullPage: false });
  report.jump = { sharedWorldTravel: { objectTravel, floorTravel }, keyboardJumpAndDuck: true, jumpLayout };

  assert.deepEqual(errors, []);
  writeFileSync(`${output}/browser-report.json`, JSON.stringify({ passed: true, ...report }, null, 2));
  console.log("RHYTHM_JUMP_V11_BROWSER_PASSED");
} finally {
  await browser.close();
}
