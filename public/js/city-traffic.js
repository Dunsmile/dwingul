// A distance-axis reachability check retains a route with time to plan each lane change.
export const trafficLength = vehicle => ({car:4,van:5,truck:6,bus:8}[vehicle.type]||4);
export function hasTrafficPath(vehicles,{startLane=2,maxSpeed=126,horizon=270}={}) {
  const step=2, cooldown=Math.ceil(maxSpeed*.20/step);
  let states=new Set([Math.max(0,Math.min(4,Math.round(startLane)))*(cooldown+1)]);
  const blocked=(lane,z)=>vehicles.some(v=>v.lane===lane&&Math.abs(v.z-z)<trafficLength(v)/2+2.5);
  for(let z=0;z<=horizon;z+=step){
    const next=new Set();
    for(const encoded of states){const lane=Math.floor(encoded/(cooldown+1)),wait=encoded%(cooldown+1);
      if(blocked(lane,z))continue;
      next.add(lane*(cooldown+1)+Math.max(0,wait-1));
      if(!wait)for(const direction of [-1,1]){const to=lane+direction;if(to>=0&&to<5&&!blocked(to,z)&&!blocked(to,z+step))next.add(to*(cooldown+1)+cooldown);}
    }
    if(!next.size)return false;states=next;
  }
  return true;
}
export function trafficCandidate(random,z) { const roll=random();return {lane:Math.floor(random()*5),z,type:roll<.2?'bus':roll<.36?'truck':roll<.50?'van':'car'}; }
