import assert from 'node:assert/strict';
import test from 'node:test';

import {
  typingLongPhraseMetadata,
  typingLongPhrases,
} from '../public/js/typing-long-phrases.js';

test('장문 연습 문구는 서로 다른 250개 문장이다', () => {
  assert.equal(typingLongPhrases.length, 250);
  assert.equal(new Set(typingLongPhrases).size, 250);
});

test('모든 장문 연습 문구는 공백과 문장 부호를 포함해 20~30자다', () => {
  for (const phrase of typingLongPhrases) {
    const length = Array.from(phrase).length;
    assert.ok(length >= 20 && length <= 30, `${length}자: ${phrase}`);
  }
});

test('모든 문구에는 정확한 분류 메타데이터가 대응한다', () => {
  assert.equal(typingLongPhraseMetadata.length, typingLongPhrases.length);
  assert.deepEqual(
    typingLongPhraseMetadata.map(({ text }) => text),
    typingLongPhrases,
  );
  for (const item of typingLongPhraseMetadata) {
    assert.ok(['traditional-adaptation', 'original-aphorism'].includes(item.kind));
    assert.equal(typeof item.basis, 'string');
    assert.ok(item.basis.length > 0);
  }
  assert.ok(typingLongPhraseMetadata.some(({ kind }) => kind === 'traditional-adaptation'));
  assert.ok(typingLongPhraseMetadata.some(({ kind }) => kind === 'original-aphorism'));
});
