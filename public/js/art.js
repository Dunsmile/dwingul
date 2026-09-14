import {assetUrl,readyImage} from './asset-delivery.js';
import {catalog,esc} from './catalog.js';

const ids=new Set(catalog.map(c=>c.id));
const legacyIllustration=/^\/assets\/pixel\/(world|rpg|personas|items)\/([a-z0-9-]+)\.svg$/;
const illustratedPng=/^\/assets\/pixel\/illustrated\/(world|rpg|personas|items|monsters|vehicles|traffic)\/([a-z0-9-]+)\.png$/;
const retainedWebp=/^\/assets\/pixel\/(thumbnails|portraits)\/([a-z0-9-]+)\.webp$/;

export function isIllustratedPngPath(src){return typeof src==='string'&&illustratedPng.test(src);}

// Legacy SVG references remain the semantic fallback while the generated PNG is
// the preferred artwork. Only the known, local asset namespaces may be resolved.
export function primaryArtPath(src){
 if(isIllustratedPngPath(src))return src;
 const match=typeof src==='string'&&src.match(legacyIllustration);
 return match?`/assets/pixel/illustrated/${match[1]}/${match[2]}.png`:'';
}

export function artAssetSources(src){
 if(typeof src!=='string')return null;
 if(retainedWebp.test(src)||isIllustratedPngPath(src))return{primary:src,fallback:''};
 const primary=primaryArtPath(src);
 return primary?{primary,fallback:src}:null;
}

const safeClasses=value=>String(value).split(/\s+/).filter(name=>/^[a-z0-9_-]+$/i.test(name)).join(' ');
const fallbackAttr=sources=>sources.fallback?` data-fallback-src="${sources.fallback}"`:'';

export function thumbnail(c,{eager=false,small=false}={}){if(!c||!ids.has(c.id))return '';return `<span class="service-art" data-art="${c.id}"><span class="art-fallback" aria-hidden="true">${esc(c.glyph)}</span><img data-art-image src="/assets/pixel/thumbnails/${c.id}${small?'-small':''}.webp" ${small?'':`srcset="/assets/pixel/thumbnails/${c.id}-small.webp 480w, /assets/pixel/thumbnails/${c.id}.webp 960w" sizes="(max-width: 679px) calc(100vw - 32px), (max-width: 1199px) 42vw, 360px"`} width="960" height="640" alt="" loading="${eager?'eager':'lazy'}" decoding="async"></span>`;}

export function decorativeImage(src,{className='',frameClass='',width=32,height=32,fallback='✦',loading=''}={}){
 const sources=artAssetSources(src);if(!sources)return '';
 const w=Math.max(1,Math.round(Number(width)||32)),h=Math.max(1,Math.round(Number(height)||32)),load=loading==='lazy'||loading==='eager'?` loading="${loading}"`:'';
 return `<span class="decorative-image ${safeClasses(frameClass)}" data-decorative-frame><span class="decorative-image-fallback" aria-hidden="true">${esc(fallback)}</span><img data-decorative-image class="${safeClasses(className)}" src="${assetUrl(sources.primary)}"${fallbackAttr(sources)} width="${w}" height="${h}" alt=""${load} decoding="async"></span>`;
}

export function worldIcon(name,cls='world-icon'){
 if(!/^[a-z0-9-]+$/.test(name))return '';
 const sources=artAssetSources(`/assets/pixel/world/${name}.svg`);
 return `<img data-decorative-image class="${safeClasses(cls)}" src="${assetUrl(sources.primary)}"${fallbackAttr(sources)} width="32" height="32" alt="" decoding="async">`;
}

export const elementAsset={'목':'wood','화':'fire','토':'earth','금':'metal','수':'water'};

// The underlying semantic label stays visible if both the raster primary and
// its legacy fallback fail. The first error only swaps the source.
if(typeof document!=='undefined')document.addEventListener('error',event=>{
 const image=event.target;
 if(typeof HTMLImageElement==='undefined'||!(image instanceof HTMLImageElement))return;
 const fallback=image.hasAttribute('data-decorative-image')&&image.dataset.fallbackSrc;
 if(fallback&&image.getAttribute('src')!==fallback){delete image.dataset.fallbackSrc;image.src=fallback;return;}
 if(image.hasAttribute('data-art-image')){image.hidden=true;image.closest('.service-art')?.classList.add('is-unavailable');}
 if(image.hasAttribute('data-decorative-image')){image.hidden=true;image.closest('[data-decorative-frame]')?.classList.add('is-unavailable');}
},true);
