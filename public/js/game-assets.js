import {warmImage} from './asset-delivery.js';
import {rpgCharacter,rpgMonsterIndex} from './rpg-characters.js';
import {cityPlayerArtSource,cityTrafficRearSource} from './city-vehicle-art.js';
const scene=name=>`/assets/pixel/scenes/${name}.png`,world=name=>`/assets/pixel/illustrated/world/${name}.png`;
export function gameAssetSources(id,settings={}){
 let sources=[scene('paper-texture')];
 if(id==='sort')sources.push(scene('sort-lodge'),...['blue','white'].flatMap(c=>['normal','smile','cry'].map(f=>scene(`sort-v16-${c}-${f}`))),...['normal','smile','cry'].map(f=>world(`sort-purple-${f}`)));
 if(id==='jump')sources.push(world('heart'),...['jump-forest','jump-ground','jump-obstacle-short','jump-obstacle-wide','jump-obstacle-double','jump-obstacle-slide'].map(scene),...['runner','runner-run-b','runner-jump','runner-slide','runner-dead'].map(n=>`/assets/pixel/portraits/${n}.webp`));
 if(id==='racing')sources.push(...['city-village','road-texture','city-prop-tree','city-prop-cottage','city-prop-lamp','city-prop-shrub'].map(scene),...['coin','fuel','boost'].map(world),cityPlayerArtSource(settings.car||'basic'),...['car','van','truck','bus'].map(type=>cityTrafficRearSource(type)));
 if(['memory','numbers'].includes(id))sources.push(scene('memory-table'),scene('wood-token'),world('star'));
 if(id==='color')sources.push(scene('color-table'));
 if(id==='timing')sources.push(scene('timing-desk'));
 if(id==='typing')sources.push('/assets/pixel/illustrated/rpg/battlefield.png',scene(`duel-hero-${rpgCharacter(settings.characterId).index}`),scene(`duel-monster-${String(rpgMonsterIndex(settings.startStage||1)+1).padStart(2,'0')}`),'/assets/pixel/illustrated/rpg/spell-heal.png');
 return [...new Set(sources.filter(Boolean))];
}
export async function prepareGameAssets(id,settings,{signal,onProgress=()=>{}}={}){
 const sources=gameAssetSources(id,settings);let loaded=0;
 if(signal?.aborted)return {aborted:true,failed:[]};
 const abort=new Promise(resolve=>signal?.addEventListener('abort',()=>resolve({aborted:true,failed:[]}),{once:true}));
 const work=Promise.all(sources.map(async source=>{const ok=await warmImage(source);loaded++;if(!signal?.aborted)onProgress(loaded,sources.length);return ok?null:source;})).then(results=>({aborted:false,failed:results.filter(Boolean)}));
 return signal?Promise.race([work,abort]):work;
}
export function prefetchGameAssets(id,settings){if(!navigator.connection?.saveData)void prepareGameAssets(id,settings);}
