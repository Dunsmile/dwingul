import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.DWINGUL_TEST_URL || "http://localhost:4174";
const output = "output/rhythm-v7";
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
    await page.goto(`${baseUrl}/?rhythmV7=${++visit}#/play/sequence?seed=317`);
    await page.locator(".rhythm-game").waitFor();
    await advance(0);
    assert.equal((await state()).phase, "idle");
    await page.getByRole("button", { name: "리듬 시작", exact: true }).click();
    assert.equal((await state()).phase, "countin");

    await advance((await state()).phaseRemainingMs);
    assert.equal((await state()).phase, "listen");
    await advance((await state()).phaseRemainingMs);
    assert.equal((await state()).phase, "respond");
    if (viewport.width >= 700) await page.keyboard.press("Space");
    else await page.locator(".rhythm-game__tap").click();
    let current = await state();
    assert.equal(current.lastJudgment.grade, "perfect");
    assert.equal(current.hits, 1);

    await page.locator(".rhythm-game__mute").click();
    assert.equal((await state()).muted, true);
    await page.locator(".dg-game__pause").click();
    current = await state();
    const pausedAt = current.elapsedMs;
    assert.equal(current.paused, true);
    assert.equal(await page.locator(".rhythm-game__tap").isDisabled(), true);
    await advance(1000);
    assert.equal((await state()).elapsedMs, pausedAt);
    await page.locator(".dg-game__pause").click();
    assert.equal((await state()).paused, false);

    const boxes = await page.evaluate(() => {
      const box = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      };
      return {
        game: box(".rhythm-game"),
        tap: box(".rhythm-game__tap"),
        viewport: { width: innerWidth, height: innerHeight },
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(boxes.horizontalOverflow, false);
    assert.ok(boxes.tap.height >= 44, `${viewport.name}: tap target is at least 44px`);
    assert.ok(boxes.tap.left >= 0 && boxes.tap.right <= boxes.viewport.width + 1, `${viewport.name}: tap target stays horizontally visible`);
    assert.ok(boxes.tap.top >= 0 && boxes.tap.bottom <= boxes.viewport.height + 1, `${viewport.name}: tap target stays in the viewport`);
    assert.ok(boxes.game.width <= boxes.viewport.width + 1, `${viewport.name}: game fits viewport width`);
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: false });
    report.push({ viewport, boxes, perfectInput: true, pausedClock: true, mute: true });
  }
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/browser-report.json`, JSON.stringify({ passed: true, report, errors }, null, 2));
  console.log("RHYTHM_V7_BROWSER_PASSED", report.map(({ viewport }) => `${viewport.width}x${viewport.height}`).join(", "));
} finally {
  await browser.close();
}
