import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {catalog} from '../public/js/catalog.js';
import {rpgItems} from '../public/js/rpg-items.js';

const base = process.env.BASE_URL || 'http://127.0.0.1:4174';
const parsedBase = new URL(base);
assert.ok(['127.0.0.1', 'localhost'].includes(parsedBase.hostname));
assert.equal(parsedBase.port, '4174', 'V10 world QA may only use the isolated server on port 4174');
assert.equal(catalog.length, 21);

const output = 'output/playwright/v10-world';
mkdirSync(output, {recursive: true});
const qaSection = process.env.QA_SECTION || 'full';
const reportPath = `${output}/report-${qaSection}.json`;
const viewports = [
  {width: 320, height: 568},
  {width: 390, height: 844},
  {width: 768, height: 1024},
  {width: 1440, height: 900},
  {width: 1920, height: 1080},
];
const cityFixture = JSON.parse(readFileSync(new URL('./fixtures/city-v6-drive.json', import.meta.url), 'utf8'));
const artbookManifest = JSON.parse(readFileSync(new URL('../public/artbook/manifest.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: viewports[1]});
await context.addInitScript(() => {
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
});
const page = await context.newPage();
page.setDefaultTimeout(10_000);

const report = {
  passed: false,
  viewports,
  contentCount: catalog.length,
  routeChecks: 0,
  thumbnailChecks: {},
  games: {},
  results: {},
  rpg: {},
  scroll: {},
  fallback: {},
  artbook: {},
  findings: [],
  pageErrors: [],
  consoleErrors: [],
  failedImages: [],
  failedResponses: [],
  loadedWorldAssets: [],
};

page.on('pageerror', error => report.pageErrors.push({url: page.url(), message: error.message}));
page.on('console', message => {
  if (message.type() === 'error') report.consoleErrors.push({url: page.url(), message: message.text()});
});
page.on('response', response => {
  const local = new URL(response.url()).origin === parsedBase.origin;
  if (!local) return;
  const pathname = new URL(response.url()).pathname;
  if (response.status() === 200 && /^\/assets\/pixel\/world\/(?:vehicle-[a-z-]+|boost)\.svg$/.test(pathname)) report.loadedWorldAssets.push(pathname);
  if (response.request().resourceType() === 'image' && response.status() >= 400) {
    report.failedImages.push({url: response.url(), status: response.status()});
  }
  if (response.status() >= 500) report.failedResponses.push({url: response.url(), status: response.status()});
});

const commonItem = rpgItems.find(item => item.id === 'attack-common');
const rareItem = rpgItems.find(item => item.id === 'defense-rare');
assert.ok(commonItem && rareItem);
let rpgProfile = {
  earnedCheckpoints: [1], recommendedStartStage: 1, gold: 1000, bestCleared: 0,
  equipped: {attack: commonItem.id, defense: null, heal: null},
  gear: {attack: commonItem.value, defense: 0, heal: 0},
  owned: [commonItem.id, rareItem.id],
  inventory: [
    {itemId: commonItem.id, quantity: 1, enhancement: 0},
    {itemId: rareItem.id, quantity: 1, enhancement: 0},
  ],
  configured: false, checkpoints: [1],
};
const fulfillJson = (route, body, status = 200) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify(body)});
await page.route('**/api/rpg**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  const data = request.postDataJSON?.() || {};
  if (path === '/api/rpg/draw') {
    rpgProfile = {...rpgProfile, gold: 950};
    return fulfillJson(route, {...rpgProfile, item: rareItem, duplicate: true, items: [{item: rareItem, duplicate: true}], revealedCount: 0});
  }
  if (path === '/api/rpg/equip') {
    rpgProfile = {...rpgProfile, equipped: {...rpgProfile.equipped, [data.slot]: data.itemId}, gear: {...rpgProfile.gear, [data.slot]: rareItem.value}};
    return fulfillJson(route, rpgProfile);
  }
  if (path === '/api/rpg/progress') return fulfillJson(route, {...rpgProfile, earned: 0, finished: true, score: 0, stage: 1});
  return fulfillJson(route, rpgProfile);
});

