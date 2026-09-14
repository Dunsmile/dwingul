// Read-only release smoke check. Never calls an API or creates a game/profile.
import assert from 'node:assert/strict';
const origin=new URL(process.env.PUBLIC_SITE||'https://dwingul.com');
const manifestResponse=await fetch(new URL('/artbook/manifest.json',origin),{cache:'no-store'});
assert.equal(manifestResponse.status,200);
const manifest=await manifestResponse.json();
assert.equal(manifest.version,'pixel-v13');
assert.equal(manifest.assets.length,615);
const paths=new Set(['/css/world.css','/css/scenes.css','/css/fortune.css','/js/art.js','/js/pixel-world.js','/js/scene-art.js','/js/city-vehicle-art.js','/js/fortune-analysis.js','/js/fortune-results.js','/artbook/','/css/delivery.css','/js/asset-delivery.js','/js/asset-manifest.js','/js/game-assets.js','/js/energy-test.js']);
for(const asset of manifest.assets)for(const src of [asset.src,asset.preview].filter(Boolean)){
 assert.match(src,/^\/assets\/pixel\/[a-z0-9/-]+\.(png|svg|webp)$/);
 paths.add(src);
}
const queue=[...paths],failures=[];let checked=0;
await Promise.all(Array.from({length:10},async()=>{
 while(queue.length){const path=queue.shift();try{const response=await fetch(new URL(path,origin),{method:'HEAD',redirect:'follow'});if(response.status!==200)failures.push({path,status:response.status});}catch(error){failures.push({path,error:error.message});}checked++;}
}));
assert.deepEqual(failures,[]);
const sitemapResponse=await fetch(new URL('/sitemap.xml',origin));
assert.equal(sitemapResponse.status,200);
const sitemap=await sitemapResponse.text();
const pages=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]).pathname);
assert.equal(pages.length,30);
assert.ok(!pages.some(path=>path.includes('sequence')));
const {DELIVERY_ASSETS}=await import('../public/js/asset-manifest.js');
const deliveryQueue=Object.values(DELIVERY_ASSETS);
await Promise.all(Array.from({length:10},async()=>{while(deliveryQueue.length){const asset=deliveryQueue.shift();const response=await fetch(new URL(asset.url,origin),{method:'HEAD'});assert.equal(response.status,200,asset.url);assert.match(response.headers.get('cache-control')||'',/max-age=31536000/);}}));
const titles=new Set();
for(const path of pages){
 const response=await fetch(new URL(path,origin));assert.equal(response.status,200,path);
 const html=await response.text();
 assert.ok(html.includes('© 2026 DWINGUL'),path);
 assert.ok(html.includes('mailto:poilkjmnb122@gmail.com'),path);
 assert.ok(html.includes(`rel="canonical" href="https://dwingul.com${path}"`),path);
 assert.equal((html.match(/property="og:image"/g)||[]).length,1);
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 assert.ok(title,path);assert.ok(!titles.has(title),`Duplicate title: ${title}`);titles.add(title);
}
const www=await fetch('https://www.dwingul.com/?v=play-v13',{redirect:'manual'});
assert.equal(www.status,308);assert.equal(www.headers.get('location'),'https://dwingul.com/?v=play-v13');
for(const path of ['/js/rpg-store.js','/js/garage-store.js']){
 const response=await fetch(new URL(path,origin));
 assert.equal(response.status,404,path);
}
console.log(JSON.stringify({site:origin.origin,version:manifest.version,artwork:manifest.assets.length,deliveryImages:Object.keys(DELIVERY_ASSETS).length,checkedResources:checked,crawlablePages:pages.length,uniqueTitles:titles.size,wwwRedirect:308,privateModules:404,failures},null,2));
