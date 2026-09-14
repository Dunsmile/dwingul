import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/js/catalog.js';
import {discoveryCategories,searchMetadata} from '../public/js/search-metadata.js';
import {buildSite,guides} from '../scripts/build-site.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const origin='https://dwingul.com';
const contactEmail='poilkjmnb122@gmail.com';
const pagePaths=[
  '/', '/content/',
  ...Object.keys(discoveryCategories).map(id=>`/content/category/${id}/`),
  ...catalog.map(item=>`/content/${item.id}/`),
  '/about/', '/privacy/', '/terms/', '/contact/',
];
const diskPath=pathname=>pathname==='/'?path.join(dist,'index.html'):path.join(dist,pathname.slice(1),'index.html');
const matchOne=(html,pattern,label)=>{const matches=[...html.matchAll(pattern)];assert.equal(matches.length,1,`${label} must appear exactly once`);return matches[0][1];};
const structuredData=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
const hasType=(value,type)=>JSON.stringify(value).includes(`"@type":"${type}"`);

test('publication build creates crawlable pages and excludes server stores',async()=>{
  const result=await buildSite();
  assert.deepEqual({pages:result.pages,contents:result.contents},{pages:31,contents:21});

  await assert.rejects(stat(path.join(dist,'js/rpg-store.js')),{code:'ENOENT'});
  await assert.rejects(stat(path.join(dist,'js/garage-store.js')),{code:'ENOENT'});

  const home=await readFile(path.join(dist,'index.html'),'utf8');
  assert.match(home,/<main class="seo-home"/);
  assert.match(home,/<link rel="canonical" href="https:\/\/dwingul\.com\/">/);
  assert.match(home,/name="google-adsense-account" content="ca-pub-7301223136166743"/);
  assert.match(home,/class="guide-thumb static-art-fallback"/);
  assert.match(home,/property="og:image" content="https:\/\/dwingul\.com\/assets\/pixel\/thumbnails\/sort\.webp"/);

  const index=await readFile(path.join(dist,'content/index.html'),'utf8');
  assert.ok(index.includes('<h1>놀거리 가이드</h1>'));
  for(const id of Object.keys(discoveryCategories))assert.ok(index.includes(`href="/content/category/${id}/"`));
  for(const item of catalog)assert.ok(index.includes('href="/content/'+item.id+'/"'));
  const intros=new Set();
  for (const item of catalog) {
    const html=await readFile(path.join(dist,'content',item.id,'index.html'),'utf8');
    assert.ok(html.includes(`<h1>${item.title}</h1>`));
    assert.match(html,new RegExp(`href="/#/detail/${item.id}"`));
    assert.match(html,/type="module" src="\/js\/telemetry\.js"/);
    assert.match(html,/class="guide-cover static-art-fallback"/);
    assert.match(html,new RegExp(`property="og:image" content="https://dwingul\\.com/assets/pixel/thumbnails/${item.id}\\.webp"`));
    assert.match(html,/<h2>기록과 결과 읽기<\/h2>/);
    assert.equal((html.match(/<article><h3>/g)||[]).length,3);
    assert.ok(html.includes(`href="/content/category/${item.cat}/"`));
    const data=structuredData(html);
    assert.equal(data.length,1);
    assert.ok(hasType(data,'WebPage'));
    assert.ok(hasType(data,'WebApplication'));
    assert.ok(hasType(data,'BreadcrumbList'));
    intros.add(guides[item.id].intro);
  }
  assert.equal(intros.size,21,'각 콘텐츠는 고유한 안내문을 가져야 한다.');

  assert.match(guides.racing.faq.flat().join(' '),/초당 0\.5칸/);
  assert.match(guides.racing.scoring,/충돌[^.]*연료/);
  assert.match(guides.racing.faq.flat().join(' '),/차량마다 50~200토큰/);
  assert.match(guides.sequence.intro,/세 레인/);
  assert.match(guides.sequence.faq.flat().join(' '),/왼쪽.*가운데.*오른쪽/);
  assert.match(guides.jump.scoring,/같은 이동 거리 축/);
  assert.match(guides.jump.scoring,/이동 속도가 빨라질수록.*시간 간격/);
  assert.match(guides.typing.intro,/16종/);
  assert.match(guides.typing.intro,/25종/);
  assert.match(guides.typing.faq.flat().join(' '),/전투 능력치에 영향/);
  assert.match(guides.shop.scoring,/16가지.*주·보조/);
  assert.equal(Object.keys(searchMetadata).length,21);
  const currentGuides=Object.fromEntries(await Promise.all(['racing','sequence','jump','typing','shop'].map(async id=>[id,await readFile(path.join(dist,'content',id,'index.html'),'utf8')])));
  assert.match(currentGuides.racing,/초당 0\.5칸/);
  assert.match(currentGuides.racing,/0\.9초 동안 보호/);
  assert.match(currentGuides.racing,/8종 차량/);
  assert.doesNotMatch(currentGuides.racing,/초당 2칸|모든 차량.{0,8}50토큰/);
  assert.match(currentGuides.sequence,/세 레인/);
  assert.match(currentGuides.sequence,/왼쪽은 ←·A/);
  assert.match(currentGuides.jump,/같은 이동 거리 축/);
  assert.match(currentGuides.typing,/25종 몬스터/);
  assert.match(currentGuides.typing,/16종 캐릭터/);
  assert.match(currentGuides.shop,/주 스타일과 보조 스타일을 조합한 16가지 유형/);

  const titles=new Set(),descriptions=new Set();
  for(const pathname of pagePaths){
    const html=await readFile(diskPath(pathname),'utf8');
    const canonical=matchOne(html,/<link rel="canonical" href="([^"]+)">/g,`${pathname} canonical`);
    const title=matchOne(html,/<title>([^<]+)<\/title>/g,`${pathname} title`);
    const description=matchOne(html,/<meta name="description" content="([^"]+)">/g,`${pathname} description`);
    assert.equal(canonical,new URL(pathname,origin).href);
    assert.ok(title.length>=8&&description.length>=40,`${pathname} metadata should be descriptive`);
    titles.add(title);descriptions.add(description);
    assert.match(html,new RegExp(`>${contactEmail.replaceAll('.', '\\.')}<`));
    assert.match(html,/© 2026 DWINGUL/);
    assert.doesNotMatch(html,/Dunsmile\/dwingul\/issues|AggregateRating|ratingValue|reviewCount/);
    const data=structuredData(html);
    assert.ok(data.length>=1,`${pathname} needs structured data`);
    assert.ok(hasType(data,'WebPage'),`${pathname} needs a WebPage entity`);
    if(pathname!=='/')assert.ok(hasType(data,'BreadcrumbList'),`${pathname} needs breadcrumbs`);
  }
  assert.equal(titles.size,31,'31개 정식 주소의 제목이 모두 달라야 한다.');
  assert.equal(descriptions.size,31,'31개 정식 주소의 설명이 모두 달라야 한다.');

  for(const [id] of Object.entries(discoveryCategories)){
    const html=await readFile(path.join(dist,'content','category',id,'index.html'),'utf8');
    for(const item of catalog.filter(candidate=>candidate.cat===id))assert.ok(html.includes(`href="/content/${item.id}/"`));
  }

  assert.equal(await readFile(path.join(dist,'ads.txt'),'utf8'),'google.com, pub-7301223136166743, DIRECT, f08c47fec0942fa0\n');
  const sitemap=await readFile(path.join(dist,'sitemap.xml'),'utf8');
  assert.equal((sitemap.match(/<url>/g)||[]).length,31);
  for (const page of ['about','privacy','terms','contact']) {
    const html=await readFile(path.join(dist,page,'index.html'),'utf8');
    assert.match(html,/type="module" src="\/js\/telemetry\.js"/);
    assert.match(html,new RegExp(`<link rel="canonical" href="https://dwingul.com/${page}/">`));
  }
});
