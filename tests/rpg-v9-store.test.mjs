import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRpgStore} from '../public/js/rpg-store.js';
import {rpgItems} from '../public/js/rpg-items.js';

function setup({legacy = false} = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY,pin_hash TEXT); CREATE TABLE runs(id TEXT PRIMARY KEY,user_id TEXT,content TEXT,seed TEXT,game_settings TEXT);');
  if (legacy) db.exec("CREATE TABLE rpg_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),gold INTEGER NOT NULL DEFAULT 0,best_cleared INTEGER NOT NULL DEFAULT 0,equipped TEXT NOT NULL DEFAULT '{}'); CREATE TABLE rpg_inventory(user_id TEXT REFERENCES users(id),item_id TEXT,PRIMARY KEY(user_id,item_id)); INSERT INTO users VALUES('u',NULL); INSERT INTO rpg_profiles VALUES('u',1000,0,'{\"attack\":\"attack-common\"}'); INSERT INTO rpg_inventory VALUES('u','attack-common');");
  else db.exec("INSERT INTO users VALUES('u',NULL)");
  const fail = message => { throw new Error(message); };
  return {db, user: {id: 'u', pin_hash: null}, store: createRpgStore(db, fail)};
}

test('legacy inventory rows migrate to one base copy without changing equipped stats', () => {
  const {store} = setup({legacy: true});
  const profile = store.profile({id: 'u', pin_hash: null});
  assert.deepEqual(profile.owned, ['attack-common']);
  assert.deepEqual(profile.inventory, [{itemId: 'attack-common', quantity: 1, enhancement: 0}]);
  assert.deepEqual(profile.gear, {attack: 5, defense: 0, heal: 0});
});

test('duplicate draws add quantity, always charge the full price, and retry is idempotent', () => {
  const {db, store, user} = setup({legacy: true});
  const add = db.prepare('INSERT OR IGNORE INTO rpg_inventory(user_id,item_id,quantity,enhancement) VALUES(?,?,1,0)');
  for (const item of rpgItems) add.run(user.id, item.id);
  const first = store.draw(user, 'single-key-0001');
  const afterFirst = store.profile(user);
  const retry = store.draw(user, 'single-key-0001');
  assert.equal(first.items.length, 1);
  assert.equal(first.duplicate, true);
  assert.equal(afterFirst.inventory.find(row => row.itemId === first.item.id).quantity, 2);
  assert.equal(first.item.id, first.items[0].item.id);
  assert.equal(afterFirst.gold, 950);
  assert.equal(retry.gold, 950);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM rpg_draws').get().n, 1);
  assert.deepEqual(retry.inventory, afterFirst.inventory);
});

test('ten draws charge 500 once, persist all quantities atomically, and retry returns the same order', () => {
  const {db, store, user} = setup({legacy: true});
  const result = store.draw(user, 'batch-key-00001', 10);
  assert.equal(result.items.length, 10);
  assert.equal(result.gold, 500);
  assert.equal(result.inventory.reduce((sum, row) => sum + row.quantity, 0), 11);
  const retry = store.draw(user, {key: 'batch-key-00001', count: 10});
  assert.deepEqual(retry.items, result.items);
  assert.equal(retry.gold, 500);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM rpg_draw_batches').get().n, 1);
});

test('a batch with insufficient gold leaves balance, inventory and draw history untouched', () => {
  const {db, store, user} = setup({legacy: true});
  db.prepare('UPDATE rpg_profiles SET gold=499 WHERE user_id=?').run(user.id);
  assert.throws(() => store.draw(user, 'poor-batch-0001', 10), /500골드/);
  assert.equal(store.profile(user).gold, 499);
  assert.deepEqual(store.profile(user).inventory, [{itemId: 'attack-common', quantity: 1, enhancement: 0}]);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM rpg_draw_batches').get().n, 0);
});

test('enhancement consumes two base spares, caps at +10 and changes equipped stats transactionally', () => {
  const {db, store, user} = setup({legacy: true});
  db.prepare('UPDATE rpg_inventory SET quantity=3 WHERE user_id=? AND item_id=?').run(user.id, 'attack-common');
  let profile = store.enhance(user, {itemId: 'attack-common'});
  assert.deepEqual(profile.inventory, [{itemId: 'attack-common', quantity: 1, enhancement: 1}]);
  assert.equal(profile.gear.attack, 6);
  assert.throws(() => store.enhance(user, {itemId: 'attack-common'}), /여분 2개/);
  db.prepare('UPDATE rpg_inventory SET quantity=21,enhancement=9 WHERE user_id=? AND item_id=?').run(user.id, 'attack-common');
  profile = store.enhance(user, {itemId: 'attack-common'});
  assert.equal(profile.inventory[0].quantity, 19);
  assert.equal(profile.inventory[0].enhancement, 10);
  assert.equal(profile.gear.attack, 10);
  assert.throws(() => store.enhance(user, {itemId: 'attack-common'}), /최대/);
});

test('discard removes a complete stack and automatically unequips it', () => {
  const {store, user} = setup({legacy: true});
  const profile = store.discard(user, {itemId: 'attack-common'});
  assert.deepEqual(profile.inventory, []);
  assert.deepEqual(profile.owned, []);
  assert.equal(profile.equipped.attack, null);
  assert.equal(profile.gear.attack, 0);
});