let visit = 0;
async function open(route, selector = '#main') {
  await page.goto(`${base}/?v10WorldQa=${++visit}#/${route}`, {waitUntil: 'networkidle'});
  await page.locator(selector).first().waitFor();
}

async function loadedImages(scope = 'body') {
  const images = page.locator(`${scope} img`);
  for (let index = 0; index < await images.count(); index++) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(element => element.decode?.().catch(() => {}));
  }
  return images.evaluateAll(elements => elements.map(image => ({
    src: image.currentSrc || image.src,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    hidden: image.hidden,
  })));
}

async function layout(label, {controls = []} = {}) {
  const snapshot = await page.evaluate(() => {
    const root = document.documentElement;
    const overflowing = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      return {tag: element.tagName.toLowerCase(), cls: String(element.className || '').slice(0, 90), left: Math.round(rect.left), right: Math.round(rect.right)};
    }).filter(item => item.left < -1 || item.right > innerWidth + 1).slice(0, 10);
    return {width: innerWidth, scrollWidth: root.scrollWidth, overflowing, errorPage: document.querySelector('.error-page')?.innerText || ''};
  });
  if (snapshot.scrollWidth > snapshot.width + 1) report.findings.push({severity: 'P1', area: label, issue: `horizontal overflow ${snapshot.scrollWidth - snapshot.width}px`, evidence: snapshot.overflowing});
  if (snapshot.errorPage) report.findings.push({severity: 'P1', area: label, issue: snapshot.errorPage});
  for (const selector of controls) {
    const control = page.locator(selector).first();
    await control.waitFor();
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    if (!box || box.x < -1 || box.x + box.width > snapshot.width + 1 || box.width < 32 || box.height < 32) {
      report.findings.push({severity: 'P1', area: label, issue: `critical control is clipped or too small: ${selector}`, evidence: box});
    }
  }
  return snapshot;
}

async function screenshot(name, fullPage = false) {
  await page.screenshot({path: `${output}/${name}.png`, fullPage});
}

async function verifyCatalog() {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const key = `${viewport.width}x${viewport.height}`;
    for (const route of ['', 'explore']) {
      await open(route);
      await layout(`${key} #/${route || 'home'}`);
      report.routeChecks++;
      if ([390, 1440].includes(viewport.width)) await screenshot(`${route || 'home'}-${viewport.width}`, true);
    }

    const cards = page.locator('.content-card');
    assert.equal(await cards.count(), 21, `${key} explore should show all 21 services`);
    const sources = [];
    for (let index = 0; index < 21; index++) {
      const image = cards.nth(index).locator('[data-art-image]');
      await image.scrollIntoViewIfNeeded();
      await image.waitFor();
      await page.waitForFunction(element => element.complete && element.naturalWidth > 0, await image.elementHandle());
      sources.push(new URL(await image.evaluate(element => element.currentSrc || element.src)).pathname);
    }
    assert.equal(new Set(sources).size, 21, `${key} thumbnails should resolve to 21 distinct files`);
    report.thumbnailChecks[key] = sources;

    for (const content of catalog) {
      await open(`detail/${content.id}`);
      assert.equal(await page.locator('#main h1').first().innerText(), content.title);
      const image = page.locator('.detail-masthead [data-art-image]');
      await page.waitForFunction(element => element.complete && element.naturalWidth > 0, await image.elementHandle());
      await layout(`${key} detail/${content.id}`);
      report.routeChecks++;
    }
  }
}

async function verifyFallback() {
  const fallbackContext = await browser.newContext({viewport: viewports[1]});
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.route('**/assets/pixel/thumbnails/sort*.webp', route => route.abort('failed'));
  await fallbackPage.goto(`${base}/?v10Fallback=${Date.now()}#/explore`, {waitUntil: 'networkidle'});
  const art = fallbackPage.locator('.service-art[data-art="sort"]');
  await art.scrollIntoViewIfNeeded();
  await art.locator('img').waitFor({state: 'hidden'});
  assert.match(await art.getAttribute('class'), /is-unavailable/);
  assert.equal(await art.locator('.art-fallback').isVisible(), true);
  report.fallback = {blocked: 'sort-small.webp', imageHidden: true, semanticFallbackVisible: true};
  await fallbackPage.screenshot({path: `${output}/thumbnail-fallback-390.png`, fullPage: false});
  await fallbackContext.close();
}

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = milliseconds => page.evaluate(value => window.advanceTime(value), milliseconds);

