import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {catalog} from '../public/js/catalog.js';
import {rpgItems,RPG_SLOTS,RPG_RARITIES} from '../public/js/rpg-items.js';
const root=new URL('../public/',import.meta.url);
const koreanTokens={tarot:'타로',monster:'몬스터',boss:'보스',hero:'영웅 용사',runner:'러너 달리기',vehicle:'차량 자동차',chest:'상자 보물상자',book:'책 마법책',element:'오행 원소',earth:'흙 토',fire:'불 화',metal:'쇠 금',water:'물 수',wood:'나무 목',battlefield:'전장',boost:'부스트',coin:'동전 코인',fuel:'연료',heart:'하트 체력',lantern:'등불 랜턴',sort:'분류 정리',spell:'마법 주문',attack:'공격',heal:'회복',star:'별',trophy:'트로피 우승',closed:'닫힘',open:'열림',sealed:'봉인',common:'일반',uncommon:'고급',rare:'희귀',legend:'전설',divine:'신화'};
const searchAliases=id=>[...new Set(String(id).toLowerCase().split(/[^a-z]+/).flatMap(token=>koreanTokens[token]?.split(' ')||[]))].join(' ');
async function svgDimensions(url){
 const source=await readFile(url,'utf8');
 const match=source.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
 if(!match)throw new Error(`SVG viewBox missing: ${url.pathname}`);
 return {width:Number(match[1]),height:Number(match[2])};
}
const assets=catalog.map(c=>({id:c.id,name:c.title,group:'썸네일',kind:c.cat,src:`/assets/pixel/thumbnails/${c.id}.webp`,preview:`/assets/pixel/thumbnails/${c.id}-small.webp`,width:960,height:640,searchAliases:searchAliases(c.id)}));
for(const file of (await readdir(new URL('assets/pixel/portraits/',root))).filter(f=>f.endsWith('.webp')).sort())assets.push({id:'portraits/'+file,name:file.replace('.webp',''),group:'캐릭터 원화',kind:'portraits',src:`/assets/pixel/portraits/${file}`,width:384,height:384,searchAliases:searchAliases(file)});
for(const dir of ['world','rpg','personas'])for(const file of (await readdir(new URL(`assets/pixel/${dir}/`,root))).filter(f=>f.endsWith('.svg')).sort()){
 const src=`/assets/pixel/${dir}/${file}`,dimensions=await svgDimensions(new URL('.'+src,root));
 assets.push({id:dir+'/'+file,name:file.replace('.svg',''),group:dir==='world'?'게임·타로·오행':dir==='rpg'?'타이핑 전투·상자':'성향 결과',kind:dir,src,...dimensions,searchAliases:searchAliases(file)});
}
for(const item of rpgItems)assets.push({id:item.id,name:item.name,group:'장비 312종',kind:RPG_SLOTS[item.slot],rarity:RPG_RARITIES.find(r=>r.id===item.rarity)?.name,src:`/assets/pixel/items/${item.id}.svg`,width:48,height:48});
await mkdir(new URL('artbook/',root),{recursive:true});
await writeFile(new URL('artbook/manifest.json',root),JSON.stringify({version:'pixel-v10',palette:['#fff8e8','#49382d','#405c3e','#91a877','#dfb665'],assets},null,2));
await writeFile(new URL('artbook/index.html',root),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>뒹굴 픽셀 아트북</title><link rel="stylesheet" href="/css/pixel.css"><link rel="stylesheet" href="/css/artbook.css"><script type="module" src="/js/artbook.js"></script></head><body><main><a class="back" href="/#/explore">← 뒹굴로 돌아가기</a><header><small>DWINGUL · PIXEL ARTBOOK</small><h1>뒹굴의 작은 세계</h1><p>21가지 놀거리의 그림과 게임 안에서 만나는 친구·장비·카드를 모았어요.</p><div class="palette">${['#fff8e8','#49382d','#405c3e','#91a877','#dfb665'].map(c=>`<span style="background:${c}" aria-label="${c}"></span>`).join('')}</div></header><nav id="filters" aria-label="제작물 종류"></nav><label class="search">이름으로 찾기 <input type="search" id="search" placeholder="타로, 연필검, 몬스터…"></label><p id="count" role="status"></p><div id="gallery"></div><footer>픽셀 일러스트: 뒹굴 전용 생성 이미지 · 아이템/인터페이스: 뒹굴 자체 SVG · 글꼴: Galmuri (OFL)<br><a href="https://github.com/Dunsmile/dwingul/tree/main/docs/design">제작 목록과 사용 안내</a></footer></main></body></html>`);
console.log(`Artbook: ${assets.length} assets`);
