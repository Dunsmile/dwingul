import http from 'node:http';
import {readFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApiHandler} from './server/api.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const localData=existsSync(path.join(root,'data/live/dwingul.sqlite'))?'data/live':'data';
export function createApp({dbPath=path.join(root,localData,'dwingul.sqlite'),localTickets={}}={}){
 if(dbPath!==':memory:')mkdirSync(path.dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);
 const staticHandler=(req,res)=>{
  if(!['GET','HEAD'].includes(req.method))throw Object.assign(new Error('허용되지 않는 요청이에요.'),{status:405});
  let relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(relative==='/')relative='/index.html';
  let file;
  for(const directory of ['public','dist']){
   const base=path.join(root,directory);let candidate=path.resolve(base,'.'+relative);
   if(!candidate.startsWith(base+path.sep)||!existsSync(candidate))continue;
   if(statSync(candidate).isDirectory())candidate=path.join(candidate,'index.html');
   if(existsSync(candidate)&&statSync(candidate).isFile()){file=candidate;break;}
  }
  if(!file||file.endsWith('/_headers'))throw Object.assign(new Error('파일을 찾을 수 없어요.'),{status:404});
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
  const security=Object.fromEntries(readFileSync(path.join(root,'public/_headers'),'utf8').split('\n').filter(line=>line.startsWith('  ')).map(line=>{const i=line.indexOf(':');return [line.slice(0,i).trim(),line.slice(i+1).trim()];}));
  res.writeHead(200,{...security,'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':relative.startsWith('/assets/delivery/')?'public, max-age=31536000, immutable':'no-cache'});
  res.end(req.method==='HEAD'?undefined:readFileSync(file));
 };
 const server=http.createServer(createApiHandler(db,{localOnly:true,localTickets,staticHandler}));
 return {server,db,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve();}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server}=createApp(process.env.DW_DB?{dbPath:process.env.DW_DB}:{localTickets:existsSync(path.join(root,localData,'launch-tickets.json'))?JSON.parse(readFileSync(path.join(root,localData,'launch-tickets.json'),'utf8')):{}});const port=Number(process.env.PORT||4173);server.listen(port,'127.0.0.1',()=>console.log(`뒹굴 로컬 앱 http://localhost:${port}`));}