async function startGame(id, width, seed = 42) {
  const viewport = viewports.find(item => item.width === width);
  await page.setViewportSize(viewport);
  await open(`play/${id}?seed=${seed}`, '.dg-game');
  await advance(0);
  await layout(`${width} play/${id}`, {controls: ['.dg-game__pause']});
}

async function simpleGames() {
  await startGame('sort', 390);
  let before = await state();
  await page.locator(before.queue[0].side === 'left' ? '.dg-game__control--blue' : '.dg-game__control--white').click();
  assert.equal((await state()).score, 1);
  await layout('390 sort controls', {controls: ['.dg-game__control--blue', '.dg-game__control--white']});
  await screenshot('sort-390');
  await startGame('sort', 1440);
  before = await state();
  await page.keyboard.press(before.queue[0].side === 'left' ? 'ArrowLeft' : 'ArrowRight');
  assert.equal((await state()).score, 1);
  await screenshot('sort-1440');
  report.games.sort = {touch: true, keyboard: true};

  await startGame('timing', 390);
  await page.locator('.dg-game__primary').click();
  await advance(250);
  assert.equal((await state()).phase, 'running');
  await screenshot('simple-timing-390');
  await startGame('timing', 1440);
  await page.keyboard.press('Space');
  await advance(250);
  assert.equal((await state()).phase, 'running');
  await screenshot('simple-timing-1440');
  report.games.timing = {touch: true, keyboard: true};

  await startGame('color', 390);
  before = await state();
  await page.locator('.dg-game__color-cell').nth(before.targetIndex).click();
  assert.equal((await state()).correct, 1);
  report.games.color = {targetButton: true};

  await startGame('reaction', 390);
  await page.locator('.dg-game__reaction').click();
  assert.equal((await state()).phase, 'waiting');
  await startGame('reaction', 1440);
  await page.keyboard.press('Space');
  assert.equal((await state()).phase, 'waiting');
  report.games.reaction = {touch: true, keyboard: true};

  await startGame('typing', 390);
  before = await state();
  await page.locator('.typing-rpg__input').fill(before.target);
  await page.locator('.typing-rpg__submit').click();
  assert.equal((await state()).completed, 1);
  await startGame('typing', 1440);
  before = await state();
  await page.locator('.typing-rpg__input').fill(before.target);
  await page.locator('.typing-rpg__input').press('Enter');
  assert.equal((await state()).completed, 1);
  report.games.typing = {touch: true, keyboard: true};

  await startGame('memory', 390);
  before = await state();
  await advance(before.phaseMs + 1);
  before = await state();
  for (const target of before.targets) await page.locator('.dg-game__memory-cell').nth(target).click();
  assert.equal((await state()).completedRounds, 1);
  await screenshot('simple-memory-390');
  await startGame('memory', 1440);
  before = await state();
  await advance(before.phaseMs + 1);
  before = await state();
  for (const target of before.targets) await page.locator('.dg-game__memory-cell').nth(target).click();
  assert.equal((await state()).completedRounds, 1);
  await screenshot('simple-memory-1440');
  report.games.memory = {touch: true};

  await startGame('numbers', 390);
  await page.getByRole('button', {name: '1', exact: true}).click();
  assert.equal((await state()).next, 2);
  report.games.numbers = {numberButton: true};
}

async function driveToBoost(width, input) {
  await startGame('racing', width, cityFixture.seed);
  let elapsed = 0;
  for (const [at, direction] of cityFixture.inputs) {
    await advance(at - elapsed);
    elapsed = at;
    if (direction === 0) {
      const charged = await state();
      assert.ok(charged.boost >= 10, `${width}px city fixture should charge boost before activation`);
      if (input === 'keyboard') await page.keyboard.press('ArrowUp');
      else await page.locator('.city-touch-boost').click();
      break;
    }
    await page.keyboard.press(direction < 0 ? 'ArrowLeft' : 'ArrowRight');
  }
  const boosted = await state();
  assert.equal(boosted.boosting, true);
  assert.equal(boosted.boosts, 1);
  await layout(`${width} city active`, {controls: input === 'keyboard' ? ['.city-boost-button'] : ['.city-touch-boost', '[aria-label="왼쪽 차선"]', '[aria-label="오른쪽 차선"]']});
  await screenshot(`city-${width}`);
  report.games[`racing-${input}`] = {boosting: true, boosts: boosted.boosts, nearMisses: boosted.nearMisses, key: input === 'keyboard' ? 'ArrowUp' : 'touch boost'};
}

