import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONALITY_TEST_VERSION,
  personalityTests,
  testQuestions,
  makePersonalityResult,
  getPersonalityTestVersion,
  canComparePersonalityResults,
  isAxesV9PersonalityResult,
  compareTasteResults,
} from '../public/js/personality-tests.js';

const AXES_TEST_IDS = ['chat', 'taste'];

function answersForCode(id, code) {
  const definition = personalityTests[id];
  return definition.questions.map(question => {
    const wantedPole = code[definition.axes.findIndex(axis => axis.id === question.axis)];
    return question.poles.findIndex(pole => pole === wantedPole);
  });
}

test('chat and taste keep 12 original binary situations balanced across four axes', () => {
  for (const id of AXES_TEST_IDS) {
    const definition = personalityTests[id];
    assert.equal(testQuestions[id].length, 12);
    assert.equal(definition.questions.length, 12);
    assert.equal(definition.axes.length, 4);
    assert.equal(definition.outcomes.size, 16);
    const expectedCodes = definition.axes.reduce(
      (codes, currentAxis) => codes.flatMap(code => currentAxis.poles.map(item => code + item.code)),
      [''],
    );
    assert.deepEqual([...definition.outcomes.keys()].sort(), expectedCodes.sort());
    assert.equal(new Set(testQuestions[id].map(question => question[0])).size, 12);
    assert.ok(testQuestions[id].every(question => question.length === 3));

    const axisCounts = Object.fromEntries(definition.axes.map(axis => [axis.id, 0]));
    const firstPoleAtLeft = Object.fromEntries(definition.axes.map(axis => [axis.id, 0]));
    for (const question of definition.questions) {
      axisCounts[question.axis] += 1;
      const axis = definition.axes.find(candidate => candidate.id === question.axis);
      if (question.poles[0] === axis.poles[0].code) firstPoleAtLeft[question.axis] += 1;
    }
    assert.deepEqual(Object.values(axisCounts), [3, 3, 3, 3]);
    assert.deepEqual(Object.values(firstPoleAtLeft).sort(), [1, 1, 2, 2]);
    assert.equal(Object.values(firstPoleAtLeft).reduce((sum, count) => sum + count, 0), 6);
  }
});

test('all 16 four-axis codes are reachable and have useful distinct outcomes', () => {
  for (const id of AXES_TEST_IDS) {
    const definition = personalityTests[id];
    const codes = [...definition.outcomes.keys()];
    assert.equal(new Set(codes).size, 16);
    assert.equal(new Set([...definition.outcomes.values()].map(outcome => outcome.name)).size, 16);

    for (const code of codes) {
      const result = makePersonalityResult(id, '뒹굴러', answersForCode(id, code));
      assert.equal(result.personality.code, code);
      assert.equal(result.title, definition.outcomes.get(code).name);
      assert.equal(result.testVersion, PERSONALITY_TEST_VERSION);
      assert.equal(result.content, id);
      assert.equal(result.name, '뒹굴러');
      assert.equal(result.answers.length, 12);
      assert.equal(result.scores.length, 4);
      assert.equal(Object.keys(result.personality.axes).length, 4);
      assert.match(result.sprite, /^\/assets\/pixel\/personas\/(?:[0-9]|1[0-5])\.svg$/);
      assert.ok(result.subtitle.length >= 12);
      assert.ok(result.sections.length >= 5);
      assert.ok(result.sections.every(([heading, body]) => heading.length > 0 && body.length >= 12));
      assert.equal(result.display, result.title);
      assert.equal(result.unit, '');
      assert.equal(result.birth, null);
    }
  }
});

test('every answer contributes only to its declared axis', () => {
  for (const id of AXES_TEST_IDS) {
    const definition = personalityTests[id];
    const baseline = definition.questions.map(() => 0);
    const original = makePersonalityResult(id, '축 확인', baseline);

    definition.questions.forEach((question, questionIndex) => {
      const changedAnswers = [...baseline];
      changedAnswers[questionIndex] = 1;
      const changed = makePersonalityResult(id, '축 확인', changedAnswers);
      for (const axis of definition.axes) {
        const before = original.personality.axes[axis.id];
        const after = changed.personality.axes[axis.id];
        if (axis.id === question.axis) {
          assert.equal(Math.abs(after.score - before.score), 2, `${id} question ${questionIndex}`);
        } else {
          assert.equal(after.score, before.score, `${id} question ${questionIndex} leaked into ${axis.id}`);
        }
      }
    });
  }
});

