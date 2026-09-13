import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createLaunchTransfer,LAUNCH_TRANSFER_TTL_MS,seedLaunchTransfers} from '../server/launch-transfer.js';
import {durableSqlite} from '../workers/sqlite-adapter.js';

const hash=value=>createHash('sha256').update(value).digest('hex');

function schema(db){
 db.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE users(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE,nickname TEXT DEFAULT '뒹굴러',pin_hash TEXT,salt TEXT,recovery_hash TEXT);
  CREATE TABLE rpg_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),gold INTEGER NOT NULL DEFAULT 0,best_cleared INTEGER NOT NULL DEFAULT 0,equipped TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE rpg_inventory(user_id TEXT REFERENCES users(id),item_id TEXT,quantity INTEGER NOT NULL DEFAULT 1,enhancement INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,item_id));`);
}

function deterministicBytes(){let value=0;return size=>Buffer.alloc(size,++value);}

function errorStatus(status){return error=>error?.status===status&&typeof error.message==='string'&&/[가-힣]/.test(error.message);}

function durableFixture(){
 const sqlite=new DatabaseSync(':memory:');
 const cursor=rows=>({toArray:()=>rows,one:()=>{if(rows.length!==1)throw Error('one row expected');return rows[0];}});
 const storage={
  sql:{exec(statement,...bindings){const query=statement.trim();if(!bindings.length&&query.includes(';')){sqlite.exec(statement);return cursor([]);}if(/^(?:SELECT|PRAGMA|WITH|EXPLAIN)\b/i.test(query))return cursor(sqlite.prepare(statement).all(...bindings));if(bindings.length)sqlite.prepare(statement).run(...bindings);else sqlite.exec(statement);return cursor([]);}},
  transactionSync(callback){sqlite.exec('BEGIN IMMEDIATE');try{const result=callback();sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}
 };
 return{sqlite,db:durableSqlite(storage)};
}

test('snapshot seeding covers every existing user and local links require a mapped identity',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  schema(db);
  db.exec(`INSERT INTO users(id,token_hash,nickname) VALUES
   ('guest-rpg','old-rpg','RPG 손님'),('guest-empty','old-empty','빈 손님'),('guest-history','old-history','기록 손님');
   INSERT INTO rpg_profiles(user_id,gold) VALUES('guest-rpg',350);
   INSERT INTO rpg_inventory(user_id,item_id,quantity,enhancement) VALUES('guest-rpg','attack-common',2,1);`);
  const now=1_800_000_000_000,localTickets=seedLaunchTransfers(db,{now,randomBytes:deterministicBytes()});
  assert.deepEqual(Object.keys(localTickets).sort(),['guest-empty','guest-history','guest-rpg']);
  for(const ticket of Object.values(localTickets))assert.match(ticket,/^[A-Za-z0-9_-]{43}$/);
  const rows=db.prepare('SELECT user_id,token_hash,expires,used FROM launch_transfers ORDER BY user_id').all();
  assert.equal(rows.length,3);assert.ok(rows.every(row=>row.expires===now+LAUNCH_TRANSFER_TTL_MS&&row.used===0));
  assert.ok(rows.every(row=>row.token_hash===hash(localTickets[row.user_id])));
  const transfer=createLaunchTransfer(db,{localTickets});
  assert.deepEqual(transfer.localTicket('guest-rpg'),{url:`https://dwingul.com/#/transfer/${localTickets['guest-rpg']}`});
  assert.equal(transfer.localTicket('guest-other'),null);assert.equal(transfer.localTicket(),null);
  assert.equal(createLaunchTransfer(db).localTicket('guest-rpg'),null,'runtime module does not mint or recover ticket secrets');
 }finally{db.close();}
});

