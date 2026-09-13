// Every occupied-lane combination has five different vehicle/spacing arrangements.
const combinations = [];
for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
  combinations.push([a, b]);
  for (let c = b + 1; c < 5; c++) combinations.push([a, b, c]);
}
export const cityPatterns = combinations.flatMap((lanes, row) => Array.from({ length: 5 }, (_, variant) => ({
  id: `city-${row * 5 + variant + 1}`,
  vehicles: lanes.map((lane, i) => ({ lane,
    type: variant === 1 && i === 0 || variant === 2 && i === lanes.length - 1 || variant === 4 ? 'bus' : 'car',
    offset: variant === 3 ? i * 5 : variant === 4 ? (lanes.length - i - 1) * 4 : 0,
  })),
  safeLanes: Array.from({ length: 5 }, (_, i) => i).filter(i => !lanes.includes(i)),
})));
export function patternBag(random) {
  let bag = [];
  return () => {
    if (!bag.length) {
      bag = [...cityPatterns];
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    return bag.pop();
  };
}
