export const GARDEN_SPRINKLER = {
  pots: 8,
  rounds: 12,
  score: 100,
  lives: 3,
  limit: 55,
  reveal: 0.48,
};

function hashSeed(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function responseWindow(round) {
  if (!Number.isInteger(round) || round < 0 || round >= GARDEN_SPRINKLER.rounds)
    throw new Error('花盆轮次超出浇园范围');
  return Math.max(1.25, 2.65 - round * 0.11);
}

export function generateCourse(seed) {
  const next = random(seed);
  const course = [];
  let previous = -1;
  for (let round = 0; round < GARDEN_SPRINKLER.rounds; round++) {
    let pot = Math.floor(next() * GARDEN_SPRINKLER.pots);
    if (pot === previous) pot = (pot + 1 + Math.floor(next() * 6)) % GARDEN_SPRINKLER.pots;
    course.push({ pot, window: responseWindow(round) });
    previous = pot;
  }
  return course;
}
