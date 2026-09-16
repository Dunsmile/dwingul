import {DurableObject} from 'cloudflare:workers';
import {createApiHandler} from '../server/api.js';
import {durableSqlite} from './sqlite-adapter.js';

export class DwingulDatabase extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.env=env;this.db=durableSqlite(ctx.storage);this.handler=createApiHandler(this.db,{adminBootstrap:env.DW_ADMIN_BOOTSTRAP});}
 async fetch(request){
  const url=new URL(request.url);
  const req={url:url.pathname+url.search,origin:url.origin,method:request.method,headers:Object.fromEntries(request.headers),socket:{remoteAddress:request.headers.get('CF-Connecting-IP')||'unknown',encrypted:url.protocol==='https:'},async *[Symbol.asyncIterator](){yield await request.text();}};
  let status=200,headers={},result;
  const res={writeHead(s,h={}){status=s;headers=h;},end(body){result=new Response(body,{status,headers});}};
  await this.handler(req,res);return result||new Response('Internal error',{status:500});
 }
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.hostname==='www.dwingul.com'){url.hostname='dwingul.com';return Response.redirect(url.toString(),308);}
  if(url.pathname==='/api/health')return Response.json({ok:true,version:'0.9.0'},{headers:{'Cache-Control':'no-store'}});
  if(url.pathname.startsWith('/api/'))return env.DB.get(env.DB.idFromName('dwingul-main')).fetch(request);
  return env.ASSETS.fetch(request);
 }
};