test('a valid launch ticket preserves identity and RPG items while rotating the session once',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  schema(db);db.exec("INSERT INTO users(id,token_hash,nickname) VALUES('guest-1','old-session','초기 손님'); INSERT INTO rpg_profiles(user_id,gold,best_cleared,equipped) VALUES('guest-1',420,13,'{\"attack\":\"attack-common\"}'); INSERT INTO rpg_inventory(user_id,item_id,quantity,enhancement) VALUES('guest-1','attack-common',3,2)");
  const tickets=seedLaunchTransfers(db,{now:Date.now(),randomBytes:deterministicBytes()}),transfer=createLaunchTransfer(db),claimed=transfer.claim(tickets['guest-1']);
  assert.deepEqual(claimed.user,{id:'guest-1',nickname:'초기 손님',configured:false});assert.match(claimed.secret,/^[a-f0-9]{48}$/);
  assert.equal(db.prepare('SELECT token_hash FROM users WHERE id=?').get('guest-1').token_hash,hash(claimed.secret));
  assert.deepEqual({...db.prepare('SELECT item_id,quantity,enhancement FROM rpg_inventory WHERE user_id=?').get('guest-1')},{item_id:'attack-common',quantity:3,enhancement:2});
  assert.equal(db.prepare('SELECT used FROM launch_transfers WHERE user_id=?').get('guest-1').used,1);
  assert.throws(()=>transfer.claim(tickets['guest-1']),errorStatus(409));
 }finally{db.close();}
});

test('invalid and expired tickets return distinct statuses without mutating the user',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  schema(db);db.exec("INSERT INTO users(id,token_hash,nickname) VALUES('guest-1','unchanged','손님')");
  const tickets=seedLaunchTransfers(db,{now:Date.now(),randomBytes:deterministicBytes()}),transfer=createLaunchTransfer(db);
  assert.throws(()=>transfer.claim('too-short'),errorStatus(404));
  assert.throws(()=>transfer.claim('z'.repeat(43)),errorStatus(404));
  assert.deepEqual({...db.prepare('SELECT token_hash FROM users WHERE id=?').get('guest-1')},{token_hash:'unchanged'});
  assert.equal(db.prepare('SELECT used FROM launch_transfers WHERE user_id=?').get('guest-1').used,0);
  db.prepare('UPDATE launch_transfers SET expires=? WHERE user_id=?').run(Date.now()-1,'guest-1');
  assert.throws(()=>transfer.claim(tickets['guest-1']),errorStatus(410));
  assert.equal(db.prepare('SELECT token_hash FROM users WHERE id=?').get('guest-1').token_hash,'unchanged');
  assert.equal(db.prepare('SELECT used FROM launch_transfers WHERE user_id=?').get('guest-1').used,0);
 }finally{db.close();}
});

test('claim rolls back a session rotation when marking the ticket used fails',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  schema(db);db.exec("INSERT INTO users(id,token_hash) VALUES('guest-1','before')");
  const tickets=seedLaunchTransfers(db,{now:Date.now(),randomBytes:deterministicBytes()});
  db.exec("CREATE TRIGGER stop_launch_claim BEFORE UPDATE OF used ON launch_transfers BEGIN SELECT RAISE(ABORT,'stop'); END");
  assert.throws(()=>createLaunchTransfer(db).claim(tickets['guest-1']),/stop/);
  assert.equal(db.prepare('SELECT token_hash FROM users WHERE id=?').get('guest-1').token_hash,'before');
  assert.equal(db.prepare('SELECT used FROM launch_transfers WHERE user_id=?').get('guest-1').used,0);
 }finally{db.close();}
});

test('launch tickets use the Durable Object synchronous transaction boundary',()=>{
 const {sqlite,db}=durableFixture();
 try{
  schema(db);db.prepare('INSERT INTO users(id,token_hash,nickname,pin_hash) VALUES(?,?,?,?)').run('durable-guest','before','DO 손님','configured');
  const tickets=seedLaunchTransfers(db,{now:Date.now(),randomBytes:deterministicBytes()}),claimed=createLaunchTransfer(db).claim(tickets['durable-guest']);
  assert.equal(claimed.user.id,'durable-guest');assert.equal(claimed.user.configured,true);assert.match(claimed.secret,/^[a-f0-9]{48}$/);
  assert.equal(sqlite.prepare('SELECT used FROM launch_transfers WHERE user_id=?').get('durable-guest').used,1);
 }finally{sqlite.close();}
});
