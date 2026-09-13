import {shuffled} from './catalog.js';
import {knowledge, topics, getQuestions as legacyQuestions} from './quizzes-v1.js';
import {guessBank} from './guess-bank.js';
import {guessBank as guessBankV3} from './guess-bank-v3.js';
import {iqBank} from './iq-bank.js';
export {knowledge, topics, guessBank};
export const iqQuestions = iqBank;
export const questionVersion = id => id==='guess'?'initial-match-v8':id==='iq'?'pool-100-v3':'v1';
export const supportedQuestionVersions=id=>id==='guess'?['v1','pool-100-v3','initial-match-v8']:['v1',questionVersion(id)];
export function questionMode(id, topic, version = questionVersion(id)) {
  if (version === 'v1') return id === 'iq' ? 'original-20-v1' : topic + '-10-v1';
  return id === 'iq' ? 'random-20-v3' : topic + (version==='initial-match-v8'?'-initials-v8':'-100-v3');
}
export function getQuestions(id, topic, seed, version = questionVersion(id)) {
  if (version === 'v1') return legacyQuestions(id, topic, seed);
  if (!supportedQuestionVersions(id).includes(version)) throw new Error('문제 구성이 업데이트됐어요. 새로고침 후 다시 시작해주세요.');
  let questions;
  if (id === 'iq') {
    questions = ['수열','행렬','공간','논리'].flatMap((category, i) =>
      shuffled(iqBank.filter(q => q.category === category), (Number(seed) + (i + 1) * 7919) >>> 0).slice(0, 5));
    questions = shuffled(questions, seed);
  } else {
    questions = shuffled((version==='pool-100-v3'?guessBankV3:guessBank).filter(q => q.category === topic), seed).slice(0, 10);
  }
  return questions.map((q, i) => {
    const correct = q.options[q.answer];
    const options = shuffled(q.options, (Number(seed) + i * 1543 + 101) >>> 0);
    return {...q, options, answer: options.indexOf(correct)};
  });
}
