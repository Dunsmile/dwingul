// Decorative sprites never determine game rules or collision boxes.
import {artAssetSources} from './art.js';

const cache=new Map();

export function worldImageSources(name){return /^[a-z0-9-]+$/.test(name)?artAssetSources(`/assets/pixel/world/${name}.svg`):null;}

export function worldImage(name){
 const sources=worldImageSources(name);if(!sources)return null;
 if(!cache.has(name)){
  const image=new Image();
  const useFallback=()=>{if(sources.fallback&&image.getAttribute?.('src')!==sources.fallback){image.removeEventListener?.('error',useFallback);image.src=sources.fallback;}};
  image.addEventListener?.('error',useFallback);
  image.src=sources.primary;cache.set(name,image);
 }
 return cache.get(name);
}
export function drawWorldSprite(pen,name,x,y,width,height=width){const image=worldImage(name);if(!image?.complete||!image.naturalWidth)return false;pen.imageSmoothingEnabled=false;pen.drawImage(image,Math.round(x),Math.round(y),Math.round(width),Math.round(height));return true;}
export function preloadWorld(names){names.forEach(worldImage);}
// Scanline projection paints the same garage sprite on a car's world-space top.
// Its rear edge and bus length follow the existing perspective/collision geometry.
export function drawWorldQuad(pen,name,corners){
 const image=worldImage(name);if(!image?.complete||!image.naturalWidth)return false;
 const [a,b,c,d]=corners;const rows=24,lerp=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
 pen.save();pen.imageSmoothingEnabled=false;
 for(let i=0;i<rows;i++){const t=i/rows,next=(i+1)/rows,l=lerp(a,d,t),r=lerp(b,c,t),ln=lerp(a,d,next),rn=lerp(b,c,next);const stepX=((ln.x-l.x)+(rn.x-r.x))/2,stepY=((ln.y-l.y)+(rn.y-r.y))/2;pen.save();pen.transform((r.x-l.x)/24,(r.y-l.y)/24,stepX,stepY,l.x,l.y);pen.drawImage(image,4,4+i*27/rows,24,27/rows,0,0,24,1.06);pen.restore();}
 pen.restore();return true;
}
const portraitCache=new Map();
const portraits=new Set(['runner','runner-run-b','runner-jump','runner-slide','runner-dead']);
export function portraitImage(name){if(!portraits.has(name))return null;if(!portraitCache.has(name)){const image=new Image();image.src='/assets/pixel/portraits/'+name+'.webp';portraitCache.set(name,image);}return portraitCache.get(name);}
export function drawPortraitSprite(pen,name,x,y,width,height=width){const image=portraitImage(name);if(!image?.complete||!image.naturalWidth)return false;const box=name==='runner-slide'?[.09,.25,.82,.53]:name==='runner-dead'?[.05,.12,.90,.82]:name==='runner-jump'||name==='runner-run-b'?[.04,.05,.92,.91]:[.06,.08,.88,.88];pen.imageSmoothingEnabled=false;pen.drawImage(image,image.naturalWidth*box[0],image.naturalHeight*box[1],image.naturalWidth*box[2],image.naturalHeight*box[3],Math.round(x),Math.round(y),Math.round(width),Math.round(height));return true;}
export function pixelPanel(pen,x,y,w,h,fill='#fff1d3'){pen.fillStyle='#49382d';pen.fillRect(x+4,y+4,w,h);pen.fillStyle=fill;pen.fillRect(x,y,w,h);pen.strokeStyle='#49382d';pen.lineWidth=3;pen.strokeRect(x,y,w,h);}
