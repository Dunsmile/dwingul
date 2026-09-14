// Recent starts are local to the active profile; completed history can sync across devices.
export function recentServiceIds(catalog, ...histories) {
 const allowed=new Set(catalog.map(item=>item.id)),latest=new Map();
 for(const history of histories)for(const item of Array.isArray(history)?history:[]){
  if(!item||!allowed.has(item.content)||!Number.isFinite(item.at)||item.at<=0)continue;
  latest.set(item.content,Math.max(latest.get(item.content)||0,item.at));
 }
 return [...latest].sort((a,b)=>b[1]-a[1]).map(([id])=>id);
}
export function sortByRecent(catalog, ...histories) {
 const positions=new Map(recentServiceIds(catalog,...histories).map((id,index)=>[id,index]));
 return [...catalog].sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity));
}
export function rememberActivity(catalog, history, content, at=Date.now()) {
 if(!catalog.some(item=>item.id===content)||!Number.isFinite(at)||at<=0)return Array.isArray(history)?history:[];
 const source=[{content,at},...(Array.isArray(history)?history:[]).filter(item=>item?.content!==content)];
 const ids=recentServiceIds(catalog,source);
 return ids.map(id=>source.find(item=>item.content===id));
}
