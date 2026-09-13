import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_RARITIES,
  chooseRpgItem,
  enhancedItemValue,
  gearStats,
  rpgItems,
} from '../public/js/rpg-items.js';

const legacy = [
  ['attack-common', '나무 연필검', 5], ['attack-uncommon', '은빛 펜촉검', 10],
  ['attack-rare', '유성 키보드', 18], ['attack-legend', '새벽의 만년필', 28],
  ['defense-common', '종이 망토', 2], ['defense-uncommon', '단단한 책 표지', 4],
  ['defense-rare', '수호자의 사전', 7], ['defense-legend', '별빛 문장 갑옷', 11],
  ['heal-common', '풀잎 책갈피', 2], ['heal-uncommon', '이슬 찻잔', 4],
  ['heal-rare', '달빛 잉크병', 7], ['heal-legend', '생명의 문장석', 10],
];

test('v9 catalog has 104 items per effect with the specified rarity counts', () => {
  assert.equal(rpgItems.length, 312);
  assert.deepEqual(RPG_RARITIES.map(({id, chance}) => [id, chance]), [
    ['common', 60], ['uncommon', 30], ['rare', 8], ['legend', 1.5], ['divine', 0.5],
  ]);
  for (const slot of ['attack', 'defense', 'heal']) {
    const slotItems = rpgItems.filter(item => item.slot === slot);
    assert.equal(slotItems.length, 104);
    assert.deepEqual(Object.fromEntries(RPG_RARITIES.map(rarity => [
      rarity.id, slotItems.filter(item => item.rarity === rarity.id).length,
    ])), {common: 50, uncommon: 25, rare: 20, legend: 6, divine: 3});
  }
  assert.equal(new Set(rpgItems.map(item => item.id)).size, 312);
  assert.equal(new Set(rpgItems.map(item => item.name)).size, 312);
  assert.ok(rpgItems.every(item => item.image === `/assets/pixel/items/${item.id}.svg`));
});

test('all twelve legacy catalog entries keep their IDs, names and base values', () => {
  for (const [id, name, value] of legacy) {
    const item = rpgItems.find(candidate => candidate.id === id);
    assert.equal(item.name, name);
    assert.equal(item.value, value);
  }
});

test('rarity boundaries use 60/30/8/1.5/0.5 percent and item selection stays in that rarity', () => {
  const rolls = [0, .599999, .6, .899999, .9, .979999, .98, .994999, .995, .999999];
  const rarity = rolls.map(roll => chooseRpgItem(() => roll).rarity);
  assert.deepEqual(rarity, ['common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'legend', 'legend', 'divine', 'divine']);
});

test('enhancement is rounded from base effect and gear stats use the equipped stack level', () => {
  assert.equal(enhancedItemValue({value: 7}, 0), 7);
  assert.equal(enhancedItemValue({value: 7}, 5), 11);
  assert.equal(enhancedItemValue({value: 7}, 10), 14);
  assert.deepEqual(gearStats(
    {attack: 'attack-common', defense: 'defense-rare', heal: 'heal-common'},
    [{itemId: 'attack-common', enhancement: 3}, {itemId: 'defense-rare', enhancement: 5}],
  ), {attack: 7, defense: 11, heal: 2});
});
