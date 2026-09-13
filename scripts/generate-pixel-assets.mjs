import assert from 'node:assert/strict';
import {mkdir, readdir, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {rpgItems} from '../public/js/rpg-items.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemDirectory = path.join(projectRoot, 'public/assets/pixel/items');
const personaDirectory = path.join(projectRoot, 'public/assets/pixel/personas');

const palettes = {
  common: {paper:'#f3e6c9', shadow:'#49382d', main:'#9b7652', light:'#dec18b', accent:'#6f8656', glow:'#fff5db'},
  uncommon: {paper:'#dce9df', shadow:'#2f4240', main:'#5e8b83', light:'#9fc5b5', accent:'#c77a57', glow:'#f2f2cf'},
  rare: {paper:'#e4dcef', shadow:'#3d324d', main:'#715c91', light:'#b39ac9', accent:'#d69662', glow:'#f6e7ad'},
  legend: {paper:'#f2dfad', shadow:'#503928', main:'#b46d39', light:'#e2ad53', accent:'#6f7f4a', glow:'#fff0a4'},
  divine: {paper:'#f0c9b9', shadow:'#4b2928', main:'#b74f45', light:'#ed8a66', accent:'#7761a4', glow:'#fff1bd'},
};

const accentColors = ['#6f8656','#c56f52','#527f83','#856a9a','#c69b43','#9b5a48','#50745c','#9a7547'];
const allowedTags = new Set(['svg','title','desc','g','rect','path','polygon','circle']);

const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
const rect = (x,y,width,height,fill,extra='') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${extra}/>`;
const polygon = (points,fill,extra='') => `<polygon points="${points}" fill="${fill}"${extra}/>`;
const pathShape = (d,fill,extra='') => `<path d="${d}" fill="${fill}"${extra}/>`;

function hashText(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function svgDocument(label, content, description='') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><title>${escapeXml(label)}</title>${description?`<desc>${escapeXml(description)}</desc>`:''}${content}</svg>\n`;
}

function rarityFrame(palette, rarity, serial) {
  const corners = [
    rect(3,3,8,2,palette.shadow), rect(3,5,2,6,palette.shadow),
    rect(37,3,8,2,palette.shadow), rect(43,5,2,6,palette.shadow),
    rect(3,43,8,2,palette.shadow), rect(3,37,2,6,palette.shadow),
    rect(37,43,8,2,palette.shadow), rect(43,37,2,6,palette.shadow),
  ];
  const rank = ['common','uncommon','rare','legend','divine'].indexOf(rarity);
  for (let index=0; index<rank; index++) {
    const x = 8 + index*7;
    corners.push(rect(x,6,2,2,palette.glow),rect(x+2,4,2,2,palette.accent),rect(x+2,8,2,2,palette.accent));
  }
  if (rarity === 'divine') corners.push(rect(20,2,8,2,palette.glow),rect(22,0,4,2,palette.accent));
  const ribbonColor = accentColors[(serial * 5 + rank) % accentColors.length];
  for (let bit=0; bit<9; bit++) {
    const color = serial & (1 << bit) ? ribbonColor : palette.light;
    corners.push(rect(35 + (bit%3)*3,35 + Math.floor(bit/3)*3,2,2,color));
  }
  return rect(5,5,38,38,palette.paper,' opacity=".74"') + corners.join('');
}

function sword(palette, variant) {
  const shift = variant % 3 - 1;
  return [
    polygon(`${12+shift},35 ${16+shift},39 ${38+shift},17 ${38+shift},9 ${30+shift},9 ${8+shift},31`,palette.shadow),
    polygon(`${14+shift},34 ${17+shift},37 ${35+shift},19 ${35+shift},13 ${31+shift},13 ${11+shift},33`,palette.light),
    rect(8+shift,35,14,4,palette.accent),rect(11+shift,39,5,5,palette.shadow),rect(13+shift,39,2,3,palette.main),
    rect(28+shift,15,4,4,palette.glow),
  ].join('');
}

function penNib(palette, variant) {
  const inset = variant % 3;
  return [
    polygon(`24,7 38,17 33,37 24,43 15,37 10,17`,palette.shadow),
    polygon(`24,10 ${35-inset},18 30,34 24,39 18,34 ${13+inset},18`,palette.main),
    polygon(`24,10 24,31 18,34 13,18`,palette.light),
    rect(22,24,4,7,palette.shadow),rect(23,21,2,3,palette.glow),rect(19,35,10,3,palette.accent),
  ].join('');
}

