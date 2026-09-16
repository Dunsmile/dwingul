import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApiHandler} from '../server/api.js';
import {durableSqlite} from '../workers/sqlite-adapter.js';
import {importSnapshot} from '../workers/import-snapshot.js';
import {makePersonalityResult} from '../public/js/personality-tests.js';

function durableFixture() {
  const sqlite = new DatabaseSync(':memory:');
  const cursor = rows => ({
    toArray: () => rows,
    one: () => {
      if (rows.length !== 1) throw new Error(`Expected one row, received ${rows.length}`);
      return rows[0];
    },
  });
  const storage = {
    sql: {
      exec(statement, ...bindings) {
        const query = statement.trim();
        if (!bindings.length && query.includes(';')) {
          sqlite.exec(statement);
          return cursor([]);
        }
        if (/^(?:SELECT|PRAGMA|WITH|EXPLAIN)\b/i.test(query)) {
          return cursor(sqlite.prepare(statement).all(...bindings));
        }
        if (bindings.length) sqlite.prepare(statement).run(...bindings);
        else sqlite.exec(statement);
        return cursor([]);
      },
    },
    transactionSync(callback) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = callback();
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const db = durableSqlite(storage);
  const handler = createApiHandler(db);
  return {db, sqlite, handler, close: () => sqlite.close()};
}

function client(handler, {remoteAddress = '203.0.113.10'} = {}) {
  let cookie = '';
  return async function request(path, method = 'GET', body, extraHeaders = {}) {
    const origin = 'https://worker.test';
    const headers = Object.fromEntries(Object.entries({
      host: 'worker.test',
      cookie,
      ...(body === undefined ? {} : {'content-type': 'application/json'}),
      ...extraHeaders,
    }).map(([key, value]) => [key.toLowerCase(), value]));
    const req = {
      url: `/api/${path}`,
      origin,
      method,
      headers,
      socket: {remoteAddress, encrypted: true},
      async *[Symbol.asyncIterator]() {
        if (body !== undefined) yield JSON.stringify(body);
      },
    };
    let status = 200;
    let responseHeaders = {};
    let responseBody = '';
    const res = {
      writeHead(nextStatus, nextHeaders = {}) {
        status = nextStatus;
        responseHeaders = nextHeaders;
      },
      end(value = '') {
        responseBody = value;
      },
    };
    await handler(req, res);
    const setCookie = responseHeaders['Set-Cookie'];
    if (setCookie) cookie = setCookie.split(';')[0];
    return {status, headers: responseHeaders, ...JSON.parse(responseBody)};
  };
}

test('Durable Object SQLite adapter serves isolated sessions and RPG batch, enhance, and discard APIs', async () => {
  const fixture = durableFixture();
  try {
    const first = client(fixture.handler, {remoteAddress: '203.0.113.11'});
    const second = client(fixture.handler, {remoteAddress: '203.0.113.12'});
    const firstSession = await first('session');
    const secondSession = await second('session');
    assert.notEqual(firstSession.user.id, secondSession.user.id);
    assert.match(firstSession.headers['Set-Cookie'], /HttpOnly; SameSite=Strict;.*; Secure$/);

    await first('rpg');
    await second('rpg');
    fixture.sqlite.prepare('UPDATE rpg_profiles SET gold=1000 WHERE user_id=?').run(firstSession.user.id);
    fixture.sqlite.prepare('INSERT INTO rpg_inventory(user_id,item_id,quantity,enhancement) VALUES(?,?,3,0)').run(firstSession.user.id, 'attack-common');

    const batch = await first('rpg/draw', 'POST', {key: 'worker-batch-0001', count: 10}, {origin: 'https://worker.test'});
    assert.equal(batch.status, 200);
    assert.equal(batch.items.length, 10);
    assert.equal(batch.gold, 500);
    const retry = await first('rpg/draw', 'POST', {key: 'worker-batch-0001', count: 10}, {origin: 'https://worker.test'});
    assert.deepEqual(retry.items, batch.items);
    assert.equal(retry.gold, 500);

    const beforeQuantity=fixture.sqlite.prepare('SELECT quantity FROM rpg_inventory WHERE user_id=? AND item_id=?').get(firstSession.user.id,'attack-common').quantity;
    const enhanced = await first('rpg/enhance', 'POST', {itemId: 'attack-common'}, {origin: 'https://worker.test'});
    assert.deepEqual(enhanced.inventory.find(row => row.itemId === 'attack-common'), {itemId: 'attack-common', quantity: beforeQuantity-2, enhancement: 1});
    assert.equal((await second('rpg/enhance', 'POST', {itemId: 'attack-common'}, {origin: 'https://worker.test'})).status, 400);

    await first('rpg/equip', 'POST', {slot: 'attack', itemId: 'attack-common'}, {origin: 'https://worker.test'});
    const discarded = await first('rpg/discard', 'POST', {itemId: 'attack-common'}, {origin: 'https://worker.test'});
    assert.equal(discarded.inventory.some(row => row.itemId === 'attack-common'), false);
    assert.equal(discarded.equipped.attack, null);
    assert.deepEqual((await second('rpg')).inventory, []);
  } finally {
    fixture.close();
  }
});

test('portable API rejects cross-origin state changes before mutating the authenticated session', async () => {
  const fixture = durableFixture();
  try {
    const request = client(fixture.handler);
    const session = await request('session');
    const rejected = await request('profile', 'POST', {nickname: '공격자', pin: 'Test-1234-password!'}, {origin: 'https://evil.example'});
    assert.equal(rejected.status, 403);
    assert.match(rejected.error, /출처/);
    const unchanged = await request('session');
    assert.equal(unchanged.user.id, session.user.id);
    assert.equal(unchanged.user.configured, false);
    assert.equal(unchanged.user.nickname, '뒹굴러');
    const accepted = await request('profile', 'POST', {nickname: '안전한 사용자', pin: 'Test-1234-password!'}, {origin: 'https://worker.test'});
    assert.equal(accepted.status, 200);
    assert.equal(accepted.user.configured, true);
  } finally {
    fixture.close();
  }
});

test('portable profile and share APIs preserve validated 12-answer personality version data', async () => {
  const fixture = durableFixture();
  try {
    const request = client(fixture.handler);
    await request('session');
    await request('profile', 'POST', {nickname: '취향 탐험가', pin: 'Test-1234-password!'}, {origin: 'https://worker.test'});
    const result = {...makePersonalityResult('taste', '취향 탐험가', Array(12).fill(0)), id: 'taste-v9-worker', at: Date.now()};
    const saved = await request('history', 'POST', {items: [result]}, {origin: 'https://worker.test'});
    assert.equal(saved.status, 200);
    assert.equal(saved.history[0].testVersion, 'axes-v9');
    assert.equal(saved.history[0].personality.code, result.personality.code);
    assert.deepEqual(saved.history[0].scores, result.scores);
    assert.equal(saved.history[0].sprite, result.sprite);

    const share = await request('shares', 'POST', {content: 'taste', kind: 'challenge', seed: 91, payload: result}, {origin: 'https://worker.test'});
    assert.equal(share.status, 200);
    const shared = await request(`shares/${share.id}`);
    assert.equal(shared.payload.content, 'taste');
    assert.equal(shared.payload.testVersion, 'axes-v9');
    assert.equal(shared.payload.answers.length, 12);
    assert.equal(shared.payload.personality.code, result.personality.code);
    assert.match(shared.payload.sprite, /^\/assets\/pixel\/personas\/\d+\.svg$/);

    const short = await request('shares', 'POST', {content: 'taste', kind: 'challenge', payload: {...result, answers: result.answers.slice(0, 8)}}, {origin: 'https://worker.test'});
    assert.equal(short.status, 400);
    const legacy = await request('shares', 'POST', {content: 'taste', kind: 'challenge', payload: {name: '예전 취향', answers: Array(8).fill(1)}}, {origin: 'https://worker.test'});
    assert.equal(legacy.status, 200);
    assert.equal((await request(`shares/${legacy.id}`)).payload.testVersion, 'legacy-v8');
  } finally {
    fixture.close();
  }
});

test('portable API ranks current rhythm v11 with points and retains separate v9, v7 and nine-pad modes', async () => {
  const fixture = durableFixture();
  try {
    const request = client(fixture.handler);
    const session = await request('session');
    await request('profile', 'POST', {nickname: '박자 수집가', pin: 'Test-1234-password!'}, {origin: 'https://worker.test'});

    assert.equal((await request('runs', 'POST', {content: 'sequence', seed: 7}, {origin: 'https://worker.test'})).status,410);
    const currentRun={id:'archived-current'};
    fixture.sqlite.prepare('INSERT INTO runs(id,user_id,content,seed,started,game_settings) VALUES(?,?,?,?,?,?)').run(currentRun.id,session.user.id,'sequence',7,Date.now(),JSON.stringify({version:'v11',mode:'rhythm'}));
    const currentRecord = await request('records', 'POST', {
      run: currentRun.id,
      result: {value: 123.9, display: 'forged', unit: '단계', mode: 'nine-pad'},
      scopes: ['world'],
      country: '대한민국',
    }, {origin: 'https://worker.test'});
    assert.equal(currentRecord.status, 200);
    const savedCurrent = fixture.sqlite.prepare('SELECT value,display,unit,mode FROM records WHERE id=?').get(currentRecord.id);
    assert.deepEqual({...savedCurrent}, {value: 123, display: '123', unit: '점', mode: 'rhythm-three-lane-v11'});

    const createLegacyRecord = async (settings, submittedMode, value) => {
      const run={id:'archived-'+value};
      fixture.sqlite.prepare('INSERT INTO runs(id,user_id,content,seed,started,game_settings) VALUES(?,?,?,?,?,?)').run(run.id,session.user.id,'sequence',value,Date.now(),settings);
      const record = await request('records', 'POST', {
        run: run.id,
        result: {value, display: String(value), unit: 'wrong', mode: submittedMode},
        scopes: ['world'], country: '대한민국',
      }, {origin: 'https://worker.test'});
      assert.equal(record.status, 200);
    };
    await createLegacyRecord('{"version":"v9","mode":"rhythm"}', 'nine-pad', 90);
    await createLegacyRecord('{"version":"v7","mode":"rhythm"}', 'nine-pad', 70);
    await createLegacyRecord(null, 'nine-pad', 9);

    const rankings = await request('rankings?content=sequence&scope=world');
    assert.equal(rankings.mode, 'rhythm-three-lane-v11');
    assert.equal(rankings.rows[0].unit, '점');
    assert.deepEqual(new Set(rankings.modes), new Set(['nine-pad', 'rhythm-relay-v7', 'rhythm-endless-v9', 'rhythm-three-lane-v11']));
    assert.equal((await request('rankings?content=sequence&scope=world&mode=rhythm-endless-v9')).count, 1);
    assert.equal((await request('rankings?content=sequence&scope=world&mode=rhythm-relay-v7')).count, 1);
    assert.equal((await request('rankings?content=sequence&scope=world&mode=nine-pad')).count, 1);

    const insertShare = fixture.sqlite.prepare('INSERT INTO shares(id,user_id,content,kind,seed,payload,created) VALUES(?,?,?,?,?,?,?)');
    insertShare.run('old-rhythm-v9', session.user.id, 'sequence', 'challenge', 2, JSON.stringify({gameSettings: {version: 'v9', mode: 'rhythm'}}), Date.now());
    insertShare.run('old-rhythm-v7', session.user.id, 'sequence', 'challenge', 3, JSON.stringify({gameSettings: {version: 'v7', mode: 'rhythm'}}), Date.now());
    insertShare.run('old-nine-pad', session.user.id, 'sequence', 'challenge', 4, JSON.stringify({}), Date.now());
    assert.equal((await request('runs', 'POST', {content: 'sequence', shareId: 'old-rhythm-v9'}, {origin: 'https://worker.test'})).status, 410);
    assert.equal((await request('runs', 'POST', {content: 'sequence', shareId: 'old-rhythm-v7'}, {origin: 'https://worker.test'})).status, 410);
    assert.equal((await request('runs', 'POST', {content: 'sequence', shareId: 'old-nine-pad'}, {origin: 'https://worker.test'})).status, 410);
  } finally {
    fixture.close();
  }
});

test('release snapshot import is secret-protected, one-use, insert-only, and rolls back as one transaction', async () => {
  const fixture = durableFixture();
  try {
    const url = 'https://worker.test/api/admin/import';
    const body = JSON.stringify({version: 1, tables: {users: [{id: 'imported-user', nickname: '원본 사용자'}]}});
    assert.equal((await importSnapshot(new Request(url, {method: 'POST', body}), {}, fixture.db)).status, 404);
    const imported = await importSnapshot(new Request(url, {method: 'POST', headers: {authorization: 'Bearer migration-secret'}, body}), {MIGRATION_KEY: 'migration-secret'}, fixture.db);
    assert.equal(imported.status, 200);
    assert.equal(fixture.sqlite.prepare('SELECT nickname FROM users WHERE id=?').get('imported-user').nickname, '원본 사용자');
    assert.equal((await importSnapshot(new Request(url, {method: 'POST', headers: {authorization: 'Bearer migration-secret'}, body}), {MIGRATION_KEY: 'migration-secret'}, fixture.db)).status, 409);
  } finally {
    fixture.close();
  }

  const collision = durableFixture();
  try {
    collision.sqlite.prepare('INSERT INTO users(id,nickname) VALUES(?,?)').run('existing-user', '보존할 사용자');
    const body = JSON.stringify({version: 1, tables: {users: [
      {id: 'must-roll-back', nickname: '남으면 안 됨'},
      {id: 'existing-user', nickname: '덮어쓰면 안 됨'},
    ]}});
    const response = await importSnapshot(new Request('https://worker.test/api/admin/import', {
      method: 'POST', headers: {authorization: 'Bearer migration-secret'}, body,
    }), {MIGRATION_KEY: 'migration-secret'}, collision.db);
    assert.equal(response.status, 409);
    assert.equal(collision.sqlite.prepare('SELECT nickname FROM users WHERE id=?').get('existing-user').nickname, '보존할 사용자');
    assert.equal(collision.sqlite.prepare('SELECT id FROM users WHERE id=?').get('must-roll-back'), undefined);
    assert.equal(collision.sqlite.prepare('SELECT id FROM release_imports').get(), undefined);
  } finally {
    collision.close();
  }
});
