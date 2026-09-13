import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.DWINGUL_TEST_URL || "http://localhost:4174";
const output = "output/rhythm-v9";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const report = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
await page.addInitScript(() => {
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
});

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = (ms) => page.evaluate((amount) => window.advanceTime(amount), ms);

try {
  let visit = 0;
  for (const viewport of [
    { width: 1280, height: 720, name: "pc" },
    { width: 390, height: 844, name: "mobile-390" },
    { width: 320, height: 568, name: "mobile-320" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/?rhythmV9=${++visit}#/play/sequence?seed=317`);
    await page.locator(".rhythm-game").waitFor();
    await advance(0);
    assert.equal((await state()).phase, "idle");
    await page.getByRole("button", { name: "무한 리듬 시작", exact: true }).click();
    assert.equal((await state()).phase, "countin");
    await advance((await state()).phaseRemainingMs);
    assert.equal((await state()).phase, "listen");
    await advance((await state()).phaseRemainingMs);
    let current = await state();
    assert.equal(current.phase, "prepare");
    assert.equal(await page.locator("[data-ui=count]").innerText(), "3");
    assert.equal(await page.locator(".rhythm-game__tap").isDisabled(), true);
    await page.screenshot({ path: `${output}/${viewport.name}-prepare.png`, fullPage: false });
    await advance(current.beatMs);
    assert.equal(await page.locator("[data-ui=count]").innerText(), "2");
    await advance(current.beatMs);
    assert.equal(await page.locator("[data-ui=count]").innerText(), "1");
    await advance(current.beatMs);
    current = await state();
    assert.equal(current.phase, "respond");
    assert.equal(current.nextNote.inMs, current.beatMs);
    assert.equal(await page.locator(".rhythm-game__tap").isDisabled(), false);

    await page.locator(".dg-game__pause").click();
    const pausedAt = (await state()).elapsedMs;
    assert.equal((await state()).paused, true);
    assert.equal(await page.locator(".rhythm-game__tap").isDisabled(), true);
    await advance(1000);
    assert.equal((await state()).elapsedMs, pausedAt);
    await page.locator(".dg-game__pause").click();
    assert.equal((await state()).paused, false);

    current = await state();
    await advance(current.nextNote.inMs);
    if (viewport.width >= 700) await page.keyboard.press("Space");
    else await page.locator(".rhythm-game__tap").click();
    current = await state();
    assert.equal(current.lastJudgment.grade, "perfect");
    assert.equal(current.hits, 1);
    assert.match(await page.locator("[data-ui=round]").innerText(), /1.*∞/);

    const boxes = await page.evaluate(() => {
      const rect = document.querySelector(".rhythm-game__tap").getBoundingClientRect();
      return {
        tap: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height },
        viewport: { width: innerWidth, height: innerHeight },
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(boxes.horizontalOverflow, false);
    assert.ok(boxes.tap.height >= 44);
    assert.ok(boxes.tap.left >= 0 && boxes.tap.right <= boxes.viewport.width + 1);
    assert.ok(boxes.tap.top >= 0 && boxes.tap.bottom <= boxes.viewport.height + 1);
    await page.screenshot({ path: `${output}/${viewport.name}-respond.png`, fullPage: false });
    report.push({ viewport, countdown: [3, 2, 1], firstTargetDelayMs: current.beatMs, perfectInput: true, pausedClock: true, boxes });
  }

  while (!(await state()).ending) {
    const current = await state();
    if (current.phase === "respond" && current.nextNote) await advance(current.nextNote.inMs + 176);
    else await advance(Math.max(1, current.phaseRemainingMs));
  }
  const gameOver = await state();
  const frozen = { elapsedMs: gameOver.elapsedMs, score: gameOver.score, energy: gameOver.energy };
  assert.equal(gameOver.phase, "gameover");
  assert.equal(await page.locator(".rhythm-game").evaluate((node) => node.classList.contains("is-gameover")), true);
  assert.equal(await page.locator(".rhythm-game__tap").isDisabled(), true);
  await advance(899);
  assert.deepEqual(
    await state().then((value) => ({ elapsedMs: value.elapsedMs, score: value.score, energy: value.energy })),
    frozen,
  );
  await page.screenshot({ path: `${output}/gameover-hold.png`, fullPage: false });
  await advance(1);
  await page.locator(".result-number").waitFor();
  assert.match(await page.locator(".result-number").innerText(), /점/);
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/browser-report.json`, JSON.stringify({ passed: true, report, gameOverHoldMs: 900, errors }, null, 2));
  console.log("RHYTHM_V9_BROWSER_PASSED", report.map(({ viewport }) => `${viewport.width}x${viewport.height}`).join(", "));
} finally {
  await browser.close();
}
