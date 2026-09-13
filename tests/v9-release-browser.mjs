import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {catalog} from '../public/js/catalog.js';

const base = process.env.BASE_URL || 'http://127.0.0.1:4174';
const parsedBase = new URL(base);
assert.ok(['127.0.0.1', 'localhost'].includes(parsedBase.hostname));
assert.equal(parsedBase.port, '4174', 'Release browser QA may only use the isolated Node server on port 4174');

const output = 'output/playwright/v9-release';
mkdirSync(output, {recursive: true});
const viewports = [
  {width: 320, height: 568},
  {width: 390, height: 844},
  {width: 768, height: 1024},
  {width: 1440, height: 900},
  {width: 1920, height: 1080},
];
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: viewports[1]});
const page = await context.newPage();
page.setDefaultTimeout(10_000);
await context.addInitScript(() => {
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
});

const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];
const findings = [];
const coverage = {routes: {}, games: {}, scroll: {}};
page.on('pageerror', error => pageErrors.push({url: page.url(), message: error.message}));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push({url: page.url(), message: message.text()});
});
page.on('response', response => {
  if (response.status() >= 500 && new URL(response.url()).origin === parsedBase.origin) {
    failedResponses.push({url: response.url(), status: response.status()});
  }
});

let visit = 0;
async function open(route, selector = '#main') {
  await page.goto(`${base}/?releaseQa=${++visit}#/${route}`, {waitUntil: 'networkidle'});
  await page.locator(selector).first().waitFor();
}

async function layoutSnapshot(label) {
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const overflowing = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      return {tag: element.tagName.toLowerCase(), cls: String(element.className || '').slice(0, 100), left: Math.round(rect.left), right: Math.round(rect.right)};
    }).filter(item => item.left < -1 || item.right > innerWidth + 1).slice(0, 8);
    return {
      width: innerWidth,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      viewportHeight: innerHeight,
      h1: document.querySelector('#main h1')?.textContent?.trim() || '',
      errorPage: document.querySelector('.error-page')?.innerText || '',
      overflowing,
    };
  });
  if (layout.scrollWidth > layout.width + 1) findings.push({severity: 'P1', area: label, issue: `horizontal overflow ${layout.scrollWidth - layout.width}px`, evidence: layout.overflowing});
  if (layout.errorPage) findings.push({severity: 'P1', area: label, issue: layout.errorPage});
  return layout;
}

