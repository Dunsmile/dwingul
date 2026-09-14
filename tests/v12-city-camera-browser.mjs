import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { CITY_PLAYER_CARS, CITY_TRAFFIC_TYPES, CITY_TRAFFIC_VIEWS } from '../public/js/city-vehicle-art.js';

const base = process.env.DW_TEST_URL || 'http://localhost:4174';
const output = process.env.DW_VEHICLE_OUTPUT || '/tmp/dwingul-v12-vehicle-camera';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = { screenshots: [], errors: [], images: [] };

async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  const images = await page.evaluate(() => [...document.images].map(image => ({ src: image.src, width: image.naturalWidth, height: image.naturalHeight })));
  assert.ok(images.every(image => image.width > 0 && image.height > 0), JSON.stringify(images));
  report.images.push(...images);
}

async function gallery(page, entries, title, width) {
  await page.goto(base);
  await page.evaluate(({ entries, title, base }) => {
    document.body.innerHTML = `<main><h1>${title}</h1><section>${entries.map(entry => `<figure><div><img src="${base}${entry.src}" alt="${entry.label}"></div><figcaption>${entry.label}</figcaption></figure>`).join('')}</section></main>`;
    const style = document.createElement('style');
    style.textContent = 'body{margin:0;background:#183b32;color:#fff9dd;font:16px sans-serif}main{padding:20px}h1{text-align:center}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:12px}figure{margin:0;padding:9px;background:#fff9dd;color:#284e3d;border-radius:10px;text-align:center}figure div{height:150px;display:grid;place-items:end center;background:#dce7d2}img{max-width:100%;max-height:145px;image-rendering:pixelated}figcaption{padding-top:7px;font-weight:700}';
    document.head.append(style);
  }, { entries, title, base });
  await waitForImages(page);
  const path = `${output}/${title}-${width}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}

try {
  const traffic = CITY_TRAFFIC_TYPES.flatMap(type => CITY_TRAFFIC_VIEWS.map(view => ({ label: `${type} · ${view}`, src: `/assets/pixel/scenes/traffic-${type}-${view}.png` })));
  const players = CITY_PLAYER_CARS.map(car => ({ label: `${car} · rear`, src: `/assets/pixel/scenes/player-${car}-rear.png` }));
  for (const viewport of [{ width: 1440, height: 950 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => report.errors.push(error.message));
    await gallery(page, traffic, 'traffic-five-views', viewport.width);
    await gallery(page, players, 'player-eight-rears', viewport.width);
    await page.goto(`${base}/?qa=finalgames#/play/racing?seed=19&car=basic`);
    await page.locator('.city-canvas').waitFor();
    await page.waitForFunction(() => typeof window.advanceTime === 'function');
    await page.evaluate(() => window.advanceTime(700));
    await page.waitForTimeout(100);
    const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    assert.equal(state.playerArt.source, '/assets/pixel/scenes/player-basic-rear.png');
    assert.ok(state.vehicles.every(vehicle => CITY_TRAFFIC_VIEWS.includes(vehicle.artView)));
    const path = `${output}/game-basic-${viewport.width}.png`;
    await page.locator('.city-canvas').screenshot({ path });
    report.screenshots.push(path);
    await page.close();
  }

  const fallback = await browser.newPage({ viewport: { width: 800, height: 700 } });
  await fallback.route('**/assets/pixel/scenes/traffic-*.png', route => route.abort());
  await fallback.route('**/assets/pixel/scenes/player-*-rear.png', route => route.abort());
  await fallback.goto(`${base}/?qa=finalgames#/play/racing?seed=19&car=basic`);
  await fallback.locator('.city-canvas').waitFor();
  await fallback.waitForFunction(() => typeof window.advanceTime === 'function');
  await fallback.evaluate(() => window.advanceTime(700));
  assert.equal(JSON.parse(await fallback.evaluate(() => window.render_game_to_text())).ended, false);
  await fallback.keyboard.press('ArrowRight');
  await fallback.evaluate(() => window.advanceTime(100));
  assert.equal(JSON.parse(await fallback.evaluate(() => window.render_game_to_text())).lane, 3);
  await fallback.close();

  assert.deepEqual(report.errors, []);
  assert.equal(new Set(report.images.map(image => image.src)).size, 28);
  report.passed = true;
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}

console.log(`v12 vehicle camera passed; ${report.screenshots.length} screenshots, 28 authored PNGs`);
