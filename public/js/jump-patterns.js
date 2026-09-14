const FLOOR = 390;

export const JUMP_V11_RULES = Object.freeze({
  initialSpeed: 220,
  maxSpeed: 420,
  accelerationPerMs: .002,
  minimumGapByType: Object.freeze({ basic: 360, wide: 380, double: 720, slide: 420 }),
});

export const JUMP_V13_RULES = Object.freeze({
  initialSpeed:220,speedStep:24,stepMs:10000,maxSpeed:420,
  initialObstaclesPer10s:5,
  minimumGapByType:JUMP_V11_RULES.minimumGapByType,
});

export const JUMP_V16_STAGES = Object.freeze([
  Object.freeze({ id: 'easy', label: '쉬움', fromMeters: 0, frequencyScale: 1, sky: '#dff3ed', ridge: '#b9d8bf', ground: '#6f986d', obstacle: '#a96f54' }),
  Object.freeze({ id: 'less-easy', label: '조금 쉬움', fromMeters: 1000, frequencyScale: 1.2, sky: '#f8edc9', ridge: '#c8d69c', ground: '#708d55', obstacle: '#9d7047' }),
  Object.freeze({ id: 'normal', label: '보통', fromMeters: 2000, frequencyScale: 1.44, sky: '#dce9f7', ridge: '#9db5ca', ground: '#5f7c67', obstacle: '#88654d' }),
  Object.freeze({ id: 'hard', label: '어려움', fromMeters: 3000, frequencyScale: 1.728, sky: '#eadce8', ridge: '#aa91ad', ground: '#586c63', obstacle: '#79536b' }),
  Object.freeze({ id: 'expert', label: '전문가', fromMeters: 4000, frequencyScale: 2.0736, sky: '#f0d7bd', ridge: '#b98b70', ground: '#665d50', obstacle: '#74483e' }),
  Object.freeze({ id: 'master', label: '마스터', fromMeters: 5000, frequencyScale: 2.48832, sky: '#d9d5ef', ridge: '#7d769f', ground: '#49475f', obstacle: '#5f466e' }),
]);

export const JUMP_V16_STAGE_PATTERN_TYPES = Object.freeze([
  Object.freeze(['basic','basic','basic','wide']),
  Object.freeze(['basic','basic','wide','wide','double']),
  Object.freeze(['basic','wide','wide','double','slide']),
  Object.freeze(['basic','wide','double','double','slide']),
  Object.freeze(['wide','double','double','slide','slide']),
  Object.freeze(['basic','wide','double','double','slide','slide']),
]);

export function jumpPatternTypeForStage(stageIndex, random = Math.random) {
  const choices=JUMP_V16_STAGE_PATTERN_TYPES[Math.max(0,Math.min(5,Number(stageIndex)||0))];
  return choices[Math.floor(Math.max(0,Math.min(.999999,Number(random())||0))*choices.length)];
}

export const JUMP_V16_RULES = Object.freeze({
  ...JUMP_V13_RULES,
  maxLives: 3,
  stageMeters: 1000,
  heartFirstMinMeters: 900,
  heartFirstMaxMeters: 1100,
  heartRepeatMinMeters: 900,
  heartRepeatMaxMeters: 1100,
  jumpBufferMs: 150,
});

export function jumpStageIndex(distanceMeters) {
  return Math.min(JUMP_V16_STAGES.length - 1, Math.floor(Math.max(0, Number(distanceMeters) || 0) / JUMP_V16_RULES.stageMeters));
}

export function jumpStage(distanceMeters) { return JUMP_V16_STAGES[jumpStageIndex(distanceMeters)]; }

export function jumpV16TargetObstaclesPer10s(elapsedMs, distanceMeters) {
  return jumpTargetObstaclesPer10s(elapsedMs) * jumpStage(distanceMeters).frequencyScale;
}

export function jumpV16NextPatternDistance(pattern, elapsedMs, distanceMeters) {
  const speed = jumpWorldSpeedV13(elapsedMs);
  const target = jumpV16TargetObstaclesPer10s(elapsedMs, distanceMeters);
  const last = Math.max(0, ...pattern.events.map(({ atDistance }) => atDistance));
  const desiredCycle = speed * 10 / target * pattern.events.length;
  return last + Math.max(JUMP_V13_RULES.minimumGapByType[pattern.type], desiredCycle - last);
}

export function nextHeartMeters(currentMeters, random = Math.random, first = false) {
  const min = first ? JUMP_V16_RULES.heartFirstMinMeters : JUMP_V16_RULES.heartRepeatMinMeters;
  const max = first ? JUMP_V16_RULES.heartFirstMaxMeters : JUMP_V16_RULES.heartRepeatMaxMeters;
  return currentMeters + min + Math.max(0, Math.min(.999999, Number(random()) || 0)) * (max - min);
}