async function actionGames() {
  await driveToBoost(1440, 'keyboard');
  await driveToBoost(390, 'touch');
  const expectedCityAssets = ['vehicle-basic', 'vehicle-sport', 'vehicle-touring', 'vehicle-car', 'vehicle-van', 'vehicle-truck', 'vehicle-bus', 'boost'].map(name => `/assets/pixel/world/${name}.svg`);
  const loadedCityAssets = new Set(report.loadedWorldAssets);
  assert.ok(expectedCityAssets.every(asset => loadedCityAssets.has(asset)), `city should preload all vehicle and boost art: ${JSON.stringify([...loadedCityAssets])}`);
  report.games.racingAssets = {expected: expectedCityAssets, loaded: expectedCityAssets.filter(asset => loadedCityAssets.has(asset))};

  const jumpRenderedPlayer = {};
  for (const width of [390, 1440]) {
    await startGame('jump', width, 21);
    if (width === 390) await page.getByRole('button', {name: /점프/}).click();
    else await page.keyboard.press('Space');
    const jumpState = await state();
    assert.equal(jumpState.player.jumps, 1);
    const canvasBox = await page.locator('.dg-game canvas').boundingBox();
    const scale = canvasBox.width / jumpState.canvas.width;
    jumpRenderedPlayer[width] = {
      width: Math.round(jumpState.playerBox.w * scale * 10) / 10,
      height: Math.round(jumpState.playerBox.h * scale * 10) / 10,
      cameraWidth: jumpState.canvas.width,
    };
    if (width === 390 && Math.max(jumpRenderedPlayer[width].width, jumpRenderedPlayer[width].height) < 24) {
      report.findings.push({severity: 'P2', area: 'jump mobile', issue: 'the player sprite is difficult to track at mobile scale', evidence: jumpRenderedPlayer[width]});
    }
    await layout(`${width} jump controls`, {controls: ['.dg-game__control']});
    await screenshot(`jump-${width}`);

    if (width === 390) {
      assert.equal(jumpState.canvas.width, 640, 'phone jump camera should use the 640-wide view');
      const visual = {x: 108, y: 390 - 72, width: 64, height: 72};
      assert.ok(jumpState.playerBox.x >= visual.x && jumpState.playerBox.x + jumpState.playerBox.w <= visual.x + visual.width);
      assert.ok(jumpState.playerBox.y >= visual.y && jumpState.playerBox.y + jumpState.playerBox.h <= visual.y + visual.height);
      await screenshot('jump-normal-390');

      const duck = page.getByRole('button', {name: /숙이기/});
      await duck.dispatchEvent('pointerdown', {pointerId: 1, button: 0});
      const slideState = await state();
      assert.equal(slideState.player.duck, true);
      assert.equal(slideState.playerBox.h, 27);
      const slideVisual = {x: 108, y: 390 - 34, width: 64, height: 34};
      assert.ok(slideState.playerBox.x >= slideVisual.x && slideState.playerBox.x + slideState.playerBox.w <= slideVisual.x + slideVisual.width);
      assert.ok(slideState.playerBox.y >= slideVisual.y && slideState.playerBox.y + slideState.playerBox.h <= slideVisual.y + slideVisual.height);
      await screenshot('jump-slide-390');
      await page.locator('body').dispatchEvent('pointerup', {pointerId: 1, button: 0});

      let endingState = await state();
      let endingGuard = 0;
      while (endingState.phase !== 'ending' && endingGuard++ < 2500) {
        await advance(20);
        endingState = await state();
      }
      assert.equal(endingState.phase, 'ending');
      assert.equal(endingState.lives, 0);
      assert.equal(endingState.player.y, 390);
      await screenshot('jump-end-x-390');
      report.games.jumpStates = {normal: true, slide: true, endX: true, collisionInsidePortrait: true};
    }

    await startGame('sequence', width, 317);
    await page.locator('.rhythm-game__start').click();
    let current = await state();
    let guard = 0;
    while (current.phase !== 'respond' && guard++ < 12) {
      await advance(Math.max(1, current.phaseRemainingMs));
      current = await state();
    }
    assert.equal(current.phase, 'respond');
    await advance(current.nextNote.inMs);
    if (width === 390) await page.locator('.rhythm-game__tap').click();
    else await page.keyboard.press('Space');
    assert.equal((await state()).hits, 1);
    await layout(`${width} rhythm controls`, {controls: ['.rhythm-game__tap', '.rhythm-game__mute']});
    await screenshot(`rhythm-${width}`);
  }
  report.games.jump = {touch: true, keyboard: true, renderedPlayer: jumpRenderedPlayer};
  report.games.sequence = {touch: true, keyboard: true, count: 10};
}