async function api(path, method = 'GET', body) {
  return page.evaluate(async ({path, method, body}) => {
    const response = await fetch('/api/' + path, {method, headers: body === undefined ? {} : {'Content-Type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
    return {status: response.status, ...await response.json()};
  }, {path, method, body});
}

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = milliseconds => page.evaluate(value => window.advanceTime(value), milliseconds);

async function verifyRoutes() {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const key = `${viewport.width}x${viewport.height}`;
    coverage.routes[key] = [];
    for (const route of ['', 'explore']) {
      await open(route);
      const layout = await layoutSnapshot(`${key} #/${route}`);
      assert.ok(layout.h1, `${key} #/${route} should render a page title`);
      coverage.routes[key].push(route || 'home');
    }
    for (const content of catalog) {
      await open(`detail/${content.id}`);
      const layout = await layoutSnapshot(`${key} detail/${content.id}`);
      assert.equal(layout.h1, content.title);
      coverage.routes[key].push(`detail/${content.id}`);
    }
  }
  await page.setViewportSize(viewports[4]);
  await open('');
  await page.screenshot({path: `${output}/homepage-1920.png`, fullPage: true});
  await page.setViewportSize(viewports[2]);
  await open('explore');
  assert.equal(await page.locator('.content-card').count(), catalog.length);
  await page.screenshot({path: `${output}/explore-768.png`, fullPage: true});
}

async function verifyProfileHistoryAndRank() {
  await page.setViewportSize(viewports[1]);
  await open('profile', '#unified-profile-form');
  await page.locator('[name=nickname]').fill('출시검증');
  await page.locator('[name=pin]').fill('7391');
  await page.locator('#unified-profile-form').evaluate(form => form.scrollIntoView({block: 'start'}));
  const beforeProfileSubmit = await page.evaluate(() => scrollY);
  await page.locator('#unified-profile-form button[type=submit]').click();
  await page.getByText('출시검증님의 프로필', {exact: true}).waitFor();
  const afterProfileSubmit = await page.evaluate(() => scrollY);
  coverage.scroll.profileSubmit = {before: beforeProfileSubmit, after: afterProfileSubmit};
  if (Math.abs(afterProfileSubmit - beforeProfileSubmit) > 2) findings.push({severity: 'P2', area: 'profile', issue: 'same-page profile submission changed scroll position', evidence: coverage.scroll.profileSubmit});
  await page.screenshot({path: `${output}/profile-390.png`, fullPage: true});

  const now = Date.now();
  const history = await api('history', 'POST', {items: [{
    id: `release-history-${now}`, content: 'reaction', at: now,
    title: '반응 기록', display: '321', unit: 'ms', mode: 'three-round', value: 321,
    details: {best: 280, roundsCompleted: 3},
  }]});
  assert.equal(history.status, 200);
  const run = await api('runs', 'POST', {content: 'sequence', seed: 909});
  assert.equal(run.status, 200);
  const record = await api('records', 'POST', {
    run: run.id, result: {value: 88, display: 'forged', unit: 'wrong', mode: 'wrong'},
    scopes: ['world'], country: '대한민국', device: 'keyboard',
  });
  assert.equal(record.status, 200);

  await open('my');
  await page.getByRole('button', {name: /초록불 반응/}).waitFor();
  await page.getByText('따라해 뒹굴 · 88 점', {exact: true}).waitFor();
  await page.getByRole('button', {name: /초록불 반응/}).scrollIntoViewIfNeeded();
  await page.getByRole('button', {name: /초록불 반응/}).click();
  await page.locator('.result-card').waitFor();
  assert.equal(await page.evaluate(() => scrollY), 0, 'cross-page history result should reset scroll');
  coverage.scroll.historyResult = 0;

  await open('rankings?scope=world&content=sequence&period=all', '#rank-filter');
  await page.getByText('출시검증 · 나', {exact: true}).waitFor();
  assert.match(await page.locator('.rank-row.mine').innerText(), /88\s*점/);
  const rankingSettings = await page.locator('#group-game-settings').count() ? await page.locator('#group-game-settings').innerText() : '';
  if (/20초 모드|무한 모드/.test(rankingSettings)) findings.push({severity: 'P2', area: 'rankings', issue: 'sequence ranking filter shows the unrelated sort game-mode control', evidence: rankingSettings});
  await page.locator('#rank-filter').evaluate(form => form.scrollIntoView({block: 'start'}));
  const beforeRankSubmit = await page.evaluate(() => scrollY);
  await page.locator('#rank-filter button[type=submit]').click();
  await page.waitForURL(/#\/rankings\?/);
  await page.getByText('출시검증 · 나', {exact: true}).waitFor();
  const afterRankSubmit = await page.evaluate(() => scrollY);
  coverage.scroll.rankSubmit = {before: beforeRankSubmit, after: afterRankSubmit};
  if (Math.abs(afterRankSubmit - beforeRankSubmit) > 2) findings.push({severity: 'P2', area: 'rankings', issue: 'same-page rank filter submission changed scroll position', evidence: coverage.scroll.rankSubmit});

  await page.getByRole('link', {name: '둘러보기', exact: true}).last().click();
  await page.waitForURL(/#\/explore$/);
  await page.getByRole('heading', {name: '오늘은 무엇을 해볼까요?', exact: true}).waitFor();
  assert.equal(await page.evaluate(() => scrollY), 0, 'cross-page navigation should reset scroll');
  coverage.scroll.crossPage = 0;

  await page.locator('.pills').scrollIntoViewIfNeeded();
  const beforeCategory = await page.evaluate(() => scrollY);
  await page.getByRole('link', {name: '게임', exact: true}).click();
  await page.waitForURL(/cat=game/);
  await page.getByText('게임 · 10개의 놀거리', {exact: true}).waitFor();
  const afterCategory = await page.evaluate(() => scrollY);
  coverage.scroll.exploreCategory = {before: beforeCategory, after: afterCategory};
  if (Math.abs(afterCategory - beforeCategory) > 2) findings.push({severity: 'P2', area: 'explore', issue: 'same-page category selection changed scroll position', evidence: coverage.scroll.exploreCategory});
}

async function startGame(id, viewport) {
  await page.setViewportSize(viewport);
  await open(`play/${id}?seed=37`, '.dg-game');
  await advance(0);
  await layoutSnapshot(`${viewport.width} play/${id}`);
}

async function exerciseGame(id, kind) {
  const viewport = kind === 'keyboard' ? viewports[3] : viewports[1];
  await startGame(id, viewport);
  const before = await state();
  if (id === 'reaction') {
    if (kind === 'keyboard') await page.keyboard.press('Space');
    else await page.locator('.dg-game__reaction').click();
    assert.equal((await state()).phase, 'waiting');
  } else if (id === 'racing') {
    if (kind === 'keyboard') await page.keyboard.press('ArrowLeft');
    else await page.getByRole('button', {name: '왼쪽 차선'}).click();
    assert.ok((await state()).inputs.length > before.inputs.length);
  } else if (id === 'jump') {
    if (kind === 'keyboard') await page.keyboard.press('Space');
    else await page.getByRole('button', {name: /점프/}).click();
    assert.equal((await state()).player.jumps, 1);
  } else if (id === 'sequence') {
    await page.locator('.rhythm-game__start').click();
    let current = await state();
    let guard = 0;
    while (current.phase !== 'respond' && guard++ < 12) {
      await advance(Math.max(1, current.phaseRemainingMs));
      current = await state();
    }
    assert.equal(current.phase, 'respond');
    await advance(current.nextNote.inMs);
    if (kind === 'keyboard') await page.keyboard.press('Space');
    else await page.locator('.rhythm-game__tap').click();
    assert.equal((await state()).hits, 1);
  } else if (id === 'typing') {
    const input = page.locator('.typing-rpg__input');
    await input.fill(before.target);
    if (kind === 'keyboard') await input.press('Enter');
    else await page.locator('.typing-rpg__submit').click();
    assert.equal((await state()).completed, 1);
  } else if (id === 'sort') {
    const side = before.queue[0].side;
    if (kind === 'keyboard') await page.keyboard.press(side === 'left' ? 'ArrowLeft' : 'ArrowRight');
    else await page.locator(side === 'left' ? '.dg-game__control--blue' : '.dg-game__control--white').click();
    assert.equal((await state()).score, 1);
  }
  const after = await state();
  coverage.games[`${id}-${kind}`] = {viewport: viewport.width, started: true, phase: after.phase || 'playing'};
  const gameBox = await page.locator('.dg-game').boundingBox();
  if (gameBox && gameBox.x + gameBox.width > viewport.width + 1) findings.push({severity: 'P1', area: `${id}-${kind}`, issue: 'game container exceeds viewport width', evidence: gameBox});
  if (kind === 'touch') await page.screenshot({path: `${output}/game-${id}-390.png`, fullPage: false});
  if (id === 'racing' && kind === 'keyboard') await page.screenshot({path: `${output}/game-racing-1440.png`, fullPage: false});
}

async function verifyGames() {
  for (const id of ['reaction', 'racing', 'jump', 'sequence', 'typing', 'sort']) {
    await exerciseGame(id, 'keyboard');
    await exerciseGame(id, 'touch');
  }
  await page.setViewportSize(viewports[0]);
  await open('play/typing?seed=41', '.typing-rpg');
  await page.screenshot({path: `${output}/game-typing-320.png`, fullPage: false});
  await layoutSnapshot('320x568 play/typing');
  await page.setViewportSize(viewports[1]);
  await open('play/typing?seed=43', '.typing-rpg');
  await advance(2_000_000);
  await page.locator('.result-card').waitFor();
  await page.getByRole('link', {name: '홈으로 가기', exact: true}).waitFor();
  await layoutSnapshot('390x844 typing result');
  await page.screenshot({path: `${output}/game-typing-result-390.png`, fullPage: false});
  coverage.games['typing-result-touch'] = {viewport: 390, finished: true, homeAction: true};
}

try {
  await verifyRoutes();
  await verifyProfileHistoryAndRank();
  await verifyGames();
  findings.push(...pageErrors.map(error => ({severity: 'P1', area: 'browser', issue: 'uncaught page error', evidence: error})));
  findings.push(...consoleErrors.map(error => ({severity: 'P1', area: 'browser', issue: 'console error', evidence: error})));
  findings.push(...failedResponses.map(error => ({severity: 'P1', area: 'network', issue: 'local response failed', evidence: error})));
  const blockers = findings.filter(finding => ['P0', 'P1'].includes(finding.severity));
  const report = {passed: blockers.length === 0, viewports, contentCount: catalog.length, coverage, findings, pageErrors, consoleErrors, failedResponses};
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({passed: report.passed, routeChecks: Object.values(coverage.routes).reduce((sum, routes) => sum + routes.length, 0), gameChecks: Object.keys(coverage.games).length, findings}, null, 2));
  assert.deepEqual(blockers, []);
} catch (error) {
  const diagnostics = {url: page.url(), body: (await page.locator('body').innerText().catch(() => '')).slice(0, 3000), findings, pageErrors, consoleErrors, failedResponses};
  writeFileSync(`${output}/failure.json`, JSON.stringify(diagnostics, null, 2));
  console.error(JSON.stringify(diagnostics, null, 2));
  throw error;
} finally {
  await browser.close();
}
