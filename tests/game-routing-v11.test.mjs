import test from 'node:test';
import assert from 'node:assert/strict';

import { createRhythm as createRhythmV11 } from '../public/js/rhythm-game.js';
import { createRhythm as createRhythmV9 } from '../public/js/legacy/rhythm-game-v9.js';
import { createJump as createJumpV13 } from '../public/js/jump-game.js';
import { createJump as createJumpV11 } from '../public/js/legacy/jump-game-v11.js';
import { createJump as createJumpV6 } from '../public/js/legacy/jump-game-v6.js';
import { createJump as createJumpV5 } from '../public/js/legacy/jump-game-v5.js';
import { gameContextSettings, resolveGameCreator } from '../public/js/games.js';

test('normalized V11 defaults dispatch to the current rhythm and jump creators', () => {
  assert.throws(()=>resolveGameCreator('sequence', {}), /종료/);
  assert.throws(()=>resolveGameCreator('sequence', { version: 'v11', mode: 'rhythm' }), /종료/);
  assert.equal(resolveGameCreator('jump', {}), createJumpV13);
  assert.equal(resolveGameCreator('jump', { version: 'v11' }), createJumpV11);
});

test('preserved V9, V6, and V5 settings dispatch to their frozen creators', () => {
  assert.throws(()=>resolveGameCreator('sequence', { version: 'v9', mode: 'rhythm' }), /종료/);
  assert.equal(resolveGameCreator('jump', { version: 'v6' }), createJumpV6);
  assert.equal(resolveGameCreator('jump', { version: 'v5' }), createJumpV5);
});

test('versions without a preserved playable creator fail instead of silently changing rules', () => {
  assert.throws(() => resolveGameCreator('sequence', { version: 'v7' }), /종료/);
  assert.throws(() => resolveGameCreator('jump', { version: 'v4' }), /지원하지 않는 점프 규칙: v4/);
});

test('mount context normalization keeps server-selected character and gear', () => {
  const settings = gameContextSettings('typing', {
    version: 'v5',
    mode: 'rpg',
    startStage: 21,
    characterId: 'owl-aviator',
    gear: { attack: 7, defense: 3, heal: 5 },
  });
  assert.deepEqual(settings, {
    version: 'v5',
    mode: 'rpg',
    startStage: 21,
    characterId: 'owl-aviator',
    gear: { attack: 7, defense: 3, heal: 5 },
  });
});