async function verifyArtbook() {
  const expectedGroups = Object.fromEntries([...new Set(artbookManifest.assets.map(asset => asset.group))].map(group => [group, artbookManifest.assets.filter(asset => asset.group === group).length]));
  assert.ok(artbookManifest.assets.length >= 480, 'artbook should expose the complete world package');
  assert.ok(expectedGroups['캐릭터 원화'] >= 9, 'artbook should include the portrait group');

  for (const width of [390, 1440]) {
    await page.setViewportSize(viewports.find(viewport => viewport.width === width));
    await page.goto(`${base}/artbook/?v10WorldQa=${++visit}`, {waitUntil: 'networkidle'});
    await page.locator('#gallery figure').first().waitFor();
    assert.equal(await page.locator('#filters button').count(), Object.keys(expectedGroups).length);

    const groupResults = {};
    for (const [group, expected] of Object.entries(expectedGroups)) {
      await page.getByRole('button', {name: group, exact: true}).click();
      await page.getByText(`${group} · ${expected}개`, {exact: true}).waitFor();
      assert.equal(await page.locator('#gallery figure').count(), expected);
      const sources = artbookManifest.assets.filter(asset => asset.group === group).map(asset => asset.preview || asset.src);
      const images = await page.evaluate(async urls => Promise.all(urls.map(url => new Promise(resolve => {
        const image = new Image();
        const timer = setTimeout(() => resolve({src: url, naturalWidth: 0, timeout: true}), 10_000);
        const done = () => { clearTimeout(timer); resolve({src: url, naturalWidth: image.naturalWidth}); };
        image.onload = done;
        image.onerror = done;
        image.loading = 'eager';
        image.src = url;
      }))), sources);
      assert.ok(images.every(image => image.naturalWidth > 0), `${width}px ${group} should load every preview`);
      assert.equal(new Set(images.map(image => image.src)).size, expected, `${width}px ${group} previews should be unique`);
      const firstVisibleImage = page.locator('#gallery img').first();
      await page.waitForFunction(image => image.complete && image.naturalWidth > 0, await firstVisibleImage.elementHandle());
      const snapshot = await layout(`${width} artbook ${group}`);
      groupResults[group] = {expected, loaded: images.length, overflow: snapshot.scrollWidth > snapshot.width};
    }

    await page.getByRole('button', {name: '게임·타로·오행', exact: true}).click();
    const search = page.locator('#search');
    await search.fill('타로');
    const koreanSearchCount = await page.locator('#gallery figure').count();
    if (!koreanSearchCount && !report.findings.some(finding => finding.area === 'artbook search')) report.findings.push({severity: 'P2', area: 'artbook search', issue: 'the Korean tarot query shown in the search placeholder returns no results', evidence: {query: '타로', group: '게임·타로·오행'}});
    await search.fill('tarot');
    await page.waitForFunction(() => document.querySelectorAll('#gallery figure').length > 0);
    const searchCount = await page.locator('#gallery figure').count();
    const firstOriginal = page.locator('#gallery figure a').first();
    await page.keyboard.press('Tab');
    assert.equal(await firstOriginal.evaluate(element => document.activeElement === element), true);
    const focusStyle = await firstOriginal.evaluate(element => ({width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle}));
    assert.equal(focusStyle.style, 'solid');
    assert.equal(focusStyle.width, '3px');
    const href = await firstOriginal.getAttribute('href');
    const response = await page.request.get(new URL(href, base).href);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'] || '', /^image\//);
    const focusedImage = firstOriginal.locator('img');
    assert.ok(await focusedImage.evaluate(image => image.complete && image.naturalWidth > 0));
    await layout(`${width} artbook search and focus`, {controls: ['#search', '#gallery figure a']});
    await screenshot(`artbook-search-focus-${width}`, true);

    await search.fill('');
    await page.getByRole('button', {name: '썸네일', exact: true}).click();
    await page.getByText('썸네일 · 21개', {exact: true}).waitFor();
    const visibleThumbnail = page.locator('#gallery img').first();
    await page.waitForFunction(image => image.complete && image.naturalWidth > 0, await visibleThumbnail.elementHandle());
    await screenshot(`artbook-${width}`, false);
    report.artbook[width] = {assets: artbookManifest.assets.length, groups: groupResults, search: {koreanQuery: '타로', koreanMatches: koreanSearchCount, fallbackQuery: 'tarot', matches: searchCount}, focusedOriginalLoaded: true};
  }
}

