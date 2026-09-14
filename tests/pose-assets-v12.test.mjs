import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
test('69 camera poses ship separated, transparent and free of reserved chroma color',async()=>{
 const scenes=JSON.parse(await readFile(new URL('../design/scene-assets-v12.json',import.meta.url),'utf8'));
 const poses=scenes.filter(s=>/^(traffic-|player-|duel-)/.test(s.id));assert.equal(poses.length,69);
 const hashes=new Map();
 for(const s of poses){const file=new URL('../public'+s.src,import.meta.url),bytes=await readFile(file),meta=await sharp(bytes).metadata();assert.ok(meta.hasAlpha,s.id+' alpha');assert.ok(bytes.length<300000,s.id+' size');const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let clear=0,solid=0,key=0;for(let i=0;i<data.length;i+=4){if(data[i+3]===0)clear++;else{solid++;if(data[i]>240&&data[i+2]>240&&data[i+1]<20)key++;}}assert.ok(clear>info.width*info.height*.03,s.id+' isolated silhouette');assert.ok(solid>info.width*info.height*.1,s.id+' nonempty');assert.equal(key,0,s.id+' no chroma backing');hashes.set(s.id,createHash('sha256').update(bytes).digest('hex'));}
 for(const type of ['car','van','truck','bus'])assert.equal(new Set(['left-edge','left','front','right','right-edge'].map(view=>hashes.get('traffic-'+type+'-'+view))).size,5,type+' authored angles');
});
