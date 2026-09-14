import test from 'node:test';
import assert from 'node:assert/strict';
import {createFortuneAnalysis} from '../public/js/fortune-analysis.js';
import {fortuneResultModel,isFortuneContent} from '../public/js/fortune-results.js';
import {profileForm} from '../public/js/profiles.js';

test('fortune form separates required use consent from optional remembering',()=>{
 const markup=profileForm({content:'daily',configured:true});
 assert.match(markup,/name="useConsent" required/);
 assert.match(markup,/name="remember"/);
 assert.doesNotMatch(markup,/name="(?:useConsent|remember)"[^>]*checked/);
 assert.match(markup,/파생된 캐릭터·오행과 해석 결과/);
 assert.doesNotMatch(profileForm({content:'taste'}),/name="useConsent"/);
});

test('fortune analysis calculates locally and becomes confirmable after its short presentation',async()=>{
 let calculateCount=0,readyCount=0;
 const analysis=createFortuneAnalysis({
  calculate:()=>{calculateCount++;return {content:'daily',title:'작은 시작'};},
  wait:()=>Promise.resolve(),
  isActive:()=>true,
  onReady:()=>readyCount++
 });
 const result=await analysis.run();
 assert.equal(result.title,'작은 시작');
 assert.equal(calculateCount,1);
 assert.equal(readyCount,1);
 assert.equal(analysis.state,'ready');
 assert.equal(analysis.take(),result);
 assert.equal(analysis.take(),null,'one analysis can only confirm one result');
});

test('cancelled and stale analyses never expose a result',async()=>{
 let release;
 const wait=()=>new Promise(resolve=>{release=resolve;});
 const analysis=createFortuneAnalysis({calculate:()=>({content:'daily'}),wait,isActive:()=>true});
 const pending=analysis.run();
 await Promise.resolve();analysis.cancel();release();
 assert.equal(await pending,null);
 assert.equal(analysis.take(),null);

 const stale=createFortuneAnalysis({calculate:()=>({content:'tarot'}),wait:()=>Promise.resolve(),isActive:()=>false});
 assert.equal(await stale.run(),null);
 assert.equal(stale.state,'cancelled');
});

test('analysis reports calculation failure and supports an explicit retry',async()=>{
 let attempts=0;
 const analysis=createFortuneAnalysis({calculate:()=>{if(++attempts===1)throw Error('계산 실패');return {content:'character'};},wait:()=>Promise.resolve(),isActive:()=>true});
 assert.equal(await analysis.run(),null);
 assert.equal(analysis.state,'failed');
 assert.equal(analysis.error.message,'계산 실패');
 assert.deepEqual(await analysis.retry(),{content:'character'});
 assert.equal(attempts,2);
});

test('fortune result model keeps the portrait header compact and sections ordered',()=>{
 const source={content:'daily',name:'하루',title:'작은 시작이 반가운 날',subtitle:'하루님에게 보내는 2026-09-14의 이야기',element:'목',sections:[['오늘의 리듬','천천히 시작해요.'],['사람 사이','먼저 인사해요.'],['오늘 해볼 일','한 가지를 적어요.']]};
 const model=fortuneResultModel(source);
 assert.equal(isFortuneContent('daily'),true);
 assert.equal(isFortuneContent('taste'),false);
 assert.equal(model.date,'2026-09-14');
 assert.equal(model.takeaway,'천천히 시작해요.');
 assert.deepEqual(model.sections.map(section=>section.heading),source.sections.map(section=>section[0]));
 source.sections[0][1]='changed';
 assert.equal(model.sections[0].body,'천천히 시작해요.');
});

test('old fortune history rows render safely with missing profile fields',()=>{
 const model=fortuneResultModel({content:'tarot',title:'별',display:'별'});
 assert.equal(model.name,'나');
 assert.equal(model.takeaway,'오늘의 마음을 천천히 살펴보세요.');
 assert.deepEqual(model.sections,[]);
});