async function completeQuiz() {
  await page.setViewportSize(viewports[1]);
  await open('play/knowledge?seed=42', '[data-act="answer"]');
  for (let index = 0; index < 10; index++) {
    await page.locator('[data-act="answer"]').first().click();
    await page.locator('[data-act="next"]').click();
  }
  await page.locator('.result-card').waitFor();
  await layout('390 quiz result');
  assert.match(await page.locator('.result-card').innerText(), /10/);
  const resultThumbnail = page.locator('.result-game-art [data-art-image]');
  assert.ok(await resultThumbnail.evaluate(image => image.complete && image.naturalWidth > 0));
  await screenshot('quiz-result-390', true);
  await page.setViewportSize(viewports[3]);
  await layout('1440 quiz result');
  await screenshot('quiz-result-1440', true);
  report.results.quiz = {content: 'knowledge', completed: true, thumbnailLoaded: true};

  await page.setViewportSize(viewports[1]);
  const sharedResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/shares' && response.request().method() === 'POST');
  await page.locator('[data-act="share"]').click();
  const shared = await sharedResponse;
  assert.equal(shared.status(), 200);
  const {id} = await shared.json();
  assert.ok(id);
  await open(`s/${id}`, '.result-card');
  await page.getByText('친구의 도전장', {exact: true}).waitFor();
  const sharedThumbnail = page.locator('.result-game-art [data-art-image]');
  assert.ok(await sharedThumbnail.evaluate(image => image.complete && image.naturalWidth > 0));
  await layout('390 shared quiz result');
  await screenshot('shared-result-thumbnail-390', true);
  report.results.shared = {content: 'knowledge', id, thumbnailLoaded: true};
}

async function completePersonality() {
  await page.setViewportSize(viewports[1]);
  await open('play/energy', '#birth-form');
  await page.locator('[name="name"]').fill('세계검증');
  await page.locator('#birth-form button[type="submit"]').click();
  for (let index = 0; index < 12; index++) await page.locator('[data-act="answer"]').nth(index % 2).click();
  await page.locator('.result-card').waitFor();
  assert.equal(await page.locator('.persona-art').count(), 1);
  const images = await loadedImages('.result-card');
  assert.ok(images.every(image => image.hidden || image.naturalWidth > 0));
  await layout('390 personality result');
  await screenshot('personality-result-390', true);
  await page.setViewportSize(viewports[3]);
  await layout('1440 personality result');
  await screenshot('personality-result-1440', true);
  report.results.personality = {content: 'energy', answers: 12, personaLoaded: true};
}

