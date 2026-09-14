import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENERGY_TEST_VERSION,
  energyTest,
  makeEnergyResult,
} from '../public/js/energy-test.js';

test('energy test uses one balanced teto-egen continuum with original situations', () => {
  assert.equal(ENERGY_TEST_VERSION, 'teto-egen-v13');
  assert.equal(energyTest.questions.length, 12);
  assert.equal(new Set(energyTest.questions.map(question => question.prompt)).size, 12);
  assert.ok(energyTest.questions.every(question => question.options.length === 2));
  assert.equal(energyTest.questions.filter(question => question.options[0].pole === 'teto').length, 6);
  assert.equal(energyTest.questions.filter(question => question.options[0].pole === 'egen').length, 6);
});

test('all-teto and all-egen choices produce coherent complementary percentages', () => {
  const choose = pole => energyTest.questions.map(question => question.options.findIndex(option => option.pole === pole));
  const teto = makeEnergyResult('직진이', choose('teto'));
  const egen = makeEnergyResult('다정이', choose('egen'));

  assert.equal(teto.testVersion, ENERGY_TEST_VERSION);
  assert.equal(teto.personality.kind, 'teto');
  assert.equal(teto.personality.tetoPercent, 100);
  assert.equal(teto.personality.egenPercent, 0);
  assert.match(teto.title, /테토/);
  assert.equal(egen.personality.kind, 'egen');
  assert.equal(egen.personality.tetoPercent, 0);
  assert.equal(egen.personality.egenPercent, 100);
  assert.match(egen.title, /에겐/);
  for (const result of [teto, egen]) {
    assert.equal(result.personality.tetoPercent + result.personality.egenPercent, 100);
    assert.match(result.sections.flat().join(' '), /테토력/);
    assert.match(result.sections.flat().join(' '), /에겐력/);
    assert.doesNotMatch(result.sections.flat().join(' '), /호르몬|테스토스테론|에스트로겐|MBTI/);
    assert.equal(result.birth, null);
  }
});

test('balanced answers remain a named balanced result and validation is strict', () => {
  const balanced = makeEnergyResult('균형이', energyTest.questions.map(() => 0));
  assert.equal(balanced.personality.kind, 'balanced');
  assert.deepEqual([balanced.personality.tetoPercent, balanced.personality.egenPercent], [50, 50]);
  assert.match(balanced.title, /균형/);
  assert.throws(() => makeEnergyResult('', Array(12).fill(0)), /닉네임/);
  assert.throws(() => makeEnergyResult('나', Array(11).fill(0)), /12/);
  assert.throws(() => makeEnergyResult('나', [...Array(11).fill(0), 2]), /선택/);
});
