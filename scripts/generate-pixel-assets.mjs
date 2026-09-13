import assert from 'node:assert/strict';
import {mkdir, readFile, readdir, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {rpgItems} from '../public/js/rpg-items.js';
import {RPG_PALETTE_25} from '../public/js/typing-rpg.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemDirectory = path.join(projectRoot, 'public/assets/pixel/items');
const personaDirectory = path.join(projectRoot, 'public/assets/pixel/personas');
const rpgDirectory = path.join(projectRoot, 'public/assets/pixel/rpg');
const portraitDirectory = path.join(projectRoot, 'public/assets/pixel/portraits');

const palettes = {
  common: {paper:'#fffdf4',frame:'#d8ded8',shadow:'#49382d',main:'#a67d55',dark:'#76543c',light:'#e6c590',accent:'#6f8656',glow:'#fff8e8'},
  uncommon: {paper:'#f4f8ff',frame:'#6697c1',shadow:'#49382d',main:'#668da1',dark:'#405f71',light:'#b7d2dc',accent:'#4f789d',glow:'#e9f6ff'},
  rare: {paper:'#faf5ff',frame:'#9369b3',shadow:'#49382d',main:'#8063a0',dark:'#544169',light:'#c7add9',accent:'#9c6db7',glow:'#f3e5ff'},
  legend: {paper:'#fff9df',frame:'#e0b33f',shadow:'#49382d',main:'#c08a39',dark:'#7a552b',light:'#efd070',accent:'#b6792f',glow:'#fff1a4'},
  divine: {paper:'#fff2ec',frame:'#d75d52',shadow:'#49382d',main:'#bd5b4e',dark:'#753b38',light:'#ef9b78',accent:'#c64d48',glow:'#ffe8bd'},
};

const materialPalettes={
 attack:{
  common:{main:'#a67d55',dark:'#76543c',light:'#e6c590'},uncommon:{main:'#7896aa',dark:'#485f70',light:'#c4d8e2'},rare:{main:'#8a70a8',dark:'#56456c',light:'#ccb7dc'},legend:{main:'#c8923d',dark:'#795526',light:'#f2d273'},divine:{main:'#ca6255',dark:'#713936',light:'#f4aa80'},
 },
 defense:{
  common:{main:'#8d765d',dark:'#5e4938',light:'#cbb994'},uncommon:{main:'#6689a7',dark:'#405970',light:'#abc7da'},rare:{main:'#786394',dark:'#4e405f',light:'#b9a4ca'},legend:{main:'#b98a3e',dark:'#735629',light:'#dfc166'},divine:{main:'#ae554e',dark:'#693835',light:'#e58b70'},
 },
 heal:{
  common:{main:'#819167',dark:'#536047',light:'#c9d0a1'},uncommon:{main:'#5e98a6',dark:'#3c6571',light:'#abd4da'},rare:{main:'#8d70a5',dark:'#58466a',light:'#d0b7dd'},legend:{main:'#ca9b3e',dark:'#795a27',light:'#f2d776'},divine:{main:'#c75d62',dark:'#70393d',light:'#f1a28d'},
 },
};

const emblemWords={
 common:['나무','종이','풀잎','햇살','구름','바람','모래','조약돌','이끼','새싹'],
 uncommon:['은빛','푸른','맑은','산들','파도','숲길','여울','비취','서리','청명'],
 rare:['유성','달빛','수호자의','보랏빛','황혼','신비한','별무리','몽환의','은하','예언의'],
 legend:['새벽의','별빛','태양의','영원의','황금빛','고대의'],
 divine:['천상의','신화의','창세의'],
};
const allowedTags = new Set(['svg','title','desc','defs','filter','feColorMatrix','g','rect','path','polygon','circle','image']);

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

function pixelDocument(label, width, height, content, description='') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><title>${escapeXml(label)}</title>${description?`<desc>${escapeXml(description)}</desc>`:''}${content}</svg>\n`;
}

const svgDocument=(label,content,description='')=>pixelDocument(label,48,48,content,description);

function rarityFrame(palette, rarity) {
  const rank=['common','uncommon','rare','legend','divine'].indexOf(rarity),parts=[
    rect(2,2,44,44,palette.shadow),rect(4,4,40,40,palette.frame),rect(6,6,36,36,palette.paper),
    rect(2,2,10,3,palette.shadow),rect(2,5,3,9,palette.shadow),rect(36,2,10,3,palette.shadow),rect(43,5,3,9,palette.shadow),
    rect(2,43,10,3,palette.shadow),rect(2,34,3,9,palette.shadow),rect(36,43,10,3,palette.shadow),rect(43,34,3,9,palette.shadow),
    rect(7,7,34,2,palette.glow,' opacity=".85"'),rect(7,39,34,2,palette.dark,' opacity=".22"'),
  ];
  for(let index=0;index<=rank;index++){
    const x=20+(index-rank/2)*4;
    parts.push(polygon(`${x},4 ${x+2},6 ${x},8 ${x-2},6`,index===rank?palette.glow:palette.frame));
  }
  if(rank>=2)parts.push(rect(4,18,2,12,palette.glow),rect(42,18,2,12,palette.dark));
  if(rank>=3)parts.push(rect(9,4,3,3,palette.glow),rect(36,4,3,3,palette.glow),rect(9,41,3,3,palette.frame),rect(36,41,3,3,palette.frame));
  if(rank===4)parts.push(polygon('18,3 21,0 24,3 27,0 30,3 28,6 20,6',palette.frame));
  return parts.join('');
}

function makerRune(serial,palette){
 let value=serial+1,d=`M${38+(value%4)},37`;value=Math.floor(value/4);
 for(let row=1;row<5;row++){d+=`L${38+(value%4)},${37+row*1.5}`;value=Math.floor(value/4);}
 return rect(35,34,10,11,palette.shadow)+rect(37,36,6,7,palette.paper)+`<path d="${d}" fill="none" stroke="${palette.accent}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/>`;
}

