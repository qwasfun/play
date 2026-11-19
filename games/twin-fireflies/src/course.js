import { rng } from '@playground/game-sdk';

export const TWIN_FIREFLIES = Object.freeze({
  total: 12,
  lives: 3,
  limit: 50,
  score: 100,
  firstGate: 3,
  gateInterval: 3.2,
  startGap: 150,
  step: 32,
  minGap: 86,
  maxGap: 214,
  tolerance: 13,
  playerY: 342,
  gateSpeed: 86,
});

export const GAP_LEVELS = Object.freeze([86, 118, 150, 182, 214]);

export function clampGap(gap) {
  return Math.max(TWIN_FIREFLIES.minGap, Math.min(TWIN_FIREFLIES.maxGap, gap));
}

export function isAligned(gap, targetGap) {
  return Math.abs(gap - targetGap) <= TWIN_FIREFLIES.tolerance;
}

export function generateCourse(seed) {
  const random = rng(`${seed}:twin-fireflies:v1`);
  const gates = [];
  let previous = 2;
  const used = new Set();
  for (let index = 0; index < TWIN_FIREFLIES.total; index++) {
    let level = Math.floor(random() * GAP_LEVELS.length);
    if (level === previous) level = (level + 1 + Math.floor(random() * 3)) % GAP_LEVELS.length;
    if (index >= TWIN_FIREFLIES.total - 2 && used.size < GAP_LEVELS.length) {
      level = GAP_LEVELS.findIndex((_, candidate) => !used.has(candidate));
    }
    used.add(level);
    gates.push({
      index,
      gap: GAP_LEVELS[level],
      level,
      at: TWIN_FIREFLIES.firstGate + index * TWIN_FIREFLIES.gateInterval,
      flower: Math.floor(random() * 4),
    });
    previous = level;
  }
  return { gates };
}
