import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rpgItems,RPG_RARITIES,RPG_SLOTS} from '../public/js/rpg-items.js';
import {RPG_PALETTE_25,typingRpgArtPath} from '../public/js/typing-rpg.js';
import {validateSvg} from '../scripts/generate-pixel-assets.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const asset=(group,name)=>path.join(root,'public/assets/pixel',group,name);
const svgFiles=async group=>(await readdir(asset(group,''))).filter(name=>name.endsWith('.svg')).sort();
const read=async(group,name)=>readFile(asset(group,name),'utf8');

function assertCrispSvg(source,viewBox){
 assert.match(source,new RegExp(`viewBox="0 0 ${viewBox}"`));
 assert.match(source,/shape-rendering="crispEdges"/);
 assert.match(source,/<title>[^<]+<\/title>/);
 const scrubbed=source.replace(/href="data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}"/g,'');
 assert.doesNotMatch(scrubbed,/(?:<script|javascript:|data:|undefined|NaN)/i);
}

test('all catalog gear has one unique crisp pixel asset',async()=>{
 assert.equal(rpgItems.length,312);
 assert.equal(Object.keys(RPG_SLOTS).length,3);
 assert.deepEqual(RPG_RARITIES.map(row=>[row.id,row.count,row.chance]),[
  ['common',50,60],['uncommon',25,30],['rare',20,8],['legend',6,1.5],['divine',3,.5],
 ]);
 const files=await svgFiles('items');
 assert.equal(files.length,312);
 assert.deepEqual(files,[...rpgItems.map(item=>`${item.id}.svg`)].sort());
 const artwork=new Set();
 for(const item of rpgItems){
  const source=await read('items',`${item.id}.svg`);
  assertCrispSvg(source,'48 48');
  assert.match(source,new RegExp(`<title>${item.name}</title>`));
  artwork.add(source.replace(/<title>.*?<\/title>|<desc>.*?<\/desc>| aria-label="[^"]*"/g,''));
 }
 assert.equal(artwork.size,312);
});

test('personas and RPG scene package is complete',async()=>{
 assert.equal((await svgFiles('personas')).length,16);
 const files=await svgFiles('rpg');
 assert.equal(files.length,65);
 for(const required of ['hero.svg','battlefield.svg','spell-attack.svg','spell-heal.svg','chest-sealed.svg'])assert.ok(files.includes(required));
 for(const rarity of RPG_RARITIES){
  assert.ok(files.includes(`chest-${rarity.id}-closed.svg`));
  assert.ok(files.includes(`chest-${rarity.id}-open.svg`));
 }
 for(let index=0;index<25;index++){
  const number=String(index+1).padStart(2,'0');
  const monster=await read('rpg',`monster-${number}.svg`);
  const boss=await read('rpg',`boss-${number}.svg`);
  assertCrispSvg(monster,'96 96');
  assertCrispSvg(boss,'96 96');
  assert.ok(monster.includes(RPG_PALETTE_25[index]));
  assert.ok(boss.includes(RPG_PALETTE_25[index]));
  assert.notEqual(monster,boss);
 }
 assertCrispSvg(await read('rpg','battlefield.svg'),'192 112');
 assertCrispSvg(await read('rpg','chest-divine-open.svg'),'96 80');
 assert.notEqual(await read('rpg','chest-sealed.svg'),await read('rpg','chest-common-closed.svg'));
 assert.match(await read('rpg','chest-sealed.svg'),/등급을 드러내지 않는/);
 assertCrispSvg(await read('rpg','spell-attack.svg'),'48 48');
});

test('portrait wrappers embed five safe material variants per species',async()=>{
 const species=['slime','goblin','jellyfish','golem','dragon'];
 const portraitData=Object.fromEntries(await Promise.all(species.map(async name=>[name,(await readFile(asset('portraits',`${name}.webp`))).toString('base64')])));
 for(let speciesIndex=0;speciesIndex<species.length;speciesIndex++){
  const normalMatrices=new Set(),bossMatrices=new Set();
  for(let variant=0;variant<5;variant++){
   const normalIndex=speciesIndex+variant*5,bossIndex=speciesIndex*5+variant;
   const normal=await read('rpg',`monster-${String(normalIndex+1).padStart(2,'0')}.svg`);
   const boss=await read('rpg',`boss-${String(bossIndex+1).padStart(2,'0')}.svg`);
   for(const source of [normal,boss]){
    assert.ok(source.includes(`href="data:image/webp;base64,${portraitData[species[speciesIndex]]}"`));
    assert.equal((source.match(/<image\b/g)||[]).length,1);
    assert.equal((source.match(/<feColorMatrix\b/g)||[]).length,1);
    validateSvg(source,96,96);
   }
   normalMatrices.add(normal.match(/<feColorMatrix[^>]*values="([^"]+)"/)[1]);
   bossMatrices.add(boss.match(/<feColorMatrix[^>]*values="([^"]+)"/)[1]);
   assert.doesNotMatch(normal,/data-part="boss-(?:crown|aura)"/);
   assert.match(boss,/data-part="boss-crown"/);
   assert.match(boss,/data-part="boss-aura"/);
  }
  assert.equal(normalMatrices.size,5);
  assert.equal(bossMatrices.size,5);
 }
 const hero=await read('rpg','hero.svg'),heroData=(await readFile(asset('portraits','hero.webp'))).toString('base64');
 assert.ok(hero.includes(`href="data:image/webp;base64,${heroData}"`));
});

test('SVG validation accepts only embedded WebP image references',()=>{
 const shell=content=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges"><title>검사</title>${content}</svg>`;
 const filter='<defs><filter id="tone"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></defs>';
 assert.equal(validateSvg(shell(`${filter}<image href="data:image/webp;base64,UklGRg==" filter="url(#tone)"/>`),96,96),true);
 assert.throws(()=>validateSvg(shell('<image href="https://example.com/a.webp"/>'),96,96));
 assert.throws(()=>validateSvg(shell('<image href="data:image/png;base64,UklGRg=="/>'),96,96));
 assert.throws(()=>validateSvg(shell('<image href="data:image/webp;base64,UklGRg==" onload="alert(1)"/>'),96,96));
 assert.throws(()=>validateSvg(shell('<foreignObject>bad</foreignObject>'),96,96));
 assert.throws(()=>validateSvg(shell(`${filter}<rect width="1" height="1" filter="url(https://bad.test/x)"/>`),96,96));
});

test('all 25 boss sprites are reachable at milestone stages',()=>{
 const paths=Array.from({length:25},(_,index)=>typingRpgArtPath((index+1)*10,true));
 assert.equal(new Set(paths).size,25);
 assert.equal(paths[0],'/assets/pixel/rpg/boss-01.svg');
 assert.equal(paths[24],'/assets/pixel/rpg/boss-25.svg');
 assert.equal(typingRpgArtPath(260,true),'/assets/pixel/rpg/boss-01.svg');
 assert.equal(typingRpgArtPath(26,false),'/assets/pixel/rpg/monster-01.svg');
});

test('battle and draw views point at the native pixel package',async()=>{
 const [battle,draw,css]=await Promise.all([
  readFile(path.join(root,'public/js/typing-rpg.js'),'utf8'),
  readFile(path.join(root,'public/js/rpg-draw-dialog.js'),'utf8'),
  readFile(path.join(root,'public/css/typing-rpg.css'),'utf8'),
 ]);
 assert.match(battle,/typing-rpg--pixel/);
 assert.match(battle,/assets\/pixel\/rpg\/hero\.svg/);
 assert.match(battle,/typingRpgArtPath\(state\.stage,state\.boss\)/);
 assert.match(draw,/chest-\$\{item\.rarity\}-open\.svg/);
 assert.match(draw,/chest-\$\{state\}\.svg/);
 assert.match(draw,/wireChestFallback/);
 assert.match(css,/assets\/pixel\/rpg\/battlefield\.svg/);
});