function prefixEmblem(item,palette){
 const words=emblemWords[item.rarity],index=Math.max(0,words.findIndex(word=>item.name.startsWith(word))),x=8,y=9,c=palette.accent,g=palette.glow;
 return [
  polygon(`${x},${y+5} ${x+3},${y} ${x+6},${y+2} ${x+4},${y+6}`,c)+rect(x+2,y+3,2,5,g),
  rect(x+2,y,2,8,c)+rect(x,y+3,8,2,c)+rect(x+3,y+3,2,2,g),
  polygon(`${x+3},${y} ${x+7},${y+5} ${x+3},${y+8} ${x},${y+5}`,c)+rect(x+3,y+3,2,3,g),
  rect(x+3,y,2,8,c)+rect(x,y+3,8,2,c)+rect(x+1,y+1,2,2,g)+rect(x+6,y+6,2,2,g),
  rect(x+1,y+3,7,4,c)+rect(x+3,y+1,4,6,c)+rect(x+2,y+3,4,2,g),
  pathShape(`M${x} ${y+2}H${x+6}L${x+8} ${y+4}H${x+2}M${x} ${y+6}H${x+5}`,c,' stroke="'+c+'" stroke-width="2"'),
  pathShape(`M${x} ${y+2}L${x+2} ${y+4}L${x+4} ${y+2}L${x+6} ${y+4}L${x+8} ${y+2}`, 'none',' stroke="'+c+'" stroke-width="2"'),
  polygon(`${x+4},${y} ${x+8},${y+3} ${x+6},${y+8} ${x+2},${y+8} ${x},${y+3}`,c)+polygon(`${x+4},${y+2} ${x+6},${y+4} ${x+4},${y+6} ${x+2},${y+4}`,g),
  rect(x+3,y,2,8,c)+rect(x,y+3,8,2,c)+rect(x+1,y+1,2,2,c)+rect(x+6,y+1,2,2,c)+rect(x+1,y+6,2,2,c)+rect(x+6,y+6,2,2,c),
  polygon(`${x+4},${y} ${x+5},${y+3} ${x+8},${y+4} ${x+5},${y+5} ${x+4},${y+8} ${x+3},${y+5} ${x},${y+4} ${x+3},${y+3}`,c)+rect(x+3,y+3,2,2,g),
 ][index%10];
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
  const palette = {...base, ...materialPalettes[item.slot][item.rarity]};
  const motif = motifFor(item);
  const content = rarityFrame(palette, item.rarity) + `<g>${motif(palette, hashText(item.name)%7)}</g>` + prefixEmblem(item,palette) + makerRune(serial,palette);
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
    ? polygon('9,18 13,5 22,15 27,15 36,5 40,18',dark)+polygon('13,14 15,9 19,15',face)+polygon('31,15 35,9 37,15',face)
    : species===1
      ? rect(13,3,9,17,dark)+rect(26,3,9,17,dark)+rect(16,6,4,12,face)+rect(28,6,4,12,face)
      : species===2
        ? rect(10,9,10,10,dark)+rect(28,9,10,10,dark)+rect(13,12,5,5,face)+rect(30,12,5,5,face)
        : polygon('15,17 18,8 23,13 27,5 30,15 37,11 36,20',dark);
  const body=polygon('13,15 18,11 30,11 35,15 40,21 40,34 35,41 13,41 8,34 8,21',dark)+polygon('15,18 19,15 29,15 34,18 36,22 36,33 32,37 16,37 12,33 12,22',main);
  const faceMark = species===0 ? rect(15,20,8,10,face)+rect(25,20,8,10,face)+rect(20,18,8,15,face) : species===3?polygon('14,20 34,20 31,33 17,33',face):rect(14,19,20,14,face);
  const accessory = [
    polygon('17,15 20,8 24,13 29,7 31,16', '#6f8656')+rect(11,34,26,4,dark)+rect(21,34,6,9,face),
    rect(9,33,30,5,'#a95e45')+polygon('29,36 36,36 34,44 29,41','#e08a61')+rect(15,38,7,5,dark),
    rect(13,23,9,7,dark)+rect(26,23,9,7,dark)+rect(22,25,4,2,dark)+rect(15,25,5,3,'#d5e4e5')+rect(28,25,5,3,'#d5e4e5')+rect(18,36,12,7,dark),
    rect(11,34,26,5,dark)+rect(17,38,6,6,main)+rect(27,38,6,6,main)+rect(21,14,6,4,'#fff1bd'),
  ][role];
  return `${ears}${body}${faceMark}${rect(17,23,4,5,'#3c2d28')}${rect(28,23,4,5,'#3c2d28')}${rect(18,24,2,2,'#fff8e8')}${rect(29,24,2,2,'#fff8e8')}${rect(12,29,5,2,'#d98272')}${rect(32,29,5,2,'#d98272')}${rect(23,29,3,3,'#b76852')}${rect(22,33,5,2,'#3c2d28')}${accessory}`;
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

function mixColor(left,right,amount=.5){
 const value=color=>color.match(/[a-f\d]{2}/gi).map(part=>parseInt(part,16)),a=value(left),b=value(right);
 return '#'+a.map((channel,index)=>Math.round(channel+(b[index]-channel)*amount).toString(16).padStart(2,'0')).join('');
}

const portraitSpecies=['slime','goblin','jellyfish','golem','dragon'];
const portraitLabels=['쉼표 슬라임','괄호 도깨비','물음표 해파리','띄어쓰기 골렘','마침표 용'];
const portraitMatrices=[
 '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0',
 '.78 .08 .08 0 .02 .05 .9 .08 0 .02 .08 .12 1.04 0 .03 0 0 0 1 0',
 '.86 .08 .18 0 .02 .04 .72 .12 0 .01 .16 .1 1.02 0 .03 0 0 0 1 0',
 '1.05 .1 .02 0 .04 .08 .9 .02 0 .03 .02 .08 .66 0 0 0 0 0 1 0',
 '1.08 .07 .04 0 .04 .04 .72 .04 0 .01 .04 .05 .72 0 .01 0 0 0 1 0',
];

function portraitImage(dataUri,variant,{boss=false}={}){
 assert.match(dataUri,/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/);
 const id=`portrait-tone-${variant}`;
 return `<defs><filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${portraitMatrices[variant]}"/></filter></defs><image x="${boss?7:3}" y="${boss?10:3}" width="${boss?82:90}" height="${boss?82:90}" preserveAspectRatio="xMidYMid meet" image-rendering="pixelated" filter="url(#${id})" href="${dataUri}"/>`;
}

function portraitStageMarks(color,variant,boss){
 const dark=mixColor(color,'#49382d',.5),light=mixColor(color,'#fff8e8',.55),parts=[
  rect(15,90,66,3,dark,' opacity=".3"'),rect(7,78,5,5,color),rect(84,78,5,5,color),
  polygon(`4,${25+variant*5} 8,${21+variant*5} 12,${25+variant*5} 8,${29+variant*5}`,light),
  polygon(`84,${19+(4-variant)*5} 88,${15+(4-variant)*5} 92,${19+(4-variant)*5} 88,${23+(4-variant)*5}`,light),
 ];
 if(boss)parts.push(`<g data-part="boss-aura">${rect(2,39,5,23,color,' opacity=".65"')}${rect(89,39,5,23,color,' opacity=".65"')}${rect(8,22,5,9,light)}${rect(83,22,5,9,light)}${rect(14,12,4,4,'#dfb665')}${rect(78,12,4,4,'#dfb665')}</g>`);
 return parts.join('');
}

function portraitBossCrown(){return `<g data-part="boss-crown">${polygon('29,20 32,5 42,14 48,2 55,14 65,5 68,20','#49382d')}${polygon('33,17 35,9 43,18 48,7 54,18 62,9 64,17','#dfb665')}${rect(37,13,5,4,'#fff1a4')}${rect(55,13,5,4,'#fff1a4')}</g>`;}

export function createRpgHeroSvg(dataUri){
 assert.match(dataUri,/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/);
 const content=rect(14,90,68,3,'#49382d',' opacity=".24"')+portraitImage(dataUri,0)+rect(7,77,13,4,'#dfb665')+rect(76,77,13,4,'#dfb665');
 return pixelDocument('키보드를 든 숲 모험가 영웅',96,96,content,'뒹굴 타이핑 마스터의 고해상도 픽셀 초상');
}

export function createRpgMonsterSvg(index,boss=false,dataUri){
 assert.ok(Number.isInteger(index)&&index>=0&&index<25,'몬스터 번호는 0부터 24까지예요.');
 const species=boss?Math.floor(index/5)%5:index%5,variant=boss?index%5:Math.floor(index/5),color=RPG_PALETTE_25[index];
 assert.match(dataUri,/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/);
 const content=portraitStageMarks(color,variant,boss)+portraitImage(dataUri,variant,{boss})+(boss?portraitBossCrown():'');
 return pixelDocument(`${boss?'왕관 보스 ':''}${portraitLabels[species]} ${index+1}`,96,96,content,`${portraitSpecies[species]} 초상의 ${variant+1}번째 재질 변형 ${boss?'보스':'몬스터'}`);
}

function chestBody(rarity,open=false){
 const p=palettes[rarity],rank=['common','uncommon','rare','legend','divine'].indexOf(rarity),parts=[];
 parts.push(rect(9,69,78,6,'#49382d',' opacity=".2"'));
 if(rank>0)for(let i=0;i<rank+1;i++){const x=18+i*13;parts.push(rect(x,8+(i%2)*4,5,5,p.glow),rect(x+1,6+(i%2)*4,3,3,p.accent));}
 if(open){
  parts.push(polygon('15,27 21,7 75,7 82,27',p.shadow),polygon('21,23 25,11 71,11 76,23',p.main),rect(25,14,46,6,p.light),rect(13,30,70,42,p.shadow),rect(18,35,60,31,p.main),rect(22,39,52,10,p.light));
  parts.push(polygon('24,38 32,22 39,38',p.glow),polygon('41,38 48,15 55,38',p.glow),polygon('58,38 66,23 72,38',p.glow));
 }else{
  parts.push(rect(13,20,70,23,p.shadow),rect(18,24,60,15,p.main),rect(22,27,52,6,p.light),rect(13,40,70,32,p.shadow),rect(18,44,60,22,p.main));
 }
 parts.push(rect(16,open?48:49,64,7,p.accent),rect(42,open?45:46,13,18,p.shadow),rect(45,open?48:49,7,9,p.glow),rect(20,open?58:60,8,5,p.light),rect(68,open?58:60,8,5,p.light));
 if(rank>=2)parts.push(rect(27,52,5,5,p.glow),rect(64,52,5,5,p.glow));
 if(rank>=3)parts.push(polygon('8,44 13,38 13,55',p.glow),polygon('88,44 83,38 83,55',p.glow));
 if(rank===4)parts.push(rect(6,25,6,6,p.accent),rect(84,25,6,6,p.accent),rect(46,0,5,7,p.glow));
 return parts.join('');
}

export function createRpgChestSvg(rarity,open=false){
 assert.ok(palettes[rarity],`알 수 없는 상자 등급: ${rarity}`);
 return pixelDocument(`${rarity} ${open?'열린':'닫힌'} 장비 상자`,96,80,chestBody(rarity,open),`${rarity} 등급 픽셀 보물상자`);
}

function sealedChest(){
 const ink='#49382d',wood='#9b7652',woodDark='#6f513c',woodLight='#d8b77e',sage='#6f8656',cream='#fff8e8',wax='#806952';
 const content=[
  rect(9,69,78,6,ink,' opacity=".2"'),rect(13,20,70,23,ink),rect(18,24,60,15,wood),rect(22,27,52,6,woodLight),
  rect(13,40,70,32,ink),rect(18,44,60,22,wood),rect(20,47,56,5,woodDark),rect(20,59,56,5,woodLight),
  rect(42,22,12,44,sage),rect(16,47,64,8,sage),rect(39,43,18,18,ink),rect(42,46,12,12,wax),
  polygon('48,47 51,51 49,57 45,55 45,50',cream),rect(22,30,13,3,cream,' opacity=".5"'),rect(62,30,10,3,cream,' opacity=".5"'),
 ].join('');
 return pixelDocument('봉인된 중립 장비 상자',96,80,content,'등급을 드러내지 않는 리본과 밀랍 봉인의 픽셀 상자');
}

function battleBackground(){
 let leaves='';for(const [x,y,color] of [[8,15,'#66805b'],[22,6,'#91a877'],[39,15,'#55724f'],[138,11,'#66805b'],[155,4,'#91a877'],[174,16,'#55724f']])leaves+=rect(x,y,28,18,color)+rect(x+7,y-6,15,9,color);
 return pixelDocument('숲속 타이핑 전투터',192,112,rect(0,0,192,112,'#fff8e8')+rect(0,63,192,49,'#c9bc91')+rect(0,69,192,43,'#9caf78')+rect(0,82,192,30,'#71875c')+rect(16,22,10,52,'#765542')+rect(164,21,11,54,'#765542')+leaves+rect(0,76,192,5,'#49382d',' opacity=".3"')+rect(78,72,34,5,'#dfb665')+rect(86,77,18,4,'#fff1bd'),'크림 하늘과 세 단계 숲 바닥');
}

function attackSpell(){return pixelDocument('날아가는 글자 공격',48,48,polygon('4,25 17,16 17,21 34,8 29,21 44,20 31,30 31,38 20,32 8,36 12,28','#49382d')+polygon('9,25 20,19 20,24 33,14 29,25 39,24 28,29 28,34 21,29 13,32 17,27','#dfb665')+rect(21,22,7,8,'#fff8e8'),'키 입력이 적에게 날아가는 전투 효과');}
function healSpell(){return pixelDocument('회복 잎사귀 빛',48,48,rect(21,5,6,38,'#405c3e')+rect(4,21,40,6,'#405c3e')+rect(24,8,7,30,'#91a877')+rect(9,24,30,7,'#91a877')+rect(18,16,13,16,'#fff8e8')+rect(21,12,7,24,'#d8eef0'),'회복 주문의 십자 잎사귀 효과');}

export function validateSvg(svg,width=48,height=48) {
  assert.match(svg, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,new RegExp(`viewBox="0 0 ${width} ${height}"`));
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.match(svg, /<title>[^<]+<\/title>/);
  assert.match(svg, /<\/svg>\s*$/);
  const imageTags=[...svg.matchAll(/<image\b[^>]*\/>/gi)].map(match=>match[0]);
  const approvedHrefs=[...svg.matchAll(/href="data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}"/g)].map(match=>match[0]);
  assert.equal(imageTags.length,approvedHrefs.length,'모든 image는 하나의 내장 WebP만 사용해야 해요.');
  for(const imageTag of imageTags){
    assert.match(imageTag,/\bhref="data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}"/);
    assert.doesNotMatch(imageTag,/\b(?:src|xlink:href|on[a-z]+)=/i);
  }
  const scrubbed=svg.replace(/href="data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}"/g,'');
  assert.doesNotMatch(scrubbed,/(?:<script|javascript:|data:|\b(?:href|src|xlink:href)=|\bon[a-z]+\s*=)/i);
  assert.doesNotMatch(scrubbed, /(?:undefined|NaN|Infinity)/);
  for(const reference of svg.matchAll(/url\(([^)]+)\)/g))assert.match(reference[1],/^#[A-Za-z][\w.-]*$/,'SVG 필터는 같은 문서의 ID만 참조해야 해요.');
  for (const match of svg.matchAll(/<\/?([a-z][\w-]*)\b/gi)) assert.ok(allowedTags.has(match[1]), `허용하지 않는 SVG 태그: ${match[1]}`);
  return true;
}

async function clearSvgFiles(directory) {
  await mkdir(directory, {recursive:true});
  const files = await readdir(directory);
  await Promise.all(files.filter(file => file.endsWith('.svg')).map(file => unlink(path.join(directory,file))));
}

async function loadPortraitData(name){
 const bytes=await readFile(path.join(portraitDirectory,`${name}.webp`));
 assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF',`${name} 초상은 RIFF WebP여야 해요.`);
 assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP',`${name} 초상은 WebP여야 해요.`);
 return `data:image/webp;base64,${bytes.toString('base64')}`;
}

export async function generatePixelAssets() {
  assert.equal(rpgItems.length, 312, 'RPG 장비 목록은 정확히 312개여야 해요.');
  assert.equal(new Set(rpgItems.map(item => item.id)).size, 312, '장비 ID가 중복됐어요.');
  await clearSvgFiles(itemDirectory);
  await clearSvgFiles(personaDirectory);
  await clearSvgFiles(rpgDirectory);
  const portraitEntries=await Promise.all(['hero',...portraitSpecies].map(async name=>[name,await loadPortraitData(name)]));
  const portraits=Object.fromEntries(portraitEntries);

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

  const rpgAssets=new Map([
    ['hero.svg',createRpgHeroSvg(portraits.hero)],
    ['battlefield.svg',battleBackground()],
    ['spell-attack.svg',attackSpell()],
    ['spell-heal.svg',healSpell()],
    ['chest-sealed.svg',sealedChest()],
  ]);
  for(const rarity of Object.keys(palettes)){
    rpgAssets.set(`chest-${rarity}-closed.svg`,createRpgChestSvg(rarity));
    rpgAssets.set(`chest-${rarity}-open.svg`,createRpgChestSvg(rarity,true));
  }
  for(let index=0;index<25;index++){
    const number=String(index+1).padStart(2,'0');
    rpgAssets.set(`monster-${number}.svg`,createRpgMonsterSvg(index,false,portraits[portraitSpecies[index%5]]));
    rpgAssets.set(`boss-${number}.svg`,createRpgMonsterSvg(index,true,portraits[portraitSpecies[Math.floor(index/5)%5]]));
  }
  for(const [filename,svg] of rpgAssets){
    const dimensions=filename==='battlefield.svg'?[192,112]:filename.startsWith('chest-')?[96,80]:filename.startsWith('spell-')?[48,48]:[96,96];
    validateSvg(svg,...dimensions);
    await writeFile(path.join(rpgDirectory,filename),svg,'utf8');
  }

  assert.equal((await readdir(itemDirectory)).filter(file => file.endsWith('.svg')).length,312);
  assert.equal((await readdir(personaDirectory)).filter(file => file.endsWith('.svg')).length,16);
  assert.equal((await readdir(rpgDirectory)).filter(file=>file.endsWith('.svg')).length,65);
  return {items:itemArtwork.size, personas:personaArtwork.size,rpg:rpgAssets.size};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await generatePixelAssets();
  console.log(`pixel assets ready: ${result.items} items, ${result.personas} personas, ${result.rpg} RPG scenes`);
}
