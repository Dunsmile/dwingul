import {createHash,randomBytes as cryptoRandomBytes} from 'node:crypto';
import {atomic} from '../lib/transaction.js';

export const LAUNCH_TRANSFER_TTL_MS=30*24*60*60*1000;

const digest=value=>createHash('sha256').update(value).digest('hex');
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};

function ensureSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS launch_transfers(
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK(used IN(0,1))
 )`);
}

function ticketFrom(bytes){
 const ticket=Buffer.from(bytes(32)).toString('base64url');
 if(!/^[A-Za-z0-9_-]{43}$/.test(ticket))throw Error('Launch transfer random source must return 32 bytes.');
 return ticket;
}

function validTicket(ticket){
 if(typeof ticket!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(ticket))return false;
 const decoded=Buffer.from(ticket,'base64url');
 return decoded.length===32&&decoded.toString('base64url')===ticket;
}

function mappedTicket(localTickets,userId){
 if(typeof userId!=='string'||!userId)return null;
 if(localTickets instanceof Map)return localTickets.get(userId)||null;
 return localTickets&&Object.hasOwn(localTickets,userId)?localTickets[userId]:null;
}

export function createLaunchTransfer(db,{localTickets={}}={}){
 ensureSchema(db);
 const get=(sql,...args)=>db.prepare(sql).get(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
 function localTicket(userId){
  const ticket=mappedTicket(localTickets,userId);
  if(!validTicket(ticket)||!get('SELECT 1 FROM users WHERE id=?',userId))return null;
  return{url:`https://dwingul.com/#/transfer/${ticket}`};
 }
 function claim(ticket){
  if(!validTicket(ticket))fail('이전 링크를 찾을 수 없어요.',404);
  return atomic(db,()=>{
   const row=get(`SELECT lt.user_id,lt.expires,lt.used,u.nickname,u.pin_hash
    FROM launch_transfers lt JOIN users u ON u.id=lt.user_id WHERE lt.token_hash=?`,digest(ticket));
   if(!row)fail('이전 링크를 찾을 수 없어요.',404);
   if(row.used)fail('이미 사용한 이전 링크예요.',409);
   if(Number(row.expires)<=Date.now())fail('이전 링크가 만료됐어요.',410);
   const secret=cryptoRandomBytes(24).toString('hex');
   run('UPDATE users SET token_hash=? WHERE id=?',digest(secret),row.user_id);
   run('UPDATE launch_transfers SET used=1 WHERE user_id=?',row.user_id);
   return{user:{id:row.user_id,nickname:row.nickname,configured:!!row.pin_hash},secret};
  });
 }
 return{localTicket,claim};
}

export function seedLaunchTransfers(db,{now=Date.now(),randomBytes=cryptoRandomBytes}={}){
 if(!Number.isSafeInteger(now)||now<0)throw Error('Launch transfer time must be a non-negative integer.');
 if(typeof randomBytes!=='function')throw Error('Launch transfer random source is required.');
 ensureSchema(db);
 const users=db.prepare('SELECT id FROM users ORDER BY id').all(),tickets={};
 return atomic(db,()=>{
  const upsert=db.prepare(`INSERT INTO launch_transfers(user_id,token_hash,expires,used) VALUES(?,?,?,0)
   ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,expires=excluded.expires,used=0`);
  for(const {id} of users){
   const ticket=ticketFrom(randomBytes);
   upsert.run(id,digest(ticket),now+LAUNCH_TRANSFER_TTL_MS);
   tickets[id]=ticket;
  }
  return tickets;
 });
}
