import test from 'node:test';
import assert from 'node:assert/strict';
import {typingHub, rpgProfileCard} from '../public/js/typing-hub.js';
import {isExtraShakeRarity, normalizeRpgDraw} from '../public/js/rpg-draw-dialog.js';

const profile = {
  checkpoints: [1], earnedCheckpoints: [1], recommendedStartStage: 1,
  gold: 1000, bestCleared: 0, configured: false,
  equipped: {attack: 'attack-common'}, gear: {attack: 6, defense: 0, heal: 0},
  owned: ['attack-common', 'attack-common-02', 'defense-rare'],
  inventory: [
    {itemId: 'attack-common', quantity: 3, enhancement: 1},
    {itemId: 'attack-common-02', quantity: 1, enhancement: 0},
    {itemId: 'defense-rare', quantity: 2, enhancement: 0},
  ],
};

test('profile disclosure is closed by default even when progress exists', () => {
  assert.doesNotMatch(rpgProfileCard({...profile, bestCleared: 20}), /<details[^>]* open/);
});

test('shop offers one and ten draws with the new prices and exact rarity odds', () => {
  const html = typingHub(profile, new URLSearchParams('panel=shop'));
  assert.match(html, /data-act="rpg-draw"[^>]*data-count="1"/);
  assert.match(html, /data-act="rpg-draw"[^>]*data-count="10"/);
  assert.match(html, /일반 60%/);
  assert.match(html, /고급 30%/);
  assert.match(html, /신 0\.5%/);
  assert.doesNotMatch(html, /돌려/);
});

test('inventory shows compact enhanced stacks, filters to six rows and emits integration attributes', () => {
  const html = typingHub(profile, new URLSearchParams('panel=gear&effect=attack&rarity=common&page=1'));
  assert.match(html, /보유 장비 · 3종 · 총 6개/);
  assert.match(html, /\+1/);
  assert.match(html, /수량 3/);
  assert.match(html, /data-act="rpg-enhance"/);
  assert.match(html, /data-act="rpg-delete"/);
  assert.match(html, /data-quantity="3"/);
  assert.match(html, /data-equipped="true"/);
  assert.doesNotMatch(html.match(/<div class="rpg-inventory">[\s\S]*?<\/div><\/article><\/div>/)?.[0] || '', /수호자의 사전/);
});

test('codex always includes all 312 entries and marks owned items', () => {
  const html = typingHub(profile, new URLSearchParams('panel=gear'));
  assert.match(html, /장비 도감 · 3\/312/);
  assert.equal((html.match(/class="rpg-codex-item/g) || []).length, 312);
  assert.match(html, /rpg-codex-item is-owned/);
  assert.match(html, /아직 만나지 못한 장비/);
});

test('draw result normalization preserves the single item API and ordered batch progress', () => {
  const item = {id: 'attack-common', rarity: 'common'};
  assert.deepEqual(normalizeRpgDraw({item, duplicate: true}), {
    item, duplicate: true, items: [{item, duplicate: true}], revealedCount: 0,
  });
  const batch = normalizeRpgDraw({items: [{item, duplicate: false}, {item, duplicate: true}], revealedCount: 1});
  assert.equal(batch.item, item);
  assert.equal(batch.items.length, 2);
  assert.equal(batch.revealedCount, 1);
  assert.equal(isExtraShakeRarity('common'), false);
  assert.equal(isExtraShakeRarity('uncommon'), false);
  assert.equal(isExtraShakeRarity('rare'), true);
  assert.equal(isExtraShakeRarity('divine'), true);
});
