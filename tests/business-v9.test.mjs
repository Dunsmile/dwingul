import test from 'node:test';
import assert from 'node:assert/strict';
import {BUSINESS_TEST_VERSION,businessResult,businessSubtypes,businessTypes} from '../public/js/business-test.js';

function answersForCounts(counts){
 const types=counts.flatMap((count,type)=>Array(count).fill(type));
 assert.equal(types.length,12);
 return types.map((type,index)=>(type-index%4+4)%4);
}

test('four main styles and four secondary styles produce 16 reachable named subtypes',()=>{
 const seenIds=new Set(),seenNames=new Set();
 for(let primary=0;primary<4;primary++)for(let secondary=0;secondary<4;secondary++){
  const counts=secondary===primary?Array(4).fill(2):Array(4).fill(2);
  counts[primary]=secondary===primary?6:5;if(secondary!==primary)counts[secondary]=3;
  const result=businessResult('창업가',answersForCounts(counts));
  assert.equal(result.businessVersion,BUSINESS_TEST_VERSION);
  assert.equal(result.businessSubtype.primary,primary);
  assert.equal(result.businessSubtype.secondary,secondary);
  assert.deepEqual(result.scores,counts);
  assert.deepEqual(result.business.map(row=>row.count),counts,'the existing four main bars remain unchanged');
  seenIds.add(result.businessSubtype.id);seenNames.add(result.businessSubtype.name);
 }
 assert.equal(businessTypes.length,4);assert.equal(businessSubtypes.length,16);
 assert.equal(seenIds.size,16);assert.equal(seenNames.size,16);
});

test('a runner-up at two stays a strong main subtype, while three activates the secondary style',()=>{
 const strong=businessResult('나',answersForCounts([6,2,2,2]));
 assert.equal(strong.businessSubtype.primary,0);assert.equal(strong.businessSubtype.secondary,0);assert.equal(strong.businessSubtype.strongMain,true);
 const blended=businessResult('나',answersForCounts([5,3,2,2]));
 assert.equal(blended.businessSubtype.primary,0);assert.equal(blended.businessSubtype.secondary,1);assert.equal(blended.businessSubtype.strongMain,false);
});

test('ties use a stable index rule and retain the established balanced result wording',()=>{
 const answers=Array(12).fill(0),snapshot=[...answers],result=businessResult('나',answers);
 assert.deepEqual(result.scores,[3,3,3,3]);assert.equal(result.businessSubtype.primary,0);assert.equal(result.businessSubtype.secondary,1);
 assert.equal(result.title,'고르게 살피는 균형 사업가');assert.match(result.businessSubtype.explanation,/같은 점수/);assert.deepEqual(answers,snapshot);
});

test('subtypes remain business guidance and do not claim to be MBTI or a validated aptitude test',()=>{
 const text=JSON.stringify(businessSubtypes);
 assert.doesNotMatch(text,/MBTI|엠비티아이|적성 검사|심리 검사/);
 const result=businessResult('나',answersForCounts([5,2,3,2]));
 assert.match(result.sections.at(-1)[1],/성공 가능성이나 직업 적합성을 측정하는 검사는 아니/);
});
