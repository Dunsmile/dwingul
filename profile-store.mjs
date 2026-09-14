import lunar from 'lunar-javascript';
import {normalizeBirth} from './public/js/profile-fields.js';
import {byId} from './public/js/catalog.js';
import {PERSONALITY_TEST_VERSION,personalityTests} from './public/js/personality-tests.js';
import {atomic} from './lib/transaction.js';
export function createProfileStore(db,fail){
 db.exec(`CREATE TABLE IF NOT EXISTS profile_details(user_id TEXT PRIMARY KEY REFERENCES users(id),birth TEXT,updated INTEGER);
 CREATE TABLE IF NOT EXISTS private_history(user_id TEXT REFERENCES users(id),id TEXT,content TEXT,payload TEXT,created INTEGER,PRIMARY KEY(user_id,id));
 CREATE TABLE IF NOT EXISTS personal_bests(user_id TEXT REFERENCES users(id),content TEXT,mode TEXT,value REAL,payload TEXT,PRIMARY KEY(user_id,content,mode));`);
 const get=(s,...a)=>db.prepare(s).get(...a),all=(s,...a)=>db.prepare(s).all(...a),run=(s,...a)=>db.prepare(s).run(...a);
 const requireProfile=u=>{if(!u.pin_hash)fail('먼저 뒹굴 프로필을 만들어주세요.');};
 function state(u){return {birth:u.pin_hash?JSON.parse(get('SELECT birth FROM profile_details WHERE user_id=?',u.id)?.birth||'null'):null,history:u.pin_hash?all('SELECT payload FROM private_history WHERE user_id=? ORDER BY created DESC,id DESC LIMIT 100',u.id).map(x=>JSON.parse(x.payload)):[],bests:u.pin_hash?all('SELECT payload FROM personal_bests WHERE user_id=? ORDER BY content,mode',u.id).map(x=>JSON.parse(x.payload)):[]};}
 function saveBirth(u,data){requireProfile(u);let birth;try{birth=normalizeBirth(data);const [y,m,d]=birth.birthday.split('-').map(Number),[h,n]=(birth.time||'12:00').split(':').map(Number);const solar=birth.calendar==='solar'?lunar.Solar.fromYmdHms(y,m,d,h,n,0):lunar.Lunar.fromYmdHms(y,birth.calendar==='leap'?-m:m,d,h,n,0).getSolar();if(solar.toYmd()>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}))throw Error('미래의 생일은 입력할 수 없어요.');}catch(e){fail(e.message||'생년월일을 확인해주세요.');}run('INSERT INTO profile_details VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET birth=excluded.birth,updated=excluded.updated',u.id,JSON.stringify(birth),Date.now());return {birth};}
 const text=(v,max=200)=>String(v??'').slice(0,max);
 function cleanPersonality(r,out){
  if(r.testVersion)out.testVersion=text(r.testVersion,30);
  if(r.testVersion!==PERSONALITY_TEST_VERSION)return;
  const definition=personalityTests[r.content],sourceAxes=r.personality?.axes;
  if(!definition||!sourceAxes||typeof sourceAxes!=='object')fail('성향 검사 결과를 확인해주세요.');
  const axes={};let code='';
  for(const axis of definition.axes){
   const source=sourceAxes[axis.id],selected=axis.poles.find(pole=>pole.code===source?.code),score=Number(source?.score);
   if(!selected||!Number.isFinite(score))fail('성향 검사 결과를 확인해주세요.');
   const cleanScore=Math.max(-3,Math.min(3,Math.round(score)));
   code+=selected.code;
   axes[axis.id]={label:axis.label,code:selected.code,name:selected.name,score:cleanScore,normalized:cleanScore/3,counts:Object.fromEntries(axis.poles.map(pole=>[pole.code,Math.max(0,Math.min(3,Math.round(Number(source.counts?.[pole.code])||0)))]))};
  }
  out.personality={code,axes};
  out.scores=definition.axes.map(axis=>axes[axis.id].score);
  if(/^\/assets\/pixel\/personas\/(?:[0-9]|1[0-5])\.svg$/.test(r.sprite||''))out.sprite=r.sprite;
 }
 function cleanResult(r){
  if(!r||!byId(r.content)||!/^[a-zA-Z0-9:_-]{1,100}$/.test(r.id||''))fail('저장할 결과를 확인해주세요.');
  const at=Number(r.at);if(!Number.isSafeInteger(at)||at<0||at>Date.now()+60000)fail('기록 시간을 확인해주세요.');
  const out={id:r.id,content:r.content,at,title:text(r.title),name:text(r.name,12),subtitle:text(r.subtitle,300),display:text(r.display,200),unit:text(r.unit,20),mode:text(r.mode,60),element:text(r.element,10),category:text(r.category,24),questionVersion:text(r.questionVersion,30)};
  if(Number.isFinite(r.value)&&r.value>=0&&r.value<=1000000){out.value=r.value;out.higherBetter=!['reaction','timing','numbers'].includes(r.content);}
  if(Array.isArray(r.sections))out.sections=r.sections.slice(0,12).filter(x=>Array.isArray(x)&&x.length===2).map(x=>x.map(v=>text(v,1400)));
  if(Array.isArray(r.answers))out.answers=r.answers.slice(0,20).map(x=>Number.isInteger(x)?x:0);
  if(Array.isArray(r.scores))out.scores=r.scores.slice(0,8).map(x=>Math.min(100,Math.max(0,Number(x)||0)));
  cleanPersonality(r,out);
  if(Array.isArray(r.business))out.business=r.business.slice(0,4).map(x=>({name:text(x.name,40),count:Math.max(0,Math.min(12,Number(x.count)||0)),percent:Math.max(0,Math.min(100,Number(x.percent)||0))}));
  // A private saved result excludes raw birth fields, run credentials, input replays and inventory snapshots.
  out.details={};for(const key of ['target','stoppedSeconds','best','bestMs','accuracy','maxCombo','roundsCompleted','perfect','good','misses','currentStage','stage','defeated','gold','coins','distance'])if(Number.isFinite(r.details?.[key]))out.details[key]=r.details[key];
  if(r.details?.reason)out.details.reason=text(r.details.reason,30);
  if(r.gameSettings){out.gameSettings={};for(const key of ['version','mode','car','startStage','sentenceMode'])if(['string','number'].includes(typeof r.gameSettings[key]))out.gameSettings[key]=typeof r.gameSettings[key]==='string'?text(r.gameSettings[key],50):r.gameSettings[key];}
  if(r.birth&&Array.isArray(r.birth.pillars)){const b=r.birth;out.birth={name:text(b.name,50),symbol:text(b.symbol,2),timeKnown:!!b.timeKnown,pillars:b.pillars.slice(0,4).filter(x=>Array.isArray(x)&&x.length===2).map(x=>x.map(v=>text(v,5))),counts:Object.fromEntries(['목','화','토','금','수'].map(k=>[k,Math.min(8,Math.max(0,Number(b.counts?.[k])||0))]))};}
  return out;
 }
 function saveHistory(u,data){requireProfile(u);if(!Array.isArray(data.items)||data.items.length>100)fail('한 번에 100개까지 저장할 수 있어요.');const items=data.items.map(cleanResult);atomic(db,()=>{for(const r of items){const inserted=run('INSERT OR IGNORE INTO private_history VALUES(?,?,?,?,?)',u.id,r.id,r.content,JSON.stringify(r),r.at);if(!inserted.changes)continue;if(['game','quiz'].includes(byId(r.content).cat)&&Number.isFinite(r.value)){const prev=get('SELECT value FROM personal_bests WHERE user_id=? AND content=? AND mode=?',u.id,r.content,r.mode);if(!prev||(r.higherBetter?r.value>prev.value:r.value<prev.value))run('INSERT INTO personal_bests VALUES(?,?,?,?,?) ON CONFLICT(user_id,content,mode) DO UPDATE SET value=excluded.value,payload=excluded.payload',u.id,r.content,r.mode,r.value,JSON.stringify(r));}}run('DELETE FROM private_history WHERE user_id=? AND id NOT IN(SELECT id FROM private_history WHERE user_id=? ORDER BY created DESC,id DESC LIMIT 100)',u.id,u.id);});return state(u);}
 function clearHistory(u){requireProfile(u);atomic(db,()=>{run('DELETE FROM private_history WHERE user_id=?',u.id);run('DELETE FROM personal_bests WHERE user_id=?',u.id);});return {ok:true};}
 return {state,saveBirth,saveHistory,clearHistory,clearBirth(u){requireProfile(u);run('DELETE FROM profile_details WHERE user_id=?',u.id);return {ok:true};}};
}
