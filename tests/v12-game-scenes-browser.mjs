import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.DW_TEST_URL || 'http://localhost:4174';
const output = process.env.DW_SCENE_OUTPUT || '/tmp/dwingul-v12-scenes';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = { screenshots: [], failures: [], assets: [] };

async function visit(page, route) {
  await page.goto(`${base}/?qa=finalgames#${route}`);
  await page.locator('.dg-game__canvas').waitFor();
  await page.waitForFunction(() => typeof window.advanceTime === 'function');
  await page.evaluate(() => window.advanceTime(0));
  await page.waitForTimeout(120);
}

try {
  for (const viewport of [{ width: 1440, height: 950 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => report.failures.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/assets/pixel/scenes/')) report.assets.push({ path: new URL(response.url()).pathname, status: response.status() });
    });
    for (const game of ['jump', 'sort', 'racing']) {
      await visit(page, `/play/${game}?seed=12`);
      if (game === 'jump') {
        for (let index = 0; index < 180; index += 1) {
          await page.evaluate(() => window.advanceTime(20));
          const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
          if (state.obstacles.some(obstacle => obstacle.x < 600 && obstacle.x + obstacle.w > 180)) break;
        }
        const obstacle = JSON.parse(await page.evaluate(() => window.render_game_to_text())).obstacles[0];
        if (obstacle?.kind !== 'slide') assert.equal(obstacle.y + obstacle.h, 390);
      }
      if (game === 'sort') { const state = JSON.parse(await page.evaluate(() => window.render_game_to_text())); await page.keyboard.press(state.queue[0].side === 'left' ? 'ArrowLeft' : 'ArrowRight'); }
      if (game === 'racing') { await page.keyboard.press('ArrowRight'); await page.evaluate(() => window.advanceTime(700)); }
      const path = `${output}/${game}-${viewport.width}.png`;
      await page.locator('.dg-game__canvas').screenshot({ path });
      report.screenshots.push(path);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${game} overflow at ${viewport.width}`);
      if (game === 'sort') {
        for (let index = 1; index < 20; index += 1) {
          const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
          await page.keyboard.press(state.queue[0].side === 'left' ? 'ArrowLeft' : 'ArrowRight');
          await page.evaluate(() => window.advanceTime(100));
        }
        assert.ok(JSON.parse(await page.evaluate(() => window.render_game_to_text())).feverMs > 0);
        const feverPath = `${output}/sort-fever-${viewport.width}.png`;
        await page.locator('.dg-game__canvas').screenshot({ path: feverPath });
        report.screenshots.push(feverPath);
      }
    }
    await page.close();
  }

  const sizing = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await visit(sizing, '/play/racing?seed=12');
  for (const height of [320, 630, 1100]) {
    await sizing.locator('canvas').evaluate((canvas, value) => { canvas.height = value; }, height);
    await sizing.evaluate(() => window.advanceTime(16));
    assert.equal(await sizing.locator('canvas').getAttribute('height'), String(height));
    const path = `${output}/racing-height-${height}.png`;
    await sizing.locator('canvas').screenshot({ path });
    report.screenshots.push(path);
  }
  await sizing.close();

  const fallback = await browser.newPage({ viewport: { width: 800, height: 700 } });
  await fallback.route('**/assets/pixel/scenes/*.png', route => route.abort());
  for (const game of ['jump', 'sort', 'racing']) {
    await visit(fallback, `/play/${game}?seed=7`);
    await fallback.evaluate(() => window.advanceTime(100));
    assert.ok(JSON.parse(await fallback.evaluate(() => window.render_game_to_text())).phase !== 'finished');
  }
  await fallback.close();
  assert.deepEqual(report.failures, []);
  assert.ok(report.assets.length >= 10);
  assert.ok(report.assets.every(asset => asset.status === 200), JSON.stringify(report.assets));
  report.passed = true;
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}

console.log(`v12 scene gameplay passed; ${report.screenshots.length} screenshots`);
