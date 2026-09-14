import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {catalog} from '../public/js/catalog.js';
import {cityCars} from '../public/js/game-options.js';
import {tarotCards} from '../public/js/profiles.js';
import {RPG_CHARACTERS,RPG_CHARACTER_TIERS,RPG_MONSTER_NAMES_25} from '../public/js/rpg-characters.js';
import {rpgItems,RPG_SLOTS,RPG_RARITIES} from '../public/js/rpg-items.js';

const root=new URL('../public/',import.meta.url);
const palette=['#fff8e8','#49382d','#405c3e','#91a877','#dfb665'];
const rarityNames=Object.fromEntries(RPG_RARITIES.map(rarity=>[rarity.id,rarity.name]));
const koreanTokens={tarot:'타로',monster:'몬스터',boss:'보스',hero:'영웅 용사',runner:'러너 달리기',vehicle:'차량 자동차',traffic:'교통',chest:'상자 보물상자',book:'책 마법책',element:'오행 원소',earth:'흙 토',fire:'불 화',metal:'쇠 금',water:'물 수',wood:'나무 목',battlefield:'전장',boost:'부스트',coin:'동전 코인',fuel:'연료',heart:'하트 체력',lantern:'등불 랜턴',sort:'분류 정리',spell:'마법 주문',attack:'공격',heal:'회복',star:'별',trophy:'트로피 우승',closed:'닫힘',open:'열림',sealed:'봉인',common:'일반',uncommon:'고급',rare:'희귀',legend:'전설',divine:'신화'};
const searchAliases=id=>[...new Set(String(id).toLowerCase().split(/[^a-z]+/).flatMap(token=>koreanTokens[token]?.split(' ')||[]))].join(' ');
const withoutExtension=file=>file.replace(/\.[^.]+$/,'');

