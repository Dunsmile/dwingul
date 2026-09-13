import {CITY,vehicleLength,longitudinalOverlap,frontGap} from './city-engine.js';
export function cityProjection(height=630){return(lane,z)=>{const scale=35/Math.max(7,35+z);return{x:500+(lane-2)*164*scale,y:height*(.12+.55*scale),scale};};}
export function vehiclePassState(v){if(v.z+vehicleLength(v)/2<=-CITY.playerHalfLength)return 'passed';return longitudinalOverlap(v)?'alongside':'approaching';}
export function vehicleFootprint(v,project){const half=v.type==='bus'?CITY.busHalfWidth:CITY.carHalfWidth,len=vehicleLength(v)/2;return[[v.lane-half,v.z+len],[v.lane+half,v.z+len],[v.lane+half,v.z-len],[v.lane-half,v.z-len]].map(([lane,z])=>project(lane,z));}
export function laneTrafficState(vehicles,lane){if(vehicles.some(v=>v.lane===lane&&vehiclePassState(v)==='alongside'))return 'alongside';if(vehicles.some(v=>v.lane===lane&&frontGap(v)>0&&frontGap(v)<=CITY.evadeMax))return 'close';return 'clear';}