function keyboard(palette, variant) {
  const key = variant % 2 ? palette.accent : palette.light;
  let keys = '';
  for (let row=0; row<3; row++) for (let column=0; column<6; column++) keys += rect(11+column*5,17+row*5,3,3,(row+column+variant)%4===0?palette.glow:key);
  return rect(7,12,34,24,palette.shadow)+rect(9,14,30,19,palette.main)+keys+rect(15,32,18,2,palette.light)+rect(10,36,28,3,palette.shadow);
}

function fountainPen(palette, variant) {
  const cap = variant % 2 ? palette.accent : palette.main;
  return [
    polygon('8,35 12,40 38,14 34,10',palette.shadow),polygon('11,34 13,37 35,15 33,13',palette.light),
    polygon('34,10 38,14 42,8 40,6',cap),rect(7,36,6,6,palette.shadow),rect(8,35,3,3,palette.glow),
    rect(20,25,4,2,palette.accent),rect(28,17,4,2,palette.accent),
  ].join('');
}

function runeBlade(palette, variant) {
  const width = 10 + (variant % 3)*2;
  const left = 24-width/2;
  return [
    polygon(`24,4 ${left+width},12 ${left+width-2},32 24,38 ${left+2},32 ${left},12`,palette.shadow),
    polygon(`24,8 ${left+width-3},13 ${left+width-5},30 24,34 24,8`,palette.light),
    rect(12,34,24,4,palette.accent),rect(20,38,8,7,palette.shadow),rect(22,39,4,4,palette.main),
    rect(22,15,4,4,palette.glow),rect(20,21,4,4,palette.main),rect(24,27,4,4,palette.glow),
  ].join('');
}

function cloak(palette, variant) {
  const flare = variant % 3;
  return [
    polygon(`24,7 33,11 ${39+flare},39 29,43 24,37 19,43 ${9-flare},39 15,11`,palette.shadow),
    pathShape('M24 10L31 13L34 37L28 39L24 33L20 39L14 37L17 13Z',palette.main),
    polygon('17,13 24,20 31,13 29,9 19,9',palette.light),circleMarkup(24,20,3,palette.accent),
    rect(15,29,5,3,palette.light),rect(29,32,5,3,palette.accent),
  ].join('');
}

