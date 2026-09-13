// One-use, secret-protected release migration. Disabled unless MIGRATION_KEY exists.
import {timingSafeEqual,createHash} from 'node:crypto';
const tableOrder=['users','launch_transfers','runs','records','groups','members','group_records','shares','racing_wallet','run_rewards','rpg_profiles','rpg_inventory','rpg_draws','rpg_draw_batches','rpg_progress','profile_details','private_history','personal_bests'];
const digest=s=>createHash('sha256').update(s).digest();
export async function importSnapshot(request,env,db){
 if(!env.MIGRATION_KEY||request.method!=='POST'||!timingSafeEqual(digest(request.headers.get('authorization')||''),digest('Bearer '+env.MIGRATION_KEY)))return new Response('Not found',{status:404});
 if(Number(request.headers.get('content-length')||0)>10*1024*1024)return new Response('Too large',{status:413});
 db.exec('CREATE TABLE IF NOT EXISTS release_imports(id TEXT PRIMARY KEY,created INTEGER)');
 if(db.prepare('SELECT id FROM release_imports').get())return Response.json({error:'Import already completed'},{status:409});
 const raw=await request.text();if(raw.length>10*1024*1024)return new Response('Too large',{status:413});
 let snapshot;try{snapshot=JSON.parse(raw);}catch{return new Response('Bad format',{status:400});}
 const tables=snapshot.tables;if(snapshot.version!==1||!tables||Object.keys(tables).some(t=>!tableOrder.includes(t)))return new Response('Bad snapshot',{status:400});
 try{
 const counts=db.transactionSync(()=>{
  const out={};
  for(const table of tableOrder){
   const rows=tables[table];if(!rows)continue;
   const allowed=db.prepare('PRAGMA table_info('+table+')').all().map(x=>x.name);
   if(!allowed.length||!Array.isArray(rows)||rows.length>50000)throw Error('Invalid table');
   for(const row of rows){const keys=Object.keys(row);if(!keys.length||keys.some(k=>!allowed.includes(k)))throw Error('Invalid columns');db.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));}
   out[table]=rows.length;
  }
  db.prepare('INSERT INTO release_imports VALUES(?,?)').run('v9-initial',Date.now());return out;
 });return Response.json({ok:true,counts});
 }catch{return Response.json({error:'Snapshot import failed; no changes saved.'},{status:409});}
}