export function jumpDifficultyLevel(elapsedMs){return Math.floor(Math.max(0,Number(elapsedMs)||0)/JUMP_V13_RULES.stepMs);}
export function jumpTargetObstaclesPer10s(elapsedMs){return JUMP_V13_RULES.initialObstaclesPer10s+jumpDifficultyLevel(elapsedMs);}
export function jumpWorldSpeedV11(elapsedMs){return Math.min(JUMP_V11_RULES.maxSpeed,JUMP_V11_RULES.initialSpeed+Math.max(0,Number(elapsedMs)||0)*JUMP_V11_RULES.accelerationPerMs);}

export function jumpWorldSpeed(elapsedMs) {
  return jumpWorldSpeedV11(elapsedMs);
}

export function jumpWorldSpeedV13(elapsedMs) {
  return Math.min(JUMP_V13_RULES.maxSpeed,JUMP_V13_RULES.initialSpeed+jumpDifficultyLevel(elapsedMs)*JUMP_V13_RULES.speedStep);
}

export function jumpWorldDelta(speed, elapsedMs) {
  return Math.max(0, Number(speed) || 0) * Math.max(0, Number(elapsedMs) || 0) / 1000;
}

export function jumpPatternIntervalMs(pattern, speed) {
  const lastDistance = Math.max(0, ...pattern.events.map(({ atDistance }) => atDistance));
  return (lastDistance + pattern.gapAfterDistance) / Math.max(1, speed) * 1000;
}

export function jumpV13NextPatternDistance(pattern,elapsedMs){
 const speed=jumpWorldSpeedV13(elapsedMs),target=jumpTargetObstaclesPer10s(elapsedMs),last=Math.max(0,...pattern.events.map(event=>event.atDistance));
 const desiredCycle=speed*10/target*pattern.events.length;
 return last+Math.max(JUMP_V13_RULES.minimumGapByType[pattern.type],desiredCycle-last);
}

function event(kind, atDistance, width, height) {
  return Object.freeze({
    kind,
    atDistance,
    // Read-only compatibility metadata for v4-v6 analysis tools. V11 runtime
    // scheduling and movement use atDistance and never these time/scale fields.
    atMs: Math.round(atDistance / JUMP_V11_RULES.initialSpeed * 1000),
    speedScale: 1,
    w: width,
    h: height,
    y: kind === "slide" ? 0 : FLOOR - height,
  });
}

function pattern(id, type, variant, gapAfterDistance, events) {
  return {
    id,
    type,
    variant,
    gapAfterDistance,
    gapAfterMs: Math.round(gapAfterDistance / JUMP_V11_RULES.initialSpeed * 1000),
    events,
  };
}

function basicPattern(index) {
  const events = [event("ground", 0, 48 + (index % 7) * 5, 50 + (index % 4) * 3)];
  if (index % 3 === 1) events.push(event("ground", 246 + (index % 5) * 19, 46 + (index % 4) * 7, 54));
  return pattern(`basic-${String(index + 1).padStart(2, "0")}`, "basic", index + 1, JUMP_V11_RULES.minimumGapByType.basic + (index % 7) * 14, events);
}

function widePattern(index) {
  const events = [event("wide", 0, 92 + (index % 9) * 2, 28 + (index % 3) * 2)];
  if (index % 4 === 2) events.push(event("ground", 282 + (index % 4) * 20, 50 + (index % 5) * 4, 52));
  return pattern(`wide-${String(index + 1).padStart(2, "0")}`, "wide", index + 1, JUMP_V11_RULES.minimumGapByType.wide + (index % 6) * 16, events);
}

function doublePattern(index) {
  const height = 148 + (index % 6) * 3;
  const events = [event("double", 0, 48 + (index % 7) * 3, height)];
  if (index % 5 === 3) events.push(event("ground", 341 + (index % 3) * 22, 52, 54 + (index % 3) * 2));
  return pattern(`double-${String(index + 1).padStart(2, "0")}`, "double", index + 1, JUMP_V11_RULES.minimumGapByType.double + (index % 5) * 18, events);
}

function slidePattern(index) {
  const events = [event("slide", 0, 104 + (index % 8) * 6, 348 + (index % 3) * 3)];
  if (index % 4 === 1) events.push(event("ground", 304 + (index % 4) * 20, 48 + (index % 5) * 4, 52));
  return pattern(`slide-${String(index + 1).padStart(2, "0")}`, "slide", index + 1, JUMP_V11_RULES.minimumGapByType.slide + (index % 6) * 16, events);
}

export const jumpPatterns100 = Object.freeze([
  ...Array.from({ length: 25 }, (_, index) => basicPattern(index)),
  ...Array.from({ length: 25 }, (_, index) => widePattern(index)),
  ...Array.from({ length: 25 }, (_, index) => doublePattern(index)),
  ...Array.from({ length: 25 }, (_, index) => slidePattern(index)),
].map((pattern) => Object.freeze({ ...pattern, events: Object.freeze(pattern.events) })));

export function shuffledJumpPatterns(random) {
  const deck = [...jumpPatterns100];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}
