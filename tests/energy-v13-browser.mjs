import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:4177';
const out = new URL('../output/playwright/energy-v13/', import.meta.url);
await fs.mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 390, height: 844}});
const page = await context.newPage();
const report = {base, runs: {}};

async function open(path, selector) {
  await page.goto(`${base}/#/${path}`);
  await page.locator(selector).waitFor();
}

await open('profile', '#unified-profile-form');
await page.locator('[name=nickname]').fill('에너지검토');
await page.locator('[name=pin]').fill('Test-4177-password!');if(await page.locator('[name=passwordConfirm]').count())await page.locator('[name=passwordConfirm]').fill('Test-4177-password!');
await page.locator('#unified-profile-form button[type=submit]').click();
await page.locator('.recovery-code').waitFor();
const recovery = (await page.locator('.recovery-code').innerText()).trim();
assert.match(recovery, /^[A-Za-z0-9_-]{32,64}$/);

async function runEnergy(label, poleForQuestion) {
  await open('play/energy', '#birth-form');
  assert.equal(await page.locator('[name=birthday],[name=birthHour],[name=calendar]').count(), 0);
  await page.locator('[name=name]').fill(label);
  await page.locator('#birth-form button[type=submit]').click();
  await page.locator('[data-act=answer]').first().waitFor();

  for (let index = 0; index < 12; index++) {
    const buttons = page.locator('[data-act=answer]');
    const choice = poleForQuestion(index);
    await buttons.nth(choice).click();
  }
  await page.locator('.result-card h1').waitFor();
  const title = (await page.locator('.result-card h1').innerText()).trim();
  const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const subtitle = (await page.locator('.energy-meters').innerText()).replace(/\s+/g, ' ').trim();
  assert.match(body, /테토력 \d+%/);
  assert.match(body, /에겐력 \d+%/);
  assert.equal((body.match(/테토력과 에겐력/g) || []).length, 0);
  assert.equal(await page.locator('.energy-meters progress').count(), 2);
  assert.ok(body.indexOf('균형을 잡는 힌트') < body.indexOf('DWINGUL PROFILE'));
  assert.doesNotMatch(body, /생년월일|태어난 시간|사주 기둥|테스토스테론|에스트로겐/);
  await page.screenshot({path: fileURLToPath(new URL(`${label}.png`, out)), fullPage: true});
  report.runs[label] = {title, subtitle};
}

// Even questions put teto first, odd questions put it second.
await runEnergy('all-teto', index => index % 2 === 0 ? 0 : 1);
await runEnergy('all-egen', index => index % 2 === 0 ? 1 : 0);
await runEnergy('balanced', () => 0);

assert.match(report.runs['all-teto'].title, /테토/);
assert.match(report.runs['all-teto'].subtitle, /테토력 100% 에겐력 0%/);
assert.match(report.runs['all-egen'].title, /에겐/);
assert.match(report.runs['all-egen'].subtitle, /테토력 0% 에겐력 100%/);
assert.match(report.runs.balanced.title, /균형/);
assert.match(report.runs.balanced.subtitle, /테토력 50% 에겐력 50%/);

const shareResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/shares') && response.request().method() === 'POST');
await page.locator('[data-act=share]').click();
const shareResponse = await shareResponsePromise;
assert.equal(shareResponse.status(), 200);
const {id: shareId} = await shareResponse.json();
const shared = await (await context.request.get(`${base}/api/shares/${shareId}`)).json();
assert.equal(shared.payload.testVersion, 'teto-egen-v13');
assert.deepEqual(shared.payload.scores, [50, 50]);
const serializedShare = JSON.stringify(shared);
assert.doesNotMatch(serializedShare, /birthday|birthHour|birthMinute|calendar|pillars|생년월일/);
report.share = {id: shareId, version: shared.payload.testVersion, scores: shared.payload.scores};
if (await page.locator('#dialog[open]').count()) await page.locator('#dialog [data-act=close-dialog]').click();
await page.goto(`${base}/#/s/${shareId}`);
await page.locator('.result-card h1').waitFor();
assert.equal((await page.locator('.result-card h1').innerText()).trim(), '테토·에겐 균형형');
assert.equal(await page.locator('[name=birthday],[name=birthHour],[name=calendar],.pillars').count(), 0);

await open('my', '.list');
const energyHistoryRows = page.locator('[data-act=history-result]');
assert.equal(await energyHistoryRows.count(), 3);
await energyHistoryRows.first().click();
await page.locator('.result-card h1').waitFor();
assert.match((await page.locator('main').innerText()).replace(/\s+/g, ' '), /테토력 50% 에겐력 50%/);

const stored = await page.evaluate(() => Object.entries(localStorage)
  .filter(([key]) => key.includes('history:'))
  .flatMap(([, value]) => JSON.parse(value))
  .filter(row => row.content === 'energy'));
assert.equal(stored.length, 3);
assert.ok(stored.every(row => row.testVersion === 'teto-egen-v13'));
assert.ok(stored.every(row => row.birth == null));
report.history = stored.map(row => ({title: row.title, version: row.testVersion, scores: row.scores, birth: row.birth}));

await page.goto(`${base}/#/my`);
await page.locator('[data-act=history-result]').first().waitFor();
await page.locator('[data-act=history-result]').first().click();
await page.locator('.result-card h1').waitFor();
assert.match((await page.locator('main').innerText()).replace(/\s+/g, ' '), /테토력 50% 에겐력 50%/);

const recoveredContext = await browser.newContext({viewport: {width: 390, height: 844}});
const recoveredPage = await recoveredContext.newPage();
await recoveredPage.goto(`${base}/#/recover`);
await recoveredPage.locator('#recover-form').waitFor();
await recoveredPage.locator('[name=recovery]').fill(recovery);
await recoveredPage.locator('[name=pin]').fill('Test-4177-password!');if(await recoveredPage.locator('[name=passwordConfirm]').count())await recoveredPage.locator('[name=passwordConfirm]').fill('Test-4177-password!');
await recoveredPage.locator('#recover-form button[type=submit]').click();
await recoveredPage.waitForURL(/#\/profile$/);
await recoveredPage.goto(`${base}/#/my`);
await recoveredPage.locator('[data-act=history-result]').first().waitFor();
assert.equal(await recoveredPage.locator('[data-act=history-result]').count(), 3);
await recoveredPage.locator('[data-act=history-result]').first().click();
await recoveredPage.locator('.result-card h1').waitFor();
assert.match((await recoveredPage.locator('main').innerText()).replace(/\s+/g, ' '), /테토력 50% 에겐력 50%/);
report.recovery = {historyCount: 3, reopenedTitle: (await recoveredPage.locator('.result-card h1').innerText()).trim()};

await fs.writeFile(new URL('report.json', out), JSON.stringify(report, null, 2));
await recoveredContext.close();
await context.close();
await browser.close();
console.log(JSON.stringify(report, null, 2));
