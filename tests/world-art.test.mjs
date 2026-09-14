import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {catalog} from '../public/js/catalog.js';
import {artAssetSources} from '../public/js/art.js';
import {RPG_CHARACTERS,RPG_MONSTER_NAMES_25} from '../public/js/rpg-characters.js';
import {cityCars} from '../public/js/game-options.js';
import {tarotCards} from '../public/js/profiles.js';

const root=new URL('../public/',import.meta.url);
const readAsset=src=>readFile(new URL('.'+src,root));

test('game portraits have real transparency, not a painted checkerboard',async()=>{
 for(const name of ['hero','slime','goblin','jellyfish','golem','dragon','runner','runner-run-b','runner-jump','runner-slide','runner-dead']){
  const bytes=await readAsset(`/assets/pixel/portraits/${name}.webp`);
  assert.equal(bytes.toString('ascii',12,16),'VP8X',name);
  assert.ok(bytes[20]&0x10,`${name}: alpha channel required`);
 }
});

test('every activity ships a distinct full and compact thumbnail',async()=>{
 const full=new Set(),small=new Set();
 assert.equal(catalog.length,20);
 for(const entry of catalog)for(const suffix of ['', '-small']){
  const bytes=await readAsset(`/assets/pixel/thumbnails/${entry.id}${suffix}.webp`);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>1000&&bytes.length<250000,`${entry.id}${suffix}: production image budget`);
  (suffix?small:full).add(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(full.size,20);assert.equal(small.size,20);
});

test('artbook contains complete, local, nonempty production artwork',async()=>{
 const manifest=JSON.parse(await readFile(new URL('artbook/manifest.json',root),'utf8')),assets=manifest.assets;
 const illustratedSceneCount=(await Promise.all(['world','rpg'].map(async group=>(await readdir(new URL(`assets/pixel/illustrated/${group}/`,root))).filter(file=>file.endsWith('.png')).length))).reduce((sum,count)=>sum+count,0);
 const expected=catalog.length+(await readdir(new URL('assets/pixel/portraits/',root))).filter(file=>file.endsWith('.webp')).length+illustratedSceneCount+RPG_CHARACTERS.length+312+RPG_MONSTER_NAMES_25.length+cityCars.length+4+(await readdir(new URL('assets/pixel/scenes/',root))).filter(file=>file.endsWith('.png')).length;
 assert.equal(manifest.version,'pixel-v13');
 assert.equal(manifest.copyright,'© 2026 DWINGUL');
 assert.equal(manifest.contact.email,'poilkjmnb122@gmail.com');
 assert.equal(manifest.provenance.equipmentBaseIllustrations,75);
 assert.equal(manifest.provenance.derivedEquipmentVariants,312);
 assert.equal(assets.length,expected);
 assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 assert.equal(new Set(assets.map(a=>a.src)).size,assets.length);
 for(const asset of assets){
  assert.match(asset.src,/^\/assets\/pixel\/[a-z0-9/-]+\.(png|webp)$/);
  assert.doesNotMatch(asset.src,/\.svg$/);
  assert.ok(asset.name);assert.ok(asset.width>0&&asset.height>0);
  assert.ok((await stat(new URL('.'+asset.src,root))).size>100,asset.id);
  if(asset.preview)assert.ok((await stat(new URL('.'+asset.preview,root))).size>100,asset.id+' preview');
 }
 for(const group of ['world','portraits','rpg','personas','items','monsters','vehicles','traffic'])assert.ok(assets.some(a=>a.src.includes('/'+group+'/')));
});

test('artbook PNG dimensions and aspect ratios match every source IHDR',async()=>{
 const {assets}=JSON.parse(await readFile(new URL('artbook/manifest.json',root),'utf8'));
 for(const asset of assets.filter(asset=>asset.src.endsWith('.png'))){
  const bytes=await readFile(new URL('.'+asset.src,root));
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',asset.id);
  assert.equal(bytes.toString('ascii',12,16),'IHDR',asset.id);
  const actual=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  assert.deepEqual([asset.width,asset.height],actual,`${asset.id} manifest dimensions`);
  assert.equal(asset.width/asset.height,actual[0]/actual[1],`${asset.id} aspect ratio`);
 }
});

test('every legacy SVG keeps an existing raster primary and exact fallback',async()=>{
 for(const group of ['world','rpg','personas','items'])for(const file of (await readdir(new URL(`assets/pixel/${group}/`,root))).filter(file=>file.endsWith('.svg'))){
  const legacy=`/assets/pixel/${group}/${file}`,sources=artAssetSources(legacy);
  assert.deepEqual(sources,{primary:`/assets/pixel/illustrated/${group}/${file.replace(/\.svg$/,'.png')}`,fallback:legacy});
  assert.ok((await stat(new URL('.'+sources.primary,root))).size>100,sources.primary);
  assert.ok((await stat(new URL('.'+sources.fallback,root))).size>100,sources.fallback);
 }
});

test('artbook native assets include focused Korean search aliases',async()=>{
 const {assets}=JSON.parse(await readFile(new URL('artbook/manifest.json',root),'utf8'));
 const matches=query=>assets.filter(asset=>[asset.name,asset.kind,asset.rarity,asset.id,asset.searchAliases].join(' ').toLowerCase().includes(query));
 assert.deepEqual(matches('타로').filter(asset=>asset.id.startsWith('world/')).map(asset=>asset.id),assets.filter(asset=>asset.id.startsWith('world/tarot-')).map(asset=>asset.id));
 assert.equal(matches('몬스터').filter(asset=>asset.id.startsWith('rpg/monster-')).length,25);
 assert.equal(matches('보스').filter(asset=>asset.id.startsWith('rpg/boss-')).length,25);
 for(const query of ['영웅','러너','차량','상자','마법책','오행'])assert.ok(matches(query).length>0,`${query} Korean alias`);
});

test('artbook uses the product names for tarot, characters, species, and cars',async()=>{
 const {assets}=JSON.parse(await readFile(new URL('artbook/manifest.json',root),'utf8')),byId=new Map(assets.map(asset=>[asset.id,asset]));
 tarotCards.forEach((card,index)=>assert.equal(byId.get(`world/tarot-${index}`)?.name,`타로 · ${card[0]}`));
 RPG_CHARACTERS.forEach(character=>assert.equal(byId.get(`personas/${character.index}`)?.name,character.name));
 RPG_MONSTER_NAMES_25.forEach((name,index)=>assert.equal(byId.get(`species/${String(index+1).padStart(2,'0')}`)?.name,name));
 cityCars.forEach(car=>assert.equal(byId.get(`vehicles/${car.id}`)?.name,car.name));
});
