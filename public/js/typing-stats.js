// Two-beolsik equivalent strokes, not DOM keydown counts: IME and mobile
// keyboards deliver different events for the same completed Korean text.
const initials = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const vowels = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const finals = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
const compound = {
  ㄲ:['shift','ㄱ'], ㄸ:['shift','ㄷ'], ㅃ:['shift','ㅂ'], ㅆ:['shift','ㅅ'], ㅉ:['shift','ㅈ'],
  ㅒ:['shift','ㅐ'], ㅖ:['shift','ㅔ'],
  ㄳ:['ㄱ','ㅅ'], ㄵ:['ㄴ','ㅈ'], ㄶ:['ㄴ','ㅎ'], ㄺ:['ㄹ','ㄱ'], ㄻ:['ㄹ','ㅁ'], ㄼ:['ㄹ','ㅂ'],
  ㄽ:['ㄹ','ㅅ'], ㄾ:['ㄹ','ㅌ'], ㄿ:['ㄹ','ㅍ'], ㅀ:['ㄹ','ㅎ'], ㅄ:['ㅂ','ㅅ'],
  ㅘ:['ㅗ','ㅏ'], ㅙ:['ㅗ','ㅐ'], ㅚ:['ㅗ','ㅣ'], ㅝ:['ㅜ','ㅓ'], ㅞ:['ㅜ','ㅔ'], ㅟ:['ㅜ','ㅣ'], ㅢ:['ㅡ','ㅣ'],
};

export function typingStrokeTokens(text) {
  const tokens = [];
  const add = char => { if (char) tokens.push(...(compound[char] || [char])); };
  for (const char of String(text ?? '').normalize('NFC')) {
    const code = char.codePointAt(0), syllable = code - 0xac00;
    if (syllable >= 0 && syllable < 11172) {
      add(initials[Math.floor(syllable / 588)]);
      add(vowels[Math.floor(syllable % 588 / 28)]);
      add(finals[syllable % 28]);
    } else if (code >= 0x1100 && code <= 0x1112) add(initials[code - 0x1100]);
    else if (code >= 0x1161 && code <= 0x1175) add(vowels[code - 0x1161]);
    else if (code >= 0x11a8 && code <= 0x11c2) add(finals[code - 0x11a7]);
    else add(char);
  }
  return tokens;
}
export const typingStrokeCount = text => typingStrokeTokens(text).length;

// Align omissions/insertions so one missing letter does not mark the whole
// remaining sentence wrong. Spaces and punctuation are part of the original.
export function submittedAccuracy(target, input) {
  const a = [...String(target).normalize('NFC')], b = [...String(input).normalize('NFC')];
  let row = b.map((_, i) => i + 1); row.unshift(0);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return {characters: Math.max(a.length, b.length), errors: row[b.length]};
}

export function createTypingStats() {
  let draft = [], strokes = 0, submissions = 0, characters = 0, errors = 0, lastSubmission = null;
  return {
    edit(text) {
      const next = typingStrokeTokens(text);
      let prefix = 0, suffix = 0;
      while (prefix < draft.length && prefix < next.length && draft[prefix] === next[prefix]) prefix++;
      while (suffix < Math.min(draft.length, next.length) - prefix && draft[draft.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
      if (prefix !== draft.length || prefix !== next.length) lastSubmission = null;
      strokes += next.length - prefix - suffix;
      draft = next;
    },
    resetDraft() { draft = []; lastSubmission = null; },
    submit(target, text, promptNumber, {command = false} = {}) {
      if (!text || command) return;
      const key = JSON.stringify([promptNumber, text]);
      if (lastSubmission === key) return; // Holding Enter is not another attempt.
      lastSubmission = key;
      const result = submittedAccuracy(target, text);
      submissions++; characters += result.characters; errors += result.errors;
    },
    snapshot(elapsedMs) {
      return {
        version: 1, strokes, elapsedMs,
        cpm: elapsedMs > 0 ? Math.round(strokes * 60000 / elapsedMs) : 0,
        accuracy: characters ? Math.round((characters - errors) / characters * 1000) / 10 : null,
        submissions, characters, errors,
      };
    },
  };
}

export function typingResultStats(result) {
  const stats = result?.details?.typingStats;
  if (result?.content !== 'typing' || stats?.version !== 1) return '';
  const speed = Math.max(0, Math.round(Number(stats.cpm) || 0));
  const accuracy = stats.accuracy === null ? '—' : `${Math.max(0, Math.min(100, Number(stats.accuracy) || 0))}%`;
  return `<div class="typing-result-stats" aria-label="이번 판 타자 기록"><div><span>평균 타자 속도</span><strong>${speed}<small>타/분</small></strong></div><div><span>정확도</span><strong>${accuracy}</strong></div></div><details class="typing-result-method"><summary>타수와 정확도는 어떻게 계산하나요?</summary><p>평균 타수 = 한글 자모로 환산한 입력 수 ÷ 플레이 시간(초) × 60. ‘한’은 3타, ‘닭’과 ‘꽃’은 4타예요. 영문·숫자·공백·기호는 1타로 계산해요.</p><p>문자를 지운 뒤 다시 입력한 타수도 포함해요. Enter·삭제 같은 제어키는 제외하고, 일시정지를 뺀 플레이 시간에는 문장을 읽거나 기다린 시간도 포함해요. 두벌식 기준의 환산 수치라 실제 키보드·모바일 입력 횟수와는 다를 수 있어요.</p><p>정확도는 Enter 또는 공격 버튼으로 제출한 문장과 원문을 비교해요. 수정 후 제출한 오타는 감점하지 않고, 제출한 오타·빠진 글자·추가 글자만 반영해요. 빈 입력·회복 명령·같은 문장의 중복 제출은 제외해요. 제출한 문장이 없으면 —로 표시해요.</p></details>`;
}
