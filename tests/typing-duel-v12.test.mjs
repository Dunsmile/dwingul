import test from 'node:test';
import assert from 'node:assert/strict';
import {RPG_CHARACTERS} from '../public/js/rpg-characters.js';
import {typingRpgHeroDuelArtPath,typingRpgMonsterDuelArtPath} from '../public/js/typing-rpg.js';

test('all gameplay heroes map to inward-facing duel variants without changing collection art',()=>{
 assert.deepEqual(RPG_CHARACTERS.map(character=>typingRpgHeroDuelArtPath(character.id)),Array.from({length:16},(_,index)=>`/assets/pixel/scenes/duel-hero-${index}.png`));
 assert.equal(typingRpgHeroDuelArtPath('unknown'),'/assets/pixel/scenes/duel-hero-0.png');
});

test('normal and boss stages use the same inward-facing species variant and repeat after 25',()=>{
 assert.equal(typingRpgMonsterDuelArtPath(1),'/assets/pixel/scenes/duel-monster-01.png');
 assert.equal(typingRpgMonsterDuelArtPath(10,true),'/assets/pixel/scenes/duel-monster-10.png');
 assert.equal(typingRpgMonsterDuelArtPath(25),'/assets/pixel/scenes/duel-monster-25.png');
 assert.equal(typingRpgMonsterDuelArtPath(26),'/assets/pixel/scenes/duel-monster-01.png');
});