function circleMarkup(cx,cy,r,fill) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`; }

function book(palette, variant) {
  const tabY = 15 + (variant%4)*5;
  return [
    rect(8,8,32,34,palette.shadow),rect(11,10,26,28,palette.main),rect(14,12,20,24,palette.paper),
    rect(11,10,4,28,palette.accent),rect(17,15,14,2,palette.light),rect(17,20,11,2,palette.light),
    rect(17,25,14,2,palette.light),rect(37,tabY,4,5,palette.glow),rect(12,38,27,3,palette.light),
  ].join('');
}

function dictionary(palette, variant) {
  return [
    polygon('7,12 35,7 42,13 42,38 14,43 7,37',palette.shadow),
    polygon('10,14 34,10 38,14 38,34 14,39 10,35',palette.main),
    polygon('14,17 35,13 35,32 14,36',palette.paper),rect(10,14,5,22,palette.accent),
    rect(19,18+(variant%3)*4,12,2,palette.light),rect(19,23+(variant%2)*5,10,2,palette.light),
    rect(13,39,26,3,palette.light),
  ].join('');
}

function armor(palette, variant) {
  const shoulder = 6 + variant%3;
  return [
    polygon(`24,7 33,10 ${42-shoulder},16 38,23 35,19 35,40 13,40 13,19 10,23 ${6+shoulder},16 15,10`,palette.shadow),
    polygon('24,11 31,13 34,18 31,21 31,36 17,36 17,21 14,18 17,13',palette.main),
    polygon('19,12 24,17 29,12 28,23 20,23',palette.light),rect(20,25,8,3,palette.accent),
    rect(16,30,5,4,palette.light),rect(27,30,5,4,palette.light),
  ].join('');
}

function shield(palette, variant) {
  const notch = 16 + variant%4;
  return [
    polygon(`24,5 40,11 38,31 24,44 10,31 8,11`,palette.shadow),
    polygon(`24,9 36,13 34,29 24,39 14,29 12,13`,palette.main),
    polygon(`24,12 24,35 17,27 ${notch},16`,palette.light),rect(22,17,4,15,palette.accent),rect(17,22,14,4,palette.accent),
    rect(21,8,6,3,palette.glow),
  ].join('');
}

function bookmark(palette, variant) {
  return [
    rect(15,6,18,37,palette.shadow),rect(18,8,12,29,palette.main),polygon('18,37 24,32 30,37 30,43 24,39 18,43',palette.shadow),
    rect(20,11,8,3,palette.light),rect(21,17+(variant%4)*4,6,6,palette.accent),rect(23,19+(variant%4)*4,2,2,palette.glow),
  ].join('');
}

function cup(palette, variant) {
  const steamShift = variant%3;
  return [
    rect(8,17,29,22,palette.shadow),rect(11,20,23,15,palette.main),rect(14,22,17,10,palette.light),
    rect(34,21,7,12,palette.shadow),rect(35,24,3,6,palette.paper),rect(12,37,24,4,palette.shadow),
    rect(15+steamShift,8,3,7,palette.accent),rect(22-steamShift,5,3,10,palette.light),rect(29,9,3,6,palette.accent),
  ].join('');
}

function inkBottle(palette, variant) {
  return [
    rect(17,5,14,5,palette.shadow),rect(15,10,18,6,palette.accent),rect(10,16,28,25,palette.shadow),
    polygon('14,19 34,19 32,37 16,37',palette.main),polygon('16,21 24,21 24,35 18,35',palette.light),
    rect(19,24+(variant%3)*3,10,5,palette.paper),rect(22,25+(variant%3)*3,4,3,palette.accent),rect(13,40,22,3,palette.shadow),
  ].join('');
}

function gem(palette, variant) {
  const middle = 20 + variant%5;
  return [
    polygon(`24,5 40,18 35,36 24,44 13,36 8,18`,palette.shadow),
    polygon(`24,9 36,19 32,33 24,39 16,33 12,19`,palette.main),
    polygon(`24,10 ${middle},20 24,36 14,20`,palette.light),polygon('25,11 35,20 25,20',palette.glow),
    rect(21,20,6,6,palette.accent),
  ].join('');
}

function talisman(palette, variant) {
  return [
    rect(12,6,24,37,palette.shadow),rect(15,9,18,31,palette.paper),rect(17,11,14,5,palette.accent),
    rect(22,18,4,4,palette.main),rect(18,22,8,3,palette.main),rect(24,25,5,3,palette.main),
    rect(19+(variant%3)*3,30,3,6,palette.accent),polygon('15,40 20,36 24,40 28,36 33,40 33,44 15,44',palette.shadow),
  ].join('');
}

function motifFor(item) {
  const name = item.name;
  if (item.slot === 'attack') {
    if (name.includes('키보드')) return keyboard;
    if (name.includes('만년필')) return fountainPen;
    if (name.includes('문장검')) return runeBlade;
    if (name.includes('펜촉검')) return penNib;
    return sword;
  }
  if (item.slot === 'defense') {
    if (name.includes('책 표지')) return book;
    if (name.includes('사전')) return dictionary;
    if (name.includes('갑옷')) return armor;
    if (name.includes('수호패')) return shield;
    return cloak;
  }
  if (name.includes('찻잔')) return cup;
  if (name.includes('잉크병')) return inkBottle;
  if (name.includes('문장석')) return gem;
  if (name.includes('부적')) return talisman;
  return bookmark;
}

export function createItemSvg(item, serial=0) {
  const base = palettes[item.rarity];
  assert.ok(base, `알 수 없는 등급: ${item.rarity}`);
  const palette = {...base, accent: accentColors[hashText(item.id) % accentColors.length]};
  const motif = motifFor(item);
  const content = rarityFrame(palette, item.rarity, serial) + `<g>${motif(palette, hashText(item.name)%7)}</g>`;
  return svgDocument(item.name, content, `${item.rarity} ${item.slot} 픽셀 장비`);
}

function personaBody(index) {
  const species = index % 4;
  const role = Math.floor(index / 4);
  const colors = [
    ['#6e8752','#b5ca7b','#f1e4bd'],
    ['#a95e45','#e08a61','#f5d4ae'],
    ['#526f86','#8cb0bd','#e8e1c4'],
    ['#68567e','#9a82ac','#eee0c0'],
  ][role];
  const [dark,main,face] = colors;
  const ears = species===0
    ? polygon('11,15 15,6 20,16 28,16 33,6 38,15',dark)
    : species===1
      ? polygon('10,17 13,5 22,15 26,15 35,5 38,17',main)
      : species===2
        ? `${rect(15,8,7,8,main)}${rect(26,6,7,10,dark)}${rect(21,4,6,12,main)}`
        : `${rect(13,10,8,7,face)}${rect(20,6,10,10,face)}${rect(29,11,7,7,face)}`;
  const faceMark = species===0 ? rect(14,23,8,7,face)+rect(26,23,8,7,face) : rect(13,18,22,17,face);
  const accessory = [
    `${rect(10,34,28,5,dark)}${rect(21,32,6,10,main)}`,
    `${rect(8,30,8,10,dark)}${rect(32,30,8,10,dark)}${rect(17,36,14,5,main)}`,
    `${rect(18,35,12,7,dark)}${rect(21,31,6,5,main)}`,
    `${rect(11,35,26,5,dark)}${rect(15,40,6,4,main)}${rect(27,40,6,4,main)}`,
  ][role];
  return `${ears}${rect(9,14,30,27,dark)}${rect(12,17,24,21,main)}${faceMark}${rect(17,24,4,5,'#3c2d28')}${rect(28,24,4,5,'#3c2d28')}${rect(23,29,3,3,'#b76852')}${accessory}`;
}

export function createPersonaSvg(index) {
  assert.ok(Number.isInteger(index) && index >= 0 && index < 16, '페르소나 번호는 0부터 15까지예요.');
  const background = ['#dfe9c9','#f0d0bd','#d5e4e5','#e5daec'][Math.floor(index/4)];
  const content = rect(4,4,40,40,background,' opacity=".78"')
    + rect(4,4,12,3,'#49382d') + rect(4,7,3,9,'#49382d')
    + rect(32,41,12,3,'#49382d') + rect(41,32,3,9,'#49382d')
    + `<g>${personaBody(index)}</g>`;
  return svgDocument(`숲 친구 ${index+1}`, content, '뒹굴 자체 픽셀 페르소나');
}

export function validateSvg(svg) {
  assert.match(svg, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 48 48"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.match(svg, /<title>[^<]+<\/title>/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.doesNotMatch(svg, /(?:<script|javascript:|data:text\/html|\b(?:href|src)=)/i);
  assert.doesNotMatch(svg, /(?:undefined|NaN|Infinity)/);
  for (const match of svg.matchAll(/<\/?([a-z][\w-]*)\b/gi)) assert.ok(allowedTags.has(match[1]), `허용하지 않는 SVG 태그: ${match[1]}`);
  return true;
}

async function clearSvgFiles(directory) {
  await mkdir(directory, {recursive:true});
  const files = await readdir(directory);
  await Promise.all(files.filter(file => file.endsWith('.svg')).map(file => unlink(path.join(directory,file))));
}

export async function generatePixelAssets() {
  assert.equal(rpgItems.length, 312, 'RPG 장비 목록은 정확히 312개여야 해요.');
  assert.equal(new Set(rpgItems.map(item => item.id)).size, 312, '장비 ID가 중복됐어요.');
  await clearSvgFiles(itemDirectory);
  await clearSvgFiles(personaDirectory);

  const itemArtwork = new Set();
  for (const [serial,item] of rpgItems.entries()) {
    assert.equal(item.image, `/assets/pixel/items/${item.id}.svg`, `${item.id} 이미지 주소가 카탈로그와 달라요.`);
    const svg = createItemSvg(item, serial);
    validateSvg(svg);
    const visual = svg.replace(/<title>.*?<\/title>/,'').replace(/<desc>.*?<\/desc>/,'').replace(/ aria-label="[^"]*"/,'');
    assert.ok(!itemArtwork.has(visual), `${item.id}의 그림이 다른 장비와 같아요.`);
    itemArtwork.add(visual);
    await writeFile(path.join(itemDirectory,`${item.id}.svg`),svg,'utf8');
  }

  const personaArtwork = new Set();
  for (let index=0; index<16; index++) {
    const svg = createPersonaSvg(index);
    validateSvg(svg);
    const visual = svg.replace(/<title>.*?<\/title>/,'').replace(/<desc>.*?<\/desc>/,'').replace(/ aria-label="[^"]*"/,'');
    assert.ok(!personaArtwork.has(visual), `${index}번 페르소나가 중복됐어요.`);
    personaArtwork.add(visual);
    await writeFile(path.join(personaDirectory,`${index}.svg`),svg,'utf8');
  }

  assert.equal((await readdir(itemDirectory)).filter(file => file.endsWith('.svg')).length,312);
  assert.equal((await readdir(personaDirectory)).filter(file => file.endsWith('.svg')).length,16);
  return {items:itemArtwork.size, personas:personaArtwork.size};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await generatePixelAssets();
  console.log(`pixel assets ready: ${result.items} items, ${result.personas} personas`);
}
