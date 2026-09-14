const FLOOR = 390;

function event(kind, atMs, width, height, speedScale = 1) {
  return Object.freeze({ kind, atMs, w: width, h: height, y: kind === "slide" ? 0 : FLOOR - height, speedScale });
}

function basicPattern(index) {
  const speedScale = .94 + (index % 6) * .018;
  const events = [event("ground", 0, 48 + (index % 7) * 5, 50 + (index % 4) * 3, speedScale)];
  if (index % 3 === 1) events.push(event("ground", 1120 + (index % 5) * 85, 46 + (index % 4) * 7, 54, speedScale + .015));
  return { id: `basic-${String(index + 1).padStart(2, "0")}`, type: "basic", gapAfterMs: 1450 + (index % 7) * 75, events };
}

function widePattern(index) {
  const speedScale = .93 + (index % 5) * .02;
  const events = [event("wide", 0, 92 + (index % 9) * 2, 28 + (index % 3) * 2, speedScale)];
  if (index % 4 === 2) events.push(event("ground", 1280 + (index % 4) * 90, 50 + (index % 5) * 4, 52, speedScale));
  return { id: `wide-${String(index + 1).padStart(2, "0")}`, type: "wide", gapAfterMs: 1520 + (index % 6) * 85, events };
}

function doublePattern(index) {
  const speedScale = .92 + (index % 5) * .018;
  const height = 148 + (index % 6) * 3;
  const events = [event("double", 0, 48 + (index % 7) * 3, height, speedScale)];
  if (index % 5 === 3) events.push(event("ground", 1550 + (index % 3) * 100, 52, 54 + (index % 3) * 2, speedScale));
  return { id: `double-${String(index + 1).padStart(2, "0")}`, type: "double", gapAfterMs: 1720 + (index % 5) * 90, events };
}

function slidePattern(index) {
  const speedScale = .91 + (index % 6) * .018 + Math.floor(index / 12) * .003;
  const events = [event("slide", 0, 104 + (index % 8) * 6, 348 + (index % 3) * 3, speedScale)];
  if (index % 4 === 1) events.push(event("ground", 1380 + (index % 4) * 90, 48 + (index % 5) * 4, 52, speedScale + .01));
  return { id: `slide-${String(index + 1).padStart(2, "0")}`, type: "slide", gapAfterMs: 1650 + (index % 6) * 90, events };
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