test('scoring is deterministic and invalid inputs fail clearly', () => {
  const answers = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1];
  assert.deepEqual(makePersonalityResult('energy', '같은 사람', answers), makePersonalityResult('energy', '같은 사람', answers));
  assert.throws(() => makePersonalityResult('unknown', '나', answers), /검사/);
  assert.throws(() => makePersonalityResult('energy', '', answers), /닉네임/);
  assert.throws(() => makePersonalityResult('energy', '나', answers.slice(1)), /12/);
  assert.throws(() => makePersonalityResult('energy', '나', [...answers.slice(0, 11), 2]), /선택/);
  assert.throws(() => makePersonalityResult('energy', '나', [...answers.slice(0, 11), '1']), /선택/);
});

test('version helpers distinguish v9 from legacy results', () => {
  const v9 = makePersonalityResult('taste', '새 결과', Array(12).fill(0));
  const legacyA = {content: 'taste', answers: Array(8).fill(0)};
  const legacyB = {content: 'taste', answers: Array(8).fill(1)};
  assert.equal(getPersonalityTestVersion(v9), 'axes-v9');
  assert.equal(isAxesV9PersonalityResult(v9), true);
  assert.equal(isAxesV9PersonalityResult(legacyA), false);
  assert.equal(getPersonalityTestVersion(legacyA), 'legacy-v8');
  assert.equal(canComparePersonalityResults(v9, v9), true);
  assert.equal(canComparePersonalityResults(legacyA, legacyB), true);
  assert.equal(canComparePersonalityResults(v9, legacyA), false);
  assert.equal(canComparePersonalityResults({...v9, content: 'energy'}, v9), false);
  assert.equal(getPersonalityTestVersion({content: 'taste', testVersion: 'future-v99', answers: []}), 'unknown');
  assert.equal(getPersonalityTestVersion({content: 'energy', testVersion: 'teto-egen-v13', answers: Array(12).fill(0)}), 'teto-egen-v13');
  assert.equal(getPersonalityTestVersion({content: 'energy', testVersion: 'axes-v9', personality: {code: 'OQHN'}, answers: Array(12).fill(0)}), 'axes-v9');
  assert.equal(canComparePersonalityResults({content: 'other', testVersion: 'axes-v9'}, {content: 'other', testVersion: 'axes-v9'}), false);
});

test('taste comparison uses normalized axes while legacy eight-answer comparison remains available', () => {
  const definition = personalityTests.taste;
  const code = [...definition.outcomes.keys()][0];
  const sameDimensionsDifferentAnswers = answersForCode('taste', code).map((answer, index) => index < 4 ? 1 - answer : answer);
  const a = makePersonalityResult('taste', '가', answersForCode('taste', code));
  const b = makePersonalityResult('taste', '나', sameDimensionsDifferentAnswers);
  assert.equal(a.personality.code, b.personality.code);
  const v9Comparison = compareTasteResults(a, b);
  assert.equal(v9Comparison.same, 4);
  assert.equal(v9Comparison.total, 4);
  assert.equal(v9Comparison.similarity, 67);
  assert.equal(Object.keys(v9Comparison.dimensions).length, 4);
  assert.equal(v9Comparison.version, 'axes-v9');
  assert.match(v9Comparison.title, /4개 취향 축/);

  const legacyComparison = compareTasteResults(
    {content: 'taste', answers: [0, 0, 1, 1, 0, 1, 0, 1]},
    {content: 'taste', answers: [0, 1, 1, 1, 0, 0, 0, 1]},
  );
  assert.deepEqual({same: legacyComparison.same, total: legacyComparison.total, version: legacyComparison.version}, {same: 6, total: 8, version: 'legacy-v8'});
  assert.equal(legacyComparison.similarity, 75);
  assert.throws(() => compareTasteResults(a, {content: 'taste', answers: Array(8).fill(0)}), /버전/);
  assert.throws(() => compareTasteResults({...a, content: 'energy'}, b), /취향/);
});