async function pngDimensions(src){
 const bytes=await readFile(new URL('.'+src,root));
 if(bytes.length<24||bytes.toString('hex',0,8)!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')throw new Error(`Invalid PNG: ${src}`);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(!width||!height)throw new Error(`Invalid PNG dimensions: ${src}`);
 return{width,height};
}

const assets=catalog.map(c=>({id:c.id,name:c.title,group:'썸네일',kind:c.cat,src:`/assets/pixel/thumbnails/${c.id}.webp`,preview:`/assets/pixel/thumbnails/${c.id}-small.webp`,width:960,height:640,searchAliases:searchAliases(c.id)}));
for(const file of (await readdir(new URL('assets/pixel/portraits/',root))).filter(file=>file.endsWith('.webp')).sort())assets.push({id:'portraits/'+file,name:withoutExtension(file),group:'캐릭터 원화',kind:'portraits',src:`/assets/pixel/portraits/${file}`,width:384,height:384,searchAliases:searchAliases(file)});

const addPng=async({id,name,group,kind,src,rarity,aliases})=>assets.push({id,name,group,kind,...(rarity?{rarity}:{}),src,...await pngDimensions(src),searchAliases:aliases??searchAliases(id)});
const mirrorFiles=async group=>(await readdir(new URL(`assets/pixel/${group}/`,root))).filter(file=>file.endsWith('.svg')).map(withoutExtension).sort();
const illustratedFiles=async group=>(await readdir(new URL(`assets/pixel/illustrated/${group}/`,root))).filter(file=>file.endsWith('.png')).map(withoutExtension).sort();
async function verifyLegacyMirrors(group){for(const name of await mirrorFiles(group))await pngDimensions(`/assets/pixel/illustrated/${group}/${name}.png`);}

const worldNames={book:'마법책',boost:'부스트',coin:'동전',fuel:'연료',heart:'하트',lantern:'등불',star:'별',trophy:'우승 트로피','rhythm-drum':'리듬 북','spell-attack':'공격 주문','spell-heal':'회복 주문','tarot-back':'타로 카드 뒷면','tarot-back-purple':'보랏빛 타로 카드 뒷면','tarot-deck':'타로 카드 더미','tarot-fan':'펼친 타로 카드','tarot-pouch':'타로 카드 주머니','element-earth':'오행 · 토','element-fire':'오행 · 화','element-metal':'오행 · 금','element-water':'오행 · 수','element-wood':'오행 · 목','sort-left':'왼쪽 분류','sort-right':'오른쪽 분류','vehicle-basic':'시티 원 픽셀 차량','vehicle-sport':'스프린터 픽셀 차량','vehicle-touring':'롱런 픽셀 차량','vehicle-car':'도심 승용차 픽셀','vehicle-van':'도심 밴 픽셀','vehicle-truck':'도심 트럭 픽셀','vehicle-bus':'도심 버스 픽셀','runner-run-a':'러너 달리기 자세 A','runner-run-b':'러너 달리기 자세 B','runner-jump':'러너 점프 자세','runner-slide':'러너 슬라이드 자세','runner-dead':'러너 충돌 자세'};
const worldName=name=>{const tarot=name.match(/^tarot-(\d+)$/),tarotName=tarotCards[Number(tarot?.[1])]?.[0];if(tarotName)return`타로 · ${tarotName}`;const sort=name.match(/^sort-(white|blue|purple)-(normal|smile|cry)$/);if(sort)return`${{white:'흰색',blue:'파란색',purple:'보라색'}[sort[1]]} 분류 친구 · ${{normal:'기본 표정',smile:'웃는 표정',cry:'우는 표정'}[sort[2]]}`;return worldNames[name]||name;};
await verifyLegacyMirrors('world');
for(const name of await illustratedFiles('world'))await addPng({id:`world/${name}`,name:worldName(name),group:'게임·타로·오행',kind:'world',src:`/assets/pixel/illustrated/world/${name}.png`});

const rpgName=name=>{
 const creature=name.match(/^(monster|boss)-(\d{2})$/);
 if(creature){const species=RPG_MONSTER_NAMES_25[Number(creature[2])-1];return creature[1]==='boss'?`${species} 대장`:`${species}`;}
 const chest=name.match(/^chest-(sealed|(?:common|uncommon|rare|legend|divine)-(?:closed|open))$/);
 if(chest){if(chest[1]==='sealed')return '봉인된 보물상자';const [,rarity,state]=chest[1].match(/^([a-z]+)-(closed|open)$/);return `${rarityNames[rarity]} 상자 · ${state==='open'?'열림':'닫힘'}`;}
 return{hero:'기존 용사',battlefield:'숲속 전장','spell-attack':'공격 주문','spell-heal':'회복 주문'}[name]||name;
};
await verifyLegacyMirrors('rpg');
for(const name of await illustratedFiles('rpg'))await addPng({id:`rpg/${name}`,name:rpgName(name),group:'타이핑 전투·상자',kind:'rpg',src:`/assets/pixel/illustrated/rpg/${name}.png`});

for(const character of RPG_CHARACTERS)await addPng({id:`personas/${character.index}`,name:character.name,group:'모험 캐릭터 16종',kind:RPG_CHARACTER_TIERS[character.tier],src:`/assets/pixel/illustrated/personas/${character.index}.png`,aliases:`캐릭터 성향 ${character.id}`});
for(const item of rpgItems)await addPng({id:item.id,name:item.name,group:'장비 312종',kind:RPG_SLOTS[item.slot],rarity:rarityNames[item.rarity],src:`/assets/pixel/illustrated/items/${item.id}.png`});
for(const [index,name] of RPG_MONSTER_NAMES_25.entries()){const number=String(index+1).padStart(2,'0');await addPng({id:`species/${number}`,name,group:'몬스터 25종',kind:'species',src:`/assets/pixel/illustrated/monsters/${number}.png`,aliases:'몬스터 종족 전투'});}
for(const car of cityCars)await addPng({id:`vehicles/${car.id}`,name:car.name,group:'플레이 차량 8종',kind:'vehicle',src:car.art,aliases:`차량 자동차 ${car.design}`});
for(const [id,name] of Object.entries({car:'도심 승용차',van:'도심 밴',truck:'도심 트럭',bus:'도심 버스'}))await addPng({id:`traffic/${id}`,name,group:'교통 차량 4종',kind:'traffic',src:`/assets/pixel/illustrated/traffic/${id}.png`,aliases:'교통 차량 자동차'});

const manifest={
 version:'pixel-v11',
 copyright:'© 2026 DWINGUL',
 contact:{email:'poilkjmnb122@gmail.com',partnership:'mailto:poilkjmnb122@gmail.com?subject=%5BDWINGUL%5D%20%EC%A0%9C%ED%9C%B4%20%EB%AC%B8%EC%9D%98'},
 provenance:{rasterArtwork:'DWINGUL을 위해 만든 오리지널 생성 래스터 일러스트',equipmentVariants:'75개의 기본 일러스트에서 파생한 장비 변형 312종',equipmentBaseIllustrations:75,derivedEquipmentVariants:312},
 palette,
 assets,
};
await mkdir(new URL('artbook/',root),{recursive:true});
await writeFile(new URL('artbook/manifest.json',root),JSON.stringify(manifest,null,2));
await writeFile(new URL('artbook/index.html',root),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>뒹굴 픽셀 아트북</title><link rel="stylesheet" href="/css/pixel.css"><link rel="stylesheet" href="/css/artbook.css"><script type="module" src="/js/artbook.js"></script></head><body><main><a class="back" href="/#/explore">← 뒹굴로 돌아가기</a><header><small>DWINGUL · PIXEL ARTBOOK</small><h1>뒹굴의 작은 세계</h1><p>21가지 놀거리의 그림과 게임 안에서 만나는 친구·장비·카드를 모았어요.</p><div class="palette">${palette.map(color=>`<span style="background:${color}" aria-label="${color}"></span>`).join('')}</div></header><nav id="filters" aria-label="제작물 종류"></nav><label class="search">이름으로 찾기 <input type="search" id="search" placeholder="타로, 연필검, 몬스터…"></label><p id="count" role="status"></p><div id="gallery"></div><footer><p>오리지널 생성 래스터 일러스트 · 장비 312종은 기본 일러스트 75종에서 파생 · 글꼴: Galmuri (OFL)</p><p><span>© 2026 DWINGUL</span> · <a href="mailto:poilkjmnb122@gmail.com">poilkjmnb122@gmail.com</a> · <a href="mailto:poilkjmnb122@gmail.com?subject=%5BDWINGUL%5D%20%EC%A0%9C%ED%9C%B4%20%EB%AC%B8%EC%9D%98">제휴 문의</a> · <a href="https://github.com/Dunsmile/dwingul/tree/main/docs/design">제작 목록과 사용 안내</a></p></footer></main></body></html>`);
console.log(`Artbook: ${assets.length} assets`);
