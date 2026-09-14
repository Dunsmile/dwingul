import {DELIVERY_ASSETS} from './asset-manifest.js';
export function assetUrl(source){return DELIVERY_ASSETS[source]?.url || source;}
const warmed=new Map(),decoded=new Map();
export function readyImage(source){return decoded.get(assetUrl(source))||null;}
// Decode, not only download: callers may begin their clock after this resolves.
export function warmImage(source,{timeoutMs=15000}={}){
 const url=assetUrl(source);if(typeof Image==='undefined')return Promise.resolve(false);
 if(warmed.has(url))return warmed.get(url);
 const pending=new Promise(resolve=>{const image=new Image();let settled=false;const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;if(!ok)warmed.delete(url);else decoded.set(url,image);resolve(ok);};const timer=setTimeout(()=>done(false),timeoutMs);image.decoding='async';image.onload=()=>{Promise.resolve(image.decode?.()).then(()=>done(image.naturalWidth>0),()=>done(false));};image.onerror=()=>done(false);image.src=url;});
 warmed.set(url,pending);return pending;
}
