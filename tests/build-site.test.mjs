import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/js/catalog.js';
import {buildSite,guides} from '../scripts/build-site.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

test('publication build creates crawlable pages and excludes server stores',async()=>{
  const result=await buildSite();
  assert.deepEqual({pages:result.pages,contents:result.contents},{pages:27,contents:21});

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
    intros.add(guides[item.id].intro);
  }
  assert.equal(intros.size,21,'각 콘텐츠는 고유한 안내문을 가져야 한다.');

  assert.equal(await readFile(path.join(dist,'ads.txt'),'utf8'),'google.com, pub-7301223136166743, DIRECT, f08c47fec0942fa0\n');
  const sitemap=await readFile(path.join(dist,'sitemap.xml'),'utf8');
  assert.equal((sitemap.match(/<url>/g)||[]).length,27);
  for (const page of ['about','privacy','terms','contact']) {
    const html=await readFile(path.join(dist,page,'index.html'),'utf8');
    assert.match(html,/type="module" src="\/js\/telemetry\.js"/);
    assert.match(html,new RegExp(`<link rel="canonical" href="https://dwingul.com/${page}/">`));
  }
});
