import {assetUrl} from '../public/js/asset-delivery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {artAssetSources,decorativeImage,isIllustratedPngPath,primaryArtPath,worldIcon} from '../public/js/art.js';
import {rpgChestArtSources,rpgItemArtSources} from '../public/js/rpg-draw-dialog.js';
import {worldImageSources} from '../public/js/pixel-world.js';

test('known legacy SVG art resolves to a validated PNG primary and exact fallback',()=>{
 const cases=[
  ['/assets/pixel/world/book.svg','/assets/pixel/illustrated/world/book.png'],
  ['/assets/pixel/rpg/chest-divine-open.svg','/assets/pixel/illustrated/rpg/chest-divine-open.png'],
  ['/assets/pixel/personas/15.svg','/assets/pixel/illustrated/personas/15.png'],
  ['/assets/pixel/items/weapon-common-001.svg','/assets/pixel/illustrated/items/weapon-common-001.png'],
 ];
 for(const [legacy,primary] of cases){
  assert.equal(primaryArtPath(legacy),primary);
  assert.deepEqual(artAssetSources(legacy),{primary,fallback:legacy});
  assert.equal(isIllustratedPngPath(primary),true);
 }
 assert.deepEqual(artAssetSources('/assets/pixel/portraits/runner.webp'),{primary:'/assets/pixel/portraits/runner.webp',fallback:''});
});

test('art resolver rejects external, traversal, malformed, and unknown asset paths',()=>{
 for(const src of ['https://example.com/book.svg','/assets/pixel/world/../rpg/hero.svg','/assets/pixel/world/book.png','/assets/pixel/other/book.svg','/assets/pixel/illustrated/world/book.svg','/assets/pixel/illustrated/world/book.png?x=1']){
  assert.equal(primaryArtPath(src),'',src);
  assert.equal(artAssetSources(src),null,src);
 }
});

test('decorative markup advertises its raster primary and one legacy fallback',()=>{
 const image=decorativeImage('/assets/pixel/world/book.svg',{className:'book-icon bad/class',width:40,height:42});
 assert.ok(image.includes(`src="${assetUrl('/assets/pixel/illustrated/world/book.png')}"`));
 assert.match(image,/data-fallback-src="\/assets\/pixel\/world\/book\.svg"/);
 assert.match(image,/class="book-icon"/);
 assert.doesNotMatch(image,/bad\/class/);
 const icon=worldIcon('trophy');
 assert.ok(icon.includes(assetUrl('/assets/pixel/illustrated/world/trophy.png')));
 assert.match(icon,/data-fallback-src="\/assets\/pixel\/world\/trophy\.svg"/);
 assert.equal(worldIcon('../trophy'),'');
});

test('canvas and RPG draw consumers use the same primary/fallback contract',()=>{
 assert.deepEqual(worldImageSources('coin'),{primary:'/assets/pixel/illustrated/world/coin.png',fallback:'/assets/pixel/world/coin.svg'});
 assert.equal(worldImageSources('../coin'),null);
 assert.deepEqual(rpgChestArtSources('rare-open'),{primary:'/assets/pixel/illustrated/rpg/chest-rare-open.png',fallback:'/assets/pixel/rpg/chest-rare-open.svg'});
 assert.deepEqual(rpgItemArtSources({id:'armor-uncommon-014',image:'/assets/pixel/items/armor-uncommon-014.svg'}),{primary:'/assets/pixel/illustrated/items/armor-uncommon-014.png',fallback:'/assets/pixel/items/armor-uncommon-014.svg'});
 assert.deepEqual(rpgItemArtSources({id:'armor-uncommon-014',image:'https://example.com/tracker.png'}),{primary:'/assets/pixel/illustrated/items/armor-uncommon-014.png',fallback:'/assets/pixel/items/armor-uncommon-014.svg'});
 assert.equal(rpgItemArtSources({id:'../armor',image:'https://example.com/tracker.png'}),null);
});

test('canvas world image falls back once when the PNG cannot be decoded',()=>{
 const previousImage=globalThis.Image;
 class FakeImage{
  constructor(){this.listeners=new Map();this.attributes=new Map();}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  removeEventListener(type,listener){if(this.listeners.get(type)===listener)this.listeners.delete(type);}
  set src(value){this.attributes.set('src',value);}
  get src(){return this.attributes.get('src');}
  getAttribute(name){return this.attributes.get(name);}
  error(){this.listeners.get('error')?.();}
 }
 globalThis.Image=FakeImage;
 return import(`../public/js/pixel-world.js?fallback=${Date.now()}`).then(({worldImage})=>{
  const image=worldImage('heart');
  assert.equal(image.src,assetUrl('/assets/pixel/illustrated/world/heart.png'));
  image.error();
  assert.equal(image.src,'/assets/pixel/world/heart.svg');
  assert.equal(image.listeners.has('error'),false);
 }).finally(()=>{if(previousImage===undefined)delete globalThis.Image;else globalThis.Image=previousImage;});
});

test('decorative image error handling hides art only after its SVG fallback also fails',async()=>{
 const previousDocument=globalThis.document,previousHtmlImage=globalThis.HTMLImageElement;
 let onError;
 class FakeImage{
  constructor(decorative=true){this.dataset={fallbackSrc:'/assets/pixel/world/book.svg'};this.attributes=new Map([['src','/assets/pixel/illustrated/world/book.png']]);if(decorative)this.attributes.set('data-decorative-image','');this.frame={classes:new Set()};}
  getAttribute(name){return this.attributes.get(name);}
  hasAttribute(name){return this.attributes.has(name);}
  set src(value){this.attributes.set('src',value);}
  get src(){return this.attributes.get('src');}
  closest(selector){return selector==='[data-decorative-frame]'?{classList:{add:name=>this.frame.classes.add(name)}}:null;}
 }
 globalThis.document={addEventListener:(type,listener)=>{if(type==='error')onError=listener;}};
 globalThis.HTMLImageElement=FakeImage;
 try{
  await import(`../public/js/art.js?errors=${Date.now()}`);
  const image=new FakeImage();onError({target:image});
  assert.equal(image.src,'/assets/pixel/world/book.svg');
  assert.equal(image.hidden,undefined);
  onError({target:image});
  assert.equal(image.hidden,true);
  assert.equal(image.frame.classes.has('is-unavailable'),true);
  const locallyManaged=new FakeImage(false);onError({target:locallyManaged});
  assert.equal(locallyManaged.src,'/assets/pixel/illustrated/world/book.png');
  assert.equal(locallyManaged.dataset.fallbackSrc,'/assets/pixel/world/book.svg');
 }finally{
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  if(previousHtmlImage===undefined)delete globalThis.HTMLImageElement;else globalThis.HTMLImageElement=previousHtmlImage;
 }
});
