import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {catalog} from '../public/js/catalog.js';

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
 assert.equal(catalog.length,21);
 for(const entry of catalog)for(const suffix of ['', '-small']){
  const bytes=await readAsset(`/assets/pixel/thumbnails/${entry.id}${suffix}.webp`);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>1000&&bytes.length<250000,`${entry.id}${suffix}: production image budget`);
  (suffix?small:full).add(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(full.size,21);assert.equal(small.size,21);
});

test('artbook contains complete, local, nonempty production artwork',async()=>{
 const {assets}=JSON.parse(await readFile(new URL('artbook/manifest.json',root),'utf8'));
 const expected=21+(await readdir(new URL('assets/pixel/portraits/',root))).filter(file=>file.endsWith('.webp')).length+
  (await Promise.all(['world','rpg','personas'].map(async group=>(await readdir(new URL(`assets/pixel/${group}/`,root))).filter(file=>file.endsWith('.svg')).length))).reduce((sum,count)=>sum+count,0)+312;
 assert.equal(assets.length,expected);
 assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 assert.equal(new Set(assets.map(a=>a.src)).size,assets.length);
 for(const asset of assets){
  assert.match(asset.src,/^\/assets\/pixel\/[a-z0-9/-]+\.(svg|webp)$/);
  assert.ok(asset.name);assert.ok(asset.width>0&&asset.height>0);
  assert.ok((await stat(new URL('.'+asset.src,root))).size>100,asset.id);
  if(asset.preview)assert.ok((await stat(new URL('.'+asset.preview,root))).size>100,asset.id+' preview');
 }
 for(const group of ['world','portraits','rpg','personas','items'])assert.ok(assets.some(a=>a.src.includes('/'+group+'/')));
});

test('artbook SVG metadata preserves every source viewBox ratio',async()=>{
 const {assets}=JSON.parse(await readFile(new URL('artbook/manifest.json',root),'utf8'));
 for(const asset of assets.filter(asset=>asset.src.endsWith('.svg'))){
  const source=await readFile(new URL('.'+asset.src,root),'utf8');
  const viewBox=source.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  assert.ok(viewBox,`${asset.id} needs a numeric viewBox`);
  assert.deepEqual([asset.width,asset.height],[Number(viewBox[1]),Number(viewBox[2])],`${asset.id} manifest dimensions`);
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
