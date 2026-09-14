import {CITY,vehicleLength,longitudinalOverlap,frontGap} from './city-engine.js';
export function cityProjection(height=630){return(lane,z)=>{const scale=35/Math.max(7,35+z);return{x:500+(lane-2)*164*scale,y:height*(.12+.55*scale),scale};};}
export function vehiclePassState(v){if(v.z+vehicleLength(v)/2<=-CITY.playerHalfLength)return 'passed';return longitudinalOverlap(v)?'alongside':'approaching';}
export function vehicleFootprint(v,project,{player=false}={}){const half=player?CITY.playerHalfWidth:v.type==='bus'?CITY.busHalfWidth:CITY.carHalfWidth,len=(player?CITY.playerHalfLength*2:vehicleLength(v))/2;return[[v.lane-half,v.z+len],[v.lane+half,v.z+len],[v.lane+half,v.z-len],[v.lane-half,v.z-len]].map(([lane,z])=>project(lane,z));}
export function vehicleSpriteBox(v,project,{player=false}={}){
 const type=player?'car':v.type,shape={car:[102,116],van:[108,136],truck:[116,128],bus:[120,152]}[type]||[102,116];
 const center=project(v.lane,v.z),floor=vehicleFootprint(v,project,{player}),width=shape[0]*center.scale,height=shape[1]*center.scale,floorY=Math.max(...floor.map(point=>point.y));
 return{x:center.x-width/2,y:floorY-height*.88,width,height,floorY,length:player?CITY.playerHalfLength*2:vehicleLength(v),floor};
}
export function laneTrafficState(vehicles,lane){if(vehicles.some(v=>v.lane===lane&&vehiclePassState(v)==='alongside'))return 'alongside';if(vehicles.some(v=>v.lane===lane&&frontGap(v)>0&&frontGap(v)<=CITY.evadeMax))return 'close';return 'clear';}
