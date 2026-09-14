import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {guessBank} from '../public/js/guess-bank.js';
import {guessBank as guessBankV8} from '../public/js/guess-bank-v8.js';
import {guessHints} from '../public/js/guess-hints.js';
import {getQuestions,questionMode,questionVersion,supportedQuestionVersions} from '../public/js/quizzes.js';

const compact=value=>String(value).normalize('NFC').toLocaleLowerCase('ko-KR').replace(/[\s\p{P}\p{S}]+/gu,'');

test('all 300 questions have a unique, useful Korean context clue without the answer',()=>{
  assert.equal(Object.keys(guessHints).length,300);
  assert.equal(guessBank.length,300);
  assert.equal(new Set(guessBank.map(question=>question.hint)).size,300);
  for(const category of ['drama','anime','game'])assert.equal(guessBank.filter(question=>question.category===category).length,100);
  for(const question of guessBank){
    assert.equal(question.hint,guessHints[question.id],question.id);
    assert.match(question.hint,/[가-힣]/u,question.id);
    assert.match(question.hint,/다\.$/u,question.id);
    assert.ok(question.hint.length>=20&&question.hint.length<=120,`${question.id}: ${question.hint.length}`);
    assert.equal(compact(question.hint).includes(compact(question.canonicalAnswer)),false,`${question.id} leaks ${question.canonicalAnswer}`);
    assert.doesNotMatch(question.hint,/https?:|www\.|《|》/u,question.id);
  }
});

test('the copied v8 bank remains the exact pre-clue bank',()=>{
  assert.equal(createHash('sha256').update(JSON.stringify(guessBankV8)).digest('hex'),'f495ef9455dc49b6c9553ea356b4d24222f9b2d98e818dc6b3f4d4cd32af68f8');
  assert.deepEqual(guessBank.map(({hint,...question})=>question),guessBankV8);
  assert.ok(guessBankV8.every(question=>question.hint===undefined));
});

test('v11 is the default while v8 questions and their leaderboard mode remain reproducible',()=>{
  assert.equal(questionVersion('guess'),'initial-clues-v11');
  assert.deepEqual(supportedQuestionVersions('guess'),['v1','pool-100-v3','initial-match-v8','initial-clues-v11']);
  for(const topic of ['drama','anime','game']){
    const v11=getQuestions('guess',topic,731,'initial-clues-v11');
    const v8=getQuestions('guess',topic,731,'initial-match-v8');
    assert.equal(v11.length,10);
    assert.deepEqual(v11.map(question=>question.id),v8.map(question=>question.id));
    assert.deepEqual(v11.map(question=>question.options),v8.map(question=>question.options));
    assert.ok(v11.every(question=>question.hint));
    assert.ok(v8.every(question=>question.hint===undefined));
    assert.equal(questionMode('guess',topic,'initial-clues-v11'),`${topic}-initial-clues-v11`);
    assert.equal(questionMode('guess',topic,'initial-match-v8'),`${topic}-initials-v8`);
    assert.notEqual(questionMode('guess',topic,'initial-clues-v11'),questionMode('guess',topic,'initial-match-v8'));
  }
});
