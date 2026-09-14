import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const js=await readFile(new URL('../public/js/typing-rpg.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/css/typing-rpg.css',import.meta.url),'utf8');

test('typing battle places three status groups, actors, and commands in one illustrated arena',()=>{
  assert.match(js,/hud\.append\(playerHud, runHud, enemyHud\)/);
  assert.match(js,/arena\.append\(hud, scene, command\)/);
  assert.match(js,/pauseButton\.classList\.add\('typing-rpg__pause'\)/);
  assert.doesNotMatch(js,/root\.append\(hud, battlefield\)/);
  assert.match(css,/v13: one immersive battlefield/);
  assert.match(css,/typing-rpg__arena[\s\S]*background(?:-image)?:[^;]*battlefield\.png/);
  assert.match(css,/typing-rpg__hud[\s\S]*grid-template-columns/);
  assert.match(css,/typing-rpg__command[\s\S]*position:relative/);
  assert.match(css,/dg-game--typing-rpg \.dg-game__toolbar\{display:none\}/);
  assert.match(css,/typing-rpg__pause\{position:relative/);
});

test('typing battle keeps semantic asset paths while delivering and warming optimized images',()=>{
  assert.match(js,/image\.src=assetUrl\(primary\)/);
  assert.match(js,/warmImage\(typingRpgMonsterDuelArtPath\(state\.stage\+1\)\)/);
  assert.match(js,/dataSet|dataset\.fallback=fallback/);
  assert.match(js,/export function typingRpgHeroDuelArtPath/);
  assert.match(js,/export function typingRpgMonsterDuelArtPath/);
});
