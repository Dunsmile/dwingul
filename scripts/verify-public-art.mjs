// Read-only release smoke check. Never calls an API or creates a game/profile.
import assert from 'node:assert/strict';
const origin=new URL(process.env.PUBLIC_SITE||'https://dwingul.com');
const manifestResponse=await fetch(new URL('/artbook/manifest.json',origin),{cache:'no-store'});
assert.equal(manifestResponse.status,200);
const manifest=await manifestResponse.json();
assert.equal(manifest.version,'pixel-v10');
const paths=new Set(['/css/world.css','/js/art.js','/js/pixel-world.js','/artbook/']);
for(const asset of manifest.assets)for(const src of [asset.src,asset.preview].filter(Boolean)){
 assert.match(src,/^\/assets\/pixel\/[a-z0-9/-]+\.(svg|webp)$/);
 paths.add(src);
}
const queue=[...paths],failures=[];let checked=0;
await Promise.all(Array.from({length:10},async()=>{
 while(queue.length){const path=queue.shift();try{const response=await fetch(new URL(path,origin),{method:'HEAD',redirect:'follow'});if(response.status!==200)failures.push({path,status:response.status});}catch(error){failures.push({path,error:error.message});}checked++;}
}));
assert.deepEqual(failures,[]);
for(const id of ['typing','racing','tarot']){
 const response=await fetch(new URL(`/content/${id}/`,origin));assert.equal(response.status,200);
 const html=await response.text();assert.ok(html.includes(`/assets/pixel/thumbnails/${id}.webp`));
 assert.equal((html.match(/property="og:image"/g)||[]).length,1);
}
console.log(JSON.stringify({site:origin.origin,artwork:manifest.assets.length,checkedResources:checked,guides:3,failures},null,2));