async function verifyDecorativeFallback() {
  const fallbackContext = await browser.newContext({viewport: viewports[1]});
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.route('**/assets/pixel/personas/*.svg', route => route.abort('failed'));
  await fallbackPage.goto(`${base}/?v10DecorativeFallback=${Date.now()}#/play/energy`, {waitUntil: 'networkidle'});
  await fallbackPage.locator('#birth-form [name="name"]').fill('장식검증');
  await fallbackPage.locator('#birth-form button[type="submit"]').click();
  for (let index = 0; index < 12; index++) await fallbackPage.locator('[data-act="answer"]').first().click();
  await fallbackPage.locator('.result-card').waitFor();
  const frame = fallbackPage.locator('[data-decorative-frame].is-unavailable');
  await frame.waitFor();
  assert.equal(await frame.locator('[data-decorative-image]').isHidden(), true);
  assert.equal(await frame.locator('.decorative-image-fallback').isVisible(), true);
  assert.ok((await fallbackPage.locator('.result-card h1').innerText()).trim());
  assert.equal(await fallbackPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await fallbackPage.screenshot({path: `${output}/result-decorative-fallback-390.png`, fullPage: false});
  report.fallback.decorativeResult = {blocked: 'persona SVG', imageHidden: true, fallbackVisible: true, resultReadable: true};
  await fallbackContext.close();
}

async function fillBirth(name) {
  await page.locator('[name="name"]').fill(name);
  await page.locator('[name="birthYear"]').fill('2000');
  await page.locator('[name="birthMonth"]').fill('5');
  await page.locator('[name="birthDay"]').fill('15');
  const unknown = page.locator('[name="timeUnknown"]');
  if (await unknown.isChecked()) await unknown.uncheck();
  await page.locator('[name="birthHour"]').selectOption('14');
  await page.locator('[name="birthMinute"]').selectOption('30');
  await page.locator('#birth-form button[type="submit"]').click();
}

async function completeFortuneAndTarot() {
  await page.setViewportSize(viewports[1]);
  await open('play/daily', '#birth-form');
  await fillBirth('오늘검증');
  await page.locator('.result-card').waitFor();
  await layout('390 fortune result');
  await screenshot('fortune-result-390', true);
  await page.setViewportSize(viewports[3]);
  await layout('1440 fortune result');
  report.results.fortune = {content: 'daily', completed: true};

  await page.setViewportSize(viewports[1]);
  await open('play/tarot', '#birth-form');
  await fillBirth('타로검증');
  await page.locator('.tarot-card').first().click();
  await page.locator('.result-card').waitFor();
  assert.equal(await page.locator('.tarot-front').count(), 1);
  const images = await loadedImages('.result-card');
  assert.ok(images.every(image => image.hidden || image.naturalWidth > 0));
  await layout('390 tarot result');
  await screenshot('tarot-result-390', true);
  await page.setViewportSize(viewports[3]);
  await layout('1440 tarot result');
  await screenshot('tarot-result-1440', true);
  report.results.tarot = {completed: true, cardLoaded: true};
}

async function verifyRpg() {
  await page.setViewportSize(viewports[1]);
  await open('detail/typing?panel=gear', '.rpg-inventory');
  const filter = page.locator('[data-rpg-rarity-filter]');
  await filter.scrollIntoViewIfNeeded();
  const beforeFilter = await page.evaluate(() => scrollY);
  const previousInventory = await page.locator('.rpg-inventory').elementHandle();
  await filter.selectOption('rare');
  await page.waitForURL(/rarity=rare/);
  await page.waitForFunction(element => !element.isConnected, previousInventory, {polling: 50});
  await page.locator('.rpg-inventory').waitFor();
  const afterFilter = await page.evaluate(() => scrollY);
  const equip = page.locator(`[data-act="rpg-equip"][data-item="${rareItem.id}"]`);
  await equip.scrollIntoViewIfNeeded();
  const beforeEquip = await page.evaluate(() => scrollY);
  await equip.click();
  await page.locator(`[data-act="rpg-equip"][data-item="${rareItem.id}"]:disabled`).waitFor();
  const afterEquip = await page.evaluate(() => scrollY);
  report.scroll.rpgFilterAndEquip = {filter: {before: beforeFilter, after: afterFilter}, equip: {before: beforeEquip, after: afterEquip}};
  if (Math.abs(afterFilter - beforeFilter) > 2 || Math.abs(afterEquip - beforeEquip) > 2) report.findings.push({severity: 'P2', area: 'RPG equipment', issue: 'same-page filter/equip changed scroll position', evidence: report.scroll.rpgFilterAndEquip});
  assert.equal(rpgProfile.equipped.defense, rareItem.id);
  await layout('390 RPG equipment', {controls: [`[data-act="rpg-equip"][data-item="${rareItem.id}"]`]});
  await screenshot('equipment-390', true);

  await open('detail/typing?panel=shop', '.rpg-hub');
  await page.locator('[data-act="rpg-draw"][data-count="1"]').click();
  await page.locator('.draw-reveal').waitFor();
  await page.locator('.draw-reveal').click();
  await page.locator('.draw-reward-art img').first().waitFor();
  const drawImages = await loadedImages('.rpg-draw-dialog');
  assert.ok(drawImages.every(image => image.naturalWidth > 0));
  await layout('390 RPG draw', {controls: ['[data-draw-done]']});
  await screenshot('draw-390');
  report.rpg = {equipment: rareItem.id, equipped: true, draw: rareItem.id, drawArtLoaded: true};
}

async function verifyScroll() {
  await page.setViewportSize(viewports[1]);
  await open('explore');
  await page.locator('.pills').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await page.getByRole('link', {name: '게임', exact: true}).click();
  await page.waitForURL(/cat=game/);
  await page.getByText('게임 · 10개의 놀거리', {exact: true}).waitFor();
  const after = await page.evaluate(() => scrollY);
  report.scroll.exploreCategory = {before, after};
  if (Math.abs(after - before) > 2) report.findings.push({severity: 'P2', area: 'explore', issue: 'same-page category changed scroll position', evidence: report.scroll.exploreCategory});

  await page.locator('.content-card').first().click();
  await page.locator('#game-setup').waitFor();
  report.scroll.crossPage = await page.evaluate(() => scrollY);
  assert.equal(report.scroll.crossPage, 0);
  await page.locator('[data-act="start"]').click();
  await page.locator('.dg-game').waitFor();
  report.scroll.gameStart = await page.evaluate(() => scrollY);
  assert.equal(report.scroll.gameStart, 0);
}

try {
  if (qaSection === 'artbook') {
    await verifyArtbook();
  } else if (qaSection === 'rpg') {
    await verifyRpg();
  } else if (qaSection === 'results') {
    await completeQuiz();
    await completePersonality();
    await verifyDecorativeFallback();
    await completeFortuneAndTarot();
    report.rpg = {skipped: 'covered by the dedicated RPG section'};
    await verifyScroll();
  } else {
    await verifyCatalog();
    await verifyFallback();
    await simpleGames();
    await actionGames();
    await verifyArtbook();
    await completeQuiz();
    await completePersonality();
    await verifyDecorativeFallback();
    await completeFortuneAndTarot();
    if (process.env.SKIP_RPG !== '1') await verifyRpg();
    else report.rpg = {skipped: 'covered by the dedicated RPG section'};
    await verifyScroll();
  }

  report.findings.push(...report.pageErrors.map(error => ({severity: 'P1', area: 'browser', issue: 'uncaught page error', evidence: error})));
  report.findings.push(...report.consoleErrors.map(error => ({severity: 'P1', area: 'browser', issue: 'console error', evidence: error})));
  report.findings.push(...report.failedImages.map(error => ({severity: 'P1', area: 'assets', issue: 'image failed to load', evidence: error})));
  report.findings.push(...report.failedResponses.map(error => ({severity: 'P1', area: 'network', issue: 'local response failed', evidence: error})));
  report.passed = report.findings.filter(finding => ['P0', 'P1'].includes(finding.severity)).length === 0;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({passed: report.passed, routeChecks: report.routeChecks, thumbnailSets: Object.keys(report.thumbnailChecks).length, gameChecks: Object.keys(report.games).length, results: Object.keys(report.results), findings: report.findings}, null, 2));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.findings.push({severity: 'P0', area: 'test execution', issue: error.message, evidence: error.stack});
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  await page.screenshot({path: `${output}/failure.png`, fullPage: true}).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
