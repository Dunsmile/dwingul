import test from 'node:test';
import assert from 'node:assert/strict';
import {typingStrokeCount, createTypingStats, submittedAccuracy, typingResultStats} from '../public/js/typing-stats.js';
import {createTypingRpgModel} from '../public/js/typing-rpg.js';
import {createTypingInput} from '../public/js/typing-input.js';

const fixture = (phrase = '한글') => {
  const model = createTypingRpgModel({phrases: [phrase]});
  return {model, input: createTypingInput(model), stats: () => model.getState().typingStats};
};

test('user examples and two-beolsik compounds count strokes in NFC, NFD and isolated jamo', () => {
  for (const [text, strokes] of [['한',3],['닭',4],['꽃',4],['값',4],['과',3],['왜',3],['예',3],['땅',4],['ㄳㅘ',4],['A 1!?',5]]) {
    assert.equal(typingStrokeCount(text), strokes, text);
    assert.equal(typingStrokeCount(text.normalize('NFD')), strokes, text+' NFD');
  }
});

test('IME progression, duplicate compositionend and 받침 carryover do not inflate CPM', () => {
  const {model, input, stats} = fixture('바람');
  for (const text of ['ㅂ','바','발','바라','바람']) input.edit(text, {composing: true});
  input.edit('바람'); input.edit('바람');
  model.tick(2000); input.submit();
  assert.equal(stats().strokes,5);
  assert.equal(stats().cpm,150);
  assert.equal(stats().accuracy,100);
  assert.equal(model.getState().hp,100);
});

test('draft mistakes corrected before Enter never lower accuracy, but retyped strokes count', () => {
  const {input, stats} = fixture();
  input.edit('한'); input.edit('한그'); input.edit('한글'); input.edit('한'); input.edit('한글');
  assert.equal(stats().accuracy,null);
  assert.equal(stats().strokes,9); // 6 original strokes plus retyped 글 (3).
  input.submit();
  assert.equal(stats().accuracy,100);
  assert.equal(stats().submissions,1);
});

test('only an explicit confirmed wrong attempt reduces accuracy and unchanged Enter is deduplicated', () => {
  const {input, stats} = fixture('바람');
  input.edit('바다');
  assert.equal(stats().accuracy,null);
  input.submit();
  assert.equal(stats().accuracy,50);
  const after = stats(); input.submit(); input.submit();
  assert.deepEqual(stats(),after);
  input.edit('바람'); input.submit();
  assert.equal(stats().accuracy,75);
  assert.equal(stats().submissions,2);
});

test('editing away and back permits a genuine repeated wrong submission',()=>{
 const {input,stats}=fixture('바람');input.edit('바다');input.submit();
 input.edit('바림');input.edit('바다');input.submit();
 assert.equal(stats().submissions,2);assert.equal(stats().errors,2);
});

test('omissions, additions, substitutions and spaces count once rather than shifting all following letters', () => {
  assert.deepEqual(submittedAccuracy('반짝이는 숲','반이는 숲'),{characters:6, errors:1});
  assert.deepEqual(submittedAccuracy('별 하나','별 둘하나'),{characters:5, errors:1});
  assert.deepEqual(submittedAccuracy('별 하나','별하나'),{characters:4, errors:1});
});

test('empty input, an IME confirmation Enter, and heal commands do not become accuracy attempts', () => {
  const {model, input, stats} = fixture('가'.repeat(50));
  input.submit(); input.edit('ㄱ',{composing:true}); input.submit();
  assert.equal(stats().submissions,0);
  input.edit('가'.repeat(50)); input.clear();
  assert.equal(model.getState().mp,100);
  input.edit('힐'); assert.equal(input.submit().type,'heal');
  assert.equal(stats().accuracy,null);
  assert.equal(stats().submissions,0);
});

test('the final lethal typo is fully judged and the entire input replay produces identical metrics', () => {
  const {model,input,stats} = fixture();
  model.tick(190000); // 5 HP left.
  input.edit('다른글'); input.submit();
  assert.equal(model.getState().finished,true);
  assert.deepEqual({submissions:stats().submissions, errors:stats().errors, characters:stats().characters}, {submissions:1,errors:2,characters:3});
  const replay = createTypingRpgModel({phrases:['한글']});
  for(const [at,type,text] of model.getProgress().details.actions) {
    replay.tick(at-replay.getState().elapsedMs);
    if(type==='draft') replay.captureDraft(text);
    else if(type==='confirm') replay.confirmInput(text);
    else if(type==='input') replay.commitInput(text);
    else if(type==='clear') replay.clearInput();
    else if(type==='submit') replay.submit();
  }
  assert.deepEqual(replay.getProgress(),model.getProgress());
});

test('active time and submitted accuracy are independent; results never invent an accuracy before submission', () => {
  const stats = createTypingStats(); stats.edit('한 닭 꽃');
  assert.equal(stats.snapshot(6000).cpm,130);
  assert.equal(stats.snapshot(12000).cpm,65);
  assert.equal(stats.snapshot(12000).accuracy,null);
  const result={content:'typing',details:{typingStats:stats.snapshot(12000)}};
  assert.match(typingResultStats(result),/평균 타자 속도/);
  assert.match(typingResultStats(result),/<strong>—<\/strong>/);
  assert.equal(typingResultStats({content:'typing',details:{}}),'');
});
